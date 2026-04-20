import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Bell, Type as TypeIcon, Smartphone, Shield, UserPlus, Copy, Check,
  Trash2, LogOut, Download, RefreshCw, Mail, MessageSquare, Twitter, Send,
  AlertTriangle, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Prefs = {
  notifications: { achievements: boolean; reminders: boolean; sounds: boolean; messages: boolean };
  fontScale: number; // 0.85 - 1.3
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
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

type InviteRow = {
  code: string;
  inviterName?: string | null;
  message?: string | null;
  status: string;
  claimedById?: string | null;
  claimedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
};

function Section({ icon: Icon, title, subtitle, children, danger }: any) {
  return (
    <Card className={`p-6 ${danger ? "border-red-200 dark:border-red-900/40" : ""}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${danger ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button onClick={() => onChange(!on)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [inviteMessage, setInviteMessage] = useState("Hey! Join me on PeaceBoard — it's a kindness & wellbeing app.");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  const setNotif = (k: keyof Prefs["notifications"], v: boolean) =>
    setPrefs(p => ({ ...p, notifications: { ...p.notifications, [k]: v } }));

  // ─── Linked devices ───
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

  // ─── Invitations ───
  const { data: invites = [] } = useQuery<InviteRow[]>({
    queryKey: ["/api/invites/mine/list"], enabled: !!user,
  });
  const createInvite = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/invites", { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/mine/list"] });
      toast({ title: "Invite link ready", description: "Share it with your friend." });
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
  const shareText = (code: string) =>
    `${inviteMessage}\n\nJoin here: ${inviteUrl(code)}`;

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(inviteUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  // ─── Privacy & data ───
  const exportEverything = () => {
    const dump: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("peaceboard_") || k.startsWith("brain_") || k.startsWith("avatar_")) {
        dump[k] = localStorage.getItem(k);
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Notifications, devices, privacy, and friend invites.</p>
        </motion.div>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications" subtitle="Choose what nudges you'll see in the app.">
          <Toggle on={prefs.notifications.achievements} onChange={v => setNotif("achievements", v)}
            label="Achievements & streaks" hint="Confetti and toasts when you unlock badges." />
          <Toggle on={prefs.notifications.reminders} onChange={v => setNotif("reminders", v)}
            label="Daily reminders" hint="Gentle nudges to journal or play a kindness game." />
          <Toggle on={prefs.notifications.sounds} onChange={v => setNotif("sounds", v)}
            label="Sound effects" hint="Soft chimes for replies and rewards." />
          <Toggle on={prefs.notifications.messages} onChange={v => setNotif("messages", v)}
            label="Chatbot replies" hint="Show a small badge when Peace replies." />
        </Section>

        {/* Font */}
        <Section icon={TypeIcon} title="Display & Font" subtitle="Make text bigger or smaller across PeaceBoard.">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Font size</span>
            <span className="text-sm font-bold tabular-nums">{Math.round(prefs.fontScale * 100)}%</span>
          </div>
          <Slider value={[prefs.fontScale * 100]} min={85} max={130} step={5}
            onValueChange={([v]) => setPrefs(p => ({ ...p, fontScale: v / 100 }))} />
          <div className="flex gap-2 mt-3">
            {[
              { l: "Small", v: 0.9 },
              { l: "Default", v: 1 },
              { l: "Large", v: 1.15 },
              { l: "X-Large", v: 1.3 },
            ].map(o => (
              <Button key={o.l} size="sm" variant={Math.abs(prefs.fontScale - o.v) < 0.01 ? "default" : "outline"}
                onClick={() => setPrefs(p => ({ ...p, fontScale: o.v }))}>{o.l}</Button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3" style={{ fontSize: `${prefs.fontScale}rem` }}>
            Preview — this is how text will look across the app.
          </p>
        </Section>

        {/* Linked devices */}
        <Section icon={Smartphone} title="Linked Devices" subtitle="Devices currently signed in to your account.">
          {sessionsLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="text-sm text-slate-400">No active sessions found.</p>
          )}
          <div className="space-y-2">
            {sessions.map(s => {
              const ua = s.deviceInfo || "Unknown device";
              const short = ua.length > 80 ? ua.slice(0, 80) + "…" : ua;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{short}</p>
                      {s.current && <Badge variant="secondary">This device</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.ipAddress ?? "—"} · since {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                      onClick={() => revokeSession.mutate(s.id)} disabled={revokeSession.isPending}>
                      <LogOut className="w-4 h-4 mr-1" /> Sign out
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {sessions.filter(s => !s.current).length > 0 && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => revokeOthers.mutate()}
              disabled={revokeOthers.isPending}>
              <RefreshCw className="w-4 h-4 mr-1" /> Sign out all other devices
            </Button>
          )}
        </Section>

        {/* Invite a friend */}
        <Section icon={UserPlus} title="Invite a Friend" subtitle="Share PeaceBoard with someone you care about.">
          <div className="grid sm:grid-cols-3 gap-3 text-center mb-1">
            <div className="rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">{invites.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total invites</p>
            </div>
            <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">{pendingInvites.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
            </div>
            <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{acceptedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Joined</p>
            </div>
          </div>

          <Textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value.slice(0, 280))}
            rows={2} placeholder="Add a personal note (optional)" />
          <Button className="w-full" onClick={() => createInvite.mutate(inviteMessage)} disabled={createInvite.isPending}>
            {createInvite.isPending ? "Creating…" : <><UserPlus className="w-4 h-4 mr-1" /> Generate invite link</>}
          </Button>

          {invites.length > 0 && (
            <div className="space-y-2 pt-2">
              {invites.slice(0, 6).map(inv => {
                const url = inviteUrl(inv.code);
                const text = encodeURIComponent(shareText(inv.code));
                const isExpired = inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now();
                const status = isExpired && inv.status === "pending" ? "expired" : inv.status;
                return (
                  <div key={inv.code} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <code className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{inv.code}</code>
                      <Badge variant={status === "accepted" ? "default" : status === "pending" ? "secondary" : "outline"}>
                        {status}
                      </Badge>
                      {inv.createdAt && (
                        <span className="text-xs text-slate-400">created {new Date(inv.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(inv.code)}>
                        {copiedCode === inv.code ? <><Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Copied</>
                          : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy link</>}
                      </Button>
                      <a href={`mailto:?subject=Join%20me%20on%20PeaceBoard&body=${text}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><Mail className="w-3.5 h-3.5 mr-1" /> Email</Button>
                      </a>
                      <a href={`sms:?&body=${text}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><MessageSquare className="w-3.5 h-3.5 mr-1" /> SMS</Button>
                      </a>
                      <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><Send className="w-3.5 h-3.5 mr-1" /> WhatsApp</Button>
                      </a>
                      <a href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><Twitter className="w-3.5 h-3.5 mr-1" /> X / Twitter</Button>
                      </a>
                      <Link href={`/invite/${inv.code}`}>
                        <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview</Button>
                      </Link>
                      {inv.status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                          onClick={() => revokeInvite.mutate(inv.code)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Privacy & data */}
        <Section icon={Shield} title="Privacy & Data" subtitle="Your diary, brain memory, and chat stay on your device.">
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <p>• Diary entries are stored locally and PIN-locked.</p>
            <p>• PeaceBrain (offline AI) learns from your 👍 / 👎 in your browser only.</p>
            <p>• Chat history with the cloud AI is saved to your account.</p>
          </div>
          <div className="flex gap-2 flex-wrap pt-2">
            <Button variant="outline" onClick={exportEverything}>
              <Download className="w-4 h-4 mr-1" /> Export local data (JSON)
            </Button>
            <Link href="/diary"><Button variant="outline"><ExternalLink className="w-4 h-4 mr-1" /> Open Diary</Button></Link>
          </div>
        </Section>

        {/* Danger zone */}
        <Section icon={AlertTriangle} title="Danger Zone" subtitle="Clear everything stored on this device." danger>
          <Button variant="destructive" onClick={wipeLocal}>
            <Trash2 className="w-4 h-4 mr-1" /> Erase local data on this device
          </Button>
          <p className="text-xs text-slate-500">
            This wipes diary, brain memory, avatar, and other browser-only data. Your account, achievements, and history on the server are kept.
          </p>
        </Section>
      </main>
    </div>
  );
}
