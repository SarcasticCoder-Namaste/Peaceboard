import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, RefreshCw, Brain, Smile, AlertCircle,
  Heart, TrendingUp, TrendingDown, Minus, Wind, Sparkles,
  Clock, Download, Music, BarChart3, Activity, Shield,
} from "lucide-react";
import * as faceapi from "@vladmandic/face-api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DetectionResult {
  age: number; ageRange: string; gender: string; genderProbability: number;
  expressions: Record<string, number>; dominantEmotion: string;
  dominantEmotionScore: number; timestamp: number;
}
interface EmotionEntry { emotion: string; score: number; timestamp: number; }
interface SessionStats { totalFrames: number; emotionCounts: Record<string, number>; sessionStart: number; }

// ─── Emotion metadata ─────────────────────────────────────────────────────────
const EMOTION_META: Record<string, {
  label: string; emoji: string; color: string; bg: string;
  tip: string; breathTip: string; musicGenre: string; wellnessScore: number;
  coping: string[]; affirmation: string;
}> = {
  happy: {
    label: "Happy", emoji: "😊", color: "#f59e0b",
    bg: "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
    tip: "Your happiness is contagious! Share a kind word or smile with someone nearby.",
    breathTip: "Take a deep breath of gratitude — breathe in for 4, hold for 4, breathe out for 4.",
    musicGenre: "uplifting instrumental",
    wellnessScore: 90,
    coping: ["Share your joy with a friend", "Write down what made you happy", "Do something kind for someone"],
    affirmation: "You radiate warmth and positive energy. Keep shining! ✨",
  },
  sad: {
    label: "Sad", emoji: "😢", color: "#3b82f6",
    bg: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
    tip: "It's okay to feel sad. Take a deep breath and remember: this feeling will pass.",
    breathTip: "Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 times.",
    musicGenre: "calming meditation",
    wellnessScore: 35,
    coping: ["Journal your feelings for 5 minutes", "Reach out to someone you trust", "Take a gentle walk outside"],
    affirmation: "Your feelings are valid. You have the strength to move through this. 💙",
  },
  angry: {
    label: "Angry", emoji: "😠", color: "#ef4444",
    bg: "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20",
    tip: "Pause and breathe. Count to 10 before reacting. Anger is a signal to slow down.",
    breathTip: "Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. This activates your calm response.",
    musicGenre: "soothing nature sounds",
    wellnessScore: 25,
    coping: ["Step away and take 10 slow breaths", "Write down what you're feeling", "Physical activity helps release tension"],
    affirmation: "You are in control. This anger is information, not your identity. 🔥→🌊",
  },
  fearful: {
    label: "Fearful", emoji: "😨", color: "#8b5cf6",
    bg: "from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20",
    tip: "Fear is natural. Identify what you can control and focus on small, safe steps.",
    breathTip: "Try grounding: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
    musicGenre: "peaceful ambient",
    wellnessScore: 30,
    coping: ["Practice the 5-4-3-2-1 grounding technique", "Reach out to someone you trust", "Remind yourself of past challenges you overcame"],
    affirmation: "You are safe right now. Courage is not the absence of fear — it's moving forward anyway. 🌟",
  },
  disgusted: {
    label: "Disgusted", emoji: "🤢", color: "#10b981",
    bg: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
    tip: "Pause and reflect. Your feelings are valid. Stepping away can bring clarity.",
    breathTip: "Take a slow, cleansing breath. Exhale any tension. Refresh your perspective.",
    musicGenre: "nature ambient",
    wellnessScore: 30,
    coping: ["Remove yourself from the triggering situation", "Take a short mindful walk", "Identify the underlying need behind the feeling"],
    affirmation: "Your boundaries are valid. It's okay to remove yourself from what doesn't serve you. 🌿",
  },
  surprised: {
    label: "Surprised", emoji: "😲", color: "#f97316",
    bg: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",
    tip: "Surprise keeps life interesting! Embrace the unexpected with curiosity.",
    breathTip: "Take a grounding breath to process the surprise. Breathe slowly and center yourself.",
    musicGenre: "uplifting instrumental",
    wellnessScore: 65,
    coping: ["Give yourself a moment to process", "Stay open-minded — surprises often lead to growth", "Share the surprise with someone close"],
    affirmation: "Life is full of wonderful unexpected moments. Stay curious and open! 🌈",
  },
  neutral: {
    label: "Neutral", emoji: "😐", color: "#94a3b8",
    bg: "from-slate-50 to-gray-50 dark:from-slate-800/30 dark:to-gray-800/30",
    tip: "A calm state is a powerful one. Use this clarity to focus on what matters.",
    breathTip: "This calm state is ideal for mindfulness. Try breathing in for 5, out for 5.",
    musicGenre: "focus ambient",
    wellnessScore: 60,
    coping: ["This is a great state for reflection", "Set an intention for the rest of your day", "Check in with a friend"],
    affirmation: "Calm and centered — you're in a great state to think clearly and act with intention. 🎯",
  },
};

