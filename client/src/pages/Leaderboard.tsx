import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Crown, Star, TrendingUp } from "lucide-react";

export default function Leaderboard() {
  const [timeframe, setTimeframe] = useState<string>("weekly");
  const { user } = useAuth();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard", timeframe],
    queryFn: async () => {
      const params = timeframe ? `?timeframe=${timeframe}` : "";
      const response = await fetch(`/api/leaderboard${params}`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
  });

  const { data: userRankData } = useQuery<{ rank?: number }>({
    queryKey: [`/api/leaderboard/rank/${user?.id}`],
    enabled: !!user,
  });

  const { data: userAchievements = [] } = useQuery<any[]>({
    queryKey: [`/api/achievements/${user?.id}`],
    enabled: !!user,
  });

  const timeframes = [
    { value: "weekly", label: "This Week" },
    { value: "monthly", label: "This Month" },
    { value: "alltime", label: "All Time" },
  ];

  const podiumColors = {
    1: "from-yellow-400 to-yellow-600",
    2: "from-slate-400 to-slate-600", 
    3: "from-amber-600 to-yellow-700",
  };

  const recentAchievements = [
    {
      title: "Kindness Streak",
      description: "7 days of daily kindness activities",
      icon: "🔥",
      color: "from-orange-500 to-red-600",
    },
    {
      title: "Empathy Expert", 
      description: "Perfect scores in 5 empathy scenarios",
      icon: "⭐",
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Peace Maker",
      description: "Completed conflict resolution course",
      icon: "❤️",
      color: "from-blue-500 to-indigo-600",
    },
  ];

  const mockUserStats = {
    rank: userRankData?.rank || 12,
    totalPoints: 1620,
    gamesPlayed: 28,
    achievements: userAchievements.length || 7,
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Kindness Leaderboard
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Celebrate achievements and track progress in building empathy and kindness within our community.
          </p>
        </motion.div>

        {/* Timeframe Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? "default" : "outline"}
              onClick={() => setTimeframe(tf.value)}
              className="px-6 py-3 font-medium"
            >
              {tf.label}
            </Button>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2 space-y-8">
            {/* Top 3 Podium */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
                    Top Performers
                  </h3>
                  
                  {isLoading ? (
                    <div className="flex justify-center space-x-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="text-center animate-pulse">
                          <div className="w-16 h-16 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-2"></div>
                          <div className="w-20 h-24 bg-slate-200 dark:bg-slate-700 rounded-t-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-end justify-center space-x-4">
                      {/* 2nd Place */}
                      {leaderboard[1] && (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                            2
                          </div>
                          <div className="w-20 h-24 bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-500 rounded-t-lg flex flex-col justify-end items-center p-2">
                            <Avatar className="w-10 h-10 mb-2">
                              <AvatarImage src={leaderboard[1].profileImageUrl} />
                              <AvatarFallback>{leaderboard[1].firstName?.[0] || "2"}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {leaderboard[1].firstName || `User ${leaderboard[1].id.slice(-4)}`}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {leaderboard[1].totalPoints || 0}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 1st Place */}
                      {leaderboard[0] && (
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-2">
                            <Crown className="w-8 h-8" />
                          </div>
                          <div className="w-24 h-32 bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-lg flex flex-col justify-end items-center p-3">
                            <Avatar className="w-12 h-12 mb-2">
                              <AvatarImage src={leaderboard[0].profileImageUrl} />
                              <AvatarFallback>{leaderboard[0].firstName?.[0] || "1"}</AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-bold text-white">
                              {leaderboard[0].firstName || `User ${leaderboard[0].id.slice(-4)}`}
                            </p>
                            <p className="text-sm text-yellow-100">
                              {leaderboard[0].totalPoints || 0}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 3rd Place */}
                      {leaderboard[2] && (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-yellow-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                            3
                          </div>
                          <div className="w-20 h-20 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg flex flex-col justify-end items-center p-2">
                            <Avatar className="w-10 h-10 mb-2">
                              <AvatarImage src={leaderboard[2].profileImageUrl} />
                              <AvatarFallback>{leaderboard[2].firstName?.[0] || "3"}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-white">
                              {leaderboard[2].firstName || `User ${leaderboard[2].id.slice(-4)}`}
                            </p>
                            <p className="text-xs text-yellow-100">
                              {leaderboard[2].totalPoints || 0}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Full Rankings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle>Full Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
                          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                          </div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                        </div>
                      ))
                    ) : (
                      leaderboard.slice(3).map((user: any, index: number) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                            user.id === user?.id ? "ring-2 ring-primary bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                              {index + 4}
                            </div>
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback>
                                {user.firstName?.[0] || user.email?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {user.firstName || user.email || `User ${user.id.slice(-4)}`}
                              </p>
                              {user.schoolDomain && (
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                  {user.schoolDomain}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {user.totalPoints || 0}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">points</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Recent Achievements */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span>Recent Achievements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAchievements.map((achievement, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-3 bg-gradient-to-r ${achievement.color}/10 rounded-lg border border-current/20`}
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${achievement.color} rounded-lg flex items-center justify-center text-white`}>
                          <span className="text-lg">{achievement.icon}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {achievement.title}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Your Stats */}
            {user && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span>Your Stats</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300">Current Rank</span>
                        <Badge variant="outline" className="text-primary border-primary">
                          #{mockUserStats.rank}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300">Total Points</span>
                        <span className="font-bold text-secondary">
                          {mockUserStats.totalPoints.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300">Games Played</span>
                        <span className="font-bold text-accent">{mockUserStats.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300">Achievements</span>
                        <span className="font-bold text-purple-600">{mockUserStats.achievements}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
