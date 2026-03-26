import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Repeat, Shuffle, Loader2 } from "lucide-react";

interface Track { id: any; title: string; category: string; duration: number; audioUrl: string; thumbnailUrl?: string; description?: string; }

const GRADIENTS: Record<string, string> = {
  nature: "from-green-500 to-teal-600",
  meditation: "from-purple-500 to-violet-600",
  ambient: "from-blue-500 to-indigo-600",
  instrumental: "from-orange-400 to-pink-500",
};
const EMOJI: Record<string, string> = { nature: "🌿", meditation: "🧘", ambient: "✨", instrumental: "🎹" };

export default function MusicPlayer({ currentTrack, onTrackChange, tracks }: { currentTrack: Track | null; onTrackChange: (t: Track) => void; tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // All mutable refs so event handlers never have stale closures
  const tracksRef = useRef(tracks);
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(false);
  const isRepeatRef = useRef(false);
  const isShuffleRef = useRef(false);
  const onTrackChangeRef = useRef(onTrackChange);
  const loadedTrackIdRef = useRef<any>(null);

  // UI state only
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  // Keep refs in sync with state/props
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { onTrackChangeRef.current = onTrackChange; }, [onTrackChange]);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("loadedmetadata", () => { setDuration(audio.duration); setIsBuffering(false); });
    audio.addEventListener("waiting", () => setIsBuffering(true));
    audio.addEventListener("canplay", () => setIsBuffering(false));
    audio.addEventListener("playing", () => { setIsPlaying(true); setIsBuffering(false); isPlayingRef.current = true; });
    audio.addEventListener("pause", () => { setIsPlaying(false); isPlayingRef.current = false; });
    audio.addEventListener("error", () => {
      setHasError(true);
      setIsBuffering(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      // Auto-skip after error
      setTimeout(() => skipToNext(true), 2000);
    });
    audio.addEventListener("ended", () => {
      if (isRepeatRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        skipToNext(true);
      }
    });

    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // Volume control
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // Load new track when currentTrack changes
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (currentTrack.id === loadedTrackIdRef.current) return;

    loadedTrackIdRef.current = currentTrack.id;
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);

    const wasPlaying = isPlayingRef.current;
    audioRef.current.pause();
    audioRef.current.src = currentTrack.audioUrl;
    audioRef.current.load();

    if (wasPlaying) {
      audioRef.current.play().catch(() => { setIsPlaying(false); isPlayingRef.current = false; });
    }
  }, [currentTrack?.id]);

  const skipToNext = (autoPlay = false) => {
    const tList = tracksRef.current;
    if (!tList.length) return;
    if (autoPlay) isPlayingRef.current = true;
    const cur = currentTrackRef.current;
    let nextTrack: Track;
    if (isShuffleRef.current) {
      nextTrack = tList[Math.floor(Math.random() * tList.length)];
    } else {
      const idx = tList.findIndex(t => t.id === cur?.id);
      nextTrack = tList[idx < tList.length - 1 ? idx + 1 : 0];
    }
    onTrackChangeRef.current(nextTrack);
  };

  const skipToPrev = () => {
    if (audioRef.current && currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const tList = tracksRef.current;
    if (!tList.length) return;
    isPlayingRef.current = true;
    const cur = currentTrackRef.current;
    const idx = tList.findIndex(t => t.id === cur?.id);
    onTrackChangeRef.current(tList[idx > 0 ? idx - 1 : tList.length - 1]);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (val: number[]) => {
    if (!audioRef.current || !duration) return;
    const t = (val[0] / 100) * duration;
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const cat = currentTrack?.category || "nature";
  const grad = GRADIENTS[cat] || GRADIENTS.nature;

  return (
    <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
          {/* Spinning disc */}
          <div className="relative shrink-0">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 8, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${grad} shadow-xl overflow-hidden flex items-center justify-center relative`}
            >
              {currentTrack?.thumbnailUrl ? (
                <img src={currentTrack.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : <Music className="w-8 h-8 text-white" />}
              <div className="absolute inset-0 rounded-full border-4 border-white/20 pointer-events-none" />
            </motion.div>
            {/* Center dot */}
            <div className="absolute w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow-inner"
              style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
            {/* Live bars */}
            {isPlaying && !isBuffering && (
              <div className="absolute -bottom-1 -right-1 flex items-end gap-px bg-white dark:bg-slate-700 rounded-full px-1.5 py-1 shadow">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1 rounded-full bg-green-500"
                    animate={{ height: [4, 14, 4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.13, ease: "easeInOut" }} />
                ))}
              </div>
            )}
          </div>

          {/* Track info + progress */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentTrack?.id ?? "none"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="text-xs text-slate-400 mb-0.5">
                  {EMOJI[cat]} {cat}
                  {isBuffering && <span className="ml-2 text-blue-500 animate-pulse">Loading…</span>}
                  {hasError && <span className="ml-2 text-amber-500">Skipping…</span>}
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {currentTrack?.title || "Select a track to play"}
                </h3>
              </motion.div>
            </AnimatePresence>

            <div className="mt-3 space-y-1">
              <Slider value={[pct]} onValueChange={handleSeek} max={100} step={0.2}
                disabled={!currentTrack || duration === 0} className="w-full" />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                <span>{duration > 0 ? formatDuration(Math.floor(duration)) : "--:--"}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={skipToPrev} disabled={!currentTrack}
                className="w-9 h-9 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button size="icon" onClick={togglePlay} disabled={!currentTrack}
                className={`w-14 h-14 bg-gradient-to-br ${grad} text-white hover:opacity-90 shadow-lg rounded-full`}>
                {isBuffering ? <Loader2 className="w-6 h-6 animate-spin" />
                  : isPlaying ? <Pause className="w-6 h-6" />
                  : <Play className="w-6 h-6 ml-0.5" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={() => skipToNext()} disabled={!currentTrack}
                className="w-9 h-9 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={() => setIsShuffle(s => !s)}
                className={`w-8 h-8 ${isShuffle ? "text-green-500" : "text-slate-400"}`}>
                <Shuffle className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsRepeat(r => !r)}
                className={`w-8 h-8 ${isRepeat ? "text-green-500" : "text-slate-400"}`}>
                <Repeat className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(m => !m)}
                className="w-8 h-8 text-slate-400">
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </Button>
              <Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => { setVolume(v); setIsMuted(false); }}
                max={100} step={1} className="w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
