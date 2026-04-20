import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Bell, Type as TypeIcon, Smartphone, Shield, UserPlus, Copy, Check,
  Trash2, LogOut, Download, RefreshCw, Mail, MessageSquare, Twitter, Send,
  AlertTriangle, ExternalLink, Sparkles, Laptop, MonitorSmartphone, Globe,
  Sliders, Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAvatar } from "@/hooks/useAvatar";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Prefs = {
  notifications: { achievements: boolean; reminders: boolean; sounds: boolean; messages: boolean };
  fontScale: number;
};
const DEFAULT_PREFS: Prefs = {
  notifications: { achievements: true, reminders: true, sounds: true, messages: true },
  fontScale: 1,
};
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem("peaceboard_prefs");
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}
function savePrefs(p: Prefs) {
  localStorage.setItem("peaceboard_prefs", JSON.stringify(p));
  document.documentElement.style.fontSize = `${Math.round(16 * p.fontScale)}px`;
  window.dispatchEvent(new CustomEvent("peaceboard-prefs", { detail: p }));
}

type SessionRow = {
  id: string; deviceInfo: string | null; ipAddress: string | null;
  createdAt: string; expiresAt: string; current: boolean;
};
type InviteRow = {
  code: string; inviterName?: string | null; message?: string | null;
  status: string; claimedAt?: string | null; expiresAt?: string | null; createdAt?: string | null;
};

function deviceIcon(ua: string | null) {
  const s = (ua || "").toLowerCase();
  if (/mobi|iphone|android|phone/.test(s)) return Smartphone;
  if (/ipad|tablet/.test(s)) return MonitorSmartphone;
  return Laptop;
}
function deviceLabel(ua: string | null) {
  const s = ua || "Unknown device";
  const browser = /chrome/i.test(s) ? "Chrome" : /firefox/i.test(s) ? "Firefox" : /safari/i.test(s) ? "Safari" : /edge/i.test(s) ? "Edge" : "Browser";
  const os = /windows/i.test(s) ? "Windows" : /mac/i.test(s) ? "macOS" : /android/i.test(s) ? "Android" : /iphone|ios/i.test(s) ? "iOS" : /linux/i.test(s) ? "Linux" : "Device";
  return `${browser} on ${os}`;
}

const SECTIONS = [
  { id: "notifications", label: "Notifications", icon: Bell, color: "from-rose-400 to-orange-400" },
  { id: "display", label: "Display & Font", icon: TypeIcon, color: "from-indigo-400 to-purple-500" },
  { id: "devices", label: "Linked Devices", icon: Smartphone, color: "from-blue-400 to-cyan-500" },
  { id: "invite", label: "Invite a Friend", icon: UserPlus, color: "from-pink-400 to-fuchsia-500" },
  { id: "privacy", label: "Privacy & Data", icon: Shield, color: "from-emerald-400 to-teal-500" },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, color: "from-red-400 to-rose-500" },
];

function Toggle({ on, onChange, label, hint, color = "emerald" }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; color?: string }) {
  const colorClass: Record<string, string> = {
    emerald: "bg-emerald-500", indigo: "bg-indigo-500", pink: "bg-pink-500", amber: "bg-amber-500",
  };
  return (
    <motion.label
      whileHover={{ x: 2 }}
      className="flex items-center justify-between gap-3 py-3 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onChange(!on); }}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? colorClass[color] : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow ${on ? "translate-x-5" : ""}`}
        />
      </button>
    </motion.label>
  );
}

