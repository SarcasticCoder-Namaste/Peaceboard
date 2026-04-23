import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listEntries as listDiaryEntries } from "@/lib/diaryStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Flower2, Sprout, Trees, Sun, Cloud, RefreshCcw, Heart } from "lucide-react";

type Stage = "seed" | "sprout" | "bud" | "bloom" | "tree";

interface PlantDef {
  id: string;
  emoji: string;
  name: string;
  source: "game" | "diary" | "kindness" | "music" | "emotion";
  plantedAt: number;
  stage: Stage;
}

const SOURCE_META: Record<PlantDef["source"], { color: string; label: string; flower: string[] }> = {
  game:     { color: "from-violet-400 to-fuchsia-500", label: "Game",        flower: ["🌱","🌿","🌷","🌸","🌳"] },
  diary:    { color: "from-pink-400 to-rose-500",      label: "Diary entry", flower: ["🌱","🌿","🥀","🌹","🌳"] },
  kindness: { color: "from-amber-400 to-orange-500",   label: "Kindness",    flower: ["🌱","🌿","🌼","🌻","🌳"] },
  music:    { color: "from-sky-400 to-cyan-500",       label: "Music",       flower: ["🌱","🌿","🪻","💠","🌳"] },
  emotion:  { color: "from-emerald-400 to-teal-500",   label: "Emotion log", flower: ["🌱","🌿","🌷","🌺","🌳"] },
};

const STAGES: Stage[] = ["seed", "sprout", "bud", "bloom", "tree"];

function stageFromAge(ms: number): Stage {
  const days = ms / 86_400_000;
  if (days < 1)  return "seed";
  if (days < 3)  return "sprout";
  if (days < 7)  return "bud";
  if (days < 21) return "bloom";
  return "tree";
}

function plantEmoji(p: PlantDef): string {
  const idx = STAGES.indexOf(p.stage);
  return SOURCE_META[p.source].flower[idx] ?? "🌱";
}

const STORAGE_KEY = (uid: string) => `pb-garden-${uid || "anon"}`;

function loadPlants(uid: string): PlantDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlantDef[];
    return parsed.map(p => ({ ...p, stage: stageFromAge(Date.now() - p.plantedAt) }));
  } catch { return []; }
}

function savePlants(uid: string, plants: PlantDef[]) {
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(plants));
}

/**
 * Reconciles a user's real activity (games / diary / etc.) against the local
 * garden, planting any new flowers that haven't been recorded yet.
 */
function reconcileGarden(uid: string, sources: { source: PlantDef["source"]; key: string; at: number; name: string }[]): PlantDef[] {
  const existing = loadPlants(uid);
  const have = new Set(existing.map(p => p.id));
  const next = [...existing];
  let added = false;
  for (const s of sources) {
    if (!Number.isFinite(s.at) || s.at <= 0) continue;
    const id = `${s.source}:${s.key}`;
    if (have.has(id)) continue;
    have.add(id); // prevent duplicates within this same pass
    added = true;
    next.push({
      id, source: s.source, name: s.name,
      plantedAt: s.at, stage: stageFromAge(Date.now() - s.at),
      emoji: SOURCE_META[s.source].flower[0],
    });
  }
  if (added) savePlants(uid, next);
  return next;
}

