// Local-only private diary storage. All entries live in localStorage,
// scoped per user, in plaintext on this device. The optional 4-digit PIN
// only gates the diary UI (its hash is stored locally) — it does NOT
// encrypt the underlying entries. Anyone with access to this browser
// profile / DevTools could read the raw payload.

export type DiaryType = "thought" | "feeling" | "gratitude" | "dream" | "secret" | "goal" | "memory";

export interface DiaryEntry {
  id: string;
  type: DiaryType;
  title: string;
  body: string;
  mood: number; // 1-5
  isSecret: boolean; // hide preview on locked screen
  pinned?: boolean;
  tags?: string[];
  photo?: string; // optional data-URL image attachment
  createdAt: number;
  updatedAt: number;
}

export interface DiaryStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  avgMood: number; // 1..5
  topMoodEmoji: string;
  topType?: DiaryType;
  longestStreak: number; // consecutive writing days
  currentStreak: number;
  totalWords: number;
  uniqueTags: number;
}

const entriesKey = (uid: string) => `peaceboard_diary_${uid}`;
const pinKey = (uid: string) => `peaceboard_diary_pin_${uid}`;
const sessionKey = (uid: string) => `peaceboard_diary_session_${uid}`;

export const TYPE_META: Record<DiaryType, { label: string; emoji: string; color: string }> = {
  thought:   { label: "Thought",   emoji: "💭", color: "from-blue-400 to-indigo-500" },
  feeling:   { label: "Feeling",   emoji: "💖", color: "from-rose-400 to-pink-500" },
  gratitude: { label: "Gratitude", emoji: "🙏", color: "from-amber-400 to-orange-500" },
  dream:     { label: "Dream",     emoji: "🌙", color: "from-violet-400 to-purple-600" },
  secret:    { label: "Secret",    emoji: "🤫", color: "from-slate-500 to-slate-700" },
  goal:      { label: "Goal",      emoji: "🎯", color: "from-emerald-400 to-teal-500" },
  memory:    { label: "Memory",    emoji: "📸", color: "from-cyan-400 to-blue-500" },
};

export const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Entries CRUD ─────────────────────────────────────────────────────────────
export function listEntries(userId: string): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(entriesKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveEntry(userId: string, entry: Omit<DiaryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }): DiaryEntry {
  const all = listEntries(userId);
  const now = Date.now();
  const cleanTags = Array.isArray(entry.tags)
    ? Array.from(new Set(entry.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))).slice(0, 12)
    : [];
  if (entry.id) {
    const i = all.findIndex((e) => e.id === entry.id);
    if (i >= 0) {
      const updated: DiaryEntry = {
        ...all[i],
        ...entry,
        tags: cleanTags,
        pinned: entry.pinned ?? all[i].pinned ?? false,
        id: all[i].id,
        updatedAt: now,
      } as DiaryEntry;
      all[i] = updated;
      localStorage.setItem(entriesKey(userId), JSON.stringify(all));
      return updated;
    }
  }
  const created: DiaryEntry = {
    id: uid(),
    type: entry.type,
    title: entry.title,
    body: entry.body,
    mood: entry.mood,
    isSecret: entry.isSecret,
    pinned: entry.pinned ?? false,
    tags: cleanTags,
    photo: entry.photo,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(entriesKey(userId), JSON.stringify([created, ...all]));
  return created;
}

export function deleteEntry(userId: string, id: string) {
  const all = listEntries(userId).filter((e) => e.id !== id);
  localStorage.setItem(entriesKey(userId), JSON.stringify(all));
}

export function togglePin(userId: string, id: string) {
  const all = listEntries(userId);
  const i = all.findIndex(e => e.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], pinned: !all[i].pinned, updatedAt: Date.now() };
  localStorage.setItem(entriesKey(userId), JSON.stringify(all));
}

