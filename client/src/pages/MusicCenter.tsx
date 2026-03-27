import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MusicPlayer from "@/components/music/MusicPlayer";
import {
  Music, Heart, Leaf, Brain, Sparkles, Piano, Clock, Timer,
  ListMusic, Zap, Moon, Sun, Focus, Flame, Play, Check
} from "lucide-react";

// ─── Reliable audio tracks (SoundHelix — verified, no CORS, free) ─────────────
const ALL_TRACKS = [
  {
    id: 1, title: "Morning Focus", category: "ambient", mood: "focus", duration: 372,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop",
    description: "Bright ambient layers to sharpen concentration and start your day."
  },
  {
    id: 2, title: "Deep Calm", category: "meditation", mood: "relax", duration: 421,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=200&h=200&fit=crop",
    description: "Gentle tones for deep meditation and emotional release."
  },
  {
    id: 3, title: "Gentle Horizon", category: "nature", mood: "relax", duration: 389,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&h=200&fit=crop",
    description: "Soft organic textures inspired by wide-open natural spaces."
  },
  {
    id: 4, title: "Crystal Piano", category: "instrumental", mood: "focus", duration: 347,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=200&h=200&fit=crop",
    description: "Delicate piano lines for quiet study and peaceful reflection."
  },
  {
    id: 5, title: "Ocean Drift", category: "nature", mood: "sleep", duration: 456,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop",
    description: "Slow waves and tidal rhythms to drift into sleep."
  },
  {
    id: 6, title: "Mind Space", category: "ambient", mood: "focus", duration: 398,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop",
    description: "Expansive ambient pads to clear mental fog and boost focus."
  },
  {
    id: 7, title: "Lunar Rest", category: "meditation", mood: "sleep", duration: 512,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1477120128765-a0528148fed6?w=200&h=200&fit=crop",
    description: "Slow meditative pulses for pre-sleep mindfulness."
  },
  {
    id: 8, title: "Inner Light", category: "instrumental", mood: "energize", duration: 334,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
    description: "Uplifting melodic progressions to energize and inspire."
  },
  {
    id: 9, title: "Forest Rain", category: "nature", mood: "relax", duration: 467,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=200&h=200&fit=crop",
    description: "Soft rainfall textures layered with forest ambiance."
  },
  {
    id: 10, title: "Clarity Bells", category: "meditation", mood: "focus", duration: 388,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=200&h=200&fit=crop",
    description: "Bell tones and silence for mindful attention training."
  },
  {
    id: 11, title: "Sunrise Drift", category: "ambient", mood: "energize", duration: 362,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=200&h=200&fit=crop",
    description: "Warm ambient layers rising like the morning sun."
  },
  {
    id: 12, title: "Still Waters", category: "instrumental", mood: "sleep", duration: 504,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&h=200&fit=crop",
    description: "Tranquil instrumental textures for deep rest."
  },
  {
    id: 13, title: "Thunder Mind", category: "ambient", mood: "focus", duration: 395,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=200&h=200&fit=crop",
    description: "Dramatic ambient waves for deep focus sessions."
  },
  {
    id: 14, title: "Velvet Night", category: "meditation", mood: "sleep", duration: 543,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop",
    description: "Soft, velvety tones to ease you into deep sleep."
  },
  {
    id: 15, title: "Peak Flow", category: "instrumental", mood: "energize", duration: 321,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
    description: "Driving melodic energy for workout and motivation."
  },
  {
    id: 16, title: "Birch Grove", category: "nature", mood: "relax", duration: 432,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1510784722466-f2aa240d9c8e?w=200&h=200&fit=crop",
    description: "Gentle woodland textures for afternoon unwinding."
  },
];

