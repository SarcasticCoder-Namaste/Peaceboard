import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateStarRating } from "@/lib/utils";
import { Play, Trophy, Star, Heart, Users, Handshake, Lightbulb, Brain, Zap, ListOrdered } from "lucide-react";

const GAME_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  scenarios: { label: "Scenarios", icon: Lightbulb, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  "memory-match": { label: "Memory Match", icon: Brain, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  "speed-round": { label: "Speed Round", icon: Zap, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  sequence: { label: "Sequence", icon: ListOrdered, color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

interface GameCardProps {
  game: any;
  viewMode: "grid" | "list";
  userProgress?: any;
  onPlay: () => void;
  delay?: number;
}

export default function GameCard({ game, viewMode, userProgress, onPlay, delay = 0 }: GameCardProps) {
  const categoryIcons = {
    empathy: Heart,
    "social-skills": Users,
    "conflict-resolution": Handshake,
    kindness: Lightbulb,
  };

  const categoryColors = {
    empathy: "from-blue-500 to-purple-600",
    "social-skills": "from-green-500 to-teal-600",
    "conflict-resolution": "from-purple-500 to-pink-600",
    kindness: "from-orange-500 to-red-600",
  };

  const difficultyColors = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const IconComponent = categoryIcons[game.category as keyof typeof categoryIcons] || Heart;
  const isCompleted = userProgress?.completed || false;
  const stars = userProgress?.stars || 0;
  const starRating = generateStarRating(stars);
  const gameType = (game.content as any)?.gameType || "scenarios";
  const typeMeta = GAME_TYPE_META[gameType] || GAME_TYPE_META.scenarios;
  const TypeIcon = typeMeta.icon;

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay }}
      >
        <Card className="bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-16 h-16 bg-gradient-to-br ${categoryColors[game.category]} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {game.title}
                    </h3>
                    {isCompleted && (
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                    {game.description}
                  </p>
                  
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge className={difficultyColors[game.difficulty]}>
                      {game.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      {game.category.replace("-", " ")}
                    </Badge>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeMeta.color}`}>
                      <TypeIcon className="w-3 h-3" /> {typeMeta.label}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {game.points} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {isCompleted && (
                  <div className="text-center">
                    <div className="flex items-center space-x-1 mb-1">
                      {starRating.map((star, index) => (
                        <Star
                          key={index}
                          className={`w-4 h-4 ${
                            star === "filled" ? "text-yellow-400 fill-current" : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Completed</p>
                  </div>
                )}
                
                <Button
                  onClick={onPlay}
                  className="bg-gradient-to-r from-primary to-primary text-white hover:from-primary/90 hover:to-primary/90"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isCompleted ? "Play Again" : "Play"}
                </Button>
              </div>
            </div>

            {userProgress && !isCompleted && userProgress.score !== undefined && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Progress</span>
                  <span className="text-sm font-medium">{userProgress.score}%</span>
                </div>
                <Progress value={userProgress.score} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Card className="bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 group cursor-pointer h-full">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${categoryColors[game.category]} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
              <IconComponent className="w-6 h-6" />
            </div>
            
            {isCompleted ? (
              <div className="flex items-center space-x-1">
                {starRating.map((star, index) => (
                  <Star
                    key={index}
                    className={`w-4 h-4 ${
                      star === "filled" ? "text-yellow-400 fill-current" : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="w-4 h-4 text-slate-300" />
                ))}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {game.title}
              </h3>
              {isCompleted && (
                <Trophy className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
              {game.description}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge className={difficultyColors[game.difficulty]} variant="secondary">
              {game.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {game.category.replace("-", " ")}
            </Badge>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeMeta.color}`}>
              <TypeIcon className="w-3 h-3" /> {typeMeta.label}
            </span>
          </div>

          {userProgress && !isCompleted && userProgress.score !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-300">Progress</span>
                <span className="text-xs font-medium">{userProgress.score}%</span>
              </div>
              <Progress value={userProgress.score} className="h-2" />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {game.points} pts
              </span>
            </div>
            
            <Button
              onClick={onPlay}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary text-white hover:from-primary/90 hover:to-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              {isCompleted ? "Replay" : "Play"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
