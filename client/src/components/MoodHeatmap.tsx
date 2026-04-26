import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarHeart } from "lucide-react";

const WEEKS = 12;
const DAYS = WEEKS * 7;

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊", joy: "😊", excited: "🤩", calm: "😌", peaceful: "😌",
  sad: "😢", angry: "😠", anxious: "😰", fear: "😨", surprised: "😲",
  neutral: "😐", tired: "😴", love: "🥰", grateful: "🙏",
};

function emojiForEmotion(emotion?: string | null): string {
  if (!emotion) return "";
  const k = String(emotion).toLowerCase();
  if (MOOD_EMOJI[k]) return MOOD_EMOJI[k];
  for (const [tag, emj] of Object.entries(MOOD_EMOJI)) {
    if (k.includes(tag)) return emj;
  }
  return "•";
}

function localDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface DayCell {
  date: Date;
  key: string;
  games: number;
  music: number;
  emotions: number;
  diary: number;
  topEmotion?: string;
  total: number;
}

interface MoodHeatmapProps {
  progress?: any[];
  emotions?: any[];
  music?: any[];
  diary?: any[];
}

export default function MoodHeatmap({
  progress = [], emotions = [], music = [], diary = [],
}: MoodHeatmapProps) {
  const [hover, setHover] = useState<DayCell | null>(null);

  const cells = useMemo<DayCell[]>(() => {
    const map = new Map<string, DayCell>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize empty grid: oldest first so the rightmost column is "today"
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = localDayKey(d);
      map.set(k, { date: d, key: k, games: 0, music: 0, emotions: 0, diary: 0, total: 0 });
    }

    const tally = (date: any, field: keyof Pick<DayCell, "games" | "music" | "emotions" | "diary">, extra?: { emotion?: string }) => {
      if (!date) return;
      const t = typeof date === "number" ? date : new Date(date).getTime();
      if (!Number.isFinite(t)) return;
      const k = localDayKey(new Date(t));
      const cell = map.get(k);
      if (!cell) return; // outside the 12-week window
      cell[field] += 1;
      cell.total += 1;
      if (extra?.emotion && !cell.topEmotion) cell.topEmotion = extra.emotion;
    };

    for (const p of progress) {
      if (p?.completed) tally(p.completedAt || p.createdAt, "games");
    }
    for (const m of music) tally(m?.playedAt, "music");
    for (const e of emotions) tally(e?.createdAt, "emotions", { emotion: e?.emotion });
    for (const d of diary) tally(d?.createdAt, "diary");

    return Array.from(map.values());
  }, [progress, emotions, music, diary]);

  const totalDaysActive = cells.filter(c => c.total > 0).length;
  const max = cells.reduce((m, c) => Math.max(m, c.total), 0);

  function intensityClass(total: number): string {
    if (total === 0) return "bg-slate-100 dark:bg-slate-800";
    if (max <= 1) return "bg-emerald-300 dark:bg-emerald-700";
    const ratio = total / max;
    if (ratio < 0.25) return "bg-emerald-200 dark:bg-emerald-900";
    if (ratio < 0.5) return "bg-emerald-300 dark:bg-emerald-700";
    if (ratio < 0.75) return "bg-emerald-400 dark:bg-emerald-600";
    return "bg-emerald-500 dark:bg-emerald-400";
  }

  // Group into columns of 7 days (weeks). cells is oldest→newest.
  const columns: DayCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarHeart className="w-5 h-5 text-rose-500" />
            <span>Your Mood Map</span>
          </span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            {totalDaysActive} active {totalDaysActive === 1 ? "day" : "days"} · last 12 weeks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-2 min-w-full">
            <div className="flex gap-1">
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-1">
                  {col.map((cell) => {
                    const emoji = emojiForEmotion(cell.topEmotion);
                    return (
                      <motion.button
                        key={cell.key}
                        type="button"
                        whileHover={{ scale: 1.25 }}
                        onMouseEnter={() => setHover(cell)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(cell)}
                        onBlur={() => setHover(null)}
                        aria-label={`${shortDate(cell.date)}: ${cell.total} ${cell.total === 1 ? "activity" : "activities"}${cell.topEmotion ? `, mood ${cell.topEmotion}` : ""}`}
                        className={`relative w-4 h-4 sm:w-5 sm:h-5 rounded-sm ${intensityClass(cell.total)} flex items-center justify-center text-[8px] sm:text-[10px] leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                      >
                        {emoji && cell.total > 0 ? <span aria-hidden="true">{emoji}</span> : null}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>{shortDate(cells[0]?.date || new Date())}</span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                {[0, 0.2, 0.5, 0.8, 1].map((r, i) => (
                  <span key={i} className={`w-3 h-3 rounded-sm ${intensityClass(Math.max(1, Math.round(r * Math.max(1, max))))}`} aria-hidden="true" />
                ))}
                <span>More</span>
              </div>
              <span>Today</span>
            </div>

            {/* Hover detail */}
            <div className="min-h-[2.25rem] mt-1">
              {hover ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-md px-3 py-2 inline-flex flex-wrap gap-x-3 gap-y-1"
                >
                  <span className="font-semibold">{shortDate(hover.date)}</span>
                  {hover.total === 0 ? (
                    <span className="text-slate-500">No activity</span>
                  ) : (
                    <>
                      {hover.games > 0 && <span>🎮 {hover.games}</span>}
                      {hover.emotions > 0 && <span>{emojiForEmotion(hover.topEmotion) || "💭"} {hover.emotions}</span>}
                      {hover.music > 0 && <span>🎵 {hover.music}</span>}
                      {hover.diary > 0 && <span>📓 {hover.diary}</span>}
                    </>
                  )}
                </motion.div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">Hover a square to see what you did that day.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
