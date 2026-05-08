import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Sparkles, Flower2, PlayCircle, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import MiniGameShell from "@/components/minigames/MiniGameShell";
import KindnessCatcher from "@/components/minigames/KindnessCatcher";
import EmotionMatch from "@/components/minigames/EmotionMatch";
import PeaceGarden from "@/components/minigames/PeaceGarden";

type GameId = "catcher" | "match" | "garden";

const GAMES: {
  id: GameId;
  title: string;
  blurb: string;
  long: string;
  icon: any;
  emoji: string;
  gradient: string;
  bg: string;
}[] = [
  {
    id: "catcher",
    title: "Kindness Catcher",
    blurb: "Catch the kind words!",
    long: "Move your basket to catch falling kind words and dodge the unkind ones. 45 seconds, 3 hearts.",
    icon: Heart,
    emoji: "💗",
    gradient: "from-rose-500 to-pink-600",
    bg: "from-rose-100 via-pink-100 to-orange-100 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-slate-900",
  },
  {
    id: "match",
    title: "Emotion Memory",
    blurb: "Match the feelings",
    long: "Flip cards and match pairs of emotion faces. Fewer moves = more stars!",
    icon: Sparkles,
    emoji: "🧠",
    gradient: "from-fuchsia-500 to-purple-600",
    bg: "from-fuchsia-100 via-purple-100 to-indigo-100 dark:from-fuchsia-950/40 dark:via-purple-950/30 dark:to-slate-900",
  },
  {
    id: "garden",
    title: "Peace Garden",
    blurb: "Grow a calm garden",
    long: "Tap soil to plant seeds, catch water drops to help them bloom. A zen, zero-pressure ritual.",
    icon: Flower2,
    emoji: "🌷",
    gradient: "from-emerald-500 to-teal-600",
    bg: "from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900",
  },
];

export default function Arcade() {
  useDocumentTitle("Arcade · Mini-Games");
  const [active, setActive] = useState<GameId | null>(null);
  const activeGame = GAMES.find((g) => g.id === active);

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 bg-gradient-to-br from-indigo-50 via-pink-50 to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-6xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white border-0 mb-3">
            <Trophy className="w-3 h-3 mr-1" /> Arcade
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Pick a quick game
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2 max-w-xl mx-auto">
            Three feel-good mini-games — perfect for a 60-second break or a friendly contest.
          </p>
        </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((g, i) => {
            const Icon = g.icon;
            return (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActive(g.id)}
                className="text-left"
              >
                <Card className={`relative overflow-hidden p-0 h-full bg-gradient-to-br ${g.bg} border-2 border-white/50 dark:border-slate-700/50 shadow-xl`}>
                  {/* Big emoji backdrop */}
                  <div className="absolute -top-4 -right-2 text-[7rem] opacity-20 select-none rotate-12">{g.emoji}</div>
                  <div className="relative p-6">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${g.gradient} text-white shadow-lg mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{g.title}</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-semibold">{g.blurb}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">{g.long}</p>
                    <div className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 rounded-full">
                      <PlayCircle className="w-4 h-4" /> Play now
                    </div>
                  </div>
                </Card>
              </motion.button>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-500 mt-10">
          Tip · works great on touch screens at exhibitions. Each game ends with a celebration screen.
        </p>
      </div>

      {activeGame && (
        <MiniGameShell
          open={!!active}
          onClose={() => setActive(null)}
          title={activeGame.title}
          gradient={activeGame.gradient}
        >
          {active === "catcher" && <KindnessCatcher />}
          {active === "match" && <EmotionMatch />}
          {active === "garden" && <PeaceGarden />}
        </MiniGameShell>
      )}
    </div>
  );
}
