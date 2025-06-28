import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDuration } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Music,
  Repeat,
  Shuffle
} from "lucide-react";

interface MusicPlayerProps {
  currentTrack: any;
  onTrackChange: (track: any) => void;
  tracks: any[];
}

export default function MusicPlayer({ currentTrack, onTrackChange, tracks }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audioUrl || "";
      audioRef.current.load();
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    } else {
      audioRef.current.play().catch(console.error);
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 1000);
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    if (isRepeat) {
      handleReplay();
    } else if (isShuffle) {
      handleShuffle();
    } else {
      handleNext();
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handlePrevious = () => {
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex(track => track.id === currentTrack?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
    onTrackChange(tracks[prevIndex]);
  };

  const handleNext = () => {
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex(track => track.id === currentTrack?.id);
    const nextIndex = currentIndex < tracks.length - 1 ? currentIndex + 1 : 0;
    onTrackChange(tracks[nextIndex]);
  };

  const handleShuffle = () => {
    if (!tracks.length) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    onTrackChange(tracks[randomIndex]);
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      
      <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardContent className="p-0">
          {/* Main Player */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
            <div className="flex items-center space-x-4">
              {/* Track Artwork */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 20, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                className="flex-shrink-0"
              >
                <Avatar className="w-16 h-16 shadow-lg">
                  <AvatarImage 
                    src={currentTrack?.thumbnailUrl} 
                    alt={currentTrack?.title}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    <Music className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {currentTrack?.title || "No track selected"}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 capitalize">
                  {currentTrack?.category || ""}
                </p>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={!currentTrack}
                  className="text-slate-600 dark:text-slate-300 hover:text-primary"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>

                <Button
                  size="icon"
                  onClick={togglePlayPause}
                  disabled={!currentTrack}
                  className="w-12 h-12 bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90 shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={!currentTrack}
                  className="text-slate-600 dark:text-slate-300 hover:text-primary"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              {/* Additional Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`${isShuffle ? "text-primary" : "text-slate-400"} hover:text-primary`}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`${isRepeat ? "text-primary" : "text-slate-400"} hover:text-primary`}
                >
                  <Repeat className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-300">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                <span>{formatDuration(Math.floor(duration))}</span>
              </div>
              
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
                disabled={!currentTrack}
              />
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-3 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-slate-600 dark:text-slate-300 hover:text-primary"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1 max-w-24"
              />
              
              <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">
                {isMuted ? 0 : volume}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
