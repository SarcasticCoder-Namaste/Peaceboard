import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, RefreshCw, User, Brain, Smile, AlertCircle } from "lucide-react";
import * as faceapi from "@vladmandic/face-api";

interface DetectionResult {
  age: number;
  gender: string;
  genderProbability: number;
  expressions: Record<string, number>;
  dominantEmotion: string;
  dominantEmotionScore: number;
}

const EMOTION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  happy: { label: "Happy", emoji: "😊", color: "text-yellow-500" },
  sad: { label: "Sad", emoji: "😢", color: "text-blue-500" },
  angry: { label: "Angry", emoji: "😠", color: "text-red-500" },
  fearful: { label: "Fearful", emoji: "😨", color: "text-purple-500" },
  disgusted: { label: "Disgusted", emoji: "🤢", color: "text-green-600" },
  surprised: { label: "Surprised", emoji: "😲", color: "text-orange-500" },
  neutral: { label: "Neutral", emoji: "😐", color: "text-slate-500" },
};

const MODEL_URL = "/models";

export default function FaceAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState("");
  const [fps, setFps] = useState(0);
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(Date.now());

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;
    setIsLoading(true);
    setError(null);
    try {
      setLoadingStep("Initializing AI engine…");
      const tf = (faceapi as any).tf;
      if (tf) {
        await tf.setBackend("webgl");
        await tf.ready();
      }

      setLoadingStep("Loading face detector…");
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      setLoadingStep("Loading age & gender model…");
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);

      setLoadingStep("Loading expression model…");
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

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
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    setDetectionResult(null);
    setFaceDetected(false);
  };

  const startDetectionLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      await runDetection();
    }, 150);
  };

  const runDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
    if (videoRef.current.readyState < 2) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
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
        const dominant = Object.entries(expressions).sort(([, a], [, b]) => b - a)[0];

        setDetectionResult({
          age: Math.round(d.age),
          gender: d.gender,
          genderProbability: d.genderProbability,
          expressions,
          dominantEmotion: dominant[0],
          dominantEmotionScore: dominant[1],
        });

        resized.forEach((det) => {
          const box = det.detection.box;

          const emotionInfo = EMOTION_LABELS[dominant[0]] || EMOTION_LABELS.neutral;
          const boxColor = getBoxColor(dominant[0]);

          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = boxColor;
          ctx.shadowBlur = 12;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.shadowBlur = 0;

          const cornerSize = 16;
          ctx.lineWidth = 4;
          [
            [box.x, box.y, cornerSize, 0, 0, cornerSize],
            [box.x + box.width, box.y, -cornerSize, 0, 0, cornerSize],
            [box.x, box.y + box.height, cornerSize, 0, 0, -cornerSize],
            [box.x + box.width, box.y + box.height, -cornerSize, 0, 0, -cornerSize],
          ].forEach(([x, y, dx1, dy1, dx2, dy2]) => {
            ctx.beginPath();
            ctx.moveTo(x + dx1, y + dy1);
            ctx.lineTo(x, y);
            ctx.lineTo(x + dx2, y + dy2);
            ctx.stroke();
          });

          const labelText = `${emotionInfo.emoji} ${det.gender === "male" ? "♂" : "♀"} ~${Math.round(det.age)}y`;
          ctx.fillStyle = boxColor;
          ctx.font = "bold 16px Inter, sans-serif";
          const textWidth = ctx.measureText(labelText).width;
          const labelX = box.x;
          const labelY = box.y > 30 ? box.y - 10 : box.y + box.height + 24;

          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.beginPath();
          ctx.roundRect(labelX - 4, labelY - 18, textWidth + 12, 26, 6);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(labelText, labelX + 2, labelY);
        });
      } else {
        setFaceDetected(false);
        setDetectionResult(null);
      }

      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFpsTime.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTime.current = now;
      }
    } catch {
    }
  };

  const getBoxColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      happy: "#f59e0b",
      sad: "#3b82f6",
      angry: "#ef4444",
      fearful: "#8b5cf6",
      disgusted: "#10b981",
      surprised: "#f97316",
      neutral: "#94a3b8",
    };
    return colors[emotion] || "#6366f1";
  };

  const emotionBars = detectionResult
    ? Object.entries(detectionResult.expressions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium mb-4">
            <Camera className="w-4 h-4" />
            Live Computer Vision
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Face & Mood Analyzer
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            AI-powered real-time analysis of age, gender, and emotional state using your camera — processed entirely in your browser.
          </p>
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="w-5 h-5 text-violet-500" />
                  Live Feed
                </CardTitle>
                <div className="flex items-center gap-2">
                  {cameraActive && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {fps} fps
                    </span>
                  )}
                  {cameraActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopCamera}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <CameraOff className="w-4 h-4 mr-1.5" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={startCamera}
                      disabled={isLoading || !!error && !modelsLoaded}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                    >
                      <Camera className="w-4 h-4 mr-1.5" />
                      Start Camera
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="relative bg-slate-900 aspect-video flex items-center justify-center">
                  {/* Video element */}
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  />

                  {/* Canvas overlay for detections */}
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full ${cameraActive ? "block" : "hidden"}`}
                  />

                  {/* Placeholder when camera is off */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-4 py-16">
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                          >
                            <RefreshCw className="w-10 h-10 text-violet-400" />
                          </motion.div>
                          <p className="text-sm text-slate-300">{loadingStep}</p>
                        </>
                      ) : (
                        <>
                          <Camera className="w-16 h-16 opacity-30" />
                          <p className="text-slate-400 text-sm">
                            {modelsLoaded ? "Click \"Start Camera\" to begin" : "Loading AI models…"}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Face not detected warning */}
                  {cameraActive && !faceDetected && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
                        👀 No face detected — look at the camera
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Privacy note */}
            <p className="mt-3 text-xs text-center text-slate-400 dark:text-slate-500">
              🔒 All analysis runs locally in your browser. No video data is ever sent to a server.
            </p>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Age & Gender */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-blue-500" />
                  Identity Estimate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectionResult ? (
                  <motion.div
                    key={`${detectionResult.age}-${detectionResult.gender}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Estimated Age</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                          {detectionResult.age}
                          <span className="text-lg font-normal text-slate-400 ml-1">yrs</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Gender</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl">
                            {detectionResult.gender === "male" ? "♂️" : "♀️"}
                          </span>
                          <div>
                            <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">
                              {detectionResult.gender}
                            </p>
                            <p className="text-xs text-slate-400">
                              {Math.round(detectionResult.genderProbability * 100)}% conf.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-700" />

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Confidence</p>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-blue-400 to-violet-500 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(detectionResult.genderProbability * 100)}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-sm">
                    {cameraActive ? "Detecting face…" : "Start camera to analyze"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mood / Dominant Emotion */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smile className="w-4 h-4 text-yellow-500" />
                  Mood Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectionResult ? (
                  <motion.div
                    key={detectionResult.dominantEmotion}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Dominant emotion */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <span className="text-4xl">
                        {EMOTION_LABELS[detectionResult.dominantEmotion]?.emoji || "😐"}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {EMOTION_LABELS[detectionResult.dominantEmotion]?.label || detectionResult.dominantEmotion}
                        </p>
                        <p className="text-xs text-slate-500">
                          {Math.round(detectionResult.dominantEmotionScore * 100)}% confidence
                        </p>
                      </div>
                    </div>

                    {/* Emotion bars */}
                    <div className="space-y-2">
                      {emotionBars.map(([emotion, score]) => {
                        const info = EMOTION_LABELS[emotion] || { label: emotion, emoji: "😶", color: "text-slate-500" };
                        return (
                          <div key={emotion}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <span>{info.emoji}</span>
                                <span>{info.label}</span>
                              </span>
                              <span className="text-xs text-slate-400">{Math.round(score * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                              <motion.div
                                className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${score * 100}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-sm">
                    {cameraActive ? "Detecting emotions…" : "Start camera to detect mood"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">Tips for best results</p>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                      <li>Face the camera directly</li>
                      <li>Ensure good lighting</li>
                      <li>Keep your face unobstructed</li>
                      <li>Stay 1–3 ft from camera</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
