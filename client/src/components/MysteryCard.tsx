import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Shuffle, CheckCircle2 } from "lucide-react";

interface MysteryCardData {
  emoji: string;
  title: string;
  body: string;
  tag: string;
}

const DECK: MysteryCardData[] = [
  { emoji: "💌", title: "Send a thank-you", body: "Pick one person who helped you this week and send them a short, specific thank-you message.", tag: "Gratitude" },
  { emoji: "👂", title: "Listen first", body: "Have one conversation today where you only ask questions — no advice, no fixing.", tag: "Empathy" },
  { emoji: "🌱", title: "Plant a kind word", body: "Compliment something a classmate or coworker did, not just how they look.", tag: "Kindness" },
  { emoji: "🫧", title: "Take a breathing break", body: "Right now: breathe in for 4, hold for 4, out for 6. Do it three times.", tag: "Self-care" },
  { emoji: "📵", title: "10 mindful minutes", body: "Put your phone down for 10 minutes and just notice what's around you.", tag: "Presence" },
  { emoji: "🤝", title: "Help one task", body: "Offer to help someone with one small thing today — even if they didn't ask.", tag: "Generosity" },
  { emoji: "🪞", title: "Be kind to you", body: "Write down one thing you appreciate about yourself. Just one.", tag: "Self-care" },
  { emoji: "🌈", title: "Spread color", body: "Send a friend a song, a meme, or a memory that always makes you smile.", tag: "Connection" },
  { emoji: "📝", title: "Three good things", body: "List three things that went well today, even tiny ones.", tag: "Gratitude" },
  { emoji: "💧", title: "Tend yourself", body: "Drink a glass of water and stretch for one minute. Your body will thank you.", tag: "Self-care" },
  { emoji: "🫶", title: "Apologize first", body: "If something's been off with someone, send the first message — no big speech needed.", tag: "Repair" },
  { emoji: "🌟", title: "Notice a stranger", body: "Smile or say hi to someone you don't usually talk to.", tag: "Connection" },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }
function storeKey(uid: string | undefined) { return `pb-mystery-${uid || "anon"}-${todayKey()}`; }

interface SavedState {
  index: number;   // index into DECK
  done: boolean;
  flipped: boolean;
}

function loadState(uid?: string): SavedState | null {
  try {
    const raw = localStorage.getItem(storeKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.index !== "number") return null;
    // Clamp the index in case the deck shrunk or storage was tampered with
    const safeIndex = Number.isFinite(parsed.index) && parsed.index >= 0 && parsed.index < DECK.length
      ? Math.floor(parsed.index)
      : pickDeterministic(uid);
    return {
      index: safeIndex,
      done: !!parsed.done,
      flipped: !!parsed.flipped,
    };
  } catch { return null; }
}
function saveState(uid: string | undefined, s: SavedState) {
  try { localStorage.setItem(storeKey(uid), JSON.stringify(s)); } catch {}
}
function pickDeterministic(uid?: string): number {
  // Same card per user per day, but different across users.
  const seed = `${uid || "anon"}-${todayKey()}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % DECK.length;
}

export default function MysteryCard({ userId }: { userId?: string }) {
  const [state, setState] = useState<SavedState>(() => {
    return loadState(userId) || { index: pickDeterministic(userId), done: false, flipped: false };
  });

  // Re-pick if user changes (e.g. login/logout) and there's no saved state for them today
  useEffect(() => {
    const existing = loadState(userId);
    if (existing) setState(existing);
    else setState({ index: pickDeterministic(userId), done: false, flipped: false });
  }, [userId]);

  const card = DECK[state.index];

  function update(next: Partial<SavedState>) {
    const merged = { ...state, ...next };
    setState(merged);
    saveState(userId, merged);
  }

  function shuffle() {
    let next = state.index;
    while (next === state.index && DECK.length > 1) {
      next = Math.floor(Math.random() * DECK.length);
    }
    update({ index: next, done: false, flipped: true });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Mystery Kindness Card
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={shuffle}
            aria-label="Draw another card"
            className="h-7 px-2 text-slate-500 hover:text-violet-600"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Flip container */}
        <div className="[perspective:1000px]">
          <motion.div
            className="relative w-full min-h-[180px] [transform-style:preserve-3d]"
            animate={{ rotateY: state.flipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 90, damping: 14 }}
          >
            {/* Back (shown by default) */}
            <button
              type="button"
              onClick={() => update({ flipped: true })}
              aria-label="Reveal today's kindness card"
              aria-hidden={state.flipped}
              tabIndex={state.flipped ? -1 : 0}
              className={`absolute inset-0 [backface-visibility:hidden] rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${state.flipped ? "pointer-events-none" : ""}`}
            >
              <div className="w-full h-full min-h-[180px] rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 flex flex-col items-center justify-center text-white p-6 shadow-inner">
                <div className="text-5xl mb-3">🎴</div>
                <p className="font-bold text-lg">Tap to reveal</p>
                <p className="text-xs opacity-90 mt-1">Today's kindness mission</p>
              </div>
            </button>

            {/* Front (shown after flip) */}
            <div
              className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg p-5 border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/20 ${state.flipped ? "" : "pointer-events-none"}`}
              aria-hidden={!state.flipped}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-4xl shrink-0">{card.emoji}</div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white">{card.title}</h4>
                  <p className="text-xs text-violet-600 dark:text-violet-300 font-semibold uppercase tracking-wide mt-0.5">{card.tag}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-4">
                {card.body}
              </p>
              <div className="flex items-center justify-between gap-2">
                {state.done ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Done — nice work!
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => update({ done: true })} tabIndex={state.flipped ? 0 : -1}>
                    I did it
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={shuffle} className="text-xs" tabIndex={state.flipped ? 0 : -1}>
                  Draw another
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
