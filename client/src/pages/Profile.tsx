import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Star, Music, Heart, Sparkles, Smile, Gamepad2,
  Flame, Clock, TrendingUp, LogIn, Activity, Award,
} from "lucide-react";

function timeAgo(d: string | Date) {
  const date = new Date(d);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString();
}

const EMOTION_EMOJI: Record<string, string> = {
  happy: "😄", neutral: "😐", sad: "😔", angry: "😠",
  surprised: "😲", fearful: "😨", disgusted: "🤢",
};

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isGuest = !!user?.id?.startsWith("guest_");

  // All hooks MUST run on every render — gate UI is rendered, not branched, below.
  const { data: progress = [] } = useQuery<any[]>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user,
  });
  const { data: rankRes } = useQuery<{ rank: number }>({
    queryKey: [`/api/leaderboard/rank/${user?.id}`],
    enabled: !!user,
  });
  const { data: achievements = [] } = useQuery<any[]>({
    queryKey: [`/api/achievements/${user?.id}`],
    enabled: !!user,
  });
  const { data: history = [] } = useQuery<any[]>({
    queryKey: [`/api/music/history/${user?.id}`],
    enabled: !!user && !isGuest,
  });
  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: [`/api/music/favorites/${user?.id}`],
    enabled: !!user && !isGuest,
  });
  const { data: emotions = [] } = useQuery<any[]>({
    queryKey: [`/api/emotions/${user?.id}`],
    enabled: !!user && !isGuest,
  });

  // Aggregations
  const stats = useMemo(() => {
    const completed = progress.filter((p: any) => p.completed).length;
    const points = progress.reduce((s: number, p: any) => s + (p.pointsEarned || 0), 0);
    const stars = progress.reduce((s: number, p: any) => s + (p.stars || 0), 0);
    return {
      completed,
      points,
      stars,
      rank: rankRes?.rank ?? null,
      achievements: achievements.length,
      tracks: history.length,
      favs: favorites.length,
      moodChecks: emotions.length,
    };
  }, [progress, rankRes, achievements, history, favorites, emotions]);

  // Streak from any activity (progress + history + emotions)
  const streak = useMemo(() => {
    const days = new Set<string>();
    const collect = (arr: any[], key: string) => {
      for (const r of arr || []) {
        const d = r[key];
        if (!d) continue;
        days.add(new Date(d).toISOString().slice(0, 10));
      }
    };
    collect(progress, "completedAt");
    collect(progress, "createdAt");
    collect(history, "playedAt");
    collect(emotions, "createdAt");
    let s = 0;
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const has = days.has(d.toISOString().slice(0, 10));
      if (has) s++;
      else if (i === 0) continue; // grace: today not done yet doesn't break the streak
      else break;
    }
    return s;
  }, [progress, history, emotions]);

  // Wellness average from last 20 emotion logs
  const wellness = useMemo(() => {
    const recent = emotions.slice(0, 20);
    if (recent.length === 0) return null;
    const avg = recent.reduce((s: number, e: any) => s + (e.wellnessScore ?? 70), 0) / recent.length;
    return Math.round(avg);
  }, [emotions]);

  // Combined recent activity feed
  const activity = useMemo(() => {
    const items: { kind: string; title: string; sub?: string; at: string; icon: string }[] = [];
    for (const p of progress.slice(0, 10)) {
      items.push({
        kind: "game",
        title: p.completed ? "Completed a game" : "Played a game",
        sub: p.score != null ? `Score ${p.score}` : undefined,
        at: p.completedAt || p.createdAt,
        icon: "🎮",
      });
    }
    for (const h of history.slice(0, 10)) {
      items.push({ kind: "music", title: h.trackTitle || `Track #${h.trackId}`, sub: "Listened", at: h.playedAt, icon: "🎵" });
    }
    for (const e of emotions.slice(0, 10)) {
      items.push({
        kind: "emotion",
        title: `Felt ${e.emotion}`,
        sub: e.wellnessScore ? `${e.wellnessScore}% wellness` : undefined,
        at: e.createdAt,
        icon: EMOTION_EMOJI[e.emotion] || "🧠",
      });
    }
    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [progress, history, emotions]);

  // Emotion distribution for the mini chart
  const moodDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of emotions) counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .map(([emotion, n]) => ({ emotion, n, pct: Math.round((n / total) * 100) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [emotions]);

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  // Gate AFTER all hooks have run
  if (!user) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-3xl font-bold mb-3">Your Profile</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Sign in to see your achievements, stats, music favorites, and wellness journey.
          </p>
          <Button onClick={() => setLocation("/login")} size="lg" className="bg-gradient-to-r from-primary to-secondary text-white">
            <LogIn className="w-4 h-4 mr-2" /> Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center"
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-3xl font-bold flex items-center justify-center shadow-lg">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {user.firstName || "Welcome"} {user.lastName || ""}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="capitalize">{user.userType}</Badge>
              {user.email && <span className="text-sm text-slate-500">{user.email}</span>}
              {isGuest && (
                <Badge variant="outline" className="border-orange-400 text-orange-600">
                  Guest session
                </Badge>
              )}
            </div>
            {isGuest && (
              <p className="text-xs text-slate-500 mt-2">
                Create a free account to keep your progress, favorites, and wellness history forever.
              </p>
            )}
          </div>
          {isGuest && (
            <Button onClick={() => setLocation("/login")} className="bg-gradient-to-r from-primary to-secondary text-white">
              Save my progress
            </Button>
          )}
        </motion.div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatTile icon={<Gamepad2 className="w-5 h-5" />} value={stats.completed} label="Games done" tint="from-blue-500 to-blue-600" />
          <StatTile icon={<Sparkles className="w-5 h-5" />} value={stats.points} label="Points" tint="from-emerald-500 to-emerald-600" />
          <StatTile icon={<Trophy className="w-5 h-5" />} value={stats.rank ? `#${stats.rank}` : "—"} label="Global rank" tint="from-amber-500 to-orange-500" />
          <StatTile icon={<Flame className="w-5 h-5" />} value={streak} label="Day streak" tint="from-rose-500 to-pink-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wellness summary */}
            {!isGuest && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    Wellness Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {wellness == null ? (
                    <EmptyState
                      icon="🧠"
                      title="No wellness checks yet"
                      desc="Try the Check Your Emotion page to start tracking how you feel."
                      action={<Button size="sm" onClick={() => setLocation("/check-emotion")}>Check now</Button>}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-end gap-3">
                        <div className="text-5xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                          {wellness}%
                        </div>
                        <div className="text-sm text-slate-500 mb-2">Avg wellness · last {Math.min(20, emotions.length)} checks</div>
                      </div>
                      <Progress value={wellness} className="h-2" />
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {moodDist.map((m) => (
                          <div key={m.emotion} className="rounded-lg border bg-white/50 dark:bg-slate-800/40 p-2 text-center">
                            <div className="text-2xl">{EMOTION_EMOJI[m.emotion] || "🙂"}</div>
                            <div className="text-xs capitalize text-slate-600 dark:text-slate-300">{m.emotion}</div>
                            <div className="text-xs text-slate-500">{m.pct}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <EmptyState
                    icon="🌱"
                    title="No activity yet"
                    desc="Play a game, listen to music, or do a wellness check to see your timeline here."
                  />
                ) : (
                  <div className="space-y-2">
                    {activity.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                        <div className="text-2xl">{a.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title}</p>
                          {a.sub && <p className="text-xs text-slate-500">{a.sub}</p>}
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{timeAgo(a.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Achievements <Badge variant="secondary" className="ml-1">{stats.achievements}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.achievements === 0 ? (
                  <EmptyState icon="🏅" title="No badges yet" desc="Complete games to start earning achievements." />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {achievements.slice(0, 9).map((a: any, i: number) => (
                      <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-2xl" title={a.title || "Achievement"}>
                        {a.icon || "🏆"}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Music quick-look */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-emerald-500" />
                  Music
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.favs}</div>
                    <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80">Favorites</div>
                  </div>
                  <div className="rounded-lg p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800/50">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.tracks}</div>
                    <div className="text-xs text-blue-700/80 dark:text-blue-300/80">Plays logged</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setLocation("/music")}>
                  Open Music Center
                </Button>
              </CardContent>
            </Card>

            {/* Session info */}
            {isGuest && user.guestSessionExpiry && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Your guest session expires <span className="font-medium text-orange-600">{new Date(user.guestSessionExpiry).toLocaleString()}</span>.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, value, label, tint }: { icon: React.ReactNode; value: number | string; label: string; tint: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tint} text-white flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-sm text-slate-500 mt-1 mb-3">{desc}</p>
      {action}
    </div>
  );
}
