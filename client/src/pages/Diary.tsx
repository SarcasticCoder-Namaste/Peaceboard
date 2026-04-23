import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { apiRequest } from "@/lib/queryClient";
import {
  Lock, Plus, Search, Trash2, Pencil, Eye, EyeOff,
  Download, KeyRound, X, BookOpen, Save, Pin, Sparkles,
  FileJson, FileText, Hash, ChevronDown, ChevronUp, Tag, CheckCircle2,
  Calendar, Quote, Mic, MicOff, Image as ImageIcon, Clock,
  Heart, Wand2, ShieldCheck, Loader2, History,
} from "lucide-react";
import {
  DiaryEntry, DiaryType, TYPE_META, MOOD_EMOJIS,
  listEntries, saveEntry, deleteEntry, exportEntries, exportEntriesJSON,
  hasPin, setPin, clearPin, verifyPin, isUnlocked, lock,
  togglePin, getDiaryStats, getMoodByDate, listAllTags,
  getDailyPrompt, saveDraft, loadDraft, clearDraft,
  getOnThisDay, readingTimeMin,
} from "@/lib/diaryStore";
import { pingStreak } from "@/lib/streak";
import { pushNotification } from "@/lib/notifications";

const TYPES: DiaryType[] = ["thought","feeling","gratitude","dream","secret","goal","memory"];

// soft mood→colour mapping for the heatmap
const MOOD_COLOR = [
  "bg-rose-300 dark:bg-rose-700",      // 1 sad
  "bg-orange-300 dark:bg-orange-700",  // 2
  "bg-amber-300 dark:bg-amber-600",    // 3 neutral
  "bg-lime-300 dark:bg-lime-600",      // 4
  "bg-emerald-400 dark:bg-emerald-600",// 5 happy
];

// Highlight matched search terms inside a string
function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded px-0.5">{p}</mark>
      : <span key={i}>{p}</span>
  );
}

