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
};

const SPEEDS = [0.75, 1, 1.25, 1.5];

function WaveformBars({ active }: { active: boolean }) {
  const heights = [3, 6, 9, 6, 3, 8, 5, 7, 5, 8, 3, 6, 9, 6, 3];
  return (
    <div className="flex items-end gap-0.5 h-8 my-1">
      {heights.map((h, i) => (
        <motion.div key={i} className="w-1 rounded-full bg-white/50"
          animate={active ? { height: [`${h * 2.5}px`, `${h * 2.5 + 10}px`, `${h * 2.5}px`] } : { height: "3px" }}
          transition={{ duration: 0.55 + (i % 3) * 0.12, repeat: active ? Infinity : 0, ease: "easeInOut", delay: i * 0.035 }}
        />
      ))}
    </div>
  );
}

export default function MusicPlayer({
  currentTrack, onTrackChange, tracks
}: {
  currentTrack: Track | null;
  onTrackChange: (t: Track) => void;
  tracks: Track[];
}) {
  // ─── Refs (never go stale in event handlers) ──────────────────
  const audioRef           = useRef<HTMLAudioElement | null>(null);
  const tracksRef          = useRef(tracks);
  const currentTrackRef    = useRef(currentTrack);
  const isPlayingRef       = useRef(false);
  const isRepeatRef        = useRef(false);
  const isRepeatOneRef     = useRef(false);
  const isShuffleRef       = useRef(false);
  const onTrackChangeRef   = useRef(onTrackChange);
  const loadedIdRef        = useRef<any>(null);
  const pendingAutoPlayRef = useRef(false); // true → play as soon as canplay fires

  // ─── UI state ─────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError,    setHasError]    = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(85);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isRepeat,    setIsRepeat]    = useState(false);
  const [isRepeatOne, setIsRepeatOne] = useState(false);
  const [isShuffle,   setIsShuffle]   = useState(false);
  const [speedIdx,    setSpeedIdx]    = useState(1);
  const [bufferedPct, setBufferedPct] = useState(0);

  // ─── Keep refs in sync ────────────────────────────────────────
  useEffect(() => { tracksRef.current = tracks; },         [tracks]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isRepeatRef.current    = isRepeat; },    [isRepeat]);
  useEffect(() => { isRepeatOneRef.current = isRepeatOne; }, [isRepeatOne]);
  useEffect(() => { isShuffleRef.current   = isShuffle; },   [isShuffle]);
  useEffect(() => { onTrackChangeRef.current = onTrackChange; }, [onTrackChange]);

  // ─── Build audio element once ─────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0) {
        setBufferedPct((audio.buffered.end(audio.buffered.length - 1) / (audio.duration || 1)) * 100);
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration || 0);
      setIsBuffering(false);
    });

    audio.addEventListener("waiting", () => setIsBuffering(true));

    audio.addEventListener("canplay", () => {
      setIsBuffering(false);
      // If a play was requested before the audio was ready, fire it now
      if (pendingAutoPlayRef.current) {
        pendingAutoPlayRef.current = false;
        audio.play().catch(() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
        });
      }
    });

    audio.addEventListener("playing", () => {
      setIsPlaying(true);
      setIsBuffering(false);
      isPlayingRef.current = true;
    });

    audio.addEventListener("pause", () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    });

    audio.addEventListener("ended", () => {
      if (isRepeatOneRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        // Advance to next track and auto-play it
        advanceTrack(true);
      }
    });

    audio.addEventListener("error", () => {
      setHasError(true);
      setIsBuffering(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      // Skip broken URL after a short pause
      setTimeout(() => advanceTrack(true), 1200);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Volume / playback speed ──────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  // ─── Load new track whenever currentTrack.id changes ─────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (currentTrack.id === loadedIdRef.current) return;

    loadedIdRef.current = currentTrack.id;
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    setBufferedPct(0);

    const shouldPlay = isPlayingRef.current || pendingAutoPlayRef.current;
    audio.pause();
    audio.src = currentTrack.audioUrl;
    audio.load();

    if (shouldPlay) {
      // Mark that we want to play as soon as canplay fires
      pendingAutoPlayRef.current = true;
    }
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const audio = audioRef.current;
      if (!audio) return;
      if (e.code === "Space")       { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight")  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      if (e.code === "ArrowLeft")   audio.currentTime = Math.max(0, audio.currentTime - 10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers ──────────────────────────────────────────────────
  // Advance to next (or previous) track. Called from event handlers — uses only refs.
  function advanceTrack(autoPlay: boolean, dir: "next" | "prev" = "next") {
    const list = tracksRef.current;
    if (!list.length) return;

    if (autoPlay) pendingAutoPlayRef.current = true;

    const cur = currentTrackRef.current;
    const idx = list.findIndex(t => t.id === cur?.id);
    let next: Track;

    if (isShuffleRef.current && dir === "next") {
      next = list[Math.floor(Math.random() * list.length)];
    } else if (dir === "next") {
      next = list[idx < list.length - 1 ? idx + 1 : 0];
    } else {
      // prev — restart track if more than 3 s in
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        return;
      }
      next = list[idx > 0 ? idx - 1 : list.length - 1];
    }

    onTrackChangeRef.current(next);
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.pause();
      pendingAutoPlayRef.current = false;
    } else {
      pendingAutoPlayRef.current = true;
      audio.play().catch(() => {
        // Not ready yet — canplay handler will fire it
      });
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  // ─── Derived display values ───────────────────────────────────
  const pct  = duration > 0 ? (currentTime / duration) * 100 : 0;
  const cat  = currentTrack?.category || "ambient";
  const grad = GRADIENTS[cat] || GRADIENTS.ambient;
  const fmt  = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${grad} shadow-2xl p-6 text-white`}>
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-black/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* ── Top: disc + track info ── */}
        <div className="flex items-center gap-5">
          {/* Spinning disc */}
          <div className="relative shrink-0">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatType: "loop" }}
              className="w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white/20"
            >
              {currentTrack?.thumbnailUrl ? (
                <img src={currentTrack.thumbnailUrl} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <Music className="w-10 h-10 text-white/70" />
                </div>
              )}
            </motion.div>
            {/* Centre hole */}
            <div className="absolute w-6 h-6 bg-white/80 rounded-full shadow"
              style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          </div>

          {/* Track info + waveform */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentTrack?.id ?? "none"}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm opacity-70 capitalize">{cat}</span>
                  {isBuffering && !hasError && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full animate-pulse">Loading…</span>
                  )}
                  {hasError && (
                    <span className="text-xs bg-red-500/40 px-2 py-0.5 rounded-full">Skipping…</span>
                  )}
                </div>
                <h2 className="text-xl font-bold truncate">
                  {currentTrack?.title || "Select a track to begin"}
                </h2>
                <WaveformBars active={isPlaying && !isBuffering} />
              </motion.div>
            </AnimatePresence>

            {/* Seek bar */}
            <div className="mt-1">
              <div role="slider" aria-label="seek"
                className="relative w-full h-2 bg-white/20 rounded-full cursor-pointer group"
                onClick={seek}>
                {/* Buffered */}
                <div className="absolute left-0 top-0 h-2 bg-white/25 rounded-full pointer-events-none"
                  style={{ width: `${bufferedPct}%` }} />
                {/* Played */}
                <div className="absolute left-0 top-0 h-2 bg-white rounded-full pointer-events-none transition-all"
                  style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                  style={{ left: `calc(${pct}% - 8px)` }} />
              </div>
              <div className="flex justify-between text-xs opacity-50 mt-1">
                <span>{fmt(currentTime)}</span>
                <span>{duration > 0 ? fmt(duration) : "--:--"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls row ── */}
        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">

          {/* Left: shuffle + repeat */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsShuffle(s => !s)}
              className={`p-2 rounded-full transition-colors ${isShuffle ? "bg-white/30 shadow" : "bg-white/10 hover:bg-white/20"}`}
              title="Shuffle">
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (isRepeatOne) { setIsRepeatOne(false); setIsRepeat(false); }
                else if (isRepeat) { setIsRepeatOne(true); setIsRepeat(false); }
                else { setIsRepeat(true); }
              }}
              className={`p-2 rounded-full transition-colors ${isRepeat || isRepeatOne ? "bg-white/30 shadow" : "bg-white/10 hover:bg-white/20"}`}
              title={isRepeatOne ? "Repeat one" : isRepeat ? "Repeat all" : "No repeat"}>
              {isRepeatOne ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Centre: prev / play / next */}
          <div className="flex items-center gap-3">
            <button onClick={() => advanceTrack(false, "prev")} disabled={!currentTrack}
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors disabled:opacity-40">
              <SkipBack className="w-5 h-5" />
            </button>

            <button onClick={togglePlay} disabled={!currentTrack}
              className="w-16 h-16 rounded-full bg-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40">
              {isBuffering
                ? <Loader2 className="w-7 h-7 text-slate-700 animate-spin" />
                : isPlaying
                  ? <Pause  className="w-7 h-7 text-slate-800" />
                  : <Play   className="w-7 h-7 text-slate-800 ml-0.5" />}
            </button>

            <button onClick={() => advanceTrack(false, "next")} disabled={!currentTrack}
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors disabled:opacity-40">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right: volume + speed */}
          <div className="flex items-center gap-2.5">
            <button onClick={() => setIsMuted(m => !m)} className="opacity-70 hover:opacity-100 transition-opacity">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min={0} max={100} value={isMuted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
              className="w-20 accent-white cursor-pointer" />
            <button onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
              className="flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-colors">
              <Gauge className="w-3 h-3" /> {SPEEDS[speedIdx]}x
            </button>
          </div>
        </div>

        <p className="text-center text-xs opacity-30 mt-3 tracking-wide">
          Space · play/pause &nbsp;·&nbsp; ← → · seek 10 s
        </p>
      </div>
    </div>
  );
}