const MUSIC_RECS: Record<string, { text: string; category: string }> = {
  happy: { text: "Uplifting instrumentals to amplify your good mood", category: "instrumental" },
  sad: { text: "Gentle meditation music to comfort and soothe", category: "meditation" },
  angry: { text: "Calming nature sounds to release tension", category: "nature" },
  fearful: { text: "Peaceful ambient tones for grounding and safety", category: "ambient" },
  disgusted: { text: "Forest sounds and nature ambience to reset", category: "nature" },
  surprised: { text: "Soft instrumentals to help you settle", category: "instrumental" },
  neutral: { text: "Focus ambient music to channel your clarity", category: "ambient" },
};

const BREATHING_EMOTIONS = ["angry", "fearful", "sad", "disgusted"];
const MODEL_URL = "/models";

function getAgeRange(age: number): string {
  if (age < 5) return "0–5 yrs";
  if (age < 13) return `${Math.max(0, age - 2)}–${age + 2} yrs`;
  if (age < 20) return `${Math.max(13, age - 2)}–${Math.min(19, age + 2)} yrs`;
  if (age < 30) return `${Math.max(20, age - 3)}–${age + 3} yrs`;
  if (age < 60) return `${age - 5}–${age + 5} yrs`;
  return `${age - 5}+ yrs`;
}

function getTrend(history: EmotionEntry[], current: string): "up" | "down" | "stable" {
  if (history.length < 5) return "stable";
  const recent = history.slice(-5);
  const currentCount = recent.filter(e => e.emotion === current).length;
  if (currentCount >= 4) return "up";
  const prev = history.slice(-10, -5);
  const prevCount = prev.filter(e => e.emotion === current).length;
  if (currentCount > prevCount) return "up";
  if (currentCount < prevCount) return "down";
  return "stable";
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Wellness Score Circle ────────────────────────────────────────────────────
function WellnessGauge({ score }: { score: number }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-24 h-24 flex items-center justify-center mx-auto">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{score}</p>
        <p className="text-xs text-slate-400">/ 100</p>
      </div>
    </div>
  );
}

