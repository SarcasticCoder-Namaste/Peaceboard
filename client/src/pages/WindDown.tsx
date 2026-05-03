import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, Moon, Volume2, VolumeX, Pause, Play, RotateCcw, Heart, Mic, MicOff } from "lucide-react";

// ─── Breathing patterns ──────────────────────────────────────────────────────
type BreathStep = { label: string; seconds: number; scale: number };
type Pattern = { id: string; name: string; description: string; steps: BreathStep[] };

const PATTERNS: Pattern[] = [
  {
    id: "box",
    name: "Box (4·4·4·4)",
    description: "Calm focus — equal parts in, hold, out, hold.",
    steps: [
      { label: "Breathe in", seconds: 4, scale: 1.6 },
      { label: "Hold",       seconds: 4, scale: 1.6 },
      { label: "Breathe out",seconds: 4, scale: 1.0 },
      { label: "Hold",       seconds: 4, scale: 1.0 },
    ],
  },
  {
    id: "478",
    name: "4·7·8 Sleep",
    description: "Drift into rest — long out-breath relaxes the nervous system.",
    steps: [
      { label: "Breathe in", seconds: 4, scale: 1.7 },
      { label: "Hold",       seconds: 7, scale: 1.7 },
      { label: "Breathe out",seconds: 8, scale: 1.0 },
    ],
  },
  {
    id: "soft",
    name: "Soft 5·5",
    description: "Gentle, even rhythm — perfect for winding down.",
    steps: [
      { label: "Breathe in", seconds: 5, scale: 1.55 },
      { label: "Breathe out",seconds: 5, scale: 1.0 },
    ],
  },
];

const NIGHT_REFLECTIONS = [
  "What's one small thing that went well today?",
  "Who made you feel cared for today, even a little?",
  "What's a kindness you gave today — to yourself or someone else?",
  "What's something you're letting go of for tonight?",
  "What's one thing you're looking forward to tomorrow?",
];

// ─── Soft ambient tone (Web Audio) ───────────────────────────────────────────
function useSoftTone(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!ctxRef.current) {
      try { ctxRef.current = new Ctx(); } catch { return; }
    }
    const ctx = ctxRef.current!;
    if (ctx.state === "suspended") { try { ctx.resume(); } catch {} }

    // Local nodes for THIS effect instance only — never shared via refs
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5);
    master.connect(ctx.destination);

    const localOscs: OscillatorNode[] = [];
    const freqs = [196, 261.63]; // G3 + C4 — perfect fifth pad
    freqs.forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(master);
      o.start();
      localOscs.push(o);
    });

    let teardownTimer: number | null = null;
    return () => {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      } catch {}
      teardownTimer = window.setTimeout(() => {
        localOscs.forEach((o) => { try { o.stop(); } catch {} });
        try { master.disconnect(); } catch {}
      }, 700);
      // Note: we intentionally don't clear teardownTimer here — its callback only
      // touches the locally-scoped nodes, so it's safe even if the component
      // remounts a new tone in the meantime.
      void teardownTimer;
    };
  }, [enabled]);

  // Close the AudioContext on unmount
  useEffect(() => {
    return () => {
      try {
        if (ctxRef.current && ctxRef.current.state !== "closed") {
          ctxRef.current.close();
        }
      } catch {}
    };
  }, []);
}

