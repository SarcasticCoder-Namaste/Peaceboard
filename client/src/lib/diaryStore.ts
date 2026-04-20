// Local-only private diary storage. All entries live in localStorage,
// scoped per user. Optional 4-digit PIN protects access (hashed).

export type DiaryType = "thought" | "feeling" | "gratitude" | "dream" | "secret" | "goal" | "memory";

export interface DiaryEntry {
  id: string;
  type: DiaryType;
  title: string;
  body: string;
  mood: number; // 1-5
  isSecret: boolean; // hide preview on locked screen
  createdAt: number;
  updatedAt: number;
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
  if (entry.id) {
    const i = all.findIndex((e) => e.id === entry.id);
    if (i >= 0) {
      const updated: DiaryEntry = { ...all[i], ...entry, id: all[i].id, updatedAt: now } as DiaryEntry;
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

export function exportEntries(userId: string) {
  const all = listEntries(userId);
  const lines = all.map((e) => {
    const t = TYPE_META[e.type];
    return [
      `# ${t.emoji} ${e.title}`,
      `_${t.label} · ${MOOD_EMOJIS[e.mood - 1]} · ${new Date(e.createdAt).toLocaleString()}_`,
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
