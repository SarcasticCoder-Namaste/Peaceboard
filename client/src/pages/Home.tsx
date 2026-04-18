import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2, Music, Trophy, BarChart3, Clock, Star,
  Target, Heart, TrendingUp, Flame, Sparkles, CheckCircle2, User as UserIcon
} from "lucide-react";

// ─── Daily challenges (rotates daily) ─────────────────────────────────────
const CHALLENGES = [
  { tag: "Social Connection",  emoji: "😊", text: "Smile at three new people today and notice how it makes you feel." },
  { tag: "Empathy",            emoji: "🫶", text: "Ask someone how they're really doing — and listen without interrupting." },
  { tag: "Gratitude",          emoji: "🙏", text: "Write down three things you're grateful for right now." },
  { tag: "Kindness",           emoji: "💌", text: "Send a thank-you message to someone who helped you recently." },
  { tag: "Self-care",          emoji: "🌿", text: "Take a 5-minute mindful breathing break — in for 4, out for 6." },
  { tag: "Listening",          emoji: "👂", text: "Have a 5-minute conversation where you only ask questions." },
  { tag: "Generosity",         emoji: "🤝", text: "Help a classmate or colleague with one small task today." },
];
function todayKey() { return new Date().toISOString().slice(0, 10); }
function challengeKey(userId: string | undefined) { return `pb-ch-${userId || "anon"}-${todayKey()}`; }
function todaysChallenge() {
  const day = Math.floor(Date.now() / 86_400_000);
  return CHALLENGES[day % CHALLENGES.length];
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isGuest = !!user?.id?.startsWith("guest_");

  const { data: userProgress = [] } = useQuery<any[]>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user,
  });
  const { data: userRank } = useQuery<{ rank: number }>({
    queryKey: [`/api/leaderboard/rank/${user?.id}`],
    enabled: !!user,
  });
  const { data: userAchievements = [] } = useQuery<any[]>({
    queryKey: [`/api/achievements/${user?.id}`],
    enabled: !!user,
  });
  const { data: history = [] } = useQuery<any[]>({
    queryKey: [`/api/music/history/${user?.id}`],
    enabled: !!user && !isGuest,
  });
  const { data: emotions = [] } = useQuery<any[]>({
    queryKey: [`/api/emotions/${user?.id}`],
    enabled: !!user && !isGuest,
  });

  const stats = useMemo(() => {
    const completed = userProgress.filter((p: any) => p.completed).length;
    const points = userProgress.reduce((s: number, p: any) => s + (p.pointsEarned || 0), 0);

    // Streak across game/music/emotion days (last 60d window)
    const days = new Set<string>();
    for (const p of userProgress) {
      if (p.completedAt) days.add(new Date(p.completedAt).toISOString().slice(0, 10));
      if (p.createdAt)   days.add(new Date(p.createdAt).toISOString().slice(0, 10));
    }
    for (const h of history)  if (h.playedAt)  days.add(new Date(h.playedAt).toISOString().slice(0, 10));
    for (const e of emotions) if (e.createdAt) days.add(new Date(e.createdAt).toISOString().slice(0, 10));
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const has = days.has(d.toISOString().slice(0, 10));
      if (has) streak++;
      else if (i === 0) continue; // grace: today not done yet doesn't break the streak
      else break;
    }

    // This week's progress (last 7 days)
    const weekAgo = Date.now() - 7 * 86_400_000;
    const gamesThisWeek = userProgress.filter((p: any) =>
      p.completed && p.completedAt && new Date(p.completedAt).getTime() > weekAgo
    ).length;
    const musicThisWeek = history.filter((h: any) =>
      h.playedAt && new Date(h.playedAt).getTime() > weekAgo
    ).length;
    const checksThisWeek = emotions.filter((e: any) =>
      e.createdAt && new Date(e.createdAt).getTime() > weekAgo
    ).length;

    const weeklyGoal = 7 + 5 + 3; // games + music + checks targets
    const weeklyDone = Math.min(7, gamesThisWeek) + Math.min(5, musicThisWeek) + Math.min(3, checksThisWeek);
    const weeklyPct = Math.round((weeklyDone / weeklyGoal) * 100);

    return {
      gamesCompleted: completed,
      totalPoints: points,
      achievements: userAchievements.length,
      currentStreak: streak,
      rank: userRank?.rank ?? null,
      weeklyProgress: weeklyPct,
      gamesThisWeek, musicThisWeek, checksThisWeek,
    };
  }, [userProgress, userRank, userAchievements, history, emotions]);

  const challenge = todaysChallenge();
  const chKey = challengeKey(user?.id);
  const [challengeDone, setChallengeDone] = useState<boolean>(() => {
    try { return localStorage.getItem(chKey) === "1"; } catch { return false; }
  });
  // Re-sync if the user identity changes (e.g. login/logout in same tab)
  useEffect(() => {
    try { setChallengeDone(localStorage.getItem(chKey) === "1"); } catch {}
  }, [chKey]);
  const completeChallenge = () => {
    setChallengeDone(true);
    try { localStorage.setItem(chKey, "1"); } catch {}
  };

  const quickActions = [
    { title: "Play Games",       description: "Continue your empathy journey", icon: Gamepad2,  color: "from-blue-500 to-blue-600",     action: () => setLocation("/games") },
    { title: "Listen to Music",  description: "Find peace and mindfulness",    icon: Music,     color: "from-emerald-500 to-emerald-600", action: () => setLocation("/music") },
    { title: "Check Emotion",    description: "Quick wellness check-in",       icon: Heart,     color: "from-rose-500 to-pink-600",     action: () => setLocation("/check-emotion") },
    { title: "View Leaderboard", description: "See where you rank",            icon: Trophy,    color: "from-yellow-500 to-orange-500", action: () => setLocation("/leaderboard") },
    { title: "Your Profile",     description: "Stats, badges & history",        icon: UserIcon,  color: "from-violet-500 to-purple-600", action: () => setLocation("/profile") },
    { title: "Analytics",        description: "Track class growth",             icon: BarChart3, color: "from-cyan-500 to-blue-600",     action: () => setLocation("/analytics"), show: user?.userType === "school_admin" || user?.userType === "teacher" },
  ];

  const recentAchievements = userAchievements.slice(0, 3);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 👋
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            {stats.currentStreak > 0
              ? `You're on a ${stats.currentStreak}-day streak — keep it going!`
              : "Ready to continue your journey of kindness and empathy?"}
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard icon={<Gamepad2 className="w-5 h-5" />} value={stats.gamesCompleted} label="Games Completed" tint="from-blue-500 to-blue-600" />
          <StatCard icon={<Sparkles className="w-5 h-5" />} value={stats.totalPoints} label="Total Points"     tint="from-emerald-500 to-emerald-600" />
          <StatCard icon={<Trophy className="w-5 h-5" />}   value={stats.rank ? `#${stats.rank}` : "—"} label="Global Rank" tint="from-amber-500 to-orange-500" />
          <StatCard icon={<Flame className="w-5 h-5" />}    value={stats.currentStreak} label="Day Streak"     tint="from-rose-500 to-pink-600" />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-primary" /><span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {quickActions.filter(a => a.show !== false).map((action, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20" onClick={action.action}>
                        <CardContent className="p-5">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white shrink-0`}>
                              <action.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white">{action.title}</h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{action.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" /><span>This Week</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Weekly goals</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{stats.weeklyProgress}%</span>
                  </div>
                  <Progress value={stats.weeklyProgress} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{Math.min(7, stats.gamesThisWeek)}/7</div>
                      <div className="text-slate-600 dark:text-slate-400">Games</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{Math.min(5, stats.musicThisWeek)}/5</div>
                      <div className="text-slate-600 dark:text-slate-400">Music</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{Math.min(3, stats.checksThisWeek)}/3</div>
                      <div className="text-slate-600 dark:text-slate-400">Wellness</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right column */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
            {/* Daily Challenge */}
            <Card className={challengeDone ? "border-emerald-300 dark:border-emerald-700" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-rose-500" /><span>Today's Kindness Challenge</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg p-4 border ${challengeDone ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-200 dark:border-rose-800"}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{challenge.emoji}</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic flex-1">"{challenge.text}"</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{challenge.tag}</Badge>
                    {challengeDone ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Done today
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" onClick={completeChallenge}>I did it</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" /><span>Recent Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAchievements.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">🏅</div>
                    <p className="text-sm text-slate-500">Complete games to earn your first badge!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAchievements.map((a: any, i: number) => (
                      <div key={i} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="text-2xl">{a.icon || "🏆"}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-white truncate">{a.title || "Achievement"}</h4>
                          {a.description && <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{a.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-500" /><span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Row label="Achievements" value={stats.achievements} />
                  <Row label="Day streak" value={`${stats.currentStreak} days`} />
                  <Row label="Music plays" value={history.length} />
                  <Row label="Wellness checks" value={emotions.length} />
                  {user?.userType === "guest" && user.guestSessionExpiry && (
                    <Row label="Session expires" value={<span className="text-orange-600">{new Date(user.guestSessionExpiry).toLocaleDateString()}</span>} />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, tint }: { icon: React.ReactNode; value: number | string; label: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tint} text-white flex items-center justify-center shrink-0`}>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