export default function WindDown() {
  useDocumentTitle("Bedtime Wind-Down");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [patternId, setPatternId] = useState("478");
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

  const pattern = useMemo(() => PATTERNS.find((p) => p.id === patternId) || PATTERNS[0], [patternId]);
  const currentStep = pattern.steps[stepIdx];
  const targetCycles = 6;

  useSoftTone(soundOn && running);

  // Gentle voice narration of each breath step (Web Speech API).
  // Pre-loads voices and speaks softly when a new step begins.
  useEffect(() => {
    if (!voiceOn || !running) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(currentStep.label);
      utter.rate = 0.75;
      utter.pitch = 0.85;
      utter.volume = 0.7;
      // Prefer a calm-sounding female voice if available
      const voices = synth.getVoices();
      const preferred = voices.find(v => /samantha|victoria|female|google uk english female/i.test(v.name))
        || voices.find(v => v.lang?.startsWith("en"))
        || voices[0];
      if (preferred) utter.voice = preferred;
      synth.speak(utter);
    } catch {}
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, [stepIdx, running, voiceOn, currentStep.label]);

  // Stop any narration when the user pauses or unmounts
  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  // Drive the breathing cycle
  useEffect(() => {
    if (!running) return;
    const ms = currentStep.seconds * 1000;
    const t = window.setTimeout(() => {
      const nextIdx = (stepIdx + 1) % pattern.steps.length;
      setStepIdx(nextIdx);
      if (nextIdx === 0) {
        setCyclesDone((c) => {
          const n = c + 1;
          if (n >= targetCycles) {
            setRunning(false);
            setShowReflection(true);
          }
          return n;
        });
      }
    }, ms);
    return () => window.clearTimeout(t);
  }, [running, stepIdx, pattern, currentStep.seconds]);

  function start() {
    setStepIdx(0);
    setCyclesDone(0);
    setShowReflection(false);
    setRunning(true);
  }
  function pause() { setRunning(false); }
  function resume() { setRunning(true); }
  function reset() {
    setRunning(false);
    setStepIdx(0);
    setCyclesDone(0);
    setShowReflection(false);
  }

  // Pick a reflection prompt that's stable for the session
  const reflection = useMemo(
    () => NIGHT_REFLECTIONS[Math.floor(Math.random() * NIGHT_REFLECTIONS.length)],
    [showReflection],
  );

  const friendlyName = user?.firstName || "friend";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bedtime wind-down breathing session"
      className="fixed inset-0 z-[100] overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white"
    >
      {/* Drifting starfield */}
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: i % 5 === 0 ? 3 : 1.5,
              height: i % 5 === 0 ? 3 : 1.5,
            }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 3 + (i % 5), repeat: Infinity, delay: (i % 7) * 0.4 }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2 text-white/90">
          <Moon className="w-5 h-5 text-indigo-300" />
          <span className="font-semibold">Bedtime Wind-Down</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceOn((v) => !v)}
            aria-label={voiceOn ? "Turn off voice guidance" : "Turn on voice guidance"}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            {voiceOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundOn((s) => !s)}
            aria-label={soundOn ? "Mute ambient tone" : "Play ambient tone"}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/home")}
            aria-label="Close wind-down"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main breathing area */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-4 pb-10" style={{ minHeight: "calc(100vh - 80px)" }}>
        {!showReflection ? (
          <>
            <p className="text-white/85 text-sm mb-2">Hi {friendlyName} — let's slow down together.</p>

            {/* Breath orb */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-8">
              {/* Outer halo */}
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/30 via-violet-400/20 to-rose-300/20 blur-2xl"
                animate={{ scale: running ? currentStep.scale : 1 }}
                transition={{ duration: currentStep.seconds, ease: "easeInOut" }}
              />
              {/* Inner orb */}
              <motion.div
                className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-indigo-300 via-violet-300 to-rose-200 shadow-[0_0_60px_rgba(165,180,252,0.5)]"
                animate={{ scale: running ? currentStep.scale : 1 }}
                transition={{ duration: currentStep.seconds, ease: "easeInOut" }}
              />
              {/* Step label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${stepIdx}-${cyclesDone}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="text-2xl sm:text-3xl font-light tracking-wide text-slate-900/80">
                      {running ? currentStep.label : "Press start"}
                    </div>
                    {running && (
                      <div className="text-xs uppercase tracking-widest text-slate-700/70 mt-1">
                        {currentStep.seconds}s
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Live region — announces breath step changes to screen readers */}
            <div role="status" aria-live="polite" className="sr-only">
              {running ? `${currentStep.label} for ${currentStep.seconds} seconds. Cycle ${cyclesDone + 1} of ${targetCycles}.` : "Paused."}
            </div>

            {/* Cycle progress */}
            <div className="flex items-center gap-1.5 mb-6">
              {Array.from({ length: targetCycles }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i < cyclesDone ? "bg-indigo-300" : "bg-white/30"}`}
                />
              ))}
              <span className="ml-3 text-xs text-white/80">{cyclesDone}/{targetCycles} cycles</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 mb-8">
              {!running && cyclesDone === 0 && (
                <Button onClick={start} className="bg-indigo-500 hover:bg-indigo-400 text-white">
                  <Play className="w-4 h-4 mr-1.5" /> Start
                </Button>
              )}
              {running && (
                <Button onClick={pause} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <Pause className="w-4 h-4 mr-1.5" /> Pause
                </Button>
              )}
              {!running && cyclesDone > 0 && cyclesDone < targetCycles && (
                <Button onClick={resume} className="bg-indigo-500 hover:bg-indigo-400 text-white">
                  <Play className="w-4 h-4 mr-1.5" /> Resume
                </Button>
              )}
              {(cyclesDone > 0 || running) && (
                <Button onClick={reset} variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
                </Button>
              )}
            </div>

            {/* Pattern picker */}
            <div className="w-full max-w-md">
              <p className="text-xs uppercase tracking-widest text-white/80 text-center mb-3">Pattern</p>
              <div className="grid grid-cols-3 gap-2">
                {PATTERNS.map((p) => {
                  const active = p.id === patternId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { if (!running) { setPatternId(p.id); setStepIdx(0); } }}
                      disabled={running}
                      className={`rounded-lg p-3 text-left text-xs transition-all border ${
                        active
                          ? "border-indigo-300 bg-indigo-500/20 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      } disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300`}
                      aria-pressed={active}
                    >
                      <div className="font-semibold mb-1">{p.name}</div>
                      <div className="text-[11px] opacity-80 leading-snug">{p.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          // Reflection screen
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-lg w-full"
          >
            <div className="text-6xl mb-6">🌙</div>
            <h2 className="text-2xl sm:text-3xl font-light mb-3">Beautifully done.</h2>
            <p className="text-white/70 mb-8">
              You took {targetCycles} slow breaths. Before you go, a gentle thought:
            </p>
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-6 mb-8">
              <Heart className="w-5 h-5 text-rose-300 mx-auto mb-3" />
              <p className="text-lg font-light italic">"{reflection}"</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Link href="/diary">Write it in your diary →</Link>
              </Button>
              <Button onClick={reset} className="bg-indigo-500 hover:bg-indigo-400 text-white">
                Breathe again
              </Button>
              <Button asChild variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                <Link href="/home">Goodnight</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