// ─── Stats / analytics ────────────────────────────────────────────────────────
export function getDiaryStats(userId: string): DiaryStats {
  const all = listEntries(userId);
  if (all.length === 0) {
    return {
      total: 0, thisWeek: 0, thisMonth: 0, avgMood: 0,
      topMoodEmoji: "—", longestStreak: 0, currentStreak: 0, totalWords: 0, uniqueTags: 0,
    };
  }
  const now = Date.now();
  const week = 7 * 86400_000, month = 30 * 86400_000;
  const moods = all.map(e => e.mood);
  const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
  const moodHist: Record<number, number> = {};
  moods.forEach(m => { moodHist[m] = (moodHist[m] || 0) + 1; });
  const topMood = Number(Object.entries(moodHist).sort((a, b) => b[1] - a[1])[0]?.[0] || 3);

  const typeHist: Record<string, number> = {};
  all.forEach(e => { typeHist[e.type] = (typeHist[e.type] || 0) + 1; });
  const topType = Object.entries(typeHist).sort((a, b) => b[1] - a[1])[0]?.[0] as DiaryType | undefined;

  const days = new Set(all.map(e => new Date(e.createdAt).toISOString().slice(0, 10)));
  const sortedDays = Array.from(days).sort();
  let longest = 0, run = 0, prev: number | null = null;
  for (const d of sortedDays) {
    const t = new Date(d).getTime();
    if (prev !== null && t - prev === 86400_000) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = t;
  }
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  let current = 0;
  let cursor = days.has(today) ? new Date() : days.has(yesterday) ? new Date(Date.now() - 86400_000) : null;
  while (cursor) {
    const k = cursor.toISOString().slice(0, 10);
    if (days.has(k)) { current++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }

  const totalWords = all.reduce((sum, e) => sum + (e.body || "").split(/\s+/).filter(Boolean).length, 0);
  const uniqueTags = new Set(all.flatMap(e => e.tags || [])).size;

  return {
    total: all.length,
    thisWeek: all.filter(e => now - e.createdAt < week).length,
    thisMonth: all.filter(e => now - e.createdAt < month).length,
    avgMood,
    topMoodEmoji: MOOD_EMOJIS[topMood - 1] || "😐",
    topType,
    longestStreak: longest,
    currentStreak: current,
    totalWords,
    uniqueTags,
  };
}

// Date-keyed mood map for the calendar heatmap. Keys are YYYY-MM-DD,
// values are 1..5 (most recent entry of the day "wins").
export function getMoodByDate(userId: string): Record<string, number> {
  const all = listEntries(userId).slice().sort((a, b) => a.createdAt - b.createdAt);
  const out: Record<string, number> = {};
  for (const e of all) {
    const k = new Date(e.createdAt).toISOString().slice(0, 10);
    out[k] = e.mood;
  }
  return out;
}

// Past entries that share today's calendar day (MM-DD) — "On This Day" memories.
// Returns at most 6, newest-first, excluding any entries from today itself.
export function getOnThisDay(userId: string): DiaryEntry[] {
  const all = listEntries(userId);
  const now = new Date();
  const mm = now.getMonth(), dd = now.getDate();
  const todayKey = now.toISOString().slice(0, 10);
  return all
    .filter(e => {
      const d = new Date(e.createdAt);
      if (d.toISOString().slice(0, 10) === todayKey) return false;
      return d.getMonth() === mm && d.getDate() === dd;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);
}

// Estimated reading time in minutes (~200 wpm), minimum 1.
export function readingTimeMin(text: string): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function listAllTags(userId: string): { tag: string; count: number }[] {
  const all = listEntries(userId);
  const map = new Map<string, number>();
  all.forEach(e => (e.tags || []).forEach(t => map.set(t, (map.get(t) || 0) + 1)));
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// Deterministic daily writing prompt — same for everyone on the same date,
// rotates through a curated list.
const PROMPTS = [
  "What is one small thing that made today a little brighter?",
  "Write a thank-you note to someone — even if you'll never send it.",
  "Describe the version of yourself you're becoming.",
  "What's a worry you can put down for tonight?",
  "List three things you noticed with your senses today.",
  "If today had a soundtrack, what song would open it?",
  "What did kindness look like today — given or received?",
  "Where did you feel most yourself this week?",
  "What's a small win worth celebrating?",
  "Finish the sentence: I'm proud of myself for…",
  "What would you tell a friend who feels exactly how you feel right now?",
  "What's something you're ready to forgive yourself for?",
  "Describe a tiny moment of beauty from the last 24 hours.",
  "What's one boundary you'd like to honor tomorrow?",
  "Write about a feeling you usually push away.",
  "What did your body try to tell you today?",
  "Who in your life deserves more thanks than you give them?",
  "What would 'enough' look like, just for today?",
  "Describe a place that always feels safe to you.",
  "What hopes are quietly growing in you right now?",
  "What did you learn this week that future-you should remember?",
  "If you could whisper one thing to your past self, what would it be?",
];
export function getDailyPrompt(): string {
  const d = new Date();
  const idx = (d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate()) % PROMPTS.length;
  return PROMPTS[idx];
}

// ─── Drafts (autosave) ────────────────────────────────────────────────────────
const draftKey = (uid: string) => `peaceboard_diary_draft_${uid}`;
export interface DiaryDraft {
  type: DiaryType;
  title: string;
  body: string;
  mood: number;
  isSecret: boolean;
  tags: string[];
  editingId?: string;
  savedAt: number;
}
export function saveDraft(userId: string, d: DiaryDraft) {
  try { localStorage.setItem(draftKey(userId), JSON.stringify(d)); } catch {}
}
export function loadDraft(userId: string): DiaryDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === "object" ? (d as DiaryDraft) : null;
  } catch { return null; }
}
export function clearDraft(userId: string) {
  try { localStorage.removeItem(draftKey(userId)); } catch {}
}

export function exportEntries(userId: string) {
  const all = listEntries(userId);
  const lines = all.map((e) => {
    const t = TYPE_META[e.type];
    const tags = (e.tags || []).map(x => `#${x}`).join(" ");
    return [
      `# ${t.emoji} ${e.title || "(untitled)"}`,
      `_${t.label} · ${MOOD_EMOJIS[e.mood - 1]} · ${new Date(e.createdAt).toLocaleString()}${tags ? `  ·  ${tags}` : ""}${e.pinned ? "  ·  📌 pinned" : ""}_`,
      "",
      e.body,
      "",
      "---",
      "",
    ].join("\n");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `my-diary-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEntriesJSON(userId: string) {
  const all = listEntries(userId);
  const payload = {
    app: "PeaceBoard",
    kind: "diary-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    count: all.length,
    entries: all,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `my-diary-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PIN (hashed) ─────────────────────────────────────────────────────────────
async function hashPin(pin: string, salt: string) {
  const enc = new TextEncoder().encode(`${salt}:${pin}`);
  if (window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (very weak — only used if subtle crypto unavailable)
  let h = 0;
  for (let i = 0; i < enc.length; i++) h = (h * 31 + enc[i]) | 0;
  return String(h);
}

export function hasPin(userId: string): boolean {
  try { return !!localStorage.getItem(pinKey(userId)); } catch { return false; }
}

export async function setPin(userId: string, pin: string) {
  const salt = userId;
  const h = await hashPin(pin, salt);
  localStorage.setItem(pinKey(userId), h);
  sessionStorage.setItem(sessionKey(userId), "1");
}

export function clearPin(userId: string) {
  localStorage.removeItem(pinKey(userId));
  sessionStorage.removeItem(sessionKey(userId));
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const h = await hashPin(pin, userId);
  const stored = localStorage.getItem(pinKey(userId));
  const ok = !!stored && stored === h;
  if (ok) sessionStorage.setItem(sessionKey(userId), "1");
  return ok;
}

export function isUnlocked(userId: string): boolean {
  if (!hasPin(userId)) return true;
  return sessionStorage.getItem(sessionKey(userId)) === "1";
}

export function lock(userId: string) {
  sessionStorage.removeItem(sessionKey(userId));
}
