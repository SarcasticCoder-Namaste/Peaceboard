import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Gamepad2, 
  Music, 
  Trophy, 
  BarChart3, 
  Clock, 
  Star,
  Target,
  Heart,
  TrendingUp
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: userProgress } = useQuery({
    queryKey: [`/api/progress/${user?.id}`],
    enabled: !!user,
  });

  const { data: userRank } = useQuery({
    queryKey: [`/api/leaderboard/rank/${user?.id}`],
    enabled: !!user,
  });

  const { data: userAchievements } = useQuery({
    queryKey: [`/api/achievements/${user?.id}`],
    enabled: !!user,
  });

  // Mock data for demonstration
  const stats = {
    gamesCompleted: userProgress?.filter((p: any) => p.completed).length || 12,
    totalPoints: userProgress?.reduce((sum: number, p: any) => sum + (p.pointsEarned || 0), 0) || 1840,
    achievements: userAchievements?.length || 7,
    currentStreak: 5,
    rank: userRank?.rank || 12,
    weeklyProgress: 75,
  };

  const quickActions = [
    {
      title: "Play Games",
      description: "Continue your empathy journey",
      icon: Gamepad2,
      color: "from-blue-500 to-blue-600",
      action: () => setLocation("/games"),
    },
    {
      title: "Listen to Music",
      description: "Find peace and mindfulness",
      icon: Music,
      color: "from-green-500 to-green-600",
      action: () => setLocation("/music"),
    },
    {
      title: "View Leaderboard",
      description: "See your progress",
      icon: Trophy,
      color: "from-yellow-500 to-orange-500",
      action: () => setLocation("/leaderboard"),
    },
    {
      title: "Analytics",
      description: "Track your growth",
      icon: BarChart3,
      color: "from-purple-500 to-purple-600",
      action: () => setLocation("/analytics"),
      show: user?.userType === "school",
    },
  ];

  const recentAchievements = [
    {
      title: "Kindness Streak",
      description: "7 days of daily kindness activities",
      icon: "🔥",
      earnedAt: "2 days ago",
    },
    {
      title: "Empathy Expert",
      description: "Perfect scores in 5 empathy scenarios",
      icon: "⭐",
      earnedAt: "1 week ago",
    },
    {
      title: "Peace Maker",
      description: "Completed conflict resolution course",
      icon: "❤️",
      earnedAt: "2 weeks ago",
    },
  ];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 👋
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Ready to continue your journey of kindness and empathy?
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.gamesCompleted}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Games Completed</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalPoints}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Points</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">#{stats.rank}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Global Rank</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.currentStreak}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Day Streak</div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {quickActions
                    .filter((action) => action.show !== false)
                    .map((action, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20"
                          onClick={action.action}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white`}>
                                <action.icon className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {action.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {action.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span>Weekly Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      This Week's Goals
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {stats.weeklyProgress}%
                    </span>
                  </div>
                  <Progress value={stats.weeklyProgress} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">5/7</div>
                      <div className="text-slate-600 dark:text-slate-400">Games</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">3/5</div>
                      <div className="text-slate-600 dark:text-slate-400">Music Sessions</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">2/3</div>
                      <div className="text-slate-600 dark:text-slate-400">AI Chats</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Achievements & Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Recent Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAchievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {achievement.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {achievement.description}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {achievement.earnedAt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Tip */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span>Today's Kindness Tip</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                    "A simple smile can brighten someone's entire day. Try smiling at three new people today and notice how it makes you feel."
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      Social Connection
                    </Badge>
                    <Button variant="outline" size="sm">
                      Try This
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span>Session Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Today's Time</span>
                    <span className="font-medium">24 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Streak</span>
                    <span className="font-medium">{stats.currentStreak} days</span>
                  </div>
                  {user?.userType === "guest" && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Session expires</span>
                      <span className="font-medium text-orange-600">
                        {user.guestSessionExpiry 
                          ? new Date(user.guestSessionExpiry).toLocaleDateString()
                          : "24h"
                        }
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
