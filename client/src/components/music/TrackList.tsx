import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Play, Music, Leaf, Brain, Sparkles, Piano } from "lucide-react";

interface TrackListProps {
  tracks: any[];
  currentTrack: any;
  onTrackSelect: (track: any) => void;
  isLoading?: boolean;
}

export default function TrackList({ tracks, currentTrack, onTrackSelect, isLoading }: TrackListProps) {
  const categoryIcons = {
    nature: Leaf,
    meditation: Brain,
    ambient: Sparkles,
    instrumental: Piano,
  };

  const categoryColors = {
    nature: "from-green-500 to-emerald-600",
    meditation: "from-purple-500 to-indigo-600",
    ambient: "from-blue-500 to-cyan-600",
    instrumental: "from-orange-500 to-amber-600",
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8">
        <Music className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-300">No tracks available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tracks.map((track, index) => {
        const IconComponent = categoryIcons[track.category as keyof typeof categoryIcons] || Music;
        const isCurrentTrack = currentTrack?.id === track.id;
        
        return (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`group flex items-center justify-between p-3 rounded-lg transition-all duration-300 cursor-pointer ${
              isCurrentTrack
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            onClick={() => onTrackSelect(track)}
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className={`w-10 h-10 bg-gradient-to-br ${categoryColors[track.category]} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  isCurrentTrack 
                    ? "text-primary" 
                    : "text-slate-900 dark:text-white"
                }`}>
                  {track.title}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDuration(track.duration)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {track.category}
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                isCurrentTrack ? "opacity-100" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onTrackSelect(track);
              }}
            >
              <Play className="w-4 h-4" />
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}
