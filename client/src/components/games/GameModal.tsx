import { useState, useEffect, useCallback } from "react";
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
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
