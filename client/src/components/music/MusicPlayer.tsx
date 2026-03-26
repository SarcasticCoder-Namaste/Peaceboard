import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/utils";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music, Repeat, Shuffle, Loader2
} from "lucide-react";

interface MusicPlayerProps {
  currentTrack: any;
  onTrackChange: (track: any) => void;
  tracks: any[];
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  nature: "from-green-500 to-teal-600",
  meditation: "from-purple-500 to-violet-600",
  ambient: "from-blue-500 to-indigo-600",
  instrumental: "from-orange-400 to-pink-500",
};

const CATEGORY_BG: Record<string, string> = {
  nature: "from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20",
  meditation: "from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20",
  ambient: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
  instrumental: "from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20",
};

const CATEGORY_EMOJI: Record<string, string> = {
  nature: "🌿", meditation: "🧘", ambient: "✨", instrumental: "🎹"
};

export default function MusicPlayer({ currentTrack, onTrackChange, tracks }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const wasPlayingRef = useRef(false);
  const prevTrackIdRef = useRef<any>(null);

  // Load track when it changes — only auto-play if was already playing
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const isSameTrack = currentTrack.id === prevTrackIdRef.current;
    if (isSameTrack) return;

    prevTrackIdRef.current = currentTrack.id;
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);

    const audio = audioRef.current;
    audio.pause();
    audio.src = currentTrack.audioUrl || "";
    audio.load();

    if (wasPlayingRef.current) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      wasPlayingRef.current = false;
    } else {
      audioRef.current.play()
        .then(() => { setIsPlaying(true); wasPlayingRef.current = true; })
        .catch(console.error);
    }
  }, [isPlaying, currentTrack]);

  const handleNext = useCallback(() => {
    if (!tracks.length) return;
    wasPlayingRef.current = true;
    const idx = tracks.findIndex(t => t.id === currentTrack?.id);
    onTrackChange(tracks[idx < tracks.length - 1 ? idx + 1 : 0]);
  }, [tracks, currentTrack, onTrackChange]);

  const handlePrevious = useCallback(() => {
    if (!tracks.length) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    wasPlayingRef.current = true;
    const idx = tracks.findIndex(t => t.id === currentTrack?.id);
    onTrackChange(tracks[idx > 0 ? idx - 1 : tracks.length - 1]);
  }, [tracks, currentTrack, currentTime, onTrackChange]);

  const handleEnded = () => {
    setIsPlaying(false);
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (isShuffle) {
      wasPlayingRef.current = true;
      onTrackChange(tracks[Math.floor(Math.random() * tracks.length)]);
    } else {
      handleNext();
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsBuffering(false);
    setIsPlaying(false);
    // Skip to next after brief pause
    setTimeout(() => { wasPlayingRef.current = true; handleNext(); }, 2000);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration > 0) {
      const t = (value[0] / 100) * duration;
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const category = currentTrack?.category || "nature";
  const gradient = CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.nature;
  const bgGradient = CATEGORY_BG[category] || CATEGORY_BG.nature;

  return (
    <>
      {/* Audio element — NO crossOrigin to avoid CORS issues with archive.org */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) { setDuration(audioRef.current.duration); setIsBuffering(false); } }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />

      <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardContent className="p-0">
          <div className={`bg-gradient-to-r ${bgGradient} p-5`}>
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">

              {/* Vinyl disc artwork */}
              <div className="relative flex-shrink-0">
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 10, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                  className="relative w-20 h-20"
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} shadow-lg overflow-hidden flex items-center justify-center`}>
                    {currentTrack?.thumbnailUrl ? (
                      <img src={currentTrack.thumbnailUrl} alt={currentTrack.title}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <Music className="w-8 h-8 text-white" />
                    )}
                  </div>
                  {/* Center hole */}
                  <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-white/80 shadow-inner" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", position: "absolute" }} />
                  <div className="absolute inset-0 rounded-full border-4 border-white/20 pointer-events-none" />
                </motion.div>

                {/* Live bars */}
                {isPlaying && !isBuffering && (
                  <div className="absolute -bottom-1 -right-1 flex items-end gap-px bg-white dark:bg-slate-700 rounded-full px-1.5 py-1 shadow">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1 rounded-full bg-green-500"
                        animate={{ height: [4, 12, 4] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Track info + progress */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div key={currentTrack?.id ?? "none"}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {CATEGORY_EMOJI[category]} {category}
                      {isBuffering && <span className="ml-2 text-blue-500">Loading…</span>}
                      {hasError && <span className="ml-2 text-red-400">Skipping to next…</span>}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {currentTrack?.title || "Select a track to play"}
                    </h3>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-3">
                  <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1}
                    disabled={!currentTrack || duration === 0} className="w-full mb-1" />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{formatDuration(Math.floor(currentTime))}</span>
                    <span>{duration > 0 ? formatDuration(Math.floor(duration)) : "--:--"}</span>
                  </div>
                </div>
              </div>

              {/* Controls column */}
              <div className="flex flex-col items-center gap-3">
                {/* Play controls */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={!currentTrack}
                    className="w-9 h-9 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button size="icon" onClick={togglePlayPause} disabled={!currentTrack}
                    className={`w-14 h-14 bg-gradient-to-br ${gradient} text-white hover:opacity-90 shadow-lg rounded-full`}>
                    {isBuffering
                      ? <Loader2 className="w-6 h-6 animate-spin" />
                      : isPlaying
                        ? <Pause className="w-6 h-6" />
                        : <Play className="w-6 h-6 ml-0.5" />}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={handleNext} disabled={!currentTrack}
                    className="w-9 h-9 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {/* Secondary controls */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsShuffle(s => !s)}
                    className={`w-8 h-8 ${isShuffle ? "text-green-500" : "text-slate-400"}`}>
                    <Shuffle className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsRepeat(r => !r)}
                    className={`w-8 h-8 ${isRepeat ? "text-green-500" : "text-slate-400"}`}>
                    <Repeat className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsMuted(m => !m)}
                    className="w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Slider value={[isMuted ? 0 : volume]}
                    onValueChange={([v]) => { setVolume(v); setIsMuted(false); }}
                    max={100} step={1} className="w-20" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
