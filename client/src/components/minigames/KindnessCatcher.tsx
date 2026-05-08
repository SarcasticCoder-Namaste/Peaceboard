import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Trophy, RefreshCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playTone } from "./MiniGameShell";

// Falling kind words — the player drags a basket left/right to catch them.
// Mean words occasionally drop too — catch one and you lose a heart.

const KIND_WORDS = ["love", "smile", "share", "help", "hug", "thanks", "kind", "brave", "calm", "hope", "joy", "care"];
const MEAN_WORDS = ["mean", "sad", "rude"];

interface FallingItem {
  id: number;
  x: number; // 0..100 percent
  y: number; // 0..100 percent of play area
  speed: number; // % per tick
  word: string;
  kind: boolean;
}

const ROUND_SECONDS = 45;

export default function KindnessCatcher() {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [basketX, setBasketX] = useState(50);
  // Mirror basketX in a ref so the tick loop can read the latest position
  // without re-creating its interval on every pointer move.
  const basketXRef = useRef(50);
  useEffect(() => { basketXRef.current = basketX; }, [basketX]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; text: string; good: boolean }[]>([]);
  const idRef = useRef(0);

  const reset = () => {
    setItems([]);
    setScore(0);
    setHearts(3);
    setTimeLeft(ROUND_SECONDS);
    setPopups([]);
    setBasketX(50);
  };

  const start = () => {
    reset();
    setRunning(true);
  };

  // Spawn loop
  useEffect(() => {
    if (!running) return;
    const spawn = window.setInterval(() => {
      idRef.current += 1;
      const isMean = Math.random() < 0.18;
      setItems((prev) => [
        ...prev,
        {
          id: idRef.current,
          x: 5 + Math.random() * 90,
          y: -5,
          speed: 0.6 + Math.random() * 0.6 + (ROUND_SECONDS - timeLeft) * 0.01,
          word: isMean ? MEAN_WORDS[Math.floor(Math.random() * MEAN_WORDS.length)]
                       : KIND_WORDS[Math.floor(Math.random() * KIND_WORDS.length)],
          kind: !isMean,
        },
      ]);
    }, 700);
    return () => window.clearInterval(spawn);
  }, [running, timeLeft]);

  // Tick loop — runs once per round, reads basket position from ref
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => {
      setItems((prev) => {
        const next: FallingItem[] = [];
        for (const it of prev) {
          const ny = it.y + it.speed;
          // Catch zone is bottom 12%, basket span ±11% around current basket
          if (ny >= 88 && Math.abs(it.x - basketXRef.current) < 11) {
            // Caught
            if (it.kind) {
              setScore((s) => s + 10);
              playTone(880, 120, "sine", 0.18);
              setPopups((p) => [...p, { id: idRef.current++, x: it.x, y: 86, text: "+10", good: true }]);
            } else {
              setHearts((h) => Math.max(0, h - 1));
              playTone(180, 200, "sawtooth", 0.18);
              setPopups((p) => [...p, { id: idRef.current++, x: it.x, y: 86, text: "Oops", good: false }]);
            }
            continue;
          }
          if (ny > 100) continue; // missed
          next.push({ ...it, y: ny });
        }
        return next;
      });
    }, 30);
    return () => window.clearInterval(tick);
  }, [running]);

  // Countdown
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  // Cleanup popups
  useEffect(() => {
    if (popups.length === 0) return;
    const t = window.setTimeout(() => setPopups((p) => p.slice(1)), 700);
    return () => window.clearTimeout(t);
  }, [popups]);

  // End conditions
  useEffect(() => {
    if (running && (timeLeft <= 0 || hearts <= 0)) {
      setRunning(false);
      playTone(523, 200);
      setTimeout(() => playTone(659, 200), 180);
      setTimeout(() => playTone(784, 320), 360);
    }
  }, [timeLeft, hearts, running]);

  // Pointer / touch / keyboard movement
  useEffect(() => {
    const move = (clientX: number) => {
      const el = areaRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * 100;
      setBasketX(Math.max(8, Math.min(92, px)));
    };
    const onMove = (e: MouseEvent) => move(e.clientX);
    const onTouch = (e: TouchEvent) => { if (e.touches[0]) move(e.touches[0].clientX); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setBasketX((x) => Math.max(8, x - 6));
      if (e.key === "ArrowRight") setBasketX((x) => Math.min(92, x + 6));
    };
    const el = areaRef.current;
    el?.addEventListener("mousemove", onMove);
    el?.addEventListener("touchmove", onTouch);
    window.addEventListener("keydown", onKey);
    return () => {
      el?.removeEventListener("mousemove", onMove);
      el?.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const finished = !running && (timeLeft <= 0 || hearts <= 0) && score > 0;
  const ready = !running && timeLeft === ROUND_SECONDS && score === 0;

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-cyan-200 to-emerald-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900">
      {/* HUD */}
      <div className="absolute top-2 left-3 right-3 z-10 flex items-center justify-between text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur px-2 py-1 rounded-full text-xs font-semibold">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`w-3.5 h-3.5 ${i < hearts ? "text-rose-500 fill-rose-500" : "text-slate-300"}`} />
          ))}
        </div>
        <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur px-3 py-1 rounded-full text-sm font-bold">⏱ {Math.max(0, timeLeft)}s</div>
        <div className="bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><Trophy className="w-4 h-4" /> {score}</div>
      </div>

      {/* Play area */}
      <div ref={areaRef} className="absolute inset-0 cursor-none touch-none">
        {/* Decorative clouds */}
        <div className="absolute top-10 left-10 w-24 h-10 bg-white/60 rounded-full blur-md animate-pulse" />
        <div className="absolute top-24 right-16 w-32 h-10 bg-white/50 rounded-full blur-md animate-pulse" />

        {/* Falling items */}
        {items.map((it) => (
          <motion.div
            key={it.id}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute -translate-x-1/2 select-none"
            style={{ left: `${it.x}%`, top: `${it.y}%` }}
          >
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur ${
              it.kind ? "bg-rose-500 text-white" : "bg-slate-800 text-white"
            }`}>
              {it.kind ? "💗 " : "⚠️ "}{it.word}
            </div>
          </motion.div>
        ))}

        {/* Basket */}
        <motion.div
          animate={{ left: `${basketX}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="absolute bottom-3 -translate-x-1/2 w-24 h-12"
        >
          <div className="w-full h-full bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-3xl rounded-t-md shadow-xl border-2 border-amber-300 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white fill-white drop-shadow" />
          </div>
        </motion.div>

        {/* Score popups */}
        <AnimatePresence>
          {popups.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, y: -30, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute -translate-x-1/2 font-bold text-lg pointer-events-none ${p.good ? "text-emerald-600" : "text-rose-600"}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Start / end overlays */}
      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-center p-6"
          >
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="text-6xl mb-3">💗</motion.div>
            <h3 className="text-2xl font-bold mb-1">Catch the kindness!</h3>
            <p className="text-sm text-white/80 max-w-sm mb-5">Move the basket with your finger, mouse, or arrow keys. Catch 💗 kind words. Avoid the ⚠️ mean ones.</p>
            <Button size="lg" onClick={start} className="bg-rose-500 hover:bg-rose-600"><Play className="w-4 h-4 mr-1" /> Start</Button>
          </motion.div>
        )}
        {finished && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center p-6"
          >
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }} className="text-7xl mb-3">
              {score >= 200 ? "🏆" : score >= 100 ? "🎉" : "💗"}
            </motion.div>
            <h3 className="text-3xl font-extrabold mb-1">{score} kindness points!</h3>
            <p className="text-white/80 mb-5">{score >= 200 ? "Incredible! You're a kindness champion." : score >= 100 ? "Wonderful effort!" : "Every act of kindness counts."}</p>
            <Button size="lg" onClick={start} className="bg-rose-500 hover:bg-rose-600"><RefreshCcw className="w-4 h-4 mr-1" /> Play again</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