export default function DiaryPage() {
  useDocumentTitle("Diary");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const userId = user?.id || "";

  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<DiaryType | "all">("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [revealSecrets, setRevealSecrets] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);

  useEffect(() => { if (userId) setUnlocked(isUnlocked(userId)); }, [userId]);
  useEffect(() => { if (userId && unlocked) setEntries(listEntries(userId)); }, [userId, unlocked]);

  const refresh = () => setEntries(listEntries(userId));
  const stats = useMemo(() => getDiaryStats(userId), [entries, userId]);
  const moodByDate = useMemo(() => getMoodByDate(userId), [entries, userId]);
  const allTags = useMemo(() => listAllTags(userId), [entries, userId]);
  const dailyPrompt = useMemo(() => getDailyPrompt(), []);
  const memories = useMemo(() => getOnThisDay(userId), [entries, userId]);

  const [reflectionOpen, setReflectionOpen] = useState(false);

  const tryUnlock = async () => {
    setPinError("");
    const ok = await verifyPin(userId, pinInput);
    if (ok) { setUnlocked(true); setPinInput(""); }
    else setPinError("Wrong PIN. Try again.");
  };

  const submitNewPin = async () => {
    if (!/^\d{4}$/.test(newPin)) { toast({ title: "PIN must be 4 digits", variant: "destructive" }); return; }
    if (newPin !== confirmPin) { toast({ title: "PINs don't match", variant: "destructive" }); return; }
    await setPin(userId, newPin);
    toast({ title: "PIN set 🔒", description: "Your diary is now private to you." });
    setShowSetPin(false); setNewPin(""); setConfirmPin("");
    setUnlocked(true);
  };

  const removePin = () => {
    if (!confirm("Remove the PIN? Your diary will no longer be locked.")) return;
    clearPin(userId);
    toast({ title: "PIN removed" });
  };

  const lockNow = () => { lock(userId); setUnlocked(false); };

  const filtered = useMemo(() => {
    let list = entries;
    if (filterType !== "all") list = list.filter((e) => e.type === filterType);
    if (filterTag) list = list.filter((e) => (e.tags || []).includes(filterTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          (e.tags || []).some(t => t.includes(q)),
      );
    }
    // pinned first, then newest
    return list.slice().sort((a, b) => {
      const pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.createdAt - a.createdAt;
    });
  }, [entries, filterType, filterTag, search]);

  const onAfterSave = () => {
    refresh();
    setEditorOpen(false);
    clearDraft(userId);
    const { milestone, isNewDay } = pingStreak(userId);
    if (isNewDay) {
      pushNotification(userId, {
        type: "diary", emoji: "📓",
        title: "Diary entry saved",
        body: "Your daily kindness streak just grew. Keep going!",
        href: "/diary",
      });
    }
    if (milestone) {
      pushNotification(userId, {
        type: "streak", emoji: "🔥",
        title: `${milestone}-day streak unlocked!`,
        body: "Consistency is its own gift. Beautiful work.",
        href: "/profile",
      });
      toast({ title: `🔥 ${milestone}-day streak!`, description: "Keep showing up for yourself." });
    }
  };

  if (!isAuthenticated) {
    return <DiaryLanding />;
  }

  // ── Locked screen ──────────────────────────────────────────────────────────
  if (!unlocked && hasPin(userId)) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Diary Locked</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your 4-digit PIN to unlock.</p>
          <div className="mt-6 flex justify-center">
            <input
              autoFocus inputMode="numeric" maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              className="w-44 text-center tracking-[0.6em] text-2xl font-mono py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••"
            />
          </div>
          {pinError && <p className="mt-3 text-sm text-red-500">{pinError}</p>}
          <button onClick={tryUnlock} className="mt-5 w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90">
            Unlock
          </button>
          <button
            onClick={() => {
              if (confirm("Forgot your PIN? You can remove it (this keeps your entries) and set a new one.")) {
                clearPin(userId); setUnlocked(true);
                toast({ title: "PIN cleared. Set a new one anytime from Settings." });
              }
            }}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Forgot PIN?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-2xl mb-6 p-6 sm:p-8"
      >
        <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> Your private diary
              {hasPin(userId) ? <span className="ml-1 inline-flex items-center gap-1 text-emerald-200">· <Lock className="w-3 h-3" /> PIN-protected</span> : null}
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold leading-tight">
              Hi {user?.firstName || "there"} — what's alive in you today?
            </h1>
            <div className="mt-4 inline-flex items-start gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
              <Quote className="w-4 h-4 mt-0.5 shrink-0 text-white/80" />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Today's prompt: </span>{dailyPrompt}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => { setEditing(null); setEditorOpen(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-sm shadow hover:bg-white/90"
              >
                <Plus className="w-4 h-4" /> New Entry
              </button>
              <button
                onClick={() => { setEditing(null); setEditorOpen(true); setTimeout(() => {
                  // pre-fill body with the prompt in the textarea via a custom event
                  window.dispatchEvent(new CustomEvent("peaceboard-diary-prefill", { detail: { body: `${dailyPrompt}\n\n` } }));
                }, 50); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-medium hover:bg-white/25"
              >
                <Sparkles className="w-4 h-4" /> Write to today's prompt
              </button>
              {entries.length >= 3 && (
                <button
                  onClick={() => setReflectionOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-medium hover:bg-white/25"
                  title="Get a kind reflection on your recent entries"
                >
                  <Wand2 className="w-4 h-4" /> Reflect on my week
                </button>
              )}
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Entries" value={stats.total} />
            <Stat label="Streak" value={`${stats.currentStreak}d`} hint={`best ${stats.longestStreak}d`} />
            <Stat label="This week" value={stats.thisWeek} />
            <Stat label="Top mood" value={stats.topMoodEmoji} hint={stats.avgMood ? `avg ${stats.avgMood.toFixed(1)}/5` : undefined} />
          </div>
        </div>
      </motion.div>

      {/* ── On This Day memories ─────────────────────────────────────── */}
      {memories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">On this day</h3>
            <span className="text-xs text-slate-500">· memories from past {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}s</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {memories.map(m => {
              const meta = TYPE_META[m.type];
              const days = Math.round((Date.now() - m.createdAt) / 86400_000);
              const yrs = Math.floor(days / 365);
              const ago = yrs >= 1 ? `${yrs} year${yrs > 1 ? "s" : ""} ago` : `${days} days ago`;
              return (
                <button
                  key={m.id}
                  onClick={() => { setEditing(m); setEditorOpen(true); }}
                  className="shrink-0 w-64 text-left bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium">{meta.emoji} {meta.label}</span>
                    <span className="text-amber-600 dark:text-amber-300 font-semibold">{ago}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white text-sm truncate">
                    {m.title || "(untitled)"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 whitespace-pre-wrap">
                    {m.isSecret ? "🔒 Hidden secret" : m.body}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Mood heatmap (last 90 days) ───────────────────────────────── */}
      {entries.length > 0 && (
        <div className="mb-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
          <button
            onClick={() => setShowStats(s => !s)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Mood timeline · last 90 days</h3>
            </div>
            <span className="text-slate-400">{showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          </button>
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <MoodHeatmap moodByDate={moodByDate} />
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>Less happy</span>
                    {MOOD_COLOR.map((c, i) => <span key={i} className={`w-3 h-3 rounded-sm ${c}`} />)}
                    <span>More happy</span>
                  </div>
                  <span>{stats.totalWords.toLocaleString()} words written · {stats.uniqueTags} tags</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 mb-5 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, body, or #tag…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          onClick={() => setRevealSecrets((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Toggle secret previews"
        >
          {revealSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {revealSecrets ? "Hide secrets" : "Show secrets"}
        </button>
        {hasPin(userId) ? (
          <>
            <button onClick={lockNow} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <Lock className="w-4 h-4" /> Lock
            </button>
            <button onClick={removePin} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
              <KeyRound className="w-4 h-4" /> Remove PIN
            </button>
          </>
        ) : (
          <button onClick={() => setShowSetPin(true)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <KeyRound className="w-4 h-4" /> Set PIN
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(o => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {exportMenuOpen && (
            <div
              onMouseLeave={() => setExportMenuOpen(false)}
              className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-30"
            >
              <button
                onClick={() => { exportEntries(userId); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FileText className="w-4 h-4 text-indigo-500" /> Markdown (.md)
              </button>
              <button
                onClick={() => { exportEntriesJSON(userId); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800"
              >
                <FileJson className="w-4 h-4 text-emerald-500" /> JSON (.json)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Chip active={filterType === "all"} onClick={() => setFilterType("all")}>All ({entries.length})</Chip>
        {TYPES.map((t) => {
          const meta = TYPE_META[t];
          const count = entries.filter((e) => e.type === t).length;
          return (
            <Chip key={t} active={filterType === t} onClick={() => setFilterType(t)}>
              <span className="mr-1">{meta.emoji}</span>{meta.label} ({count})
            </Chip>
          );
        })}
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tags</span>
          {allTags.slice(0, 16).map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                filterTag === tag
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Hash className="w-3 h-3 opacity-70" />{tag}
              <span className="opacity-60">({count})</span>
            </button>
          ))}
          {filterTag && (
            <button
              onClick={() => setFilterTag(null)}
              className="text-xs text-slate-400 hover:text-rose-500 underline"
            >
              clear tag
            </button>
          )}
        </div>
      )}

      {/* Entries grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {entries.length === 0 ? "No entries yet. Tap " : "No entries match this search."}
            {entries.length === 0 && <strong>New Entry</strong>}{entries.length === 0 && " to start."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const meta = TYPE_META[e.type];
            const hidden = e.isSecret && !revealSecrets;
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                  e.pinned ? "border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-900" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${meta.color}`} />
                {e.pinned && (
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-md">
                    <Pin className="w-3 h-3" /> Pinned
                  </div>
                )}
                {!hidden && e.photo && (
                  <div className="relative">
                    <img src={e.photo} alt="" loading="lazy" className="w-full h-32 object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <span>{meta.emoji}</span> {meta.label}
                    </span>
                    <span>{MOOD_EMOJIS[e.mood - 1]} · {new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900 dark:text-white truncate">
                    {hidden ? "🔒 Hidden secret" : (search ? highlight(e.title || "(untitled)", search) : (e.title || "(untitled)"))}
                  </h3>
                  <p className={`mt-1 text-sm text-slate-600 dark:text-slate-300 ${hidden ? "blur-sm select-none" : ""} line-clamp-3 whitespace-pre-wrap`}>
                    {hidden ? (e.body || "(no content)") : (search ? highlight(e.body || "(no content)", search) : (e.body || "(no content)"))}
                  </p>
                  {!hidden && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" /> {readingTimeMin(e.body)} min read
                      {e.photo && <span className="inline-flex items-center gap-0.5"><ImageIcon className="w-3 h-3" /> photo</span>}
                    </div>
                  )}
                  {!hidden && (e.tags?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.tags!.slice(0, 5).map(t => (
                        <button
                          key={t}
                          onClick={() => setFilterTag(t)}
                          className="text-[10px] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100"
                        >
                          <Hash className="w-2.5 h-2.5" />{t}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { togglePin(userId, e.id); refresh(); }}
                      className={`p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 ${e.pinned ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
                      title={e.pinned ? "Unpin" : "Pin to top"}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditing(e); setEditorOpen(true); }}
                      className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-primary/10"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this entry? This can't be undone.")) {
                          deleteEntry(userId, e.id);
                          refresh();
                        }
                      }}
                      className="p-1.5 rounded-md text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      <EntryEditor
        userId={userId}
        open={editorOpen}
        entry={editing}
        onClose={() => setEditorOpen(false)}
        onSave={(data) => {
          saveEntry(userId, data);
          onAfterSave();
        }}
      />

      {/* AI Reflection modal */}
      <ReflectionModal
        open={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
        entries={entries}
      />

      {/* Set-PIN modal */}
      <AnimatePresence>
        {showSetPin && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSetPin(false)}
          >
            <motion.div
              initial={{ y: 8, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Set a 4-digit PIN</h3>
              <p className="mt-1 text-xs text-slate-500">Stored hashed on this device only. If you forget it, you can clear it (your entries stay).</p>
              <div className="mt-4 space-y-3">
                <input
                  inputMode="numeric" maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="New PIN"
                  className="w-full text-center tracking-[0.6em] font-mono text-xl py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  inputMode="numeric" maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Confirm PIN"
                  className="w-full text-center tracking-[0.6em] font-mono text-xl py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mt-5 flex gap-2 justify-end">
                <button onClick={() => setShowSetPin(false)} className="px-3 py-1.5 text-sm rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button onClick={submitNewPin} className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90">Save PIN</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-3 py-3 text-white">
      <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">{label}</div>
      <div className="mt-0.5 text-2xl font-extrabold leading-none">{value}</div>
      {hint && <div className="text-[10px] text-white/70 mt-1">{hint}</div>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
        active
          ? "bg-primary text-white border-primary shadow-sm"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function MoodHeatmap({ moodByDate }: { moodByDate: Record<string, number> }) {
  const days: { key: string; mood?: number; label: string }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      mood: moodByDate[key],
      label: `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${moodByDate[key] ? ` · ${MOOD_EMOJIS[moodByDate[key]! - 1]}` : ""}`,
    });
  }
  return (
    <div className="mt-4 grid grid-rows-7 grid-flow-col auto-cols-min gap-[3px] overflow-x-auto pb-1">
      {days.map(d => (
        <div
          key={d.key}
          title={d.label}
          className={`w-3 h-3 rounded-[3px] ${d.mood ? MOOD_COLOR[d.mood - 1] : "bg-slate-100 dark:bg-slate-800"}`}
        />
      ))}
    </div>
  );
}

// ─── Editor with autosave drafts, tags, pin, and markdown preview ──────────
function EntryEditor({
  userId, open, entry, onClose, onSave,
}: {
  userId: string;
  open: boolean;
  entry: DiaryEntry | null;
  onClose: () => void;
  onSave: (data: Omit<DiaryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
}) {
  const [type, setType] = useState<DiaryType>("thought");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState(3);
  const [isSecret, setIsSecret] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewMd, setPreviewMd] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [listening, setListening] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"" | "saving" | "saved">("");
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recogRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Init when opened
  useEffect(() => {
    if (!open) return;
    if (entry) {
      setType(entry.type); setTitle(entry.title); setBody(entry.body);
      setMood(entry.mood); setIsSecret(entry.isSecret);
      setPinned(!!entry.pinned); setTags(entry.tags || []); setPhoto(entry.photo);
    } else {
      // Try to restore unsent draft
      const d = loadDraft(userId);
      if (d && !d.editingId) {
        setType(d.type); setTitle(d.title); setBody(d.body);
        setMood(d.mood); setIsSecret(d.isSecret);
        setPinned(false); setTags(d.tags || []); setPhoto(undefined);
        setDraftStatus("saved");
      } else {
        setType("thought"); setTitle(""); setBody("");
        setMood(3); setIsSecret(false); setPinned(false); setTags([]); setPhoto(undefined);
        setDraftStatus("");
      }
    }
    setTagInput(""); setPreviewMd(false); setListening(false);
  }, [open, entry, userId]);

  // Stop dictation when modal closes — and always on unmount.
  useEffect(() => {
    if (!open && recogRef.current) {
      try { recogRef.current.stop(); } catch {}
      recogRef.current = null;
      setListening(false);
    }
    return () => {
      if (recogRef.current) {
        try { recogRef.current.onresult = null; } catch {}
        try { recogRef.current.onend = null; } catch {}
        try { recogRef.current.onerror = null; } catch {}
        try { recogRef.current.stop(); } catch {}
        recogRef.current = null;
      }
    };
  }, [open]);

  const toggleDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Voice input not supported", description: "Try Chrome or Edge for dictation.", variant: "destructive" });
      return;
    }
    if (listening && recogRef.current) {
      try { recogRef.current.stop(); } catch {}
      return;
    }
    const r = new SR();
    r.continuous = true; r.interimResults = false; r.lang = navigator.language || "en-US";
    r.onresult = (ev: any) => {
      let chunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) chunk += ev.results[i][0].transcript;
      }
      if (chunk) setBody(b => (b ? `${b}${b.endsWith(" ") || b.endsWith("\n") ? "" : " "}${chunk.trim()}` : chunk.trim()));
    };
    r.onend = () => { setListening(false); recogRef.current = null; };
    r.onerror = () => { setListening(false); recogRef.current = null; };
    try { r.start(); recogRef.current = r; setListening(true); }
    catch { toast({ title: "Couldn't start mic", variant: "destructive" }); }
  };

  const onPickPhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please pick an image file", variant: "destructive" }); return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose a photo under 4 MB.", variant: "destructive" }); return;
    }
    // Down-scale via canvas to keep localStorage manageable.
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { setPhoto(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => setPhoto(reader.result as string);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Listen for "write to today's prompt" prefill
  useEffect(() => {
    if (!open) return;
    const onPrefill = (e: Event) => {
      const det = (e as CustomEvent).detail || {};
      if (det.body) setBody(b => (b ? b : det.body));
    };
    window.addEventListener("peaceboard-diary-prefill", onPrefill);
    return () => window.removeEventListener("peaceboard-diary-prefill", onPrefill);
  }, [open]);

  // Autosave draft (only for new entries — existing edits already in store)
  useEffect(() => {
    if (!open || entry) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    if (!body.trim() && !title.trim() && tags.length === 0) {
      setDraftStatus("");
      return;
    }
    setDraftStatus("saving");
    draftTimer.current = setTimeout(() => {
      saveDraft(userId, {
        type, title, body, mood, isSecret, tags,
        savedAt: Date.now(),
      });
      setDraftStatus("saved");
    }, 700);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [open, entry, userId, type, title, body, mood, isSecret, tags]);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) { setTagInput(""); return; }
    if (tags.length >= 12) return;
    setTags([...tags, t]); setTagInput("");
  };

  const submit = () => {
    if (!body.trim() && !title.trim() && !photo) { onClose(); return; }
    onSave({
      id: entry?.id, type,
      title: title.trim(), body: body.trim(),
      mood, isSecret: isSecret || type === "secret",
      pinned, tags, photo,
    });
  };

  const charCount = body.length;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {entry ? "Edit Entry" : "New Entry"}
                </h3>
                {!entry && draftStatus && (
                  <span className="text-[11px] inline-flex items-center gap-1 text-slate-400">
                    {draftStatus === "saving" ? "saving…" : <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> draft saved</>}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Type selector */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Type</h4>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => {
                    const meta = TYPE_META[t];
                    const active = t === type;
                    return (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs border-2 transition-all ${
                          active
                            ? `bg-gradient-to-r ${meta.color} text-white border-transparent shadow`
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <span className="mr-1">{meta.emoji}</span>{meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Title</h4>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A short title (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Body with markdown preview toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">What's on your mind?</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{wordCount} words · {charCount} chars · {readingTimeMin(body)} min read</span>
                    <button
                      onClick={toggleDictation}
                      title={listening ? "Stop dictation" : "Dictate with your voice"}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                        listening
                          ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      {listening ? "Listening…" : "Voice"}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach a photo"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ImageIcon className="w-3 h-3" /> Photo
                    </button>
                    <input
                      ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPickPhoto(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => setPreviewMd(p => !p)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${previewMd ? "bg-primary text-white border-primary" : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    >
                      <Eye className="w-3 h-3" /> {previewMd ? "Editing" : "Preview"}
                    </button>
                  </div>
                </div>
                {previewMd ? (
                  <div
                    className="min-h-[14rem] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderTinyMarkdown(body || "_(nothing to preview)_") }}
                  />
                ) : (
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={9}
                    placeholder="Write freely. Nothing here leaves your device. (Tip: **bold**, *italic*, lists, > quotes work.)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                  />
                )}
              </div>

              {/* Photo preview */}
              {photo && (
                <div className="relative inline-block group">
                  <img src={photo} alt="Attached" className="rounded-lg max-h-48 border border-slate-200 dark:border-slate-700" />
                  <button
                    onClick={() => setPhoto(undefined)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-90 hover:bg-rose-500"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Tags */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tags <span className="font-normal opacity-60">(up to 12, comma or enter to add)</span></h4>
                <div className="flex flex-wrap gap-1.5 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 text-xs">
                      <Hash className="w-3 h-3" />{t}
                      <button onClick={() => setTags(tags.filter(x => x !== t))} className="ml-0.5 text-indigo-400 hover:text-rose-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.includes(",")) v.split(",").forEach(addTag);
                      else setTagInput(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addTag(tagInput); }
                      else if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
                    }}
                    placeholder={tags.length === 0 ? "e.g. school, mom, calm" : ""}
                    className="flex-1 min-w-[120px] bg-transparent text-sm outline-none px-1"
                  />
                </div>
              </div>

              {/* Mood */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">How are you feeling?</h4>
                <div className="flex justify-between gap-2">
                  {MOOD_EMOJIS.map((emoji, i) => {
                    const v = i + 1;
                    return (
                      <button
                        key={v}
                        onClick={() => setMood(v)}
                        className={`flex-1 py-2 rounded-lg text-2xl transition-all ${
                          mood === v ? "bg-primary/15 ring-2 ring-primary/60 scale-105" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pin + Secret toggles */}
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Pin className={`w-4 h-4 ${pinned ? "text-amber-500" : "text-slate-400"}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">Pin to top</div>
                      <div className="text-xs text-slate-500">Keep this entry visible above the rest.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox" checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="w-5 h-5 accent-amber-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Hide preview</div>
                    <div className="text-xs text-slate-500">Card is blurred until "Show secrets" is on.</div>
                  </div>
                  <input
                    type="checkbox" checked={isSecret}
                    onChange={(e) => setIsSecret(e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                </label>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center gap-2">
              <div className="text-[11px] text-slate-400 hidden sm:block">
                <Tag className="w-3 h-3 inline mr-1" />Tip: Press <kbd className="px-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">Enter</kbd> in the tag box to add.
              </div>
              <div className="flex gap-2">
                {!entry && (
                  <button
                    onClick={() => { clearDraft(userId); setBody(""); setTitle(""); setTags([]); setDraftStatus(""); }}
                    className="px-3 py-1.5 text-sm rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Discard the saved draft"
                  >
                    Clear draft
                  </button>
                )}
                <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button onClick={submit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90">
                  <Save className="w-4 h-4" /> Save Entry
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AI Reflection modal ───────────────────────────────────────────────────
function ReflectionModal({
  open, onClose, entries,
}: { open: boolean; onClose: () => void; entries: DiaryEntry[] }) {
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState("");

  const [consented, setConsented] = useState(false);
  // Reset on open and require explicit consent every time.
  useEffect(() => {
    if (open) { setConsented(false); setReflection(""); setError(""); setLoading(false); }
  }, [open]);

  const startReflection = () => {
    const weekAgo = Date.now() - 7 * 86400_000;
    const recent = entries
      .filter(e => e.createdAt >= weekAgo && !e.isSecret && e.type !== "secret")
      .slice(0, 14);
    if (recent.length === 0) {
      setError("No non-private entries from the last 7 days yet. Write a few and come back.");
      return;
    }
    const summary = recent.map(e => {
      const d = new Date(e.createdAt).toLocaleDateString();
      const tags = (e.tags || []).map(t => `#${t}`).join(" ");
      const body = (e.body || "").slice(0, 400);
      return `[${d} · ${TYPE_META[e.type].label} · mood ${MOOD_EMOJIS[e.mood-1]}]${tags ? ` ${tags}` : ""}\n${body}`;
    }).join("\n\n---\n\n");

    setConsented(true); setLoading(true); setError("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: ctrl.signal,
      body: JSON.stringify({
        message:
`You are a gentle, kind reflection coach for a young person's private journal. Read the past week of entries below and respond in 4 short sections:

1) Themes I noticed (2–4 bullet points)
2) Feelings showing up (with emojis)
3) Something to celebrate
4) A gentle question to sit with this week

Be warm, specific to what they wrote, never preachy or clinical. Maximum 220 words. Use markdown.

Entries:
${summary}`,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (ctrl.signal.aborted) return;
        setReflection(typeof d?.message === "string" ? d.message : (d?.response || d?.reply || "I couldn't put words to it just now — try again in a bit."));
      })
      .catch((err) => { if (err?.name !== "AbortError") setError("Couldn't reach the reflection helper. Please try again."); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
  };

  const abortRef = useRef<AbortController | null>(null);
  // Cancel in-flight request when the modal closes / unmounts.
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    return () => { abortRef.current?.abort(); };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="p-5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Reflection on your week</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-md hover:bg-white/20"><X className="w-4 h-4" /></button>
              </div>
              <p className="mt-1 text-xs text-white/80">A gentle, AI-assisted look at your last 7 days.</p>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {!consented && !loading && !reflection && !error && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-100">
                    <strong>Heads up — this one feature isn't local.</strong>
                    <p className="mt-1 text-xs leading-relaxed">
                      To create a reflection, a snippet of your last 7 days of non-secret entries (titles, bodies, moods, tags) is sent to the AI service that powers PeaceBoard. Entries marked as <em>Secret</em> or with the "Hide preview" toggle are never sent. You can skip this feature at any time.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">No thanks</button>
                    <button onClick={startReflection} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90">
                      <Wand2 className="w-3.5 h-3.5" /> I understand — reflect on my week
                    </button>
                  </div>
                </div>
              )}
              {loading && (
                <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Reading your week with care…
                </div>
              )}
              {error && !loading && (
                <p className="text-sm text-rose-500 text-center py-6">{error}</p>
              )}
              {reflection && !loading && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: renderTinyMarkdown(reflection) }}
                />
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
              <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Beautiful signed-out landing page ─────────────────────────────────────
function DiaryLanding() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const tryAsGuest = async () => {
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/auth/guest", {
        firstName: "Friend", lastName: "", sessionDuration: 24 * 60,
      });
      const data = await res.json();
      const u = data?.user || data;
      if (u?.id) {
        login(u);
        toast({ title: "Welcome 💜", description: "Your diary is ready. Entries stay on this device." });
      } else {
        throw new Error("No user");
      }
    } catch {
      toast({ title: "Couldn't start guest session", description: "Please try Sign in instead.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const features: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; tone: string }[] = [
    { icon: ShieldCheck, title: "Private to your device",  body: "Entries live only in this browser. Add an optional 4-digit PIN for a quick lock.", tone: "from-emerald-400 to-teal-500" },
    { icon: Sparkles,    title: "Daily writing prompt",   body: "A gentle question every day — or write completely freely whenever you like.", tone: "from-fuchsia-400 to-pink-500" },
    { icon: Heart,       title: "Mood timeline",          body: "See how you've felt across the last 90 days at a glance with a beautiful heatmap.", tone: "from-rose-400 to-orange-400" },
    { icon: Mic,         title: "Voice & photos",         body: "Dictate your entry hands-free, or attach a photo to remember the moment.", tone: "from-sky-400 to-indigo-500" },
    { icon: Wand2,       title: "Weekly reflection",      body: "Get a kind, AI-assisted summary of your week to notice themes and small wins.", tone: "from-violet-400 to-purple-500" },
    { icon: Download,    title: "Yours to take with you", body: "Export anytime as Markdown or JSON — your words always belong to you.", tone: "from-amber-400 to-orange-500" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl p-8 sm:p-12"
      >
        <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/15 border border-white/25 rounded-full px-2.5 py-1">
              <BookOpen className="w-3 h-3" /> Your private diary
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-tight">
              A quiet place for your words.
            </h1>
            <p className="mt-3 text-white/85 text-base sm:text-lg max-w-md">
              Capture how you feel, what you're grateful for, dreams, secrets — anything. Stays on your device, with optional PIN lock and gentle daily prompts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={tryAsGuest} disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:bg-white/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Start writing as guest
              </button>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 border border-white/30 font-semibold hover:bg-white/25"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-4 text-xs text-white/70 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Entries stored on this device · optional AI reflection is opt-in
            </div>
          </div>

          {/* Mock entry card preview */}
          <div className="relative">
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-5 rotate-[1.5deg] max-w-sm mx-auto">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">💖 Feeling</span>
                <span>😄 · Today</span>
              </div>
              <h3 className="mt-2 font-bold">A small win</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Helped someone find a seat on the bus. Their smile stuck with me all day. Going to keep noticing little kindnesses like this.
              </p>
              <div className="mt-2 flex gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">#kindness</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">#bus</span>
              </div>
            </div>
            <div className="hidden sm:block absolute -bottom-6 -left-4 bg-white text-slate-900 rounded-2xl shadow-2xl p-4 -rotate-[3deg] max-w-[200px]">
              <div className="text-xs text-slate-500 font-medium">🙏 Gratitude</div>
              <p className="mt-1 text-sm">Mom's soup. Always.</p>
              <div className="mt-1 text-[10px] text-slate-400">😊 · 2 days ago</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feature grid */}
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.tone} text-white flex items-center justify-center shadow`}>
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{f.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily-prompt teaser */}
      <div className="mt-8 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
        <Quote className="w-5 h-5 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Today's prompt</div>
          <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium">{getDailyPrompt()}</p>
          <button
            onClick={tryAsGuest} disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
            Start writing
          </button>
        </div>
      </div>

      {/* Footer privacy strip */}
      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account? <Link href="/login" className="underline hover:text-primary">Sign in</Link> to access your existing diary on this device.
      </div>
    </div>
  );
}

// Tiny markdown renderer — supports bold, italic, inline code, headings,
// blockquotes, unordered lists, and paragraphs. Escapes HTML first to keep
// the diary safe even though it never leaves the device.
function renderTinyMarkdown(src: string): string {
  const esc = (s: string) => s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc(src).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw;
    if (/^\s*$/.test(line)) { closeList(); out.push(""); continue; }
    if (/^#{1,3}\s+/.test(line)) {
      closeList();
      const m = line.match(/^(#{1,3})\s+(.*)$/)!;
      const lvl = m[1].length;
      out.push(`<h${lvl + 2} class="font-bold mt-3 mb-1">${inline(m[2])}</h${lvl + 2}>`);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote class="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-slate-500">${inline(line.replace(/^\s*>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push(`<ul class="list-disc pl-5 my-1">`); inList = true; }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");

  function inline(s: string) {
    return s
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[0.85em]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  }
}
