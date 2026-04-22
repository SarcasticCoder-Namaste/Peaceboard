import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MusicPlayer from "@/components/music/MusicPlayer";
import FrequencyPlayer from "@/components/music/FrequencyPlayer";
import { Music, Heart, Leaf, Brain, Sparkles, Clock, Timer, Moon, Sun, Flame, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// ─── All tracks use SoundHelix CDN — proven reliable, no CORS, no auth ─────
const ALL_TRACKS = [
  {
    id: 1, title: "Rain in the Forest", category: "nature", mood: "relax", duration: 372,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop",
    description: "Let the gentle sounds of a forest rain wash your worries away."
  },
  {
    id: 2, title: "Ocean Waves", category: "nature", mood: "relax", duration: 421,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop",
    description: "Rolling waves for deep calm and coastal peace."
  },
  {
    id: 3, title: "Deep Meditation", category: "meditation", mood: "focus", duration: 389,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
    description: "Still, spacious tones to anchor your awareness in the present."
  },
  {
    id: 4, title: "Crystal Piano", category: "instrumental", mood: "focus", duration: 347,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=300&h=300&fit=crop",
    description: "Delicate piano lines for quiet study and peaceful reflection."
  },
  {
    id: 5, title: "Night Forest", category: "nature", mood: "sleep", duration: 456,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&h=300&fit=crop",
    description: "Soft nocturnal forest sounds for drifting into sleep."
  },
  {
    id: 6, title: "Morning Clarity", category: "ambient", mood: "focus", duration: 398,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=300&h=300&fit=crop",
    description: "Bright, airy layers to sharpen concentration and open the mind."
  },
  {
    id: 7, title: "Lunar Rest", category: "meditation", mood: "sleep", duration: 512,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1477120128765-a0528148fed6?w=300&h=300&fit=crop",
    description: "Slow meditative drones for pre-sleep mindfulness."
  },
  {
    id: 8, title: "Sunrise Energy", category: "instrumental", mood: "energize", duration: 334,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    description: "Uplifting melodies to energize and inspire your day."
  },
  {
    id: 9, title: "Gentle Creek", category: "nature", mood: "relax", duration: 467,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=300&h=300&fit=crop",
    description: "A babbling stream through green meadows — focus made audible."
  },
  {
    id: 10, title: "Tibetan Space", category: "meditation", mood: "focus", duration: 388,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=300&h=300&fit=crop",
    description: "Open resonance and silence for mindful attention training."
  },
  {
    id: 11, title: "Cloud Drift", category: "ambient", mood: "relax", duration: 362,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&h=300&fit=crop",
    description: "Weightless ambient layers — let your thoughts float by."
  },
  {
    id: 12, title: "Still Waters", category: "instrumental", mood: "sleep", duration: 504,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=300&h=300&fit=crop",
    description: "Tranquil instrumental textures for the deepest rest."
  },
  {
    id: 13, title: "Mountain Air", category: "ambient", mood: "energize", duration: 395,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=300&h=300&fit=crop",
    description: "Fresh, expansive ambient for deep-focus work sessions."
  },
  {
    id: 14, title: "Velvet Night", category: "meditation", mood: "sleep", duration: 543,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=300&h=300&fit=crop",
    description: "Velvety tones and slow pulses — ease into deep sleep."
  },
  {
    id: 15, title: "Inner Strength", category: "instrumental", mood: "energize", duration: 321,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    description: "Driving melodic energy for motivation and peak flow."
  },
  {
    id: 16, title: "Birch Grove", category: "nature", mood: "relax", duration: 432,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1510784722466-f2aa240d9c8e?w=300&h=300&fit=crop",
    description: "Gentle woodland textures for afternoon unwinding."
  },
];

const CATEGORIES = [
  { value: "all",          label: "All",          icon: Music,    color: "from-slate-500 to-slate-600" },
  { value: "nature",       label: "Nature",       icon: Leaf,     color: "from-emerald-500 to-teal-600" },
  { value: "meditation",   label: "Meditation",   icon: Brain,    color: "from-purple-500 to-violet-600" },
  { value: "ambient",      label: "Ambient",      icon: Sparkles, color: "from-blue-500 to-indigo-600" },
  { value: "instrumental", label: "Instrumental", icon: Music,    color: "from-orange-400 to-pink-500" },
];

const MOODS = [
  { value: "all",      label: "All",      icon: Music,    desc: "Everything"   },
  { value: "focus",    label: "Focus",    icon: Sparkles, desc: "Study & work" },
  { value: "relax",    label: "Relax",    icon: Sun,      desc: "Unwind"       },
  { value: "sleep",    label: "Sleep",    icon: Moon,     desc: "Drift off"    },
  { value: "energize", label: "Energize", icon: Flame,    desc: "Get moving"   },
];

const SLEEP_MINS = [15, 30, 45, 60];

const CAT_GRAD: Record<string, string> = {
  nature:       "from-emerald-500 to-teal-600",
  meditation:   "from-purple-500 to-violet-600",
  ambient:      "from-blue-500 to-indigo-600",
  instrumental: "from-orange-400 to-pink-500",
};

// ─── Track Card ─────────────────────────────────────────────────────────────
function TrackCard({ track, isActive, isFav, onPlay, onFav }: {
  track: typeof ALL_TRACKS[0]; isActive: boolean; isFav: boolean;
  onPlay: () => void; onFav: () => void;
}) {
  const grad = CAT_GRAD[track.category] || "from-slate-500 to-slate-600";
  const fmt  = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
      className={`cursor-pointer rounded-2xl overflow-hidden group transition-all ${isActive ? "ring-2 ring-violet-500 shadow-2xl shadow-violet-500/20" : "hover:shadow-xl"}`}
      onClick={onPlay}>
      <div className="relative aspect-square">
        <img src={track.thumbnailUrl} alt={track.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop"; }} />
        <div className={`absolute inset-0 bg-gradient-to-t ${grad} ${isActive ? "opacity-70" : "opacity-50 group-hover:opacity-65"} transition-opacity`} />

        {/* Play overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-2xl">
            {isActive
              ? <div className="flex items-end gap-0.5 h-5">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 bg-violet-600 rounded-full"
                      animate={{ height: [8, 18, 8] }}
                      transition={{ duration: 0.45, repeat: Infinity, delay: i*0.14 }} />
                  ))}
                </div>
              : <Play className="w-6 h-6 text-slate-800 ml-0.5" />}
          </div>
        </div>

        <button onClick={e => { e.stopPropagation(); onFav(); }}
          className="absolute top-2 right-2 w-8 h-8 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors">
          <Heart className={`w-3.5 h-3.5 ${isFav ? "text-red-400 fill-red-400" : "text-white"}`} />
        </button>
        <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full">
          {fmt(track.duration)}
        </div>
      </div>
      <div className="p-3 bg-white dark:bg-slate-800">
        <p className={`font-semibold text-sm truncate ${isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-900 dark:text-white"}`}>
          {track.title}
        </p>
        <div className="flex gap-1 mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{track.category}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{track.mood}</Badge>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sleep Timer ─────────────────────────────────────────────────────────────
function SleepTimer() {
  const [active, setActive] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  const start = (mins: number) => {
    setActive(mins);
    setRemaining(mins * 60);
    const t = setInterval(() => setRemaining(r => {
      if (r <= 1) { clearInterval(t); setActive(null); return 0; }
      return r - 1;
    }), 1000);
  };

  const fmt = (s: number) => `${Math.floor(s/60)}m ${s % 60}s`;

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
          {SLEEP_MINS.map(m => (
            <button key={m} onClick={() => start(m)}
              className={`text-xs py-2 rounded-xl font-medium transition-all ${active === m ? "bg-violet-500 text-white shadow-md" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"}`}>
              {m < 60 ? `${m}m` : "1hr"}
            </button>
          ))}
        </div>
        {active !== null && (
          <button onClick={() => setActive(null)} className="w-full mt-2 text-xs text-red-500 hover:text-red-600">
            Cancel timer
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MusicCenter() {
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack]     = useState<typeof ALL_TRACKS[0]>(() => {
    try {
      const saved = Number(localStorage.getItem("pb-last-track"));
      const found = ALL_TRACKS.find(t => t.id === saved);
      if (found) return found;
    } catch {}
    return ALL_TRACKS[0];
  });
  const [catFilter,    setCatFilter]         = useState("all");
  const [moodFilter,   setMoodFilter]        = useState("all");
  const [showFavs,     setShowFavs]          = useState(false);
  const [view,         setView]              = useState<"grid"|"list">("grid");
  const [recentlyPlayed, setRecentlyPlayed] = useState<typeof ALL_TRACKS>([]);
  const [favorites, setFavorites]           = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("pb-favs") || "[]"); } catch { return []; }
  });

  // Sync favorites + history from backend on login (real users only)
  useEffect(() => {
    if (!user || user.id.startsWith("guest_")) return;
    let cancelled = false;
    (async () => {
      try {
        const favRes = await fetch(`/api/music/favorites/${encodeURIComponent(user.id)}`);
        if (favRes.ok && !cancelled) {
          const rows: { trackId: string }[] = await favRes.json();
          const ids = rows.map(r => Number(r.trackId)).filter(n => !Number.isNaN(n));
          if (ids.length) {
            setFavorites(ids);
            localStorage.setItem("pb-favs", JSON.stringify(ids));
          }
        }
        const histRes = await fetch(`/api/music/history/${encodeURIComponent(user.id)}?limit=6`);
        if (histRes.ok && !cancelled) {
          const rows: { trackId: string }[] = await histRes.json();
          const tracks = rows
            .map(r => ALL_TRACKS.find(t => String(t.id) === String(r.trackId)))
            .filter((t): t is typeof ALL_TRACKS[0] => !!t);
          if (tracks.length) setRecentlyPlayed(tracks);
        }
      } catch { /* network errors are non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const saveFavs = useCallback((ids: number[]) => {
    setFavorites(ids);
    localStorage.setItem("pb-favs", JSON.stringify(ids));
  }, []);

  const selectTrack = (track: { id: any; title: string; category: string; duration: number; audioUrl: string; thumbnailUrl?: string; description?: string; mood?: string }) => {
    const t = track as typeof ALL_TRACKS[0];
    setCurrentTrack(t);
    setRecentlyPlayed(p => [t, ...p.filter(x => x.id !== t.id)].slice(0, 6));
    try { localStorage.setItem("pb-last-track", String(t.id)); } catch {}
    // Persist to backend (real users only); failures are silent
    if (user && !user.id.startsWith("guest_")) {
      apiRequest("POST", "/api/music/history", {
        userId: user.id,
        trackId: String(track.id),
        trackTitle: track.title,
      }).catch(() => {});
    }
  };

  const toggleFav = (id: number) => {
    const has = favorites.includes(id);
    const next = has ? favorites.filter(x => x !== id) : [...favorites, id];
    saveFavs(next);
    // Mirror to backend (real users only)
    if (user && !user.id.startsWith("guest_")) {
      if (has) {
        fetch(`/api/music/favorites/${encodeURIComponent(user.id)}/${id}`, { method: "DELETE" }).catch(() => {});
      } else {
        apiRequest("POST", "/api/music/favorites", { userId: user.id, trackId: String(id) }).catch(() => {});
      }
    }
  };

  const filtered = ALL_TRACKS.filter(t => {
    if (showFavs && !favorites.includes(t.id)) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (moodFilter !== "all" && t.mood !== moodFilter) return false;
    return true;
  });

  const totalMins = Math.round(ALL_TRACKS.reduce((a,t) => a + t.duration, 0) / 60);

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Hero + Player ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950/60 to-slate-900 pt-24 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-20 left-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-teal-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/20 text-violet-300 rounded-full text-sm font-medium border border-violet-500/30 mb-4">
              <Music className="w-4 h-4" /> Wellness Music Center
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Music for Your Mind</h1>
            <p className="text-slate-400 text-sm">
              {ALL_TRACKS.length} calming tracks · {totalMins} minutes · nature · meditation · piano
            </p>
          </motion.div>
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
            <MusicPlayer
              currentTrack={currentTrack}
              onTrackChange={selectTrack}
              tracks={filtered.length ? filtered : ALL_TRACKS}
            />
          </motion.div>

          {/* Healing frequencies generator */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="mt-6">
            <FrequencyPlayer />
          </motion.div>
        </div>
      </div>

      {/* ── Library ───────────────────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Mood bar */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">What do you need right now?</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.value} onClick={() => setMoodFilter(m.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all border ${moodFilter === m.value ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/20 scale-105" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300 hover:text-violet-600"}`}>
                    <Icon className="w-4 h-4" /> {m.label}
                    <span className="text-xs opacity-60">· {m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid xl:grid-cols-4 gap-6">

            {/* ── Track panel ──────────────────────────────── */}
            <div className="xl:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => {
                    const Icon = c.icon;
                    const cnt = ALL_TRACKS.filter(t =>
                      (c.value === "all" || t.category === c.value) &&
                      (moodFilter === "all" || t.mood === moodFilter)
                    ).length;
                    return (
                      <button key={c.value} onClick={() => setCatFilter(c.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${catFilter === c.value ? `bg-gradient-to-r ${c.color} text-white shadow-md` : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                        <Icon className="w-3.5 h-3.5" /> {c.label}
                        <span className="opacity-60 text-xs">({cnt})</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFavs(f => !f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-all ${showFavs ? "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-600" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-200"}`}>
                    <Heart className={`w-3.5 h-3.5 ${showFavs ? "fill-red-500 text-red-500" : ""}`} />
                    Favorites {favorites.length > 0 && `(${favorites.length})`}
                  </button>
                  <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {(["grid","list"] as const).map(v => (
                      <button key={v} onClick={() => setView(v)}
                        className={`px-3 py-1.5 text-sm transition-colors ${view === v ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        {v === "grid" ? "⊞" : "☰"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="mb-3">No tracks match your filters.</p>
                  <button onClick={() => { setCatFilter("all"); setMoodFilter("all"); setShowFavs(false); }}
                    className="text-violet-600 text-sm hover:underline">Clear filters</button>
                </div>
              ) : view === "grid" ? (
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {filtered.map(track => (
                      <motion.div key={track.id} layout initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                        <TrackCard
                          track={track}
                          isActive={currentTrack?.id === track.id}
                          isFav={favorites.includes(track.id)}
                          onPlay={() => selectTrack(track)}
                          onFav={() => toggleFav(track.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((track, i) => {
                    const isActive = currentTrack?.id === track.id;
                    const isFav   = favorites.includes(track.id);
                    const grad    = CAT_GRAD[track.category] || "from-slate-500 to-slate-600";
                    const fmt     = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
                    return (
                      <motion.div key={track.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.025 }}
                        onClick={() => selectTrack(track)}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group ${isActive ? "bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-300 dark:border-violet-700" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md"}`}>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} shrink-0 overflow-hidden`}>
                          <img src={track.thumbnailUrl} alt="" className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-violet-600" : "text-slate-900 dark:text-white"}`}>{track.title}</p>
                          <p className="text-xs text-slate-400 truncate">{track.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] capitalize hidden sm:flex">{track.mood}</Badge>
                          <span className="text-xs text-slate-400">{fmt(track.duration)}</span>
                          <button onClick={e => { e.stopPropagation(); toggleFav(track.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart className={`w-4 h-4 ${isFav ? "fill-red-400 text-red-400" : "text-slate-300"}`} />
                          </button>
                          {isActive && (
                            <div className="flex items-end gap-0.5 h-4">
                              {[0,1,2].map(j => (
                                <motion.div key={j} className="w-1 bg-violet-500 rounded-full"
                                  animate={{ height:[4,12,4] }} transition={{ duration:0.45, repeat:Infinity, delay:j*0.14 }} />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Sidebar ──────────────────────────────────── */}
            <div className="space-y-4">

              {/* Now Playing */}
              <AnimatePresence mode="wait">
                {currentTrack && (
                  <motion.div key={currentTrack.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div className={`h-1.5 bg-gradient-to-r ${CAT_GRAD[currentTrack.category]}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Now Playing</span>
                        </div>
                        <img src={currentTrack.thumbnailUrl} alt=""
                          className="w-full h-28 object-cover rounded-xl mb-3"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{currentTrack.title}</p>
                        <p className="text-xs text-slate-400 capitalize mt-0.5">{currentTrack.category} · {currentTrack.mood}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{currentTrack.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <SleepTimer />

              {/* Recently Played */}
              {recentlyPlayed.length > 0 && (
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Recently Played</span>
                    </div>
                    <div className="space-y-2">
                      {recentlyPlayed.map(t => (
                        <div key={t.id} onClick={() => selectTrack(t)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${currentTrack?.id === t.id ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${CAT_GRAD[t.category]} shrink-0 overflow-hidden`}>
                            <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                          <p className={`text-xs font-medium truncate ${currentTrack?.id === t.id ? "text-violet-600" : "text-slate-700 dark:text-slate-200"}`}>{t.title}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Favorites */}
              <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    <span className="text-sm font-semibold text-red-700 dark:text-red-300">Your Favorites</span>
                  </div>
                  <p className="text-3xl font-bold text-red-800 dark:text-red-200">{favorites.length}</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    {favorites.length === 0 ? "Tap ❤️ on any track to save it" : "tracks saved to your device"}
                  </p>
                </CardContent>
              </Card>

              {/* Why music heals */}
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Why Music Heals 🌿</p>
                  {[
                    ["🧠","Lowers Stress","Music reduces cortisol by up to 65%."],
                    ["😴","Improves Sleep","Calm music slows heart rate & breathing."],
                    ["🎯","Boosts Focus","Ambient sound cuts distraction by 20%."],
                    ["❤️","Builds Empathy","Shared music deepens emotional bonds."],
                  ].map(([e,t,d]) => (
                    <div key={t} className="flex gap-2.5">
                      <span className="text-lg">{e}</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-white">{t}</p>
                        <p className="text-xs text-slate-400">{d}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Keyboard shortcuts */}
              <Card className="bg-slate-900 border border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">⌨️ Shortcuts</p>
                  {[["Space","Play / Pause"],["← →","Seek ±10 s"]].map(([k,a]) => (
                    <div key={k} className="flex justify-between items-center py-1">
                      <kbd className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono">{k}</kbd>
                      <span className="text-xs text-slate-400">{a}</span>
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