// ─── Emotion Timeline ─────────────────────────────────────────────────────────
function EmotionTimeline({ history }: { history: EmotionEntry[] }) {
  const recent = history.slice(-30);
  if (recent.length === 0) return <p className="text-xs text-slate-400 text-center py-3">Timeline appears after detection starts</p>;
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 h-12">
        {recent.map((e, i) => {
          const m = EMOTION_META[e.emotion] || EMOTION_META.neutral;
          return (
            <motion.div key={i} title={`${m.label} ${Math.round(e.score * 100)}%`}
              className="flex-1 rounded-t cursor-default transition-all"
              style={{ background: m.color, opacity: 0.3 + (i / recent.length) * 0.7 }}
              initial={{ height: 0 }} animate={{ height: `${e.score * 100}%` }} />
          );
        })}
      </div>
      <div className="flex gap-0.5 flex-wrap">
        {recent.slice(-10).map((e, i) => {
          const m = EMOTION_META[e.emotion] || EMOTION_META.neutral;
          return <span key={i} className="text-base" title={m.label}>{m.emoji}</span>;
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FaceAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breathCount, setBreathCount] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ totalFrames: 0, emotionCounts: {}, sessionStart: Date.now() });
  const [emotionHistory, setEmotionHistory] = useState<EmotionEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);

  const frameCountRef = useRef(0);
  const lastFpsRef = useRef(Date.now());

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Breathing cycle
  useEffect(() => {
    if (!showBreathing) { if (breathTimerRef.current) clearTimeout(breathTimerRef.current); return; }
    const cycle = () => {
      setBreathPhase("inhale");
      breathTimerRef.current = setTimeout(() => {
        setBreathPhase("hold");
        breathTimerRef.current = setTimeout(() => {
          setBreathPhase("exhale");
          breathTimerRef.current = setTimeout(() => { setBreathCount(c => c + 1); cycle(); }, 4000);
        }, 4000);
      }, 4000);
    };
    cycle();
    return () => { if (breathTimerRef.current) clearTimeout(breathTimerRef.current); };
  }, [showBreathing]);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;
    setIsLoading(true); setError(null); setLoadProgress(0);
    try {
      setLoadingStep("Initializing WebGL AI engine…");
      const tf = (faceapi as any).tf;
      if (tf) { await tf.setBackend("webgl"); await tf.ready(); }
      setLoadProgress(10);

      setLoadingStep("Face detector (SSD MobileNet)…");
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      setLoadProgress(35);

      setLoadingStep("68-point landmark detector…");
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadProgress(58);

      setLoadingStep("Age & gender model…");
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
      setLoadProgress(80);

      setLoadingStep("Emotion recognition model…");
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setLoadProgress(100);

      setModelsLoaded(true); setLoadingStep("");
    } catch (err) {
      setError("Failed to load AI models. Please refresh and try again.");
    } finally { setIsLoading(false); }
  }, [modelsLoaded]);

  useEffect(() => { loadModels(); return () => stopCamera(); }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraActive(true);
      setSessionStats({ totalFrames: 0, emotionCounts: {}, sessionStart: Date.now() });
      setEmotionHistory([]);
      setSnapshotDataUrl(null);
      startDetectionLoop();
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Camera access denied. Please allow camera permissions.");
      else if (err.name === "NotFoundError") setError("No camera found. Please connect a camera.");
      else setError("Could not access camera. Please try again.");
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (canvasRef.current) { canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
    setCameraActive(false); setDetectionResult(null); setFaceDetected(false); setShowBreathing(false); setBreathCount(0);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = videoRef.current.videoWidth;
    offscreen.height = videoRef.current.videoHeight;
    const ctx = offscreen.getContext("2d")!;
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(videoRef.current, -offscreen.width, 0); ctx.restore();
    ctx.drawImage(canvasRef.current, 0, 0);
    setSnapshotDataUrl(offscreen.toDataURL("image/jpeg", 0.9));
  };

  const downloadSnapshot = () => {
    if (!snapshotDataUrl) return;
    const a = document.createElement("a"); a.href = snapshotDataUrl;
    a.download = `emotion-snapshot-${Date.now()}.jpg`; a.click();
  };

  const startDetectionLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(runDetection, 180);
  };

  const runDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
    if (videoRef.current.readyState < 2) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
        .withFaceLandmarks().withAgeAndGender().withFaceExpressions();

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const resized = faceapi.resizeResults(detections, displaySize);

      if (resized.length > 0) {
        setFaceDetected(true);
        const d = resized[0];
        const expressions = d.expressions as unknown as Record<string, number>;
        const sorted = Object.entries(expressions).sort(([, a], [, b]) => b - a);
        const [dominantEmotion, dominantScore] = sorted[0];
        const age = Math.round(d.age);

        const result: DetectionResult = {
          age, ageRange: getAgeRange(age), gender: d.gender,
          genderProbability: d.genderProbability, expressions,
          dominantEmotion, dominantEmotionScore: dominantScore, timestamp: Date.now(),
        };

        setDetectionResult(result);
        setEmotionHistory(prev => [...prev.slice(-59), { emotion: dominantEmotion, score: dominantScore, timestamp: Date.now() }]);
        setSessionStats(prev => ({
          ...prev, totalFrames: prev.totalFrames + 1,
          emotionCounts: { ...prev.emotionCounts, [dominantEmotion]: (prev.emotionCounts[dominantEmotion] || 0) + 1 },
        }));

        drawDetections(ctx, resized, dominantEmotion, displaySize);
      } else { setFaceDetected(false); }

      frameCountRef.current++;
      const n = Date.now();
      if (n - lastFpsRef.current >= 1000) { setFps(frameCountRef.current); frameCountRef.current = 0; lastFpsRef.current = n; }
    } catch {}
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, detections: any[], dominantEmotion: string, size: { width: number; height: number }) => {
    const meta = EMOTION_META[dominantEmotion] || EMOTION_META.neutral;
    const boxColor = meta.color;

    detections.forEach(det => {
      const box = det.detection.box;

      // Bounding box with glow
      ctx.shadowColor = boxColor; ctx.shadowBlur = 18;
      ctx.strokeStyle = boxColor; ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.shadowBlur = 0;

      // Corner decorators
      const cs = 18; ctx.lineWidth = 4; ctx.strokeStyle = "#fff";
      const corners: [number, number, number, number, number, number][] = [
        [box.x, box.y, cs, 0, 0, cs], [box.x + box.width, box.y, -cs, 0, 0, cs],
        [box.x, box.y + box.height, cs, 0, 0, -cs], [box.x + box.width, box.y + box.height, -cs, 0, 0, -cs],
      ];
      corners.forEach(([x, y, dx1, dy1, dx2, dy2]) => {
        ctx.beginPath(); ctx.shadowColor = boxColor; ctx.shadowBlur = 8;
        ctx.moveTo(x + dx1, y + dy1); ctx.lineTo(x, y); ctx.lineTo(x + dx2, y + dy2); ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Landmarks
      if (det.landmarks) {
        const pos = det.landmarks.positions;
        const groups = [
          { pts: pos.slice(0, 17), close: false, color: "rgba(255,255,255,0.35)" },
          { pts: pos.slice(17, 22), close: false, color: "rgba(180,160,255,0.65)" },
          { pts: pos.slice(22, 27), close: false, color: "rgba(180,160,255,0.65)" },
          { pts: pos.slice(27, 36), close: false, color: "rgba(100,200,255,0.6)" },
          { pts: pos.slice(36, 42), close: true, color: "rgba(100,220,200,0.75)" },
          { pts: pos.slice(42, 48), close: true, color: "rgba(100,220,200,0.75)" },
          { pts: pos.slice(48, 60), close: true, color: `${boxColor}bb` },
          { pts: pos.slice(60, 68), close: true, color: `${boxColor}88` },
        ];
        groups.forEach(({ pts, close, color }) => {
          if (!pts?.length) return;
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          pts.slice(1).forEach((p: any) => ctx.lineTo(p.x, p.y));
          if (close) ctx.closePath();
          ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
        });
        pos.forEach((pt: any) => {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fill();
        });
      }

      // Label pill
      const gender = det.gender === "male" ? "♂" : "♀";
      const age = Math.round(det.age);
      const label = `${meta.emoji} ${meta.label}  ${gender} ~${age}y`;
      ctx.font = "bold 14px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const lx = box.x; const ly = box.y > 40 ? box.y - 12 : box.y + box.height + 26;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath(); (ctx as any).roundRect(lx - 6, ly - 20, tw + 16, 28, 8); ctx.fill();
      ctx.fillStyle = boxColor;
      ctx.beginPath(); (ctx as any).roundRect(lx - 6, ly - 20, 4, 28, [8, 0, 0, 8]); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.shadowBlur = 0; ctx.fillText(label, lx + 4, ly);

      // Confidence bar (below box)
      const confBarY = box.y + box.height + 6;
      const confBarW = box.width;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      (ctx as any).roundRect(box.x, confBarY, confBarW, 5, 3); ctx.fill();
      ctx.fillStyle = boxColor;
      (ctx as any).roundRect(box.x, confBarY, confBarW * det.expressions[dominantEmotion], 5, 3); ctx.fill();
    });
  };

  const topEmotionForSession = sessionStats.totalFrames > 0
    ? Object.entries(sessionStats.emotionCounts).sort(([, a], [, b]) => b - a)[0]
    : null;
  const trend = detectionResult ? getTrend(emotionHistory, detectionResult.dominantEmotion) : "stable";
  const currentMeta = detectionResult ? (EMOTION_META[detectionResult.dominantEmotion] || EMOTION_META.neutral) : null;
  const sortedExpressions = detectionResult ? Object.entries(detectionResult.expressions).sort(([, a], [, b]) => b - a) : [];
  const musicRec = detectionResult ? MUSIC_RECS[detectionResult.dominantEmotion] : null;
  const wellnessScore = detectionResult ? Math.round(
    (EMOTION_META[detectionResult.dominantEmotion]?.wellnessScore || 60) *
    (0.5 + 0.5 * detectionResult.dominantEmotionScore)
  ) : 0;

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> AI-Powered Emotional Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3">Check Your Emotion</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Real-time face analysis with 68-point landmark tracking, age & gender estimation, and emotion-based wellness coaching — all processed locally in your browser.
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-5 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid xl:grid-cols-7 gap-5">

          {/* ── Camera Panel (4 cols) ────────────────────────────── */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="w-5 h-5 text-violet-500" /> Live Camera
                  {cameraActive && (
                    <span className="flex items-center gap-1.5 text-xs font-normal text-slate-400">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      {fps} fps · {fmt(now - sessionStats.sessionStart)}
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {cameraActive && faceDetected && (
                    <Button variant="outline" size="sm" onClick={takeSnapshot} className="text-xs h-8 gap-1">
                      <Download className="w-3.5 h-3.5" /> Snapshot
                    </Button>
                  )}
                  {cameraActive ? (
                    <Button variant="outline" size="sm" onClick={stopCamera} className="border-red-300 text-red-600 hover:bg-red-50 h-8">
                      <CameraOff className="w-3.5 h-3.5 mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={startCamera} disabled={isLoading}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 h-8">
                      <Camera className="w-3.5 h-3.5 mr-1" /> Start Camera
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
                  <video ref={videoRef} muted playsInline className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                    style={{ transform: "scaleX(-1)" }} />
                  <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${cameraActive ? "block" : "hidden"}`}
                    style={{ transform: "scaleX(-1)" }} />

                  {/* Placeholder */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center gap-5 py-14 px-8 w-full">
                      {isLoading ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
                            <RefreshCw className="w-12 h-12 text-violet-400" />
                          </motion.div>
                          <div className="w-full max-w-xs">
                            <p className="text-sm text-slate-300 text-center mb-2">{loadingStep}</p>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <motion.div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                                animate={{ width: `${loadProgress}%` }} />
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-1">{loadProgress}%</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                            <Smile className="w-12 h-12 text-slate-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-white font-semibold mb-1">{modelsLoaded ? "🟢 AI Ready" : "Loading AI…"}</p>
                            <p className="text-slate-400 text-sm">{modelsLoaded ? 'Click "Start Camera" to begin' : "Please wait while models load…"}</p>
                          </div>
                          {modelsLoaded && (
                            <div className="flex flex-wrap gap-2 justify-center">
                              {["Face detector", "68 landmarks", "Age & gender", "7 emotions"].map(t => (
                                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-green-900/40 text-green-400 border border-green-800">{t} ✓</span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {cameraActive && !faceDetected && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-2 bg-black/70 text-white text-xs rounded-full backdrop-blur border border-white/10">
                        👀 Face not detected — look directly at camera
                      </span>
                    </motion.div>
                  )}

                  {/* Breathing overlay */}
                  <AnimatePresence>
                    {showBreathing && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-5">
                        <p className="text-white text-base font-semibold">Guided Breathing</p>
                        <div className="text-center mb-1">
                          <p className="text-slate-300 text-xs">
                            {breathPhase === "inhale" ? "🌬️ Breathe slowly in through your nose…"
                              : breathPhase === "hold" ? "⏸️ Hold gently…"
                              : "💨 Exhale fully through your mouth…"}
                          </p>
                        </div>
                        <motion.div
                          animate={{ scale: breathPhase === "inhale" ? 1.6 : breathPhase === "hold" ? 1.6 : 1 }}
                          transition={{ duration: 4, ease: "easeInOut" }}
                          className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.7)]">
                          <Wind className="w-10 h-10 text-white" />
                        </motion.div>
                        <p className="text-violet-200 text-2xl font-bold capitalize">{breathPhase}</p>
                        <div className="flex gap-1">{[...Array(3)].map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-full ${i < breathCount ? "bg-green-400" : "bg-slate-600"}`} />
                        ))}</div>
                        <p className="text-slate-400 text-xs">Cycle {Math.min(breathCount + 1, 3)} of 3</p>
                        <Button size="sm" variant="ghost" onClick={() => { setShowBreathing(false); setBreathCount(0); }}
                          className="text-slate-400 text-xs">End Exercise</Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Snapshot preview */}
                <AnimatePresence>
                  {snapshotDataUrl && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }}
                      className="p-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <img src={snapshotDataUrl} alt="Snapshot" className="w-20 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700 dark:text-white">Snapshot captured!</p>
                          <p className="text-xs text-slate-400 mt-0.5">Save it with the emotion overlay</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={downloadSnapshot} className="gap-1 h-8 text-xs">
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Privacy badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {["🔒 100% browser-local", "🎯 68-point landmarks", "🧬 SSD MobileNet", "⚡ Real-time detection", "👁️ 7 emotions detected"].map(t => (
                <span key={t} className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">{t}</span>
              ))}
            </div>

            {/* Emotion timeline */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-blue-500" /> Emotion Timeline
                  <span className="text-xs font-normal text-slate-400 ml-auto">Last 30 frames</span>
                </CardTitle>
              </CardHeader>
              <CardContent><EmotionTimeline history={emotionHistory} /></CardContent>
            </Card>
          </div>

          {/* ── Right Panel (3 cols) ──────────────────────────── */}
          <div className="xl:col-span-3 space-y-4">

            {/* Wellness Score */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <WellnessGauge score={detectionResult ? wellnessScore : 0} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Wellness Score</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {!detectionResult ? "–" : wellnessScore >= 70 ? "😊 Feeling Good!" : wellnessScore >= 45 ? "😐 Moderate" : "💙 Needs Care"}
                    </p>
                    {currentMeta && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed italic">{currentMeta.affirmation}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dominant Emotion Card */}
            <AnimatePresence mode="wait">
              {detectionResult && currentMeta ? (
                <motion.div key={detectionResult.dominantEmotion} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <Card className={`bg-gradient-to-br ${currentMeta.bg} border-2 shadow-lg`}
                    style={{ borderColor: `${currentMeta.color}44` }}>
                    <CardContent className="p-5 space-y-4">
                      {/* Main */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Detected Emotion</p>
                          <div className="flex items-center gap-3">
                            <span className="text-5xl">{currentMeta.emoji}</span>
                            <div>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentMeta.label}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge className="text-xs text-white px-2" style={{ background: currentMeta.color }}>
                                  {Math.round(detectionResult.dominantEmotionScore * 100)}% confidence
                                </Badge>
                                {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                                {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                                {trend === "stable" && <Minus className="w-3.5 h-3.5 text-slate-400" />}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-0.5">Estimate</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-white">{detectionResult.ageRange}</p>
                          <p className="text-sm text-slate-500 capitalize">
                            {detectionResult.gender === "male" ? "♂" : "♀"} {detectionResult.gender}
                            <span className="text-xs text-slate-400 ml-1">({Math.round(detectionResult.genderProbability * 100)}%)</span>
                          </p>
                        </div>
                      </div>

                      {/* Tip */}
                      <div className="flex items-start gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-xl">
                        <Heart className="w-4 h-4 mt-0.5 shrink-0" style={{ color: currentMeta.color }} />
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{currentMeta.tip}</p>
                      </div>

                      {/* Coping strategies */}
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Suggested Actions</p>
                        <div className="space-y-1.5">
                          {currentMeta.coping.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0 font-bold"
                                style={{ background: currentMeta.color }}>{i + 1}</span>
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>

                      {BREATHING_EMOTIONS.includes(detectionResult.dominantEmotion) && !showBreathing && (
                        <Button size="sm" className="w-full text-white" style={{ background: currentMeta.color }}
                          onClick={() => { setShowBreathing(true); setBreathCount(0); }}>
                          <Wind className="w-3.5 h-3.5 mr-1.5" /> Start Breathing Exercise
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-5 text-center py-10 text-slate-400">
                    <Smile className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{cameraActive ? "Detecting your emotion…" : "Start camera to begin"}</p>
                  </CardContent>
                </Card>
              )}
            </AnimatePresence>

            {/* Music Recommendation */}
            {musicRec && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wide mb-0.5">Music For Your Mood</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{musicRec.text}</p>
                      </div>
                      <Link href="/music">
                        <Button size="sm" className="bg-gradient-to-r from-green-500 to-teal-500 text-white h-8 text-xs shrink-0">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Emotion Spectrum Bars */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-purple-500" /> Full Emotion Spectrum
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {detectionResult ? sortedExpressions.map(([emotion, score], i) => {
                  const m = EMOTION_META[emotion] || EMOTION_META.neutral;
                  const pct = Math.round(score * 100);
                  return (
                    <div key={emotion}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                          <span>{m.emoji}</span> {m.label}
                          {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded-full text-white text-[10px]" style={{ background: m.color }}>dominant</span>}
                        </span>
                        <span className="text-xs font-bold" style={{ color: m.color }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                        <motion.div className="h-2.5 rounded-full"
                          style={{ background: m.color }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-slate-400 text-center py-4">Emotion spectrum appears during detection</p>
                )}
              </CardContent>
            </Card>

            {/* Session Stats */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-500" /> Session Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionStats.totalFrames > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{sessionStats.totalFrames}</p>
                        <p className="text-xs text-slate-400">Frames analyzed</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{fmt(now - sessionStats.sessionStart)}</p>
                        <p className="text-xs text-slate-400">Duration</p>
                      </div>
                    </div>

                    {topEmotionForSession && (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                        <span className="text-2xl">{EMOTION_META[topEmotionForSession[0]]?.emoji}</span>
                        <div className="flex-1">
                          <p className="text-xs text-slate-400">Dominant this session</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {EMOTION_META[topEmotionForSession[0]]?.label || topEmotionForSession[0]}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          {Math.round((topEmotionForSession[1] / sessionStats.totalFrames) * 100)}% of time
                        </p>
                      </div>
                    )}

                    {/* Mini breakdown */}
                    <div className="space-y-1">
                      {Object.entries(sessionStats.emotionCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([emotion, count]) => {
                          const m = EMOTION_META[emotion] || EMOTION_META.neutral;
                          const pct = Math.round((count / sessionStats.totalFrames) * 100);
                          return (
                            <div key={emotion} className="flex items-center gap-2">
                              <span className="text-sm w-5">{m.emoji}</span>
                              <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full" style={{ background: m.color, width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {cameraActive ? "Gathering session data…" : "Start camera to see session stats"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