const CATEGORIES = [
  { value: "all", label: "All", icon: Music, color: "from-slate-500 to-slate-600" },
  { value: "nature", label: "Nature", icon: Leaf, color: "from-emerald-500 to-teal-600" },
  { value: "meditation", label: "Meditation", icon: Brain, color: "from-purple-500 to-violet-600" },
  { value: "ambient", label: "Ambient", icon: Sparkles, color: "from-blue-500 to-indigo-600" },
  { value: "instrumental", label: "Instrumental", icon: Piano, color: "from-orange-400 to-pink-500" },
];

const MOODS = [
  { value: "all", label: "All Moods", icon: Music, desc: "Everything" },
  { value: "focus", label: "Focus", icon: Focus, desc: "Study & work" },
  { value: "relax", label: "Relax", icon: Sun, desc: "Unwind" },
  { value: "sleep", label: "Sleep", icon: Moon, desc: "Drift off" },
  { value: "energize", label: "Energize", icon: Flame, desc: "Get moving" },
];

const SLEEP_TIMERS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
];

const CAT_GRADIENTS: Record<string, string> = {
  nature: "from-emerald-500 to-teal-600",
  meditation: "from-purple-500 to-violet-600",
  ambient: "from-blue-500 to-indigo-600",
  instrumental: "from-orange-400 to-pink-500",
};

