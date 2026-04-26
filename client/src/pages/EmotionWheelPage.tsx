import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Clock } from "lucide-react";
import EmotionWheel, { CORE_EMOTIONS, type EmotionDef } from "@/components/EmotionWheel";
import Confetti from "@/components/Confetti";

interface RecentLog {
  id: number;
  emotion: string;
  wellnessScore?: number | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function EmotionWheelPage() {
  useDocumentTitle("Emotion Wheel");
  const { user } = useAuth();
  const { toast } = useToast();
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [lastPick, setLastPick] = useState<{ core: EmotionDef; nuance: string } | null>(null);

  const { data: recent = [] } = useQuery<RecentLog[]>({
    queryKey: [`/api/emotions/${user?.id}`],
    enabled: !!user,
  });

  const logMutation = useMutation({
    mutationFn: async (payload: { emotion: string; wellness: number }) => {
      return apiRequest("POST", "/api/emotions", {
        userId: user?.id,
        emotion: payload.emotion,
        wellnessScore: payload.wellness,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/emotions/${user?.id}`] });
    },
  });

  function handleSelect(core: EmotionDef, nuance: string) {
    if (!user) {
      toast({ title: "Sign in to save", description: "Your picks are saved to your timeline once you're signed in." });
      return;
    }
    setLastPick({ core, nuance });
    setConfettiTrigger((n) => n + 1);
    logMutation.mutate(
      { emotion: nuance, wellness: core.wellness },
      {
        onSuccess: () => {
          toast({
            title: `Logged: ${nuance} ${core.emoji}`,
            description: "Thanks for checking in — every feeling counts.",
          });
        },
        onError: () => {
          toast({
            title: "Couldn't save your pick",
            description: "We'll show it locally for now. Try again in a moment.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // Quick stats from the recent logs
  const stats = useMemo(() => {
    const last7 = recent.filter((r) => Date.now() - new Date(r.createdAt).getTime() < 7 * 86_400_000);
    const counts: Record<string, number> = {};
    for (const r of recent) counts[r.emotion] = (counts[r.emotion] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return {
      total: recent.length,
      thisWeek: last7.length,
      mostFrequent: top?.[0],
    };
  }, [recent]);

  return (
    <div className="pt-24 pb-24 md:pb-16 px-4 sm:px-6 lg:px-8">
      <Confetti trigger={confettiTrigger} />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <Badge variant="secondary" className="mb-4 px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            Name what you feel
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Emotion Wheel
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Naming an emotion is the first step in handling it. Pick the slice closest to how you feel,
            then a more specific word — your check-ins build a kinder picture of your week.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Wheel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardContent className="p-6 sm:p-10">
                <EmotionWheel onSelect={handleSelect} size={340} disabled={logMutation.isPending} />

                {lastPick && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 mx-auto max-w-md text-center rounded-xl p-5 border-2"
                    style={{ borderColor: lastPick.core.color, background: `${lastPick.core.color}1A` }}
                  >
                    <div className="text-4xl mb-2">{lastPick.core.emoji}</div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-1">
                      You're feeling <span style={{ color: lastPick.core.textColor }}>{lastPick.nuance}</span>.
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      That's a real, valid feeling. Want to{" "}
                      <a href="/diary" className="underline font-medium">write about it</a>{" "}
                      or{" "}
                      <a href="/music" className="underline font-medium">listen to something calm</a>?
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Your check-ins
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Stat label="Total picks" value={stats.total} />
                <Stat label="This week" value={stats.thisWeek} />
                <Stat label="Most frequent" value={stats.mostFrequent || "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Recent
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    No check-ins yet — pick a slice above to start your timeline.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recent.slice(0, 6).map((r) => {
                      const core = CORE_EMOTIONS.find((c) => c.nuances.includes(r.emotion));
                      return (
                        <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{core?.emoji || "💭"}</span>
                            <span className="truncate text-slate-700 dark:text-slate-200">{r.emotion}</span>
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                            {timeAgo(r.createdAt)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-4 text-center">
                  <Button asChild variant="outline" size="sm">
                    <a href="/check-emotion">Try the camera version →</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white capitalize">{value}</span>
    </div>
  );
}
