import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, RefreshCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playTone } from "./MiniGameShell";

// A zen tap-to-grow garden. Tap soil patches → seed → sprout → flower.
// Catch falling water drops to grow faster. The sky cycles sunrise → noon → sunset.

type Stage = 0 | 1 | 2 | 3 | 4; // empty, seed, sprout, bud, flower
const FLOWERS = ["🌸", "🌼", "🌺", "🌷", "🌻", "💐"];

interface Plot {
  id: number;
  stage: Stage;
  flower: string;
  growth: number; // 0..100 within current stage
}

interface Drop {
  id: number;
  x: number;
  y: number;
}

const COLS = 4;
const ROWS = 3;
const TOTAL = COLS * ROWS;

export default function PeaceGarden() {
  const [plots, setPlots] = useState<Plot[]>(() =>
    Array.from({ length: TOTAL }).map((_, i) => ({
      id: i, stage: 0, flower: FLOWERS[i % FLOWERS.length], growth: 0,
    })),
  );
  const [drops, setDrops] = useState<Drop[]>([]);
  const dropId = useMemo(() => ({ n: 0 }), []);
  const [tick, setTick] = useState(0);

  const bloomed = plots.filter((p) => p.stage === 4).length;
  const finished = bloomed === TOTAL;

  // Sky cycles based on bloom progress
  const skyHue = Math.round(40 + (bloomed / TOTAL) * 220); // amber→indigo
  const sky = `linear-gradient(to bottom, hsl(${skyHue}, 70%, 80%), hsl(${(skyHue + 30) % 360}, 60%, 90%))`;

  // Slow growth tick
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 600);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setPlots((prev) =>
      prev.map((p) => {
        if (p.stage === 0 || p.stage === 4) return p;
        const ng = p.growth + 6;
        if (ng >= 100) {
          const next = (p.stage + 1) as Stage;
          if (next === 4) playTone(880, 220);
          return { ...p, stage: next, growth: 0 };
        }
        return { ...p, growth: ng };
      }),
    );
  }, [tick]);

  // Spawn falling water drops every couple seconds
  useEffect(() => {
    const t = window.setInterval(() => {
      dropId.n += 1;
      setDrops((d) => [...d, { id: dropId.n, x: 5 + Math.random() * 90, y: -5 }]);
    }, 1800);
    return () => window.clearInterval(t);
  }, [dropId]);

  // Drop fall animation tick
  useEffect(() => {
    const t = window.setInterval(() => {
      setDrops((prev) => prev.map((d) => ({ ...d, y: d.y + 2 })).filter((d) => d.y < 110));
    }, 30);
    return () => window.clearInterval(t);
  }, []);

  const plant = (id: number) => {
    setPlots((prev) => prev.map((p) => (p.id === id && p.stage === 0 ? { ...p, stage: 1 } : p)));
    playTone(440, 100, "triangle");
  };

  const catchDrop = (id: number) => {
    setDrops((prev) => prev.filter((d) => d.id !== id));
    // Boost the most-needy plot's growth
    setPlots((prev) => {
      const candidates = prev.filter((p) => p.stage > 0 && p.stage < 4);
      if (candidates.length === 0) return prev;
      const target = candidates.sort((a, b) => a.growth - b.growth)[0];
      return prev.map((p) => (p.id === target.id ? { ...p, growth: Math.min(99, p.growth + 50) } : p));
    });
    playTone(660, 100);
  };

  const reset = () => {
    setPlots((prev) => prev.map((p) => ({ ...p, stage: 0, growth: 0 })));
    setDrops([]);
  };

  const stageEmoji = (s: Stage, flower: string) =>
    s === 0 ? "" : s === 1 ? "🌱" : s === 2 ? "🌿" : s === 3 ? "🌾" : flower;

  return (
    <div className="absolute inset-0" style={{ background: sky }}>
      {/* Sun */}
      <motion.div
        animate={{ x: bloomed * 8, y: -bloomed * 2 }}
        className="absolute top-4 right-6 w-14 h-14 rounded-full bg-yellow-300 shadow-[0_0_30px_rgba(253,224,71,0.7)] flex items-center justify-center"
      >
        <Sun className="w-7 h-7 text-yellow-600" />
      </motion.div>

      {/* HUD */}
      <div className="absolute top-3 left-4 bg-white/70 dark:bg-slate-800/60 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-slate-800 dark:text-slate-100">
        🌷 {bloomed}/{TOTAL} bloomed
      </div>

      {/* Falling water drops */}
      {drops.map((d) => (
        <button
          key={d.id}
          onClick={() => catchDrop(d.id)}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-sky-400/80 hover:bg-sky-500 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
          aria-label="Catch water drop"
        >
          <Droplet className="w-5 h-5 text-white fill-white" />
        </button>
      ))}

      {/* Garden grid (bottom half) */}
      <div className="absolute bottom-0 left-0 right-0 h-[58%] bg-gradient-to-b from-emerald-700/60 to-emerald-900/80">
        <div className="absolute inset-x-0 top-0 h-3 bg-emerald-500 rounded-t-full opacity-70" />
        <div className="grid grid-cols-4 grid-rows-3 gap-3 p-4 h-full">
          {plots.map((p) => (
            <button
              key={p.id}
              onClick={() => plant(p.id)}
              disabled={p.stage !== 0}
              className="relative rounded-xl bg-amber-900/70 shadow-inner border border-amber-950/40 flex items-end justify-center pb-1 hover:bg-amber-800/70 transition disabled:cursor-default"
              aria-label={p.stage === 0 ? "Empty soil — tap to plant" : `Stage ${p.stage}`}
            >
              <AnimatePresence mode="wait">
                {p.stage > 0 && (
                  <motion.div
                    key={p.stage}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 15 }}
                    className="text-3xl sm:text-4xl drop-shadow-lg"
                  >
                    {stageEmoji(p.stage, p.flower)}
                  </motion.div>
                )}
              </AnimatePresence>
              {p.stage > 0 && p.stage < 4 && (
                <div className="absolute bottom-0 left-1 right-1 h-1 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${p.growth}%` }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center p-6"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-7xl mb-3">🌺</motion.div>
            <h3 className="text-3xl font-extrabold mb-1">Your garden is full of peace!</h3>
            <p className="text-white/80 mb-5">Tend to your inner garden as gently as this one.</p>
            <Button size="lg" onClick={reset} className="bg-emerald-500 hover:bg-emerald-600"><RefreshCcw className="w-4 h-4 mr-1" /> Plant a new garden</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
