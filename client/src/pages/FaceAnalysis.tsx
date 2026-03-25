import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera,
  CameraOff,
  RefreshCw,
  User,
  Brain,
  Smile,
  AlertCircle,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Wind,
  Sparkles,
  Clock,
} from "lucide-react";
import * as faceapi from "@vladmandic/face-api";

interface DetectionResult {
  age: number;
  ageRange: string;
  gender: string;
  genderProbability: number;
  expressions: Record<string, number>;
  dominantEmotion: string;
  dominantEmotionScore: number;
  timestamp: number;
}

interface EmotionEntry {
  emotion: string;
  score: number;
  timestamp: number;
}

interface SessionStats {
  totalFrames: number;
  emotionCounts: Record<string, number>;
  sessionStart: number;
}

const EMOTION_META: Record<string, { label: string; emoji: string; color: string; bg: string; tip: string; kindnessAction: string }> = {
  happy: {
    label: "Happy",
    emoji: "😊",
    color: "#f59e0b",
    bg: "from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
    tip: "Your happiness is contagious! Share a kind word or smile with someone nearby.",
    kindnessAction: "Share your joy — compliment someone today!",
  },
  sad: {
    label: "Sad",
    emoji: "😢",
    color: "#3b82f6",
    bg: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
    tip: "It's okay to feel sad. Take a deep breath and remember: this feeling will pass.",
    kindnessAction: "Be gentle with yourself. Consider journaling your thoughts.",
  },
  angry: {
    label: "Angry",
    emoji: "😠",
    color: "#ef4444",
    bg: "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20",
    tip: "Pause and breathe. Count to 10 before reacting. Anger is a signal to slow down.",
    kindnessAction: "Try the 4-7-8 breathing technique to find calm.",
  },
  fearful: {
    label: "Fearful",
    emoji: "😨",
    color: "#8b5cf6",
    bg: "from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20",
    tip: "Fear is natural. Identify what you can control and focus on small, safe steps.",
    kindnessAction: "Reach out to someone you trust — you're not alone.",
  },
  disgusted: {
    label: "Disgusted",
    emoji: "🤢",
    color: "#10b981",
    bg: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
    tip: "Pause and reflect. Your feelings are valid. Stepping away can bring clarity.",
    kindnessAction: "Take a short walk and reset your perspective.",
  },
  surprised: {
    label: "Surprised",
    emoji: "😲",
    color: "#f97316",
    bg: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",
    tip: "Surprise keeps life interesting! Embrace the unexpected with curiosity.",
    kindnessAction: "Stay open-minded — surprises often lead to growth.",
  },
  neutral: {
    label: "Neutral",
    emoji: "😐",
    color: "#94a3b8",
    bg: "from-slate-50 to-gray-50 dark:from-slate-800/30 dark:to-gray-800/30",
    tip: "A calm state is a powerful one. Use this clarity to focus on what matters.",
    kindnessAction: "Perfect time to check in with someone around you.",
  },
};

const BREATHING_EMOTIONS = ["angry", "fearful", "sad"];
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
  if (history.length < 3) return "stable";
  const recent = history.slice(-5);
  const currentCount = recent.filter((e) => e.emotion === current).length;
  if (currentCount >= 4) return "up";
  const prev = history.slice(-10, -5);
  const prevCount = prev.filter((e) => e.emotion === current).length;
  if (currentCount > prevCount) return "up";
  if (currentCount < prevCount) return "down";
  return "stable";
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remaining = s % 60;
  return `${m}m ${remaining}s`;
}

