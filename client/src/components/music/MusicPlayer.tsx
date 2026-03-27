import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music, Repeat, Shuffle, Loader2, Repeat1, Gauge
} from "lucide-react";

interface Track {
  id: any; title: string; category: string; duration: number;
  audioUrl: string; thumbnailUrl?: string; description?: string; mood?: string;
}

const GRADIENTS: Record<string, string> = {
  nature:       "from-emerald-500 to-teal-600",
  meditation:   "from-purple-500 to-violet-600",
  ambient:      "from-blue-500 to-indigo-600",
  instrumental: "from-orange-400 to-pink-500",
  focus:        "from-cyan-500 to-blue-600",
};
const CATEGORY_EMOJI: Record<string, string> = {
  nature: "🌿", meditation: "🧘", ambient: "✨", instrumental: "🎹", focus: "🎯"
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function WaveformBars({ isPlaying }: { isPlaying: boolean }) {
  const bars = [3, 5, 8, 5, 3, 7, 4, 6, 4, 7, 3, 5, 8, 5, 3];
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white/60"
          animate={isPlaying ? { height: [`${h * 3}px`, `${h * 3 + 10}px`, `${h * 3}px`] } : { height: "4px" }}
          transition={{ duration: 0.5 + (i % 3) * 0.15, repeat: isPlaying ? Infinity : 0, ease: "easeInOut", delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

export default function MusicPlayer({
  currentTrack, onTrackChange, tracks, compact = false
}: {
  currentTrack: Track | null; onTrackChange: (t: Track) => void;
  tracks: Track[]; compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(false);
  const isRepeatRef = useRef(false);
  const isRepeatOneRef = useRef(false);
  const isShuffleRef = useRef(false);
  const onTrackChangeRef = useRef(onTrackChange);
  const loadedTrackIdRef = useRef<any>(null);
  const autoPlayRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isRepeatOne, setIsRepeatOne] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [bufferedPct, setBufferedPct] = useState(0);

  // Sync refs
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isRepeatOneRef.current = isRepeatOne; }, [isRepeatOne]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { onTrackChangeRef.current = onTrackChange; }, [onTrackChange]);

  // Build audio once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0) {
        setBufferedPct((audio.buffered.end(audio.buffered.length - 1) / (audio.duration || 1)) * 100);
      }
    };
    const onMeta = () => { setDuration(audio.duration || 0); setIsBuffering(false); };
    const onWait = () => setIsBuffering(true);
    const onCanPlay = () => {
      setIsBuffering(false);
      if (autoPlayRef.current) {
        autoPlayRef.current = false;
        audio.play().catch(() => { setIsPlaying(false); isPlayingRef.current = false; });
      }
    };
    const onPlaying = () => { setIsPlaying(true); setIsBuffering(false); isPlayingRef.current = true; };
    const onPause = () => { setIsPlaying(false); isPlayingRef.current = false; };
    const onEnded = () => {
      if (isRepeatOneRef.current) {
        audio.currentTime = 0; audio.play().catch(() => {});
      } else { skipTo("next", true); }
    };
    const onError = () => {
      setHasError(true); setIsBuffering(false); setIsPlaying(false); isPlayingRef.current = false;
      setTimeout(() => skipTo("next", true), 1500);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("waiting", onWait);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause(); audio.src = "";
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("waiting", onWait);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // Volume / speed
  useEffect(() => { if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume / 100; }, [volume, isMuted]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx]; }, [speedIdx]);

  // Load new track
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (currentTrack.id === loadedTrackIdRef.current) return;
    loadedTrackIdRef.current = currentTrack.id;
    setHasError(false); setCurrentTime(0); setDuration(0); setIsBuffering(true); setBufferedPct(0);

    const wasPlaying = isPlayingRef.current;
    audioRef.current.pause();
    audioRef.current.src = currentTrack.audioUrl;
    if (wasPlaying) { autoPlayRef.current = true; }
    audioRef.current.load();
  }, [currentTrack?.id]);

  // Keyboard shortcuts (when player is on page)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight") { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }
      if (e.code === "ArrowLeft") { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentTime, duration]);

  const skipTo = (dir: "next" | "prev", autoPlay = false) => {
    const list = tracksRef.current;
    if (!list.length) return;
    if (autoPlay) isPlayingRef.current = true;
    const cur = currentTrackRef.current;
    const idx = list.findIndex(t => t.id === cur?.id);
    let next: Track;
    if (isShuffleRef.current && dir === "next") {
      next = list[Math.floor(Math.random() * list.length)];
    } else if (dir === "next") {
      next = list[idx < list.length - 1 ? idx + 1 : 0];
    } else {
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0; setCurrentTime(0); return;
      }
      next = list[idx > 0 ? idx - 1 : list.length - 1];
    }
    onTrackChangeRef.current(next);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => {}); }
  };

  const seek = (pctValue: number) => {
    if (!audioRef.current || !duration) return;
    const t = (pctValue / 100) * duration;
    audioRef.current.currentTime = t; setCurrentTime(t);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const cat = currentTrack?.category || "ambient";
  const grad = GRADIENTS[cat] || GRADIENTS.ambient;
  const emoji = CATEGORY_EMOJI[cat] || "🎵";
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  if (compact) {
    return (
      <div className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${grad} text-white shadow-xl`}>
        <button onClick={() => skipTo("prev")} className="opacity-70 hover:opacity-100"><SkipBack className="w-4 h-4" /></button>
        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
          {isBuffering ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button onClick={() => skipTo("next")} className="opacity-70 hover:opacity-100"><SkipForward className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{currentTrack?.title || "No track"}</p>
          <div className="w-full bg-white/20 rounded-full h-1 mt-1"><div className="bg-white h-1 rounded-full" style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="text-xs opacity-60">{fmt(currentTime)}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${grad} shadow-2xl p-6 text-white`}>
      {/* Background blur orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-6">
          {/* Disc */}
          <div className="relative shrink-0">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatType: "loop" }}
              className="w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 relative"
            >
              {currentTrack?.thumbnailUrl ? (
                <img src={currentTrack.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center"><Music className="w-10 h-10 text-white/80" /></div>
              )}
            </motion.div>
            <div className="absolute inset-0 m-auto w-6 h-6 bg-white/80 rounded-full shadow-inner" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentTrack?.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm opacity-70">{emoji} {cat}</span>
                  {hasError && <span className="text-xs bg-red-500/30 px-2 py-0.5 rounded-full">Skipping…</span>}
                  {isBuffering && !hasError && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full animate-pulse">Loading…</span>}
                </div>
                <h2 className="text-xl font-bold truncate">{currentTrack?.title || "Select a track"}</h2>
                <WaveformBars isPlaying={isPlaying && !isBuffering} />
              </motion.div>
            </AnimatePresence>

            {/* Seek bar */}
            <div className="mt-3">
              <div className="relative w-full h-2 bg-white/20 rounded-full cursor-pointer group"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * 100);
                }}>
                {/* Buffered */}
                <div className="absolute left-0 top-0 h-2 bg-white/25 rounded-full" style={{ width: `${bufferedPct}%` }} />
                {/* Played */}
                <div className="absolute left-0 top-0 h-2 bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${pct}% - 8px)` }} />
              </div>
              <div className="flex justify-between text-xs opacity-60 mt-1">
                <span>{fmt(currentTime)}</span>
                <span>{duration > 0 ? fmt(duration) : "--:--"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center justify-between flex-wrap gap-4">
          {/* Left: shuffle + repeat */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsShuffle(s => !s)}
              className={`p-2 rounded-full transition-colors ${isShuffle ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={() => { if (isRepeatOne) { setIsRepeatOne(false); setIsRepeat(false); } else if (isRepeat) { setIsRepeatOne(true); setIsRepeat(false); } else { setIsRepeat(true); } }}
              className={`p-2 rounded-full transition-colors ${isRepeat || isRepeatOne ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}>
              {isRepeatOne ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Center: main controls */}
          <div className="flex items-center gap-3">
            <button onClick={() => skipTo("prev")}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} disabled={!currentTrack}
              className="w-16 h-16 rounded-full bg-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40"
              style={{ color: `var(--btn-color, #6366f1)` }}>
              {isBuffering ? <Loader2 className="w-7 h-7 animate-spin text-slate-700" />
                : isPlaying ? <Pause className="w-7 h-7 text-slate-800" />
                : <Play className="w-7 h-7 text-slate-800 ml-0.5" />}
            </button>
            <button onClick={() => skipTo("next")}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right: volume + speed */}
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMuted(m => !m)} className="opacity-70 hover:opacity-100">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min={0} max={100} value={isMuted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
              className="w-20 accent-white cursor-pointer" />
            <button onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
              className="flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 px-2 py-1 rounded-full transition-colors">
              <Gauge className="w-3 h-3" /> {SPEEDS[speedIdx]}x
            </button>
          </div>
        </div>

        <p className="text-center text-xs opacity-40 mt-3">Space to play/pause · ← → to seek 10s</p>
      </div>
    </div>
  );
}