function SectionCard({ id, icon: Icon, title, subtitle, gradient, danger, children }: any) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="scroll-mt-24"
    >
      <Card className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow ${danger ? "ring-1 ring-red-200 dark:ring-red-900/40" : ""}`}>
        <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md shadow-black/10`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>
      </Card>
    </motion.section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { avatar } = useAvatar(user?.id);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [inviteMessage, setInviteMessage] = useState("Hey! Join me on PeaceBoard — a kindness & wellbeing space.");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("notifications");

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Track active section while scrolling
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0.1 }
    );
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [user]);

  const setNotif = (k: keyof Prefs["notifications"], v: boolean) =>
    setPrefs(p => ({ ...p, notifications: { ...p.notifications, [k]: v } }));

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<SessionRow[]>({
    queryKey: ["/api/me/sessions"], enabled: !!user,
  });
  const revokeSession = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/me/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/sessions"] });
      toast({ title: "Device signed out" });
    },
  });
  const revokeOthers = useMutation({
    mutationFn: () => apiRequest("POST", "/api/me/sessions/revoke-others"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/sessions"] });
      toast({ title: `Signed out ${data?.revoked ?? 0} other device(s)` });
    },
  });

  const { data: invites = [] } = useQuery<InviteRow[]>({
    queryKey: ["/api/invites/mine/list"], enabled: !!user,
  });
  const createInvite = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/invites", { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/mine/list"] });
      toast({ title: "Invite link ready ✨", description: "Share it with your friend." });
    },
  });
  const revokeInvite = useMutation({
    mutationFn: (code: string) => apiRequest("DELETE", `/api/invites/${code}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/mine/list"] });
      toast({ title: "Invite revoked" });
    },
  });

  const inviteUrl = (code: string) => `${window.location.origin}/invite/${code}`;
  const shareText = (code: string) => `${inviteMessage}\n\nJoin here: ${inviteUrl(code)}`;
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(inviteUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const exportEverything = () => {
    const dump: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("peaceboard_") || k.startsWith("brain_") || k.startsWith("avatar_")) dump[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `peaceboard-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Your local data was downloaded." });
  };
  const wipeLocal = () => {
    if (!confirm("This will erase your diary, chat history, brain memory, achievements toasts seen, and avatar. Your account stays. Continue?")) return;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("peaceboard_") || k.startsWith("brain_") || k.startsWith("avatar_")) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    toast({ title: "Local data cleared" });
    setTimeout(() => window.location.reload(), 600);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navigation />
        <div className="max-w-md mx-auto pt-32 px-6 text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view settings</h1>
          <p className="text-slate-500 mb-6">Your preferences and devices are tied to your account.</p>
          <Button onClick={() => setLocation("/login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  const pendingInvites = invites.filter(i => i.status === "pending");
  const acceptedCount = invites.filter(i => i.status === "accepted").length;
  const otherSessions = sessions.filter(s => !s.current).length;
  const onCount = Object.values(prefs.notifications).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-pink-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />

      {/* Hero */}
      <header className="relative pt-28 pb-10 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -right-20 w-96 h-96 bg-purple-300/30 dark:bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute -top-20 -left-10 w-72 h-72 bg-pink-300/30 dark:bg-pink-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatar.color} flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30`}
            >
              {avatar.emoji}
            </motion.div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 via-purple-700 to-pink-600 dark:from-white dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Personalize {user.firstName || "your"} PeaceBoard experience.
              </p>
            </div>
          </motion.div>

          {/* Quick stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6"
          >
            {[
              { label: "Notifications on", value: `${onCount}/4`, icon: Bell, color: "from-rose-400 to-orange-400" },
              { label: "Linked devices", value: sessions.length, icon: Smartphone, color: "from-blue-400 to-cyan-500" },
              { label: "Friends invited", value: invites.length, icon: UserPlus, color: "from-pink-400 to-fuchsia-500" },
              { label: "Joined via you", value: acceptedCount, icon: Sparkles, color: "from-emerald-400 to-teal-500" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                whileHover={{ y: -3 }}
                className="rounded-xl bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 p-3 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-md`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.label}</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{s.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-3">Sections</p>
              <nav className="space-y-1">
                {SECTIONS.map(s => {
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollTo(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                        active
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="settings-active-pill"
                          className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 -z-0"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 w-7 h-7 rounded-md bg-gradient-to-br ${s.color} text-white flex items-center justify-center shrink-0`}>
                        <s.icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="relative z-10 truncate">{s.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile chips */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-2">
            <div className="flex gap-2 w-max">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                    activeSection === s.id
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                      : "bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <s.icon className="w-3 h-3" /> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {/* Notifications */}
            <SectionCard id="notifications" icon={Bell} gradient="from-rose-400 to-orange-400"
              title="Notifications" subtitle="Choose what nudges you'll see in the app.">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                <Toggle on={prefs.notifications.achievements} onChange={v => setNotif("achievements", v)}
                  color="amber" label="🏆 Achievements & streaks" hint="Confetti when you unlock badges." />
                <Toggle on={prefs.notifications.reminders} onChange={v => setNotif("reminders", v)}
                  color="indigo" label="⏰ Daily reminders" hint="Gentle nudges to journal or play." />
                <Toggle on={prefs.notifications.sounds} onChange={v => setNotif("sounds", v)}
                  color="emerald" label="🔔 Sound effects" hint="Soft chimes for replies and rewards." />
                <Toggle on={prefs.notifications.messages} onChange={v => setNotif("messages", v)}
                  color="pink" label="💬 Chatbot replies" hint="Show a badge when Peace replies." />
              </div>
            </SectionCard>

            {/* Display & Font */}
            <SectionCard id="display" icon={TypeIcon} gradient="from-indigo-400 to-purple-500"
              title="Display & Font" subtitle="Make text bigger or smaller across PeaceBoard.">
              <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800/50 dark:to-purple-900/10 rounded-xl p-5 border border-slate-200/60 dark:border-slate-700/60 mb-4">
                <div className="flex items-end justify-between mb-3">
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Font size
                  </span>
                  <span className="text-2xl font-bold tabular-nums bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    {Math.round(prefs.fontScale * 100)}%
                  </span>
                </div>
                <Slider value={[prefs.fontScale * 100]} min={85} max={130} step={5}
                  onValueChange={([v]) => setPrefs(p => ({ ...p, fontScale: v / 100 }))} />
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { l: "Small", v: 0.9 }, { l: "Default", v: 1 },
                    { l: "Large", v: 1.15 }, { l: "X-Large", v: 1.3 },
                  ].map(o => {
                    const active = Math.abs(prefs.fontScale - o.v) < 0.01;
                    return (
                      <button key={o.l}
                        onClick={() => setPrefs(p => ({ ...p, fontScale: o.v }))}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          active
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-purple-500/30"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300"
                        }`}>
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">Preview</p>
                <p style={{ fontSize: `${prefs.fontScale}rem` }} className="text-slate-700 dark:text-slate-200">
                  ✨ Be kind. Be brave. Be you.
                </p>
              </div>
            </SectionCard>

            {/* Linked Devices */}
            <SectionCard id="devices" icon={Smartphone} gradient="from-blue-400 to-cyan-500"
              title="Linked Devices" subtitle="Devices currently signed in to your account.">
              {sessionsLoading && (
                <div className="space-y-2">
                  {[0, 1].map(i => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No active sessions found.</p>
              )}
              <AnimatePresence initial={false}>
                <div className="space-y-2">
                  {sessions.map(s => {
                    const Icon = deviceIcon(s.deviceInfo);
                    return (
                      <motion.div
                        key={s.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        whileHover={{ x: 2 }}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border bg-white dark:bg-slate-800/40 ${
                          s.current ? "border-emerald-300 dark:border-emerald-700/60 ring-1 ring-emerald-200 dark:ring-emerald-800/40" : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            s.current ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{deviceLabel(s.deviceInfo)}</p>
                              {s.current && <Badge className="bg-emerald-500 hover:bg-emerald-500">This device</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {s.ipAddress ?? "—"} · since {new Date(s.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {!s.current && (
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => revokeSession.mutate(s.id)} disabled={revokeSession.isPending}>
                            <LogOut className="w-4 h-4 mr-1" /> Sign out
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
              {otherSessions > 0 && (
                <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={() => revokeOthers.mutate()}
                  disabled={revokeOthers.isPending}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Sign out all {otherSessions} other device{otherSessions > 1 ? "s" : ""}
                </Button>
              )}
            </SectionCard>

            {/* Invite */}
            <SectionCard id="invite" icon={UserPlus} gradient="from-pink-400 to-fuchsia-500"
              title="Invite a Friend" subtitle="Share PeaceBoard with someone you care about.">
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Total", value: invites.length, color: "from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10 text-purple-600 dark:text-purple-300" },
                  { label: "Pending", value: pendingInvites.length, color: "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 text-amber-600 dark:text-amber-300" },
                  { label: "Joined", value: acceptedCount, color: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 text-emerald-600 dark:text-emerald-300" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-3 text-center bg-gradient-to-br ${s.color}`}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs opacity-75">{s.label}</p>
                  </div>
                ))}
              </div>

              <Textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value.slice(0, 280))}
                rows={2} placeholder="Add a personal note (optional)" className="mb-3 resize-none" />
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white shadow-md shadow-pink-500/20"
                  onClick={() => createInvite.mutate(inviteMessage)} disabled={createInvite.isPending}>
                  {createInvite.isPending ? "Creating…" : <><Sparkles className="w-4 h-4 mr-1" /> Generate invite link</>}
                </Button>
              </motion.div>

              <AnimatePresence initial={false}>
                {invites.length > 0 && (
                  <div className="space-y-2 pt-4">
                    {invites.slice(0, 6).map(inv => {
                      const text = encodeURIComponent(shareText(inv.code));
                      const isExpired = inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now();
                      const status = isExpired && inv.status === "pending" ? "expired" : inv.status;
                      const statusColor: Record<string, string> = {
                        pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                        accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                        expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                        revoked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                      };
                      return (
                        <motion.div
                          key={inv.code}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <code className="text-xs font-mono bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700/60 px-2 py-1 rounded-md tracking-wider">{inv.code}</code>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[status]}`}>{status}</span>
                            {inv.createdAt && (
                              <span className="text-xs text-slate-400">· {new Date(inv.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => copy(inv.code)} className="h-8">
                              {copiedCode === inv.code ? <><Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                            </Button>
                            <a href={`mailto:?subject=Join%20me%20on%20PeaceBoard&body=${text}`}><Button size="sm" variant="outline" className="h-8"><Mail className="w-3.5 h-3.5 mr-1" /> Email</Button></a>
                            <a href={`sms:?&body=${text}`}><Button size="sm" variant="outline" className="h-8"><MessageSquare className="w-3.5 h-3.5 mr-1" /> SMS</Button></a>
                            <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-8 text-green-600 hover:text-green-700"><Send className="w-3.5 h-3.5 mr-1" /> WhatsApp</Button></a>
                            <a href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="h-8"><Twitter className="w-3.5 h-3.5 mr-1" /> X</Button></a>
                            <Link href={`/invite/${inv.code}`}><Button size="sm" variant="ghost" className="h-8"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview</Button></Link>
                            {inv.status === "pending" && !isExpired && (
                              <Button size="sm" variant="ghost" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => revokeInvite.mutate(inv.code)}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </SectionCard>

            {/* Privacy */}
            <SectionCard id="privacy" icon={Shield} gradient="from-emerald-400 to-teal-500"
              title="Privacy & Data" subtitle="Your diary, brain memory, and chat stay on your device.">
              <ul className="space-y-2 mb-4">
                {[
                  { i: Lock, t: "Diary entries", d: "Stored locally and PIN-locked." },
                  { i: Sparkles, t: "PeaceBrain (offline AI)", d: "Learns from your 👍 / 👎 in your browser only." },
                  { i: MessageSquare, t: "Cloud chat history", d: "Saved to your account when you use cloud AI." },
                ].map(r => (
                  <li key={r.t} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <r.i className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.t}</p>
                      <p className="text-xs text-slate-500">{r.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={exportEverything}>
                  <Download className="w-4 h-4 mr-1" /> Export local data (JSON)
                </Button>
                <Link href="/diary"><Button variant="outline"><ExternalLink className="w-4 h-4 mr-1" /> Open Diary</Button></Link>
              </div>
            </SectionCard>

            {/* Danger */}
            <SectionCard id="danger" icon={AlertTriangle} gradient="from-red-400 to-rose-500"
              title="Danger Zone" subtitle="Clear everything stored on this device." danger>
              <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-900/40 p-4">
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  This wipes diary, brain memory, avatar, and other browser-only data. Your account, achievements, and history on the server are kept.
                </p>
                <Button variant="destructive" onClick={wipeLocal}>
                  <Trash2 className="w-4 h-4 mr-1" /> Erase local data on this device
                </Button>
              </div>
            </SectionCard>

            <p className="text-center text-xs text-slate-400 pt-4">
              Made with 💜 for kindness · PeaceBoard
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
