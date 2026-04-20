import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Lock, Unlock, Plus, Search, Trash2, Pencil, Eye, EyeOff,
  Download, KeyRound, X, BookOpen, Save,
} from "lucide-react";
import {
  DiaryEntry, DiaryType, TYPE_META, MOOD_EMOJIS,
  listEntries, saveEntry, deleteEntry, exportEntries,
  hasPin, setPin, clearPin, verifyPin, isUnlocked, lock,
} from "@/lib/diaryStore";

const TYPES: DiaryType[] = ["thought","feeling","gratitude","dream","secret","goal","memory"];

export default function DiaryPage() {
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
  const [revealSecrets, setRevealSecrets] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);

  // Init unlock state
  useEffect(() => {
    if (!userId) return;
    setUnlocked(isUnlocked(userId));
  }, [userId]);

  // Load entries when unlocked
  useEffect(() => {
    if (userId && unlocked) {
      setEntries(listEntries(userId));
    }
  }, [userId, unlocked]);

  const refresh = () => setEntries(listEntries(userId));

  const tryUnlock = async () => {
    setPinError("");
    const ok = await verifyPin(userId, pinInput);
    if (ok) {
      setUnlocked(true);
      setPinInput("");
    } else {
      setPinError("Wrong PIN. Try again.");
    }
  };

  const submitNewPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ title: "PIN must be 4 digits", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "PINs don't match", variant: "destructive" });
      return;
    }
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

  const lockNow = () => {
    lock(userId);
    setUnlocked(false);
  };

  const filtered = useMemo(() => {
    let list = entries;
    if (filterType !== "all") list = list.filter((e) => e.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, filterType, search]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <BookOpen className="w-14 h-14 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Diary</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Sign in to write private journal entries — locked, encrypted to your device, just for you.
        </p>
      </div>
    );
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
              autoFocus
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              className="w-44 text-center tracking-[0.6em] text-2xl font-mono py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••"
            />
          </div>
          {pinError && <p className="mt-3 text-sm text-red-500">{pinError}</p>}
          <button
            onClick={tryUnlock}
            className="mt-5 w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90"
          >
            Unlock
          </button>
          <button
            onClick={() => {
              if (confirm("Forgot your PIN? You can remove it (this keeps your entries) and set a new one.")) {
                clearPin(userId);
                setUnlocked(true);
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

  // ── Main diary screen ──────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">My Diary</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
            A private space, only on this device. {hasPin(userId) ? "🔒 PIN-protected" : "🔓 No PIN — anyone on this device can read it."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setEditing(null); setEditorOpen(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Entry
          </button>
          {hasPin(userId) ? (
            <>
              <button onClick={lockNow} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <Lock className="w-4 h-4" /> Lock
              </button>
              <button onClick={removePin} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                <KeyRound className="w-4 h-4" /> Remove PIN
              </button>
            </>
          ) : (
            <button onClick={() => setShowSetPin(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <KeyRound className="w-4 h-4" /> Set PIN
            </button>
          )}
          <button onClick={() => exportEntries(userId)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          onClick={() => setRevealSecrets((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Toggle secret previews"
        >
          {revealSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {revealSecrets ? "Hide secrets" : "Show secrets"}
        </button>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* Entries grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{entries.length === 0 ? "No entries yet. Tap **New Entry** to start." : "No entries match this search."}</p>
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
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`h-1.5 bg-gradient-to-r ${meta.color}`} />
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <span>{meta.emoji}</span> {meta.label}
                    </span>
                    <span>{MOOD_EMOJIS[e.mood - 1]} · {new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900 dark:text-white truncate">
                    {hidden ? "🔒 Hidden secret" : e.title || "(untitled)"}
                  </h3>
                  <p className={`mt-1 text-sm text-slate-600 dark:text-slate-300 ${hidden ? "blur-sm select-none" : ""} line-clamp-3 whitespace-pre-wrap`}>
                    {e.body || "(no content)"}
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
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
        open={editorOpen}
        entry={editing}
        onClose={() => setEditorOpen(false)}
        onSave={(data) => {
          saveEntry(userId, data);
          refresh();
          setEditorOpen(false);
        }}
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

function EntryEditor({
  open, entry, onClose, onSave,
}: {
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

  useEffect(() => {
    if (open) {
      setType(entry?.type || "thought");
      setTitle(entry?.title || "");
      setBody(entry?.body || "");
      setMood(entry?.mood || 3);
      setIsSecret(entry?.isSecret ?? false);
    }
  }, [open, entry]);

  const submit = () => {
    if (!body.trim() && !title.trim()) {
      onClose();
      return;
    }
    onSave({
      id: entry?.id,
      type, title: title.trim(), body: body.trim(),
      mood, isSecret: isSecret || type === "secret",
    });
  };

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
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {entry ? "Edit Entry" : "New Entry"}
              </h3>
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

              {/* Body */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">What's on your mind?</h4>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={9}
                  placeholder="Write freely. Nothing here leaves your device."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
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

              {/* Secret toggle */}
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">Hide preview</div>
                  <div className="text-xs text-slate-500">The card will be blurred until you tap "Show secrets".</div>
                </div>
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </label>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={submit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90">
                <Save className="w-4 h-4" /> Save Entry
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
