import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playTone } from "./MiniGameShell";

// Memory-style match game with emotion emojis. 3D card flip on tap.

const EMOJIS = ["😊", "😢", "😡", "😍", "😴", "🤩", "🥰", "😎"];
const PAIRS = 6; // 12 cards total → 4×3 grid

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const picks = shuffle(EMOJIS).slice(0, PAIRS);
  const cards = shuffle([...picks, ...picks]).map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  }));
  return cards;
}

export default function EmotionMatch() {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck());
  const [picks, setPicks] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  // Ref-backed lock so rapid double-taps can't sneak a third flip in before
  // React re-renders. The setTimeout chain is also tracked so we can clear
  // it on unmount and on reset.
  const lockRef = useRef(false);
  const flipBackTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (flipBackTimer.current) window.clearTimeout(flipBackTimer.current);
  }, []);

  const matchedCount = deck.filter((c) => c.matched).length;
  const won = matchedCount === PAIRS * 2;

  useEffect(() => {
    if (!startedAt || won) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [startedAt, won]);

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const stars = won ? (moves <= PAIRS + 2 ? 3 : moves <= PAIRS + 5 ? 2 : 1) : 0;

  useEffect(() => {
    if (picks.length !== 2) return;
    const [a, b] = picks;
    const ca = deck[a], cb = deck[b];
    if (ca.emoji === cb.emoji) {
      // Match
      playTone(880, 120);
      window.setTimeout(() => playTone(1175, 200), 80);
      setDeck((d) => d.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c)));
      setPicks([]);
      lockRef.current = false;
    } else {
      playTone(220, 160, "triangle");
      flipBackTimer.current = window.setTimeout(() => {
        setDeck((d) => d.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c)));
        setPicks([]);
        lockRef.current = false;
        flipBackTimer.current = null;
      }, 700);
    }
  }, [picks, deck]);

  useEffect(() => {
    if (won) {
      playTone(523, 200);
      setTimeout(() => playTone(659, 200), 200);
      setTimeout(() => playTone(784, 200), 400);
      setTimeout(() => playTone(1047, 320), 600);
    }
  }, [won]);

  const flip = (id: number) => {
    if (lockRef.current) return; // ref-based lock: blocks before React re-renders
    if (!startedAt) setStartedAt(Date.now());
    const card = deck[id];
    if (card.flipped || card.matched) return;
    playTone(660, 80);
    setDeck((d) => d.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setPicks((p) => {
      const next = [...p, id];
      if (next.length === 2) {
        lockRef.current = true; // lock until resolver effect clears
        setMoves((m) => m + 1);
      }
      return next;
    });
  };

  const reset = () => {
    if (flipBackTimer.current) {
      window.clearTimeout(flipBackTimer.current);
      flipBackTimer.current = null;
    }
    lockRef.current = false;
    setDeck(buildDeck());
    setPicks([]);
    setMoves(0);
    setStartedAt(null);
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-100 via-purple-100 to-indigo-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 flex flex-col">
      {/* HUD */}
      <div className="px-5 py-3 flex items-center justify-between text-slate-700 dark:text-slate-100">
        <div className="text-sm"><span className="font-bold">{moves}</span> moves</div>
        <div className="text-sm">⏱ <span className="font-bold">{elapsed}s</span></div>
        <div className="text-sm"><span className="font-bold">{matchedCount / 2}</span> / {PAIRS} matched</div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-4 pb-4 flex items-center justify-center">
        <div className="grid grid-cols-4 grid-rows-3 gap-3 w-full max-w-md aspect-[4/3]">
          {deck.map((c) => (
            <button
              key={c.id}
              onClick={() => flip(c.id)}
              disabled={c.matched}
              className="relative [perspective:800px] focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-2xl"
              aria-label={c.flipped || c.matched ? `Card ${c.emoji}` : "Hidden card"}
            >
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: c.flipped || c.matched ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg flex items-center justify-center text-white"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Sparkles className="w-7 h-7 opacity-80" />
                </div>
                {/* Front */}
                <div
                  className={`absolute inset-0 rounded-2xl shadow-lg flex items-center justify-center text-4xl sm:text-5xl bg-white dark:bg-slate-800 ${
                    c.matched ? "ring-4 ring-emerald-400" : ""
                  }`}
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {c.emoji}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Win overlay */}
      <AnimatePresence>
        {won && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center p-6"
          >
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }} className="text-7xl mb-3">
              🎉
            </motion.div>
            <h3 className="text-3xl font-extrabold mb-1">All matched!</h3>
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} className={`w-7 h-7 ${i < stars ? "text-yellow-300 fill-yellow-300" : "text-white/30"}`} />
              ))}
            </div>
            <p className="text-white/80 mb-5">{moves} moves · {elapsed} seconds</p>
            <Button size="lg" onClick={reset} className="bg-purple-500 hover:bg-purple-600"><RefreshCcw className="w-4 h-4 mr-1" /> Play again</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
