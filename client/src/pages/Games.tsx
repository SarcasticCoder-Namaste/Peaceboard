import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import GameCard from "@/components/games/GameCard";
import GameModal from "@/components/games/GameModal";
import { Grid, List, Filter, Trophy } from "lucide-react";

export default function Games() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const { user } = useAuth();

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["/api/games"],
  });

  const { data: userProgress = [] } = useQuery({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user,
  });

  // Filter games
  const filteredGames = games.filter((game: any) => {
    const categoryMatch = categoryFilter === "all" || game.category === categoryFilter;
    const difficultyMatch = difficultyFilter === "all" || game.difficulty === difficultyFilter;
    return categoryMatch && difficultyMatch;
  });

  // Calculate progress stats
  const completedGames = userProgress.filter((p: any) => p.completed).length;
  const totalPoints = userProgress.reduce((sum: number, p: any) => sum + (p.pointsEarned || 0), 0);
  const averageScore = userProgress.length > 0 
    ? userProgress.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / userProgress.length 
    : 0;

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "empathy", label: "Empathy Scenarios" },
    { value: "social-skills", label: "Social Skills" },
    { value: "conflict-resolution", label: "Conflict Resolution" },
    { value: "kindness", label: "Kindness Activities" },
  ];

  const difficulties = [
    { value: "all", label: "All Levels" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Empathy Building Games
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Interactive scenarios and activities designed to develop emotional intelligence and kindness through engaging gameplay.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8"
        >
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty.value} value={difficulty.value}>
                    {difficulty.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="px-4"
            >
              <Grid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="px-4"
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </motion.div>

        {/* Games Grid/List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={
            viewMode === "grid"
              ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12"
              : "space-y-4 mb-12"
          }
        >
          {filteredGames.map((game: any, index: number) => (
            <GameCard
              key={game.id}
              game={game}
              viewMode={viewMode}
              userProgress={userProgress.find((p: any) => p.gameId === game.id)}
              onPlay={() => setSelectedGame(game)}
              delay={index * 0.1}
            />
          ))}
        </motion.div>

        {/* No games message */}
        {filteredGames.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Filter className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No games found
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Try adjusting your filters to see more games.
            </p>
          </motion.div>
        )}

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Trophy className="w-6 h-6 mr-3 text-yellow-500" />
                Your Progress
              </h3>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {completedGames}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Games Completed</p>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-secondary to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {totalPoints.toLocaleString()}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Total Points</p>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-accent to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {Math.round(averageScore)}%
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Average Score</p>
                </div>
              </div>

              {/* Progress Bar */}
              {games.length > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Overall Completion
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {completedGames}/{games.length} games
                    </span>
                  </div>
                  <Progress value={(completedGames / games.length) * 100} className="h-3" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Game Modal */}
        {selectedGame && (
          <GameModal
            game={selectedGame}
            userProgress={userProgress.find((p: any) => p.gameId === selectedGame.id)}
            isOpen={!!selectedGame}
            onClose={() => setSelectedGame(null)}
          />
        )}
      </div>
    </div>
  );
}
