import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MusicPlayer from "@/components/music/MusicPlayer";
import TrackList from "@/components/music/TrackList";
import WellnessTips from "@/components/music/WellnessTips";
import { Music, Heart, Wind, Brain } from "lucide-react";

const MOCK_TRACKS = [
  {
    id: 1,
    title: "Forest Atmosphere",
    category: "nature",
    duration: 300,
    audioUrl: "https://ia801408.us.archive.org/32/items/ForestAtmosphere/Forest%20Atmosphere.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=150&h=150&fit=crop",
    description: "Gentle forest sounds with birdsong and rustling leaves"
  },
  {
    id: 2,
    title: "Ocean Waves",
    category: "nature",
    duration: 420,
    audioUrl: "https://ia801503.us.archive.org/29/items/ocean-waves-nature-sounds/Ocean%20Waves%20-%20Nature%20Sounds.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=150&fit=crop",
    description: "Peaceful ocean waves for relaxation and focus"
  },
  {
    id: 3,
    title: "Tibetan Singing Bowls",
    category: "meditation",
    duration: 600,
    audioUrl: "https://ia601402.us.archive.org/2/items/TibetanBellsMeditation/Tibetan%20Bells%20Meditation.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop",
    description: "Soothing Tibetan singing bowls for deep meditation"
  },
  {
    id: 4,
    title: "Gymnopedie No. 1",
    category: "instrumental",
    duration: 210,
    audioUrl: "https://ia601609.us.archive.org/8/items/kevinmacleod-royaltyfreemusic-26/Kevin%20MacLeod%20~%20Gymnopedie%20No%201.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=150&h=150&fit=crop",
    description: "Satie's timeless piano piece — peaceful and reflective"
  },
  {
    id: 5,
    title: "Meditation Impromptu 01",
    category: "ambient",
    duration: 180,
    audioUrl: "https://ia601305.us.archive.org/25/items/kevinmacleod-royaltyfreemusic-24/Kevin%20MacLeod%20~%20Meditation%20Impromptu%2001.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=150&h=150&fit=crop",
    description: "Calming ambient meditation music for mindful breathing"
  },
  {
    id: 6,
    title: "Gymnopedie No. 3",
    category: "instrumental",
    duration: 225,
    audioUrl: "https://ia801609.us.archive.org/8/items/kevinmacleod-royaltyfreemusic-26/Kevin%20MacLeod%20~%20Satie%20Gymnopedie%20No%203.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop",
    description: "Gentle piano for quiet reflection and calm focus"
  },
  {
    id: 7,
    title: "Meditation Impromptu 02",
    category: "meditation",
    duration: 195,
    audioUrl: "https://ia601305.us.archive.org/25/items/kevinmacleod-royaltyfreemusic-24/Kevin%20MacLeod%20~%20Meditation%20Impromptu%2002.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=150&h=150&fit=crop",
    description: "Gentle meditation music for mindfulness practice"
  },
  {
    id: 8,
    title: "Rain & Forest",
    category: "nature",
    duration: 540,
    audioUrl: "https://ia801408.us.archive.org/32/items/ForestAtmosphere/Forest%20Atmosphere.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=150&h=150&fit=crop",
    description: "Soft rainfall blended with forest ambiance for sleep"
  },
  {
    id: 9,
    title: "Deep Calm",
    category: "ambient",
    duration: 360,
    audioUrl: "https://ia601305.us.archive.org/25/items/kevinmacleod-royaltyfreemusic-24/Kevin%20MacLeod%20~%20Meditation%20Impromptu%2001.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=150&h=150&fit=crop",
    description: "Extended ambient session for deep relaxation and study"
  },
  {
    id: 10,
    title: "Peaceful Bells",
    category: "meditation",
    duration: 480,
    audioUrl: "https://ia601402.us.archive.org/2/items/TibetanBellsMeditation/Tibetan%20Bells%20Meditation.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1477120128765-a0528148fed6?w=150&h=150&fit=crop",
    description: "Bell tones and silence for mindfulness practice"
  },
  {
    id: 11,
    title: "Morning Light",
    category: "instrumental",
    duration: 210,
    audioUrl: "https://ia601609.us.archive.org/8/items/kevinmacleod-royaltyfreemusic-26/Kevin%20MacLeod%20~%20Gymnopedie%20No%201.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=150&h=150&fit=crop",
    description: "Bright hopeful piano to start the day with calm positivity"
  },
  {
    id: 12,
    title: "Mountain Stream",
    category: "nature",
    duration: 600,
    audioUrl: "https://ia801503.us.archive.org/29/items/ocean-waves-nature-sounds/Ocean%20Waves%20-%20Nature%20Sounds.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=150&h=150&fit=crop",
    description: "Gentle flowing water sounds for concentration and peace"
  }
];