export default function FaceAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState("");
  const [fps, setFps] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breathCount, setBreathCount] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ totalFrames: 0, emotionCounts: {}, sessionStart: Date.now() });
  const [emotionHistory, setEmotionHistory] = useState<EmotionEntry[]>([]);
  const [now, setNow] = useState(Date.now());

  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(Date.now());
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update clock for session duration
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Breathing exercise logic
  useEffect(() => {
    if (!showBreathing) {
      if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
      return;
    }
    const cycle = async () => {
      setBreathPhase("inhale");
      breathTimerRef.current = setTimeout(() => {
        setBreathPhase("hold");
        breathTimerRef.current = setTimeout(() => {
          setBreathPhase("exhale");
          breathTimerRef.current = setTimeout(() => {
            setBreathCount((c) => c + 1);
            cycle();
          }, 4000);
        }, 4000);
      }, 4000);
    };
    cycle();
    return () => {
      if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    };
  }, [showBreathing]);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;
    setIsLoading(true);
    setError(null);
    setLoadProgress(0);
    try {
      setLoadingStep("Initializing AI engine…");
      const tf = (faceapi as any).tf;
      if (tf) {
        await tf.setBackend("webgl");
        await tf.ready();
      }
      setLoadProgress(10);

      setLoadingStep("Loading face detector (high accuracy)…");
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      setLoadProgress(35);

      setLoadingStep("Loading landmark detector…");
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadProgress(55);

      setLoadingStep("Loading age & gender model…");
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
      setLoadProgress(75);

      setLoadingStep("Loading emotion recognition…");
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setLoadProgress(100);

      setModelsLoaded(true);
      setLoadingStep("");
    } catch (err) {
      console.error("Model load error:", err);
      setError("Failed to load AI models. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [modelsLoaded]);

  useEffect(() => {
    loadModels();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setSessionStats({ totalFrames: 0, emotionCounts: {}, sessionStart: Date.now() });
      setEmotionHistory([]);
      startDetectionLoop();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera permissions in your browser.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please connect a camera and try again.");
      } else {
        setError("Could not access camera. Please try again.");
      }
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    setDetectionResult(null);
    setFaceDetected(false);
    setShowBreathing(false);
    setBreathCount(0);
  };

  const startDetectionLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(runDetection, 200);
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
        .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withAgeAndGender()
        .withFaceExpressions();

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
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
          age,
          ageRange: getAgeRange(age),
          gender: d.gender,
          genderProbability: d.genderProbability,
          expressions,
          dominantEmotion,
          dominantEmotionScore: dominantScore,
          timestamp: Date.now(),
        };

        setDetectionResult(result);
        setEmotionHistory((prev) => [...prev.slice(-49), { emotion: dominantEmotion, score: dominantScore, timestamp: Date.now() }]);
        setSessionStats((prev) => ({
          ...prev,
          totalFrames: prev.totalFrames + 1,
          emotionCounts: { ...prev.emotionCounts, [dominantEmotion]: (prev.emotionCounts[dominantEmotion] || 0) + 1 },
        }));

        // Draw on canvas
        drawDetections(ctx, resized, dominantEmotion, displaySize);
      } else {
        setFaceDetected(false);
      }

      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFpsTime.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTime.current = now;
      }
    } catch {}
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, detections: any[], dominantEmotion: string, size: { width: number; height: number }) => {
    const meta = EMOTION_META[dominantEmotion] || EMOTION_META.neutral;
    const boxColor = meta.color;

    detections.forEach((det) => {
      const box = det.detection.box;

      // Glow effect
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.shadowBlur = 0;

      // Corner accents
      const cs = 20;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = 8;
      const corners: [number, number, number, number, number, number][] = [
        [box.x, box.y, cs, 0, 0, cs],
        [box.x + box.width, box.y, -cs, 0, 0, cs],
        [box.x, box.y + box.height, cs, 0, 0, -cs],
        [box.x + box.width, box.y + box.height, -cs, 0, 0, -cs],
      ];
      corners.forEach(([x, y, dx1, dy1, dx2, dy2]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx1, y + dy1);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx2, y + dy2);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Face landmarks — draw key groups
      if (det.landmarks) {
        const positions = det.landmarks.positions;
        const groups = [
          { pts: positions.slice(0, 17), close: false, color: "rgba(255,255,255,0.4)" },   // jaw
          { pts: positions.slice(17, 22), close: false, color: "rgba(180,160,255,0.6)" },  // left brow
          { pts: positions.slice(22, 27), close: false, color: "rgba(180,160,255,0.6)" },  // right brow
          { pts: positions.slice(27, 36), close: false, color: "rgba(100,200,255,0.6)" },  // nose bridge
          { pts: positions.slice(36, 42), close: true, color: "rgba(100,220,200,0.7)" },   // left eye
          { pts: positions.slice(42, 48), close: true, color: "rgba(100,220,200,0.7)" },   // right eye
          { pts: positions.slice(48, 60), close: true, color: `${boxColor}aa` },            // outer mouth
          { pts: positions.slice(60, 68), close: true, color: `${boxColor}88` },            // inner mouth
        ];

        groups.forEach(({ pts, close, color }) => {
          if (!pts || pts.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          pts.slice(1).forEach((p: { x: number; y: number }) => ctx.lineTo(p.x, p.y));
          if (close) ctx.closePath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });

        // Landmark dots
        positions.forEach((pt: { x: number; y: number }) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fill();
        });
      }

      // Label pill
      const gender = det.gender === "male" ? "♂" : "♀";
      const age = Math.round(det.age);
      const emoMeta = EMOTION_META[dominantEmotion] || EMOTION_META.neutral;
      const label = `${emoMeta.emoji} ${emoMeta.label}  ${gender} ~${age}y`;
      ctx.font = "bold 15px Inter, sans-serif";
      const tw = ctx.measureText(label).width;
      const lx = box.x;
      const ly = box.y > 40 ? box.y - 12 : box.y + box.height + 26;

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(lx - 6, ly - 20, tw + 16, 28, 8);
      ctx.fill();

      // Colored left bar on label
      ctx.fillStyle = boxColor;
      ctx.beginPath();
      ctx.roundRect(lx - 6, ly - 20, 4, 28, [8, 0, 0, 8]);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, lx + 4, ly);
    });
  };

  const topEmotionForSession = sessionStats.totalFrames > 0
    ? Object.entries(sessionStats.emotionCounts).sort(([, a], [, b]) => b - a)[0]
    : null;

  const trend = detectionResult ? getTrend(emotionHistory, detectionResult.dominantEmotion) : "stable";

  const currentMeta = detectionResult ? (EMOTION_META[detectionResult.dominantEmotion] || EMOTION_META.neutral) : null;

  const sortedExpressions = detectionResult
    ? Object.entries(detectionResult.expressions).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Emotional Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3">
            Check Your Emotion
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Real-time face analysis powered by deep learning — discover your age estimate, gender, and emotional state with 68-point facial landmark tracking.
          </p>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid xl:grid-cols-7 gap-6">

          {/* Camera — 4 cols */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="w-5 h-5 text-violet-500" />
                  Live Camera Feed
                </CardTitle>
                <div className="flex items-center gap-3">
                  {cameraActive && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {fps} fps · {formatDuration(now - sessionStats.sessionStart)}
                    </span>
                  )}
                  {cameraActive ? (
                    <Button variant="outline" size="sm" onClick={stopCamera} className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <CameraOff className="w-4 h-4 mr-1.5" /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={startCamera} disabled={isLoading}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
                      <Camera className="w-4 h-4 mr-1.5" /> Start Camera
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
                  <video ref={videoRef} muted playsInline className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`} />
                  <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${cameraActive ? "block" : "hidden"}`} />

                  {/* Placeholder */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center gap-5 py-16 px-8 w-full">
                      {isLoading ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
                            <RefreshCw className="w-12 h-12 text-violet-400" />
                          </motion.div>
                          <div className="w-full max-w-xs">
                            <p className="text-sm text-slate-300 text-center mb-2">{loadingStep}</p>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <motion.div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                                animate={{ width: `${loadProgress}%` }} transition={{ duration: 0.5 }} />
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-1">{loadProgress}%</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                            <Camera className="w-12 h-12 text-slate-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-white font-medium mb-1">
                              {modelsLoaded ? "AI Models Ready" : "Loading Models…"}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {modelsLoaded ? 'Click "Start Camera" to begin analysis' : "Please wait…"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* No face */}
                  {cameraActive && !faceDetected && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-2 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm border border-white/10">
                        👀 No face detected — look at the camera
                      </span>
                    </div>
                  )}

                  {/* Breathing overlay */}
                  <AnimatePresence>
                    {showBreathing && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                        <p className="text-white text-lg font-medium">Breathing Exercise</p>
                        <motion.div
                          animate={{ scale: breathPhase === "inhale" ? 1.5 : breathPhase === "hold" ? 1.5 : 1 }}
                          transition={{ duration: 4, ease: "easeInOut" }}
                          className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.6)]"
                        >
                          <Wind className="w-10 h-10 text-white" />
                        </motion.div>
                        <p className="text-violet-300 text-2xl font-bold capitalize">{breathPhase}</p>
                        <p className="text-slate-400 text-sm">Cycle {breathCount + 1} of 3</p>
                        {breathCount >= 3 && (
                          <Button size="sm" variant="outline" onClick={() => { setShowBreathing(false); setBreathCount(0); }}
                            className="border-violet-400 text-violet-300">Done</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setShowBreathing(false); setBreathCount(0); }}
                          className="text-slate-400 text-xs">Skip</Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>

            {/* Privacy + capabilities */}
            <div className="flex flex-wrap gap-3 justify-center">
              {["🔒 100% browser-only, no data sent", "🎯 68-point face landmarks", "🧬 SSD MobileNet detector", "⚡ Real-time at 5fps+"].map((t) => (
                <span key={t} className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Right panel — 3 cols */}
          <div className="xl:col-span-3 space-y-4">

            {/* Dominant Emotion Card */}
            <AnimatePresence mode="wait">
              {detectionResult && currentMeta ? (
                <motion.div key={detectionResult.dominantEmotion} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <Card className={`bg-gradient-to-br ${currentMeta.bg} border-2 shadow-lg overflow-hidden`}
                    style={{ borderColor: `${currentMeta.color}55` }}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Current Emotion</p>
                          <div className="flex items-center gap-2">
                            <span className="text-5xl">{currentMeta.emoji}</span>
                            <div>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentMeta.label}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                  style={{ background: currentMeta.color }}>
                                  {Math.round(detectionResult.dominantEmotionScore * 100)}% confidence
                                </span>
                                {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                                {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                                {trend === "stable" && <Minus className="w-3.5 h-3.5 text-slate-400" />}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Age Range</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-white">{detectionResult.ageRange}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-lg">{detectionResult.gender === "male" ? "♂️" : "♀️"}</span>
                            <span className="text-sm capitalize text-slate-600 dark:text-slate-300">{detectionResult.gender}</span>
                            <span className="text-xs text-slate-400">({Math.round(detectionResult.genderProbability * 100)}%)</span>
                          </div>
                        </div>
                      </div>

                      {/* Wellness tip */}
                      <div className="flex items-start gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-xl">
                        <Heart className="w-4 h-4 mt-0.5 shrink-0" style={{ color: currentMeta.color }} />
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{currentMeta.tip}</p>
                      </div>

                      {BREATHING_EMOTIONS.includes(detectionResult.dominantEmotion) && !showBreathing && (
                        <Button size="sm" className="w-full mt-3 text-white" style={{ background: currentMeta.color }}
                          onClick={() => { setShowBreathing(true); setBreathCount(0); }}>
                          <Wind className="w-3.5 h-3.5 mr-1.5" /> Try Breathing Exercise
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardContent className="p-5 text-center py-10 text-slate-400">
                    <Smile className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{cameraActive ? "Detecting your emotion…" : "Start camera to check your emotion"}</p>
                  </CardContent>
                </Card>
              )}
            </AnimatePresence>

            {/* All Emotions Breakdown */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="w-4 h-4 text-purple-500" />
                  Full Emotion Spectrum
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detectionResult ? (
                  sortedExpressions.map(([emotion, score], i) => {
                    const m = EMOTION_META[emotion] || EMOTION_META.neutral;
                    return (
                      <motion.div key={emotion} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{m.emoji}</span><span>{m.label}</span>
                          </span>
                          <span className="text-xs font-medium text-slate-500">{Math.round(score * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <motion.div className="h-2 rounded-full transition-all"
                            style={{ background: m.color, width: `${score * 100}%` }}
                            initial={{ width: 0 }} animate={{ width: `${score * 100}%` }}
                            transition={{ duration: 0.4 }} />
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Emotion data will appear here</p>
                )}
              </CardContent>
            </Card>

            {/* Session Summary */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Session Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionStats.totalFrames > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{sessionStats.totalFrames}</p>
                        <p className="text-xs text-slate-500">Frames analyzed</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatDuration(now - sessionStats.sessionStart)}</p>
                        <p className="text-xs text-slate-500">Session duration</p>
                      </div>
                    </div>

                    {topEmotionForSession && (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                        <span className="text-2xl">{EMOTION_META[topEmotionForSession[0]]?.emoji}</span>
                        <div>
                          <p className="text-xs text-slate-500">Dominant this session</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white capitalize">
                            {EMOTION_META[topEmotionForSession[0]]?.label || topEmotionForSession[0]}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <p className="text-xs text-slate-400">{Math.round((topEmotionForSession[1] / sessionStats.totalFrames) * 100)}% of time</p>
                        </div>
                      </div>
                    )}

                    {/* Emotion mini-history */}
                    {emotionHistory.length > 3 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Recent emotion history</p>
                        <div className="flex gap-1 flex-wrap">
                          {emotionHistory.slice(-20).map((entry, i) => {
                            const m = EMOTION_META[entry.emotion] || EMOTION_META.neutral;
                            return (
                              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                                title={m.label} className="text-base cursor-default" style={{ opacity: 0.4 + (i / 20) * 0.6 }}>
                                {m.emoji}
                              </motion.span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Kindness action */}
                    {detectionResult && currentMeta && (
                      <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                        <Sparkles className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-violet-700 dark:text-violet-200">{currentMeta.kindnessAction}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {cameraActive ? "Gathering session data…" : "Session stats appear after starting the camera"}
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
