import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Activity, Gamepad2, Sparkles, Heart, Mail, AlertTriangle,
  TrendingUp, Calendar, Award, Flag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface Digest {
  schoolless: boolean;
  weekStart?: string;
  totalStudents?: number;
  activeStudents?: number;
  engagementRate?: number;
  gamesCompleted?: number;
  pointsEarned?: number;
  emotionCheckIns?: number;
  avgWellness?: number | null;
  complimentsSent?: number;
  complimentsFlagged?: number;
  topGames?: { title: string; plays: number }[];
}

function StatTile({
  icon: Icon, label, value, sub, color,
}: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${color}`} />
      <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </Card>
  );
}

export default function Digest() {
  useDocumentTitle("Weekly Digest · Teachers");
  const { user } = useAuth();
  const isStaff = user?.userType === "school_admin" || user?.userType === "teacher";

  const { data, isLoading, error } = useQuery<Digest>({
    queryKey: ["/api/digest/weekly"],
    enabled: isStaff,
  });

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 text-center">
        <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Weekly Digest</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Sign in with a teacher or school account to see your school's weekly snapshot.</p>
      </div>
    );
  }
  if (!isStaff) {
    return (
      <div className="min-h-screen pt-20 px-4 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Teachers Only</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">The weekly digest is for school staff. Ask a teacher to share highlights with your class.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="min-h-screen pt-24 px-4 text-center text-slate-500">Building this week's snapshot…</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen pt-24 px-4 text-center text-rose-500">Couldn't load the digest right now.</div>;
  }
  if (data.schoolless) {
    return (
      <div className="min-h-screen pt-20 px-4 text-center">
        <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">No school linked</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Link your account to a school in Settings to see weekly highlights.</p>
      </div>
    );
  }

  const weekLabel = data.weekStart
    ? `Since ${new Date(data.weekStart).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`
    : "Last 7 days";
  const wellnessColor =
    data.avgWellness == null ? "text-slate-400" :
    data.avgWellness >= 70 ? "text-emerald-500" :
    data.avgWellness >= 50 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 mb-3">
            <Calendar className="w-3 h-3 mr-1" /> {weekLabel}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">Weekly Digest</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">A friendly snapshot of how kindness is growing at your school.</p>
        </motion.header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatTile icon={Users} label="Active students" value={`${data.activeStudents}/${data.totalStudents}`} sub={`${data.engagementRate}% participated`} color="bg-blue-500" />
          <StatTile icon={Gamepad2} label="Games completed" value={data.gamesCompleted ?? 0} sub={`${data.pointsEarned ?? 0} kindness points earned`} color="bg-emerald-500" />
          <StatTile icon={Heart} label="Emotion check-ins" value={data.emotionCheckIns ?? 0} sub={data.avgWellness != null ? `Avg wellness · ${data.avgWellness}/100` : "No wellness data yet"} color="bg-rose-500" />
          <StatTile icon={Mail} label="Compliments sent" value={data.complimentsSent ?? 0} sub={data.complimentsFlagged ? `${data.complimentsFlagged} flagged for review` : "All kind so far ✨"} color="bg-amber-500" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Engagement</h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Participation</span>
                  <span className="font-semibold">{data.engagementRate}%</span>
                </div>
                <Progress value={data.engagementRate ?? 0} />
              </div>
              {data.avgWellness != null && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Average wellness</span>
                    <span className={`font-semibold ${wellnessColor}`}>{data.avgWellness}/100</span>
                  </div>
                  <Progress value={data.avgWellness} />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              All numbers are aggregated across your school — never individual students. Use them to celebrate progress or notice when extra encouragement might help.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Top games this week</h2>
            </div>
            {data.topGames && data.topGames.length > 0 ? (
              <ul className="space-y-2">
                {data.topGames.map((g, i) => (
                  <li key={g.title} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="truncate">{g.title}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0">{g.plays} plays</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No games played yet this week. Encourage your class to start with an empathy game!</p>
            )}
          </Card>

          {(data.complimentsFlagged ?? 0) > 0 && (
            <Card className="p-5 md:col-span-2 border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex items-start gap-3">
                <Flag className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">{data.complimentsFlagged} compliments need review</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Students reported these notes as unkind. They're hidden from inboxes — review them in the admin console.</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5 md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold">A small idea for next week</h2>
                <p className="text-sm text-white/90 mt-1">
                  {data.engagementRate && data.engagementRate >= 70
                    ? "Engagement is strong — consider a class-wide gratitude circle to celebrate."
                    : "Try a 5-minute wind-down breathing session at the start of class to invite more students in."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