export default function MusicCenter() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: dbTracks = [], isLoading } = useQuery({
    queryKey: ["/api/music", categoryFilter !== "all" ? { category: categoryFilter } : {}],
    queryFn: async () => {
      const params = categoryFilter !== "all" ? `?category=${categoryFilter}` : "";
      const response = await fetch(`/api/music${params}`);
      if (!response.ok) throw new Error("Failed to fetch music tracks");
      return response.json();
    },
  });

  // Merge DB tracks with mock tracks — DB tracks get thumbnails from mock if missing
  const enrichedDbTracks = dbTracks.map((dbTrack: any) => {
    const mock = MOCK_TRACKS.find(m => m.title === dbTrack.title || m.audioUrl === dbTrack.audioUrl);
    return { ...dbTrack, thumbnailUrl: dbTrack.thumbnailUrl || mock?.thumbnailUrl || "" };
  });

  const allTracks = enrichedDbTracks.length > 0 ? enrichedDbTracks : MOCK_TRACKS;

  const filteredTracks = categoryFilter === "all"
    ? allTracks
    : allTracks.filter((track: any) => track.category === categoryFilter);

  const handleTrackSelect = (track: any) => {
    setCurrentTrack(track);
  };

  // Auto-select first track
  const activeTrack = currentTrack || filteredTracks[0] || null;

  const categories = [
    { value: "all", label: "All Music", icon: "🎵" },
    { value: "nature", label: "Nature", icon: "🌿" },
    { value: "meditation", label: "Meditation", icon: "🧘" },
    { value: "ambient", label: "Ambient", icon: "✨" },
    { value: "instrumental", label: "Instrumental", icon: "🎹" },
  ];

  const categoryCounts = categories.map(c => ({
    ...c,
    count: c.value === "all" ? allTracks.length : allTracks.filter((t: any) => t.category === c.value).length
  }));

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium mb-4">
            <Music className="w-4 h-4" />
            Wellness Music Library
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Peace Music Center
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {allTracks.length} curated tracks of calming nature sounds, meditation music, and peaceful instrumentals to support your emotional wellbeing.
          </p>
        </motion.div>

        {/* Music Player */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-8">
          <MusicPlayer
            currentTrack={activeTrack}
            onTrackChange={handleTrackSelect}
            tracks={filteredTracks}
          />
        </motion.div>

        {/* Category Filter */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="flex flex-wrap gap-2 mb-6 justify-center">
          {categoryCounts.map((cat) => (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat.value)}
              className={`gap-1.5 ${categoryFilter === cat.value ? "bg-gradient-to-r from-green-500 to-teal-500 text-white border-0" : ""}`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoryFilter === cat.value ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                {cat.count}
              </span>
            </Button>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Track Library */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="lg:col-span-2">
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-green-500" />
                  Music Library
                  <span className="text-sm font-normal text-slate-400 ml-auto">{filteredTracks.length} tracks</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrackList
                  tracks={filteredTracks}
                  currentTrack={activeTrack}
                  onTrackSelect={handleTrackSelect}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-4">
            <WellnessTips />

            {/* Now Playing Info */}
            {activeTrack && (
              <Card className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Now Playing
                  </h3>
                  {activeTrack.thumbnailUrl && (
                    <img src={activeTrack.thumbnailUrl} alt={activeTrack.title}
                      className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <p className="font-medium text-slate-800 dark:text-white text-sm">{activeTrack.title}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{activeTrack.category} · {Math.floor(activeTrack.duration / 60)}:{String(activeTrack.duration % 60).padStart(2, "0")}</p>
                  {activeTrack.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{activeTrack.description}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Benefits Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-12">
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-8">
              <h3 className="text-center text-lg font-semibold text-slate-900 dark:text-white mb-6">Why Music Heals</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                {[
                  { icon: Wind, color: "from-blue-500 to-indigo-600", title: "Reduces Stress", desc: "Music lowers cortisol levels and activates the body's natural relaxation response." },
                  { icon: Brain, color: "from-green-500 to-emerald-600", title: "Boosts Focus", desc: "Ambient and instrumental music enhances concentration and cognitive performance." },
                  { icon: Heart, color: "from-purple-500 to-pink-600", title: "Regulates Emotions", desc: "Music provides a healthy outlet for processing difficult feelings and building resilience." },
                ].map(({ icon: Icon, color, title, desc }) => (
                  <div key={title} className="space-y-3">
                    <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white mx-auto shadow-lg`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
