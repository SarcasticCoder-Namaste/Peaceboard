import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Gamepad2, Trophy, Music, Brain, Heart, BarChart3,
  ShieldCheck, Search, Trash2, UserCog, Activity, AlertTriangle,
  Download, ArrowLeft, Sparkles, Building2, Globe2, GraduationCap,
} from "lucide-react";

const fmtDate = (d: string | Date | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const fmtRel = (d: string | Date | null) => {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
};

type Overview = {
  totalStudents: number; activeStudents: number; totalGamesCompleted: number;
  totalAchievementsEarned: number; totalMusicPlays: number; totalEmotionChecks: number;
  avgWellness: number;
  weeklyActivity: Array<{ day: string; games: number; music: number; checks: number }>;
  categoryBreakdown: Array<{ category: string; sessions: number; percentage: number }>;
};
type Student = {
  id: string; firstName: string | null; lastName: string | null; email: string | null;
  userType: string; isActive: boolean | null; updatedAt: string | null;
  totalPoints: number; gamesCompleted: number; lastActive: string | null; avgWellness: number | null;
};
type Activity = {
  type: "game" | "music" | "emotion"; userId: string; userName: string;
  detail: string; meta?: string; at: string;
};
type Wellness = {
  moodCounts: Array<{ emotion: string; count: number }>;
  averageWellness: number; totalChecks: number;
  lowWellnessStudents: Array<{ userId: string; name: string; avgWellness: number; lastChecked: string }>;
};
type Game = { id: number; title: string; description: string; category: string; difficulty: string; points: number };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const isAdmin = user?.userType === "school_admin" || user?.userType === "teacher";

  const { data: overview } = useQuery<Overview>({ queryKey: ["/api/admin/overview"], enabled: isAdmin });
  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["/api/admin/students"], enabled: isAdmin });
  const { data: activity = [] } = useQuery<Activity[]>({ queryKey: ["/api/admin/activity"], enabled: isAdmin });
  const { data: wellness } = useQuery<Wellness>({ queryKey: ["/api/admin/wellness"], enabled: isAdmin });
  const { data: games = [] } = useQuery<Game[]>({ queryKey: ["/api/games"], enabled: isAdmin });
  const { data: schools = [] } = useQuery<Array<{ id: string; name: string; domain?: string | null; studentCount: number; activeCount: number; createdAt: string | null }>>({
    queryKey: ["/api/admin/schools"], enabled: isAdmin,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({ title: "Updated", description: "User updated." });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({ title: "User removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const deleteGame = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/games/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Game removed" });
    },
    onError: async (e: any) => {
      const msg = e?.message || "Could not delete this game.";
      toast({ title: "Cannot delete", description: msg, variant: "destructive" });
    },
  });

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (filterType !== "all" && s.userType !== filterType) return false;
      if (!q) return true;
      const hay = `${s.firstName || ""} ${s.lastName || ""} ${s.email || ""} ${s.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, search, filterType]);

  const exportStudentsCsv = () => {
    const rows = [
      ["Name", "Email", "Type", "Active", "Points", "Games", "Wellness", "Last Active"],
      ...filteredStudents.map(s => [
        `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.id,
        s.email || "",
        s.userType,
        s.isActive ? "yes" : "no",
        s.totalPoints,
        s.gamesCompleted,
        s.avgWellness ?? "",
        s.lastActive ? new Date(s.lastActive).toISOString() : "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `peaceboard-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="pt-32 pb-16 px-4 max-w-2xl mx-auto text-center">
        <Card>
          <CardContent className="p-10">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <h1 className="text-2xl font-bold mb-2">Admin only</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              You need a teacher or school administrator account to view this dashboard.
            </p>
            <Button onClick={() => setLocation("/login")}>Sign in as admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = [
    { label: "Total Students", value: overview?.totalStudents ?? 0, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "Active (7d)", value: overview?.activeStudents ?? 0, icon: Activity, color: "from-emerald-500 to-emerald-600" },
    { label: "Games Completed", value: overview?.totalGamesCompleted ?? 0, icon: Gamepad2, color: "from-purple-500 to-purple-600" },
    { label: "Achievements", value: overview?.totalAchievementsEarned ?? 0, icon: Trophy, color: "from-amber-500 to-amber-600" },
    { label: "Music Plays", value: overview?.totalMusicPlays ?? 0, icon: Music, color: "from-pink-500 to-pink-600" },
    { label: "Wellness Checks", value: overview?.totalEmotionChecks ?? 0, icon: Brain, color: "from-cyan-500 to-cyan-600" },
  ];

  const maxBar = Math.max(
    1,
    ...(overview?.weeklyActivity || []).flatMap(d => [d.games, d.music, d.checks]),
  );

  const moodColors: Record<string, string> = {
    happy: "bg-emerald-500", calm: "bg-cyan-500", neutral: "bg-slate-400",
    surprised: "bg-amber-500", sad: "bg-blue-500", angry: "bg-rose-500",
    disgusted: "bg-purple-500", fearful: "bg-violet-500",
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Console</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Welcome, {user?.firstName || "Educator"}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Manage students, content, and monitor wellness across your school.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/home")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to app
            </Button>
            <Button onClick={exportStudentsCsv}>
              <Download className="w-4 h-4 mr-1" /> Export students
            </Button>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 mb-2 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center text-white`}>
                    <k.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold">{k.value.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{k.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6 w-full max-w-4xl">
            <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />Overview</TabsTrigger>
            <TabsTrigger value="students"><Users className="w-4 h-4 mr-1 hidden sm:inline" />Students</TabsTrigger>
            <TabsTrigger value="schools"><Building2 className="w-4 h-4 mr-1 hidden sm:inline" />Schools</TabsTrigger>
            <TabsTrigger value="content"><Gamepad2 className="w-4 h-4 mr-1 hidden sm:inline" />Content</TabsTrigger>
            <TabsTrigger value="wellness"><Heart className="w-4 h-4 mr-1 hidden sm:inline" />Wellness</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="w-4 h-4 mr-1 hidden sm:inline" />Activity</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Last 7 days activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(overview?.weeklyActivity || []).map(day => (
                      <div key={day.day} className="flex items-center gap-3">
                        <div className="w-10 text-xs font-medium text-slate-500">{day.day}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded transition-all" style={{ width: `${(day.games / maxBar) * 100}%` }} />
                            <span className="text-xs text-slate-500 w-16">{day.games} games</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 bg-gradient-to-r from-pink-500 to-pink-600 rounded transition-all" style={{ width: `${(day.music / maxBar) * 100}%` }} />
                            <span className="text-xs text-slate-500 w-16">{day.music} music</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded transition-all" style={{ width: `${(day.checks / maxBar) * 100}%` }} />
                            <span className="text-xs text-slate-500 w-16">{day.checks} checks</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!overview?.weeklyActivity?.some(d => d.games || d.music || d.checks) && (
                      <p className="text-sm text-slate-500 text-center py-6">No activity yet — your students haven't started this week.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Top performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...students].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5).map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white rounded-full bg-gradient-to-br from-amber-400 to-orange-500">{i + 1}</div>
                        <Avatar className="w-9 h-9"><AvatarFallback>{(s.firstName?.[0] || s.email?.[0] || "U").toUpperCase()}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{s.firstName || s.email?.split("@")[0] || `User ${s.id.slice(-4)}`}</div>
                          <div className="text-xs text-slate-500">{s.gamesCompleted} games · {s.totalPoints} pts</div>
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No students yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-purple-500" /> Game category breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(overview?.categoryBreakdown || []).map((c, i) => (
                    <div key={c.category} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600">
                      <div className={`w-12 h-12 mb-3 rounded-full flex items-center justify-center text-white font-bold ${["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500"][i % 4]}`}>
                        {c.percentage}%
                      </div>
                      <h4 className="font-semibold capitalize">{c.category.replace(/-/g, " ")}</h4>
                      <p className="text-sm text-slate-500">{c.sessions} sessions</p>
                    </div>
                  ))}
                  {(overview?.categoryBreakdown?.length ?? 0) === 0 && (
                    <p className="text-sm text-slate-500 col-span-full text-center py-4">No game sessions yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STUDENTS */}
          <TabsContent value="students" className="space-y-4">
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, or ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="guest">Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500 mt-3">{filteredStudents.length} of {students.length} accounts</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Points</th>
                      <th className="px-4 py-3">Games</th>
                      <th className="px-4 py-3">Wellness</th>
                      <th className="px-4 py-3">Last active</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8"><AvatarFallback>{(s.firstName?.[0] || s.email?.[0] || "U").toUpperCase()}</AvatarFallback></Avatar>
                            <div>
                              <div className="font-medium">{[s.firstName, s.lastName].filter(Boolean).join(" ") || s.email?.split("@")[0] || `User ${s.id.slice(-5)}`}</div>
                              <div className="text-xs text-slate-500">{s.email || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={s.userType === "guest" ? "outline" : "default"} className="capitalize">{s.userType}</Badge>
                          {s.isActive === false && <Badge variant="destructive" className="ml-1">Suspended</Badge>}
                        </td>
                        <td className="px-4 py-3 font-medium">{s.totalPoints}</td>
                        <td className="px-4 py-3">{s.gamesCompleted}</td>
                        <td className="px-4 py-3">
                          {s.avgWellness != null ? (
                            <div className="flex items-center gap-2">
                              <Progress value={s.avgWellness} className="w-16 h-2" />
                              <span className="text-xs">{s.avgWellness}%</span>
                            </div>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtRel(s.lastActive)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => updateUser.mutate({ id: s.id, body: { isActive: !s.isActive } })}
                              title={s.isActive === false ? "Reactivate" : "Suspend"}
                            >
                              <UserCog className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this account?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently deletes the user and all their progress, music history,
                                    achievements and wellness checks. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => deleteUser.mutate(s.id)}
                                  >Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-slate-500">No matching students.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* CONTENT */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map(g => (
                <Card key={g.id} className="bg-white dark:bg-slate-800">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold leading-tight">{g.title}</h3>
                      <Badge variant="outline" className="capitalize">{g.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{g.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <Badge className="capitalize">{g.category.replace(/-/g, " ")}</Badge>
                      <span className="text-slate-500">{g.points} pts</span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove "{g.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Games with student progress are protected and cannot be removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteGame.mutate(g.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {games.length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-slate-500">No games published.</CardContent></Card>
              )}
            </div>
          </TabsContent>

          {/* WELLNESS */}
          <TabsContent value="wellness" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-5 text-center">
                  <Heart className="w-8 h-8 mx-auto text-rose-500 mb-2" />
                  <div className="text-3xl font-bold">{wellness?.averageWellness ?? 0}%</div>
                  <div className="text-xs text-slate-500">Average wellness</div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-5 text-center">
                  <Brain className="w-8 h-8 mx-auto text-cyan-500 mb-2" />
                  <div className="text-3xl font-bold">{wellness?.totalChecks ?? 0}</div>
                  <div className="text-xs text-slate-500">Total wellness checks</div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-5 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <div className="text-3xl font-bold">{wellness?.lowWellnessStudents.length ?? 0}</div>
                  <div className="text-xs text-slate-500">Students needing support</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-slate-800">
              <CardHeader><CardTitle>Mood distribution</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const total = (wellness?.moodCounts || []).reduce((s, m) => s + m.count, 0) || 1;
                  return (
                    <div className="space-y-3">
                      {(wellness?.moodCounts || []).sort((a, b) => b.count - a.count).map(m => {
                        const pct = Math.round((m.count / total) * 100);
                        return (
                          <div key={m.emotion} className="flex items-center gap-3">
                            <div className="w-20 capitalize text-sm">{m.emotion}</div>
                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                              <div className={`h-full ${moodColors[m.emotion] || "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="w-20 text-right text-xs text-slate-500">{m.count} · {pct}%</div>
                          </div>
                        );
                      })}
                      {(!wellness?.moodCounts || wellness.moodCounts.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-4">No wellness check data yet.</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" /> Students needing extra support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {(wellness?.lowWellnessStudents || []).map(s => (
                    <div key={s.userId} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarFallback>{s.name[0]?.toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-slate-500">Last checked {fmtRel(s.lastChecked)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={s.avgWellness} className="w-24 h-2" />
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{s.avgWellness}%</span>
                      </div>
                    </div>
                  ))}
                  {(wellness?.lowWellnessStudents || []).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">All students are doing well. 🌱</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIVITY */}
          <TabsContent value="activity">
            <Card className="bg-white dark:bg-slate-800">
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-500" /> Recent activity</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {activity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${
                        a.type === "game" ? "bg-purple-500" : a.type === "music" ? "bg-pink-500" : "bg-cyan-500"
                      }`}>
                        {a.type === "game" ? <Gamepad2 className="w-4 h-4" /> : a.type === "music" ? <Music className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium">{a.userName}</span>{" "}
                          <span className="text-slate-600 dark:text-slate-300">{a.detail}</span>
                          {a.meta && <span className="text-xs text-slate-500 ml-1">· {a.meta}</span>}
                        </div>
                        <div className="text-xs text-slate-500">{fmtRel(a.at)}</div>
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No recent activity yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHOOLS */}
          <TabsContent value="schools" className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Schools connected</p>
                    <p className="text-2xl font-bold">{schools.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Current users</p>
                    <p className="text-2xl font-bold">{overview?.totalStudents ?? 0}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{overview?.activeStudents ?? 0} active now</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avg. wellness</p>
                    <p className="text-2xl font-bold">{overview?.avgWellness ?? 0}<span className="text-sm text-slate-400">/100</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Connected schools</CardTitle>
              </CardHeader>
              <CardContent>
                {schools.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No schools connected yet.</p>
                )}
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {schools.map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center font-bold">
                        {s.name?.[0]?.toUpperCase() || "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Globe2 className="w-3 h-3" /> {s.domain || "no domain"} · joined {fmtDate(s.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{s.studentCount}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{s.activeCount} active</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-500" /> Quick analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500">Games done</p>
                    <p className="text-xl font-bold">{overview?.totalGamesCompleted ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500">Music plays</p>
                    <p className="text-xl font-bold">{overview?.totalMusicPlays ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500">Emotion checks</p>
                    <p className="text-xl font-bold">{overview?.totalEmotionChecks ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500">Achievements</p>
                    <p className="text-xl font-bold">{overview?.totalAchievementsEarned ?? 0}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/analytics")}>
                  Open full analytics →
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