export default function Garden() {
  useDocumentTitle("Compassion Garden");
  const { user } = useAuth();
  const uid = user?.id || "anon";
  const isGuest = !user || uid.startsWith("guest_");

  const { data: progress = [] } = useQuery<any[]>({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user && !isGuest,
  });
  const { data: emotions = [] } = useQuery<any[]>({
    queryKey: [`/api/emotions/${user?.id}`],
    enabled: !!user && !isGuest,
  });
  const { data: history = [] } = useQuery<any[]>({
    queryKey: [`/api/music/history/${user?.id}`],
    enabled: !!user && !isGuest,
  });

  const [plants, setPlants] = useState<PlantDef[]>(() => loadPlants(uid));
  const [planted, setPlanted] = useState<string | null>(null);

  // Reload when user changes
  useEffect(() => { setPlants(loadPlants(uid)); }, [uid]);

  // Reconcile real activity into garden plants
  useEffect(() => {
    const sources: { source: PlantDef["source"]; key: string; at: number; name: string }[] = [];
    for (const p of progress) {
      if (p.completed && p.completedAt) {
        sources.push({ source: "game", key: `g${p.gameId}-${p.completedAt}`, at: new Date(p.completedAt).getTime(), name: "Game completed" });
      }
    }
    for (const e of emotions) {
      if (e.createdAt) sources.push({ source: "emotion", key: `e${e.id}`, at: new Date(e.createdAt).getTime(), name: e.emotion || "Mood logged" });
    }
    for (const h of history.slice(0, 30)) {
      if (h.playedAt) sources.push({ source: "music", key: `m${h.id}`, at: new Date(h.playedAt).getTime(), name: "Track played" });
    }
    // Diary entries — read from the same per-user store the Diary page uses
    try {
      const entries = listDiaryEntries(uid);
      for (const d of entries) {
        if (d?.id && d?.createdAt) {
          sources.push({ source: "diary", key: String(d.id), at: Number(d.createdAt), name: d.title || "Diary entry" });
        }
      }
    } catch {}
    if (sources.length === 0) return;
    setPlants(reconcileGarden(uid, sources));
  }, [progress, emotions, history, uid]);

  const counts = useMemo(() => {
    const c = { seed: 0, sprout: 0, bud: 0, bloom: 0, tree: 0 };
    plants.forEach(p => { c[p.stage] = (c[p.stage] ?? 0) + 1; });
    return c;
  }, [plants]);

  const plantManual = (source: PlantDef["source"], name: string) => {
    const newPlant: PlantDef = {
      id: `${source}:manual-${Date.now()}`,
      source, name, plantedAt: Date.now(), stage: "seed",
      emoji: SOURCE_META[source].flower[0],
    };
    const next = [...plants, newPlant];
    setPlants(next); savePlants(uid, next);
    setPlanted(name);
    setTimeout(() => setPlanted(null), 1800);
  };

  const refresh = () => setPlants(loadPlants(uid));

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-gradient-to-b from-sky-50 via-emerald-50 to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" /> Your Compassion Garden
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 dark:from-emerald-400 dark:via-teal-400 dark:to-sky-400 bg-clip-text text-transparent">
            Grow kindness into a living garden
          </h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Every game you play, diary entry you write, song you listen to and emotion you log plants a seed.
            Come back each day and watch them grow into trees of kindness.
          </p>
        </div>

        {/* Counts strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { k: "seed",   label: "Seeds",   icon: <Sparkles className="w-4 h-4" />, n: counts.seed,   tip: "<1 day" },
            { k: "sprout", label: "Sprouts", icon: <Sprout   className="w-4 h-4" />, n: counts.sprout, tip: "1–3 days" },
            { k: "bud",    label: "Buds",    icon: <Flower2  className="w-4 h-4" />, n: counts.bud,    tip: "3–7 days" },
            { k: "bloom",  label: "Blooms",  icon: <Heart    className="w-4 h-4" />, n: counts.bloom,  tip: "7–21 days" },
            { k: "tree",   label: "Trees",   icon: <Trees    className="w-4 h-4" />, n: counts.tree,   tip: "21+ days" },
          ].map(s => (
            <Card key={s.k} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur border-emerald-100 dark:border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1">
                  {s.icon}{s.label}
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{s.n}</div>
                <div className="text-[11px] text-slate-400">{s.tip}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Garden plot */}
        <Card className="relative overflow-hidden border-emerald-200 dark:border-slate-700 shadow-xl">
          {/* Sky background */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-200 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950" />
          <Sun className="absolute top-6 right-8 w-12 h-12 text-yellow-400 drop-shadow" />
          <Cloud className="absolute top-10 left-12 w-14 h-14 text-white/70" />
          <Cloud className="absolute top-20 left-1/3 w-10 h-10 text-white/50" />

          {/* Grass strip */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-700 via-emerald-500 to-emerald-300 dark:from-emerald-950 dark:via-emerald-800 dark:to-emerald-700" />

          <CardContent className="relative p-6 md:p-10 min-h-[420px]">
            <div className="flex items-center justify-between mb-6 pr-20">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white drop-shadow">
                {plants.length === 0 ? "Plant your first seed" : `${plants.length} plant${plants.length === 1 ? "" : "s"} growing`}
              </h3>
              <Button variant="ghost" size="sm" onClick={refresh} className="text-slate-700 dark:text-slate-200 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                <RefreshCcw className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
            </div>

            {plants.length === 0 ? (
              <div className="text-center py-16 text-slate-700 dark:text-slate-200">
                <div className="text-7xl mb-4">🌱</div>
                <p className="font-semibold mb-1">Your garden is empty.</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Play a game, write in your diary, listen to music or log an emotion — or plant a seed below — and your garden will start to grow.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 relative z-10">
                <AnimatePresence>
                  {plants
                    .slice() // copy
                    .sort((a, b) => a.plantedAt - b.plantedAt)
                    .map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ scale: 0, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 220, damping: 18 }}
                        whileHover={{ scale: 1.2, rotate: [-3, 3, -2, 0] }}
                        title={`${SOURCE_META[p.source].label}${p.name ? " — " + p.name : ""} (${p.stage})`}
                        className="aspect-square flex items-end justify-center text-3xl md:text-4xl select-none"
                      >
                        <span className="drop-shadow-md">{plantEmoji(p)}</span>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plant a kindness manually */}
        <Card className="mt-8 border-amber-200 dark:border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> Plant an act of kindness
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Did something kind today that the app can't track automatically? Plant a seed for it.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Helped someone", emoji: "🤝" },
                { label: "Said thank you", emoji: "🙏" },
                { label: "Listened deeply", emoji: "👂" },
                { label: "Shared something", emoji: "🎁" },
                { label: "Forgave someone", emoji: "💞" },
                { label: "Encouraged a friend", emoji: "💪" },
              ].map(opt => (
                <Button
                  key={opt.label}
                  variant="outline"
                  className="rounded-full border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  onClick={() => plantManual("kindness", opt.label)}
                >
                  <span className="mr-1.5">{opt.emoji}</span>{opt.label}
                </Button>
              ))}
            </div>

            <AnimatePresence>
              {planted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold"
                >
                  <Sparkles className="w-4 h-4" /> Seed planted: {planted}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {(Object.keys(SOURCE_META) as PlantDef["source"][]).map(s => (
            <div key={s} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-2xl mb-1">{SOURCE_META[s].flower[3]}</div>
              <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{SOURCE_META[s].label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
