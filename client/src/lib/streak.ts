// Daily kindness streak — tracked locally per user.
// Each "ping" stamps today's date; the streak is the count of consecutive
// recent days (anchored to today or yesterday so we don't break overnight).

const KEY = (uid: string) => `peaceboard_streak_${uid}`;
const TIPS_KEY = "peaceboard_streak_milestones";

interface StreakState {
  days: string[]; // YYYY-MM-DD list, ascending, deduped, last 365 only
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayKey(): string {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load(uid: string): StreakState {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return { days: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.days)) return { days: parsed.days };
    return { days: [] };
  } catch { return { days: [] }; }
}

function save(uid: string, s: StreakState) {
  try { localStorage.setItem(KEY(uid), JSON.stringify(s)); } catch {}
}

export function pingStreak(uid: string): { streak: number; isNewDay: boolean; milestone?: number } {
  if (!uid) return { streak: 0, isNewDay: false };
  const s = load(uid);
  const t = todayKey();
  const isNewDay = !s.days.includes(t);
  if (isNewDay) {
    s.days.push(t);
    s.days = Array.from(new Set(s.days)).sort();
    if (s.days.length > 365) s.days = s.days.slice(-365);
    save(uid, s);
  }
  const streak = computeStreak(s);
  let milestone: number | undefined;
  if (isNewDay && [3, 7, 14, 30, 60, 100, 200].includes(streak)) {
    try {
      const seen = JSON.parse(localStorage.getItem(TIPS_KEY) || "[]");
      const key = `${uid}:${streak}`;
      if (!seen.includes(key)) {
        seen.push(key);
        localStorage.setItem(TIPS_KEY, JSON.stringify(seen));
        milestone = streak;
      }
    } catch {}
  }
  try { window.dispatchEvent(new CustomEvent("peaceboard-streak", { detail: { streak, isNewDay } })); } catch {}
  return { streak, isNewDay, milestone };
}

export function getStreak(uid: string): number {
  if (!uid) return 0;
  return computeStreak(load(uid));
}

export function getActiveDays(uid: string): string[] {
  return load(uid).days;
}

function computeStreak(s: StreakState): number {
  if (s.days.length === 0) return 0;
  const set = new Set(s.days);
  let count = 0;
  const d = new Date();
  // If today not pinged but yesterday was, the streak still reads as yesterday's run.
  if (!set.has(todayKey()) && !set.has(yesterdayKey())) return 0;
  if (!set.has(todayKey())) d.setDate(d.getDate() - 1);
  while (true) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (set.has(k)) { count++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return count;
}