function TrackCard({ track, isActive, isFav, onPlay, onFav }: {
  track: any; isActive: boolean; isFav: boolean; onPlay: () => void; onFav: () => void;
}) {
  const grad = CAT_GRADIENTS[track.category] || "from-slate-500 to-slate-600";
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
      className={`relative group cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 ${isActive ? "ring-2 ring-white shadow-2xl" : "hover:shadow-xl"}`}
      onClick={onPlay}>
      {/* Thumbnail */}
      <div className="relative aspect-square">
        <img src={track.thumbnailUrl} alt={track.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop`; }} />
        <div className={`absolute inset-0 bg-gradient-to-t ${grad} opacity-60`} />

        {/* Play overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
            {isActive
              ? <div className="flex items-end gap-0.5 h-5">{[0,1,2].map(i => (
                  <motion.div key={i} className="w-1 bg-slate-800 rounded-full"
                    animate={{ height: [8, 16, 8] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }} />
                ))}</div>
              : <Play className="w-5 h-5 text-slate-800 ml-0.5" />}
          </div>
        </div>

        {/* Fav button */}
        <button onClick={e => { e.stopPropagation(); onFav(); }}
          className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
          <Heart className={`w-3.5 h-3.5 ${isFav ? "text-red-400 fill-red-400" : "text-white"}`} />
        </button>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded-full">
          {fmt(track.duration)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-white dark:bg-slate-800">
        <p className={`font-semibold text-sm truncate ${isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-900 dark:text-white"}`}>
          {track.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{track.category}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{track.mood}</Badge>
        </div>
      </div>
    </motion.div>
  );
}

function SleepTimerWidget({ onSet }: { onSet: (minutes: number) => void }) {
  const [active, setActive] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (active === null) return;
    setRemaining(active * 60);
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(t); setActive(null); onSet(0); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Sleep Timer</span>
          {active !== null && (
            <span className="ml-auto text-sm font-mono text-violet-600 dark:text-violet-400">{fmt(remaining)}</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {SLEEP_TIMERS.map(t => (
            <button key={t.minutes}
              onClick={() => { setActive(t.minutes); onSet(t.minutes); }}
              className={`text-xs py-2 rounded-xl transition-all font-medium ${active === t.minutes ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {active !== null && (
          <button onClick={() => { setActive(null); onSet(0); }}
            className="w-full mt-2 text-xs text-red-500 hover:text-red-700 transition-colors">
            Cancel timer
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function MoodPill({ mood, active, onClick }: { mood: any; active: boolean; onClick: () => void }) {
  const Icon = mood.icon;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${active
        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-105"
        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:text-violet-600"}`}>
      <Icon className="w-4 h-4" />
      <span>{mood.label}</span>
      <span className="text-xs opacity-60">{mood.desc}</span>
    </button>
  );
}

export default function MusicCenter() {
  const [currentTrack, setCurrentTrack] = useState<any>(ALL_TRACKS[0]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moodFilter, setMoodFilter] = useState("all");
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("music-favorites") || "[]"); } catch { return []; }
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const saveFavs = useCallback((favs: number[]) => {
    setFavorites(favs);
    localStorage.setItem("music-favorites", JSON.stringify(favs));
  }, []);

  const toggleFav = (id: number) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    saveFavs(next);
  };

  const handleTrackSelect = (track: any) => {
    setCurrentTrack(track);
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 6);
    });
  };

  const filteredTracks = ALL_TRACKS.filter(t => {
    if (showFavsOnly && !favorites.includes(t.id)) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (moodFilter !== "all" && t.mood !== moodFilter) return false;
    return true;
  });

  const stats = {
    total: ALL_TRACKS.length,
    favorites: favorites.length,
    totalDuration: ALL_TRACKS.reduce((a, t) => a + t.duration, 0),
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950">
      {/* ── Hero Player Section ─────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 pt-24 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-300 rounded-full text-sm font-medium mb-4 border border-violet-500/30">
              <Music className="w-4 h-4" /> Peace Music Center
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Your Wellness Soundtrack</h1>
            <p className="text-slate-400">{stats.total} tracks · {Math.floor(stats.totalDuration / 3600)}h {Math.floor((stats.totalDuration % 3600) / 60)}m of music · {stats.favorites} favourited</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <MusicPlayer currentTrack={currentTrack} onTrackChange={handleTrackSelect} tracks={filteredTracks.length ? filteredTracks : ALL_TRACKS} />
          </motion.div>
        </div>
      </div>

      {/* ── Library Section ─────────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Mood Filters */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">What do you need right now?</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <MoodPill key={m.value} mood={m} active={moodFilter === m.value} onClick={() => setMoodFilter(m.value)} />
              ))}
            </div>
          </motion.div>

          <div className="grid xl:grid-cols-4 gap-6">
            {/* ── Track Grid (3 cols) ── */}
            <div className="xl:col-span-3">
              {/* Category tabs + controls */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const count = cat.value === "all"
                      ? ALL_TRACKS.filter(t => moodFilter === "all" || t.mood === moodFilter).length
                      : ALL_TRACKS.filter(t => t.category === cat.value && (moodFilter === "all" || t.mood === moodFilter)).length;
                    return (
                      <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${categoryFilter === cat.value
                          ? `bg-gradient-to-r ${cat.color} text-white shadow-md`
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                        <span className="text-xs opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFavsOnly(f => !f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all border ${showFavsOnly ? "bg-red-50 border-red-300 text-red-600" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-300"}`}>
                    <Heart className={`w-3.5 h-3.5 ${showFavsOnly ? "fill-red-500 text-red-500" : ""}`} />
                    Favorites {favorites.length > 0 && `(${favorites.length})`}
                  </button>
                  <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {(["grid", "list"] as const).map(v => (
                      <button key={v} onClick={() => setView(v)}
                        className={`px-3 py-1.5 text-sm transition-colors ${view === v ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        {v === "grid" ? "⊞" : "☰"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredTracks.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tracks match your filters.</p>
                  <button onClick={() => { setCategoryFilter("all"); setMoodFilter("all"); setShowFavsOnly(false); }}
                    className="mt-3 text-violet-600 text-sm hover:underline">Clear filters</button>
                </div>
              ) : view === "grid" ? (
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {filteredTracks.map(track => (
                      <motion.div key={track.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <TrackCard
                          track={track}
                          isActive={currentTrack?.id === track.id}
                          isFav={favorites.includes(track.id)}
                          onPlay={() => handleTrackSelect(track)}
                          onFav={() => toggleFav(track.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filteredTracks.map((track, i) => {
                    const isActive = currentTrack?.id === track.id;
                    const isFav = favorites.includes(track.id);
                    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
                    const grad = CAT_GRADIENTS[track.category] || "from-slate-500 to-slate-600";
                    return (
                      <motion.div key={track.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all group ${isActive ? "bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-300 dark:border-violet-700" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md"}`}
                        onClick={() => handleTrackSelect(track)}>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 overflow-hidden`}>
                          {track.thumbnailUrl && <img src={track.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${isActive ? "text-violet-600" : "text-slate-900 dark:text-white"}`}>{track.title}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{track.category}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{track.mood}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{fmt(track.duration)}</p>
                        <button onClick={e => { e.stopPropagation(); toggleFav(track.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Heart className={`w-4 h-4 ${isFav ? "fill-red-400 text-red-400" : "text-slate-300"}`} />
                        </button>
                        {isActive && (
                          <div className="flex items-end gap-0.5 h-4 shrink-0">
                            {[0,1,2].map(i => (
                              <motion.div key={i} className="w-1 bg-violet-500 rounded-full"
                                animate={{ height: [4, 12, 4] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }} />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Sidebar (1 col) ── */}
            <div className="space-y-4">

              {/* Now Playing Card */}
              <AnimatePresence mode="wait">
                {currentTrack && (
                  <motion.div key={currentTrack.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${CAT_GRADIENTS[currentTrack.category] || "from-violet-500 to-purple-600"}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-semibold text-green-600">Now Playing</span>
                        </div>
                        <img src={currentTrack.thumbnailUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-3"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{currentTrack.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{currentTrack.category} · {currentTrack.mood}</p>
                        {currentTrack.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{currentTrack.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sleep Timer */}
              <SleepTimerWidget onSet={() => {}} />

              {/* Recently Played */}
              {recentlyPlayed.length > 0 && (
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Recently Played</span>
                    </div>
                    <div className="space-y-2">
                      {recentlyPlayed.map(t => {
                        const isActive = currentTrack?.id === t.id;
                        return (
                          <div key={t.id} onClick={() => handleTrackSelect(t)}
                            className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${isActive ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${CAT_GRADIENTS[t.category]} flex items-center justify-center shrink-0`}>
                              <Music className="w-3.5 h-3.5 text-white" />
                            </div>
                            <p className={`text-xs font-medium truncate ${isActive ? "text-violet-600" : "text-slate-700 dark:text-slate-200"}`}>{t.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Favorites count */}
              <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    <span className="text-sm font-semibold text-red-700 dark:text-red-300">Your Favorites</span>
                  </div>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">{favorites.length}</p>
                  <p className="text-xs text-red-500 mt-0.5">tracks saved · stored on your device</p>
                  {favorites.length === 0 && <p className="text-xs text-red-400 mt-2">Tap ❤️ on any track to save it</p>}
                </CardContent>
              </Card>

              {/* Wellness Benefits */}
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Why Music Heals</p>
                  {[
                    { icon: "🧠", title: "Reduces Cortisol", desc: "Music lowers stress hormones by up to 65%." },
                    { icon: "😴", title: "Improves Sleep", desc: "Calming music slows heart rate and breathing." },
                    { icon: "🎯", title: "Boosts Focus", desc: "Ambient music reduces distraction by 20%." },
                    { icon: "❤️", title: "Builds Empathy", desc: "Shared music strengthens social bonds." },
                  ].map(b => (
                    <div key={b.title} className="flex gap-2.5">
                      <span className="text-lg shrink-0">{b.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-white">{b.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Keyboard shortcuts */}
              <Card className="bg-slate-900 dark:bg-slate-950 border border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2.5">⌨️ Keyboard Shortcuts</p>
                  {[
                    ["Space", "Play / Pause"],
                    ["← →", "Seek ±10 seconds"],
                  ].map(([key, action]) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <kbd className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono">{key}</kbd>
                      <span className="text-xs text-slate-400">{action}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
