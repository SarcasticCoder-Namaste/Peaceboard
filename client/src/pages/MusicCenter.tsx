import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MusicPlayer from "@/components/music/MusicPlayer";
import TrackList from "@/components/music/TrackList";
import WellnessTips from "@/components/music/WellnessTips";
import { Music, Heart, Wind, Brain } from "lucide-react";

export default function MusicCenter() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["/api/music", categoryFilter !== "all" ? { category: categoryFilter } : {}],
    queryFn: async () => {
      const params = categoryFilter !== "all" ? `?category=${categoryFilter}` : "";
      const response = await fetch(`/api/music${params}`);
      if (!response.ok) throw new Error("Failed to fetch music tracks");
      return response.json();
    },
  });

  // Mock data for demonstration since we don't have actual audio files
  const mockTracks = [
    {
      id: 1,
      title: "Forest Meditation",
      category: "nature",
      duration: 510,
      audioUrl: "https://www.soundjay.com/misc/sounds/forest-1.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=150&h=150&fit=crop",
      description: "Peaceful forest sounds for meditation"
    },
    {
      id: 2,
      title: "Ocean Waves",
      category: "nature",
      duration: 405,
      audioUrl: "https://www.soundjay.com/misc/sounds/ocean-1.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=150&h=150&fit=crop",
      description: "Calming ocean waves"
    },
    {
      id: 3,
      title: "Tibetan Bells",
      category: "meditation",
      duration: 620,
      audioUrl: "https://www.soundjay.com/misc/sounds/bell-1.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop",
      description: "Traditional meditation bells"
    },
    {
      id: 4,
      title: "Gentle Rain",
      category: "nature",
      duration: 735,
      audioUrl: "https://www.soundjay.com/misc/sounds/rain-1.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=150&h=150&fit=crop",
      description: "Soft rainfall sounds"
    },
    {
      id: 5,
      title: "Ambient Peace",
      category: "ambient",
      duration: 480,
      audioUrl: "https://www.soundjay.com/misc/sounds/ambient-1.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=150&h=150&fit=crop",
      description: "Peaceful ambient soundscape"
    },
    {
      id: 6,
      title: "Piano Serenity",
      category: "instrumental",
      duration: 360,
      audioUrl: "https://www.soundjay.com/misc/sounds/piano-1.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=150&h=150&fit=crop",
      description: "Gentle piano melodies"
    }
  ];

  const displayTracks = tracks.length > 0 ? tracks : mockTracks;
  const filteredTracks = categoryFilter === "all" 
    ? displayTracks 
    : displayTracks.filter((track: any) => track.category === categoryFilter);

  const categories = [
    { value: "all", label: "All", icon: Music },
    { value: "nature", label: "Nature", icon: "🌿" },
    { value: "meditation", label: "Meditation", icon: "🧘" },
    { value: "ambient", label: "Ambient", icon: "✨" },
    { value: "instrumental", label: "Instrumental", icon: "🎹" },
  ];

  if (!currentTrack && filteredTracks.length > 0) {
    setCurrentTrack(filteredTracks[0]);
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Peace Music Center
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Curated calming tracks and wellness content to promote mindfulness, reduce stress, and enhance emotional well-being.
          </p>
        </motion.div>

        {/* Music Player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <MusicPlayer 
            currentTrack={currentTrack}
            onTrackChange={setCurrentTrack}
            tracks={filteredTracks}
          />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Track Library */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="w-5 h-5 text-primary" />
                  <span>Music Library</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((category) => (
                    <Button
                      key={category.value}
                      variant={categoryFilter === category.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(category.value)}
                      className="text-xs"
                    >
                      {typeof category.icon === "string" ? (
                        <span className="mr-1">{category.icon}</span>
                      ) : (
                        <category.icon className="w-3 h-3 mr-1" />
                      )}
                      {category.label}
                    </Button>
                  ))}
                </div>

                <TrackList
                  tracks={filteredTracks}
                  currentTrack={currentTrack}
                  onTrackSelect={setCurrentTrack}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Wellness Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <WellnessTips />
          </motion.div>
        </div>

        {/* Featured Wellness Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white mx-auto">
                    <Wind className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Breathing Exercises
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Combine music with guided breathing to reduce anxiety and promote calm.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white mx-auto">
                    <Brain className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Mindful Listening
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Practice present-moment awareness through focused music meditation.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white mx-auto">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Emotional Regulation
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Use music to process emotions and develop healthy coping strategies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
