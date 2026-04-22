import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, XCircle, Star, Trophy, ArrowRight, ArrowLeft,
  Clock, Zap, Brain, Shuffle, Check, RotateCcw, MoveUp, MoveDown
} from "lucide-react";

interface GameModalProps {
  game: any;
  userProgress?: any;
  isOpen: boolean;
  onClose: () => void;
}

// ─── MCQ Game ────────────────────────────────────────────────────────────────
function MCQGame({ scenarios, onComplete }: { scenarios: any[]; onComplete: (score: number, total: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  const q = scenarios[idx];
  const progress = ((idx + (showFeedback ? 1 : 0)) / scenarios.length) * 100;

  const select = (i: number) => {
    if (showFeedback) return;
    setSelected(i);
    setShowFeedback(true);
    setTotalScore(s => s + q.options[i].points);
  };

  const next = () => {
    if (idx < scenarios.length - 1) {
      setIdx(i => i + 1);
      setSelected(null);
      setShowFeedback(false);
    } else {
      onComplete(totalScore + (selected !== null ? 0 : 0), scenarios.length * 10);
    }
  };

  const colorClass = (i: number) => {
    if (selected !== i) return "border border-slate-200 dark:border-slate-700 hover:shadow-md";
    const pts = q.options[i].points;
    if (pts >= 8) return "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20";
    if (pts >= 5) return "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    return "ring-2 ring-red-400 bg-red-50 dark:bg-red-900/20";
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Question {idx + 1} of {scenarios.length}</span>
          <span className="font-medium text-yellow-600">⭐ {totalScore} pts</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-5">
              <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">{q.question}</p>
            </CardContent>
          </Card>

          <div className="space-y-2 mt-3">
            {q.options.map((opt: any, i: number) => (
              <motion.div key={i} whileHover={{ scale: showFeedback ? 1 : 1.01 }} whileTap={{ scale: showFeedback ? 1 : 0.99 }}>
                <Card className={`cursor-pointer transition-all ${colorClass(i)} ${showFeedback ? "cursor-default" : ""}`}
                  onClick={() => select(i)}>
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <span className="text-slate-800 dark:text-white text-sm">{opt.text}</span>
                    {selected === i && showFeedback && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {opt.points >= 8 ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : opt.points >= 5 ? <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center"><span className="text-white text-xs font-bold">!</span></div>
                          : <XCircle className="w-4 h-4 text-red-400" />}
                        <Badge variant="outline" className="text-xs">+{opt.points}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {showFeedback && selected !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4 text-sm text-slate-700 dark:text-slate-300">
                    💡 {q.options[selected].feedback}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-2">
        <Button variant="outline" onClick={() => { if (idx > 0) { setIdx(i => i - 1); setSelected(null); setShowFeedback(false); } }} disabled={idx === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={next} disabled={!showFeedback}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          {idx === scenarios.length - 1 ? "Finish" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Memory Match Game ────────────────────────────────────────────────────────
function MemoryMatchGame({ pairs, onComplete }: { pairs: any[]; onComplete: (score: number, total: number) => void }) {
  const allCards = [
    ...pairs.map((p: any, i: number) => ({ id: `e-${i}`, pairId: i, text: p.emotion, type: "emotion" })),
    ...pairs.map((p: any, i: number) => ({ id: `s-${i}`, pairId: i, text: p.situation, type: "situation" })),
  ].sort(() => Math.random() - 0.5);

  const [cards, setCards] = useState(allCards);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [checking, setChecking] = useState(false);

  const flip = (cardId: string) => {
    if (checking || flipped.includes(cardId) || matched.includes(cardId)) return;
    if (flipped.length === 2) return;

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      const [a, b] = newFlipped.map(id => cards.find(c => c.id === id)!);
      setTimeout(() => {
        if (a.pairId === b.pairId) {
          const newMatched = [...matched, a.id, b.id];
          setMatched(newMatched);
          setFlipped([]);
          if (newMatched.length === cards.length) {
            const score = Math.max(10, pairs.length * 10 - moves * 2);
            onComplete(score, pairs.length * 10);
          }
        } else {
          setFlipped([]);
        }
        setChecking(false);
      }, 900);
    }
  };

  const isFlipped = (id: string) => flipped.includes(id) || matched.includes(id);
  const isMatched = (id: string) => matched.includes(id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Match emotions to situations</span>
        <div className="flex gap-3 text-sm">
          <span className="text-slate-500">🔄 Moves: <strong>{moves}</strong></span>
          <span className="text-green-600">✅ {matched.length / 2}/{pairs.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <motion.div key={card.id} whileHover={{ scale: isFlipped(card.id) ? 1 : 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => flip(card.id)}
            className={`h-20 rounded-xl cursor-pointer flex items-center justify-center p-2 text-center text-xs font-medium transition-all shadow-md
              ${isMatched(card.id)
                ? "bg-green-100 dark:bg-green-900/40 border-2 border-green-400 text-green-800 dark:text-green-200"
                : isFlipped(card.id)
                  ? card.type === "emotion"
                    ? "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-400 text-violet-800 dark:text-violet-200"
                    : "bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-400 text-blue-800 dark:text-blue-200"
                  : "bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-transparent hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}>
            {isFlipped(card.id) ? card.text : <Brain className="w-5 h-5 text-slate-400" />}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 text-xs">
        <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">🟣 Emotions</span>
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">🔵 Situations</span>
      </div>
    </div>
  );
}

// ─── Speed Round Game ─────────────────────────────────────────────────────────
function SpeedRoundGame({ questions, timePerQuestion = 10, onComplete }: { questions: any[]; timePerQuestion?: number; onComplete: (score: number, total: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [results, setResults] = useState<{ correct: boolean; timed: boolean }[]>([]);

  useEffect(() => {
    if (answered !== null) return;
    if (timeLeft === 0) { handleAnswer(null); return; }
    const t = setTimeout(() => setTimeLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered]);

  const handleAnswer = (answer: boolean | null) => {
    const q = questions[idx];
    const isCorrect = answer === q.correct;
    const timedOut = answer === null;
    const points = timedOut ? 0 : isCorrect ? Math.max(2, Math.ceil((timeLeft / timePerQuestion) * 10)) : 0;
    setAnswered(isCorrect);
    setTotalScore(s => s + points);
    setResults(r => [...r, { correct: isCorrect, timed: timedOut }]);

    setTimeout(() => {
      if (idx < questions.length - 1) {
        setIdx(i => i + 1);
        setTimeLeft(timePerQuestion);
        setAnswered(null);
      } else {
        onComplete(totalScore + points, questions.length * 10);
      }
    }, 1400);
  };

  const q = questions[idx];
  const timerPct = (timeLeft / timePerQuestion) * 100;
  const timerColor = timeLeft > 6 ? "bg-green-500" : timeLeft > 3 ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {results.map((r, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${r.correct ? "bg-green-500" : r.timed ? "bg-slate-300" : "bg-red-400"}`} />
          ))}
          {[...Array(questions.length - results.length)].map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className={timeLeft <= 3 ? "text-red-500" : "text-slate-700 dark:text-white"}>{timeLeft}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
        <motion.div className={`h-3 rounded-full transition-all ${timerColor}`}
          animate={{ width: `${timerPct}%` }} transition={{ duration: 0.5 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">True or False?</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">{q.statement}</p>
            </CardContent>
          </Card>

          {answered === null ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleAnswer(true)}
                className="py-5 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white text-xl font-bold shadow-lg hover:shadow-xl transition-shadow">
                ✅ True
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleAnswer(false)}
                className="py-5 rounded-2xl bg-gradient-to-br from-red-400 to-rose-600 text-white text-xl font-bold shadow-lg hover:shadow-xl transition-shadow">
                ❌ False
              </motion.button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl text-center ${answered ? "bg-green-50 dark:bg-green-900/30 border border-green-300" : "bg-red-50 dark:bg-red-900/30 border border-red-300"}`}>
              <p className="font-bold text-lg mb-1">{answered ? "✅ Correct!" : "❌ Incorrect"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{q.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="text-center">
        <span className="text-sm text-slate-500">Question {idx + 1} of {questions.length} · Score: {totalScore}</span>
      </div>
    </div>
  );
}

// ─── Sequence Builder Game ────────────────────────────────────────────────────
function SequenceGame({ situation, steps, onComplete }: { situation: string; steps: any[]; onComplete: (score: number, total: number) => void }) {
  const [order, setOrder] = useState(() => [...steps].sort(() => Math.random() - 0.5));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const move = (fromIdx: number, dir: "up" | "down") => {
    if (submitted) return;
    const toIdx = dir === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= order.length) return;
    const next = [...order];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    setOrder(next);
  };

  const submit = () => {
    let correct = 0;
    order.forEach((step, i) => {
      if (step.correctPosition === i + 1) correct++;
    });
    const pts = Math.round((correct / steps.length) * steps.length * 10);
    setScore(pts);
    setSubmitted(true);
  };

  const isCorrect = (step: any, i: number) => step.correctPosition === i + 1;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">🎯 Situation</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{situation}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500 text-center">Arrange these steps in the best order — use the arrows to move them</p>

      <div className="space-y-2">
        {order.map((step, i) => (
          <motion.div key={step.id} layout
            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${submitted
              ? isCorrect(step, i)
                ? "border-green-400 bg-green-50 dark:bg-green-900/30"
                : "border-red-300 bg-red-50 dark:bg-red-900/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, "up")} disabled={i === 0 || submitted}
                className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
                <MoveUp className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => move(i, "down")} disabled={i === order.length - 1 || submitted}
                className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
                <MoveDown className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
              {i + 1}
            </div>
            <p className="text-sm text-slate-800 dark:text-white flex-1">{step.text}</p>
            {submitted && (
              <div className="shrink-0">
                {isCorrect(step, i)
                  ? <CheckCircle className="w-5 h-5 text-green-500" />
                  : <span className="text-xs text-slate-400">→ #{step.correctPosition}</span>}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {!submitted ? (
        <Button onClick={submit} className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white">
          <Check className="w-4 h-4 mr-2" /> Submit Order
        </Button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-3">
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="font-bold text-xl text-slate-900 dark:text-white mb-1">Score: {score}/{steps.length * 10}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {score >= steps.length * 8 ? "Perfect! You understand the best approach!" :
                 score >= steps.length * 5 ? "Good job! Check the correct order above." :
                 "Keep practicing — look at the correct positions above."}
              </p>
            </CardContent>
          </Card>
          <Button onClick={() => onComplete(score, steps.length * 10)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Breathing Bubble Game ───────────────────────────────────────────────────
// Player follows a 4-7-8 (or custom) breathing pattern by holding the bubble
// during INHALE and HOLD phases. Scored on how steady their timing is.
function BreathingBubbleGame({
  cycles = 5, inhaleSec = 4, holdSec = 4, exhaleSec = 6, onComplete,
}: { cycles?: number; inhaleSec?: number; holdSec?: number; exhaleSec?: number; onComplete: (score: number, total: number) => void }) {
  const phases = [
    { name: "Inhale", dur: inhaleSec, hold: true,  color: "from-sky-400 to-blue-600",      hint: "Hold the bubble · breathe in slowly through your nose" },
    { name: "Hold",   dur: holdSec,   hold: true,  color: "from-violet-400 to-purple-600", hint: "Keep holding · stay still · count silently" },
    { name: "Exhale", dur: exhaleSec, hold: false, color: "from-emerald-400 to-teal-600",  hint: "Release the bubble · breathe out slowly through your mouth" },
  ] as const;

  const [cycle, setCycle]       = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [t, setT]               = useState(0);          // ms inside this phase
  const [holding, setHolding]   = useState(false);
  const [scoreAcc, setScoreAcc] = useState(0);          // % of correct holding accumulated
  const [done, setDone]         = useState(false);
  const startRef = useRef<number>(performance.now());
  const correctMsRef = useRef(0);
  const totalMsRef   = useRef(0);

  const phase = phases[phaseIdx];
  const phaseMs = phase.dur * 1000;

  useEffect(() => {
    if (done) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startRef.current;
      setT(elapsed);

      // Score: did the user's hold-state match what the phase wanted?
      // Sample at ~60fps via raf delta — count milliseconds correct.
      const dt = 16;
      totalMsRef.current += dt;
      if (holding === phase.hold) correctMsRef.current += dt;

      if (elapsed >= phaseMs) {
        startRef.current = now;
        if (phaseIdx === phases.length - 1) {
          // End of cycle
          if (cycle + 1 >= cycles) {
            const pct = totalMsRef.current > 0 ? (correctMsRef.current / totalMsRef.current) : 0;
            const finalScore = Math.round(pct * cycles * 10);
            setScoreAcc(finalScore);
            setDone(true);
            return;
          }
          setCycle(c => c + 1);
          setPhaseIdx(0);
        } else {
          setPhaseIdx(i => i + 1);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phaseIdx, cycle, holding, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spacebar = hold
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); setHolding(true); } };
    const up   = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); setHolding(false); } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const phaseProgress = Math.min(1, t / phaseMs);
  // Bubble scale: grows during inhale, stays during hold, shrinks during exhale
  const targetScale = phase.name === "Inhale" ? 0.4 + phaseProgress * 0.6
                    : phase.name === "Hold"   ? 1
                    : 1 - phaseProgress * 0.6;
  const matchOK = holding === phase.hold;

  if (done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-6">
        <div className="text-6xl">🌬️</div>
        <p className="text-xl font-bold text-slate-900 dark:text-white">Beautifully done</p>
        <p className="text-sm text-slate-500">You completed {cycles} breathing cycles.</p>
        <Button onClick={() => onComplete(scoreAcc, cycles * 10)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5 select-none">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Cycle {cycle + 1} of {cycles}</span>
        <span className={`font-medium ${matchOK ? "text-emerald-600" : "text-amber-600"}`}>
          {matchOK ? "✓ in sync" : phase.hold ? "hold the bubble" : "release the bubble"}
        </span>
      </div>

      <div className="relative h-72 rounded-3xl bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
        {/* Outer ring shows phase progress */}
        <svg className="absolute w-56 h-56" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 dark:text-slate-700" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={matchOK ? "text-emerald-500" : "text-amber-500"}
            strokeDasharray={`${phaseProgress * 289} 289`}
            transform="rotate(-90 50 50)"
            strokeLinecap="round" />
        </svg>

        {/* Bubble */}
        <motion.button
          onMouseDown={() => setHolding(true)}
          onMouseUp={() => setHolding(false)}
          onMouseLeave={() => setHolding(false)}
          onTouchStart={(e) => { e.preventDefault(); setHolding(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setHolding(false); }}
          onTouchCancel={(e) => { e.preventDefault(); setHolding(false); }}
          onPointerCancel={() => setHolding(false)}
          onBlur={() => setHolding(false)}
          className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${phase.color} text-white font-bold flex items-center justify-center shadow-2xl`}
          animate={{ scale: targetScale, opacity: holding ? 1 : 0.85 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="text-center pointer-events-none">
            <div className="text-2xl">{phase.name}</div>
            <div className="text-xs opacity-80 mt-1">{Math.max(0, Math.ceil(phase.dur - t / 1000))}s</div>
          </div>
        </motion.button>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{phase.hint}</p>
        <p className="text-xs text-slate-500">Hold the bubble (or press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">Space</kbd>) during <strong>Inhale</strong> and <strong>Hold</strong>; release during <strong>Exhale</strong>.</p>
      </div>
    </div>
  );
}

// ─── Kindness Catcher Game ───────────────────────────────────────────────────
// Falling kindness emojis must be caught with a basket; mean items must be
// dodged. Drag with mouse/touch or use ←/→ arrow keys.
function KindnessCatcherGame({ duration = 30, onComplete }: { duration?: number; onComplete: (score: number, total: number) => void }) {
  const KIND = ["🤗", "🌷", "💌", "🎁", "🍪", "⭐", "💖", "🌈", "👏"];
  const MEAN = ["💢", "👎", "💔", "🌧️", "🗯️"];
  const W = 360, H = 380, BASKET_W = 64;

  type Drop = { id: number; x: number; y: number; emoji: string; kind: boolean; speed: number };
  const [drops, setDrops] = useState<Drop[]>([]);
  const [basketX, setBasketX] = useState(W / 2 - BASKET_W / 2);
  const [score, setScore]   = useState(0);
  const [missed, setMissed] = useState(0);
  const [stung, setStung]   = useState(0);
  const [time, setTime]     = useState(duration);
  const [done, setDone]     = useState(false);
  const [flash, setFlash]   = useState<"good" | "bad" | null>(null);
  const idRef = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Spawn loop
  useEffect(() => {
    if (done) return;
    const spawn = setInterval(() => {
      const isKind = Math.random() < 0.78;
      const pool = isKind ? KIND : MEAN;
      setDrops(d => [...d, {
        id: idRef.current++,
        x: 20 + Math.random() * (W - 60),
        y: -30,
        emoji: pool[Math.floor(Math.random() * pool.length)],
        kind: isKind,
        speed: 1.2 + Math.random() * 1.6,
      }]);
    }, 650);
    return () => clearInterval(spawn);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation + collision loop
  useEffect(() => {
    if (done) return;
    let raf = 0;
    const tick = () => {
      setDrops(prev => {
        const next: Drop[] = [];
        let dScore = 0, dMissed = 0, dStung = 0;
        for (const d of prev) {
          const ny = d.y + d.speed;
          // Collision check at basket level
          if (ny >= H - 60 && ny <= H - 30) {
            const overlap = d.x + 18 > basketX && d.x < basketX + BASKET_W;
            if (overlap) {
              if (d.kind) { dScore++;  setFlash("good"); }
              else        { dStung++; setFlash("bad"); }
              continue;
            }
          }
          if (ny > H) {
            if (d.kind) dMissed++;
            continue;
          }
          next.push({ ...d, y: ny });
        }
        if (dScore)  setScore(s => s + dScore);
        if (dMissed) setMissed(m => m + dMissed);
        if (dStung)  setStung(s => s + dStung);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [basketX, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flash debounce
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 180);
    return () => clearTimeout(t);
  }, [flash]);

  // Countdown
  useEffect(() => {
    if (done) return;
    if (time <= 0) { setDone(true); return; }
    const t = setTimeout(() => setTime(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, done]);

  // Keyboard control
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft")  setBasketX(x => Math.max(0, x - 28));
      if (e.code === "ArrowRight") setBasketX(x => Math.min(W - BASKET_W, x + 28));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Mouse / touch control
  const move = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = ((clientX - rect.left) / rect.width) * W;
    setBasketX(Math.max(0, Math.min(W - BASKET_W, rel - BASKET_W / 2)));
  };

  if (done) {
    const max = Math.max(score + missed + stung, 1);
    const acc = Math.round((score / max) * 100);
    const finalScore = Math.max(0, score * 2 - stung);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-4">
        <div className="text-6xl">🧺</div>
        <p className="text-xl font-bold text-slate-900 dark:text-white">Time's up!</p>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-sm">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{score}</div>
            <div className="text-xs text-slate-500">Caught</div>
          </div>
          <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stung}</div>
            <div className="text-xs text-slate-500">Stung</div>
          </div>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{acc}%</div>
            <div className="text-xs text-slate-500">Accuracy</div>
          </div>
        </div>
        <Button onClick={() => onComplete(finalScore, Math.max(20, Math.round(duration * 0.8)))}
          className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-emerald-600 font-bold">💖 {score}</span>
        <span className="font-mono text-slate-500">⏱ {time}s</span>
        <span className="text-rose-500 font-bold">💢 {stung}</span>
      </div>

      <div
        ref={stageRef}
        onMouseMove={(e) => move(e.clientX)}
        onTouchMove={(e) => { if (e.touches[0]) { e.preventDefault(); move(e.touches[0].clientX); } }}
        className={`relative w-full overflow-hidden rounded-2xl border-2 transition-colors ${
          flash === "good" ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
          : flash === "bad"  ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20"
          : "border-slate-200 dark:border-slate-700 bg-gradient-to-b from-sky-50 to-violet-50 dark:from-slate-800 dark:to-slate-900"
        }`}
        style={{ aspectRatio: `${W} / ${H}`, touchAction: "none", cursor: "none" }}
      >
        <div className="absolute inset-0" style={{ width: "100%", height: "100%" }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            {drops.map(d => (
              <text key={d.id} x={d.x} y={d.y} fontSize="28" textAnchor="middle">{d.emoji}</text>
            ))}
            {/* Basket */}
            <g transform={`translate(${basketX} ${H - 50})`}>
              <rect x="0" y="6" width={BASKET_W} height="28" rx="6" fill="#a16207" />
              <rect x="0" y="0" width={BASKET_W} height="10" rx="4" fill="#facc15" />
            </g>
          </svg>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Catch kindness 💖 · dodge meanness 💢 · drag the basket or use <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">→</kbd>
      </p>
    </div>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────
function CompletionScreen({ totalScore, maxScore, aiFeedback, gameTitle, onReset, onClose }: any) {
  const pct = Math.round((totalScore / maxScore) * 100);
  const stars = Math.min(5, Math.max(1, Math.ceil(pct / 20)));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-2">
      <div>
        <div className="text-5xl mb-3">🏆</div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Congratulations!</h3>
        <p className="text-slate-500 mt-1">You completed {gameTitle}</p>
      </div>

      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{pct}%</p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalScore}</p>
              <p className="text-xs text-slate-500">Points earned</p>
            </div>
            <div>
              <div className="flex justify-center gap-0.5 mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < stars ? "text-yellow-400 fill-current" : "text-slate-300"}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {aiFeedback && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-left">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-blue-600 mb-1">🤖 AI Feedback</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{aiFeedback}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-1.5" /> Play Again
        </Button>
        <Button onClick={onClose} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          Done ✓
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function GameModal({ game, userProgress, isOpen, onClose }: GameModalProps) {
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalMax, setFinalMax] = useState(100);
  const [aiFeedback, setAiFeedback] = useState("");
  const [key, setKey] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveProgressMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/progress", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/progress/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      if (data.feedback) setAiFeedback(data.feedback);
      toast({ title: "Progress saved!", description: "Your score has been recorded." });
    },
  });

  const handleComplete = useCallback((score: number, max: number) => {
    const pct = Math.round((score / max) * 100);
    const stars = Math.min(5, Math.max(1, Math.ceil(pct / 20)));
    setFinalScore(score);
    setFinalMax(max);
    setCompleted(true);
    if (user) {
      saveProgressMutation.mutate({ userId: user.id, gameId: game.id, completed: true, score: pct, stars, pointsEarned: score });
    }
  }, [user, game?.id]);

  const reset = () => { setCompleted(false); setFinalScore(0); setAiFeedback(""); setKey(k => k + 1); };
  const handleClose = () => { reset(); onClose(); };

  const content = game?.content || {};
  const gameType = content.gameType || "scenarios";

  const GAME_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
    scenarios: { label: "Scenario Challenge", icon: "🎯", color: "bg-blue-100 text-blue-700" },
    "memory-match": { label: "Memory Match", icon: "🧠", color: "bg-purple-100 text-purple-700" },
    "speed-round": { label: "Speed Round", icon: "⚡", color: "bg-orange-100 text-orange-700" },
    sequence: { label: "Sequence Builder", icon: "📋", color: "bg-green-100 text-green-700" },
    "breathing-bubble": { label: "Breathing Bubble", icon: "🌬️", color: "bg-sky-100 text-sky-700" },
    "kindness-catcher": { label: "Kindness Catcher", icon: "🧺", color: "bg-pink-100 text-pink-700" },
  };
  const meta = GAME_TYPE_META[gameType] || GAME_TYPE_META.scenarios;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">{game?.title}</DialogTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
          </div>
          <DialogDescription className="text-sm">{game?.description}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {completed ? (
            <CompletionScreen key="done"
              totalScore={finalScore} maxScore={finalMax}
              aiFeedback={aiFeedback} gameTitle={game?.title}
              onReset={reset} onClose={handleClose} />
          ) : (
            <motion.div key={`game-${key}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {gameType === "scenarios" && content.scenarios && (
                <MCQGame scenarios={content.scenarios} onComplete={handleComplete} />
              )}
              {gameType === "memory-match" && content.pairs && (
                <MemoryMatchGame pairs={content.pairs} onComplete={handleComplete} />
              )}
              {gameType === "speed-round" && content.questions && (
                <SpeedRoundGame questions={content.questions}
                  timePerQuestion={content.timePerQuestion || 10} onComplete={handleComplete} />
              )}
              {gameType === "sequence" && content.steps && (
                <SequenceGame situation={content.situation} steps={content.steps} onComplete={handleComplete} />
              )}
              {gameType === "breathing-bubble" && (
                <BreathingBubbleGame
                  cycles={content.cycles}
                  inhaleSec={content.inhaleSec}
                  holdSec={content.holdSec}
                  exhaleSec={content.exhaleSec}
                  onComplete={handleComplete} />
              )}
              {gameType === "kindness-catcher" && (
                <KindnessCatcherGame duration={content.duration} onComplete={handleComplete} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
