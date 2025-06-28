import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Gamepad2, 
  Clock, 
  Trophy, 
  TrendingUp, 
  BarChart3,
  Target,
  Calendar,
  Download
} from "lucide-react";

export default function Analytics() {
  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/leaderboard", "weekly"],
  });

  // Mock comprehensive analytics data
  const mockAnalytics = {
    activeStudents: analytics?.activeStudents || 284,
    gamesCompleted: analytics?.gamesCompleted || 1847,
    avgSessionTime: analytics?.avgSessionTime || 24.5,
    achievementsEarned: analytics?.achievementsEarned || 156,
    weeklyGrowth: {
      students: 12,
      games: 28,
      achievements: 35,
    },
    categoryBreakdown: {
      empathy: { percentage: 42, sessions: 784 },
      socialSkills: { percentage: 28, sessions: 521 },
      conflictResolution: { percentage: 18, sessions: 335 },
      kindnessActivities: { percentage: 12, sessions: 207 },
    },
    weeklyActivity: [
      { day: "Mon", games: 45, students: 32 },
      { day: "Tue", games: 52, students: 38 },
      { day: "Wed", games: 48, students: 35 },
      { day: "Thu", games: 61, students: 42 },
      { day: "Fri", games: 55, students: 39 },
      { day: "Sat", games: 28, students: 18 },
      { day: "Sun", games: 31, students: 22 },
    ],
  };

  const topStudents = leaderboard.slice(0, 5).map((student: any, index: number) => ({
    ...student,
    progress: Math.max(60, 100 - index * 8), // Mock progress calculation
  }));

  const keyMetrics = [
    {
      title: "Active Students",
      value: mockAnalytics.activeStudents,
      change: `+${mockAnalytics.weeklyGrowth.students}%`,
      trend: "up",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Games Completed",
      value: mockAnalytics.gamesCompleted,
      change: `+${mockAnalytics.weeklyGrowth.games}%`,
      trend: "up",
      icon: Gamepad2,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Avg. Session (min)",
      value: mockAnalytics.avgSessionTime,
      change: "Stable",
      trend: "stable",
      icon: Clock,
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Achievements",
      value: mockAnalytics.achievementsEarned,
      change: `+${mockAnalytics.weeklyGrowth.achievements}%`,
      trend: "up",
      icon: Trophy,
      color: "from-purple-500 to-purple-600",
    },
  ];

  const categoryStats = [
    {
      name: "Empathy Games",
      percentage: mockAnalytics.categoryBreakdown.empathy.percentage,
      sessions: mockAnalytics.categoryBreakdown.empathy.sessions,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Social Skills",
      percentage: mockAnalytics.categoryBreakdown.socialSkills.percentage,
      sessions: mockAnalytics.categoryBreakdown.socialSkills.sessions,
      color: "from-green-500 to-green-600",
    },
    {
      name: "Conflict Resolution",
      percentage: mockAnalytics.categoryBreakdown.conflictResolution.percentage,
      sessions: mockAnalytics.categoryBreakdown.conflictResolution.sessions,
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Kindness Activities",
      percentage: mockAnalytics.categoryBreakdown.kindnessActivities.percentage,
      sessions: mockAnalytics.categoryBreakdown.kindnessActivities.sessions,
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Classroom Analytics
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl">
              Real-time insights and detailed reports to help educators track student progress and engagement.
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Select defaultValue="7days">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="3months">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {keyMetrics.map((metric, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${metric.color} rounded-xl flex items-center justify-center text-white`}>
                    <metric.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-2xl ${
                    metric.trend === "up" ? "text-green-500" : 
                    metric.trend === "down" ? "text-red-500" : "text-blue-500"
                  }`}>
                    {metric.trend === "up" ? "↗" : metric.trend === "down" ? "↘" : "→"}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {typeof metric.value === "number" && metric.value > 1000 
                    ? metric.value.toLocaleString() 
                    : metric.value}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">
                  {metric.title}
                </p>
                
                <p className={`text-sm ${
                  metric.trend === "up" ? "text-green-600" : 
                  metric.trend === "down" ? "text-red-600" : "text-slate-500"
                }`}>
                  {metric.change} from last week
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Weekly Activity Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span>Weekly Activity</span>
                  </div>
                  <Select defaultValue="games">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="games">Games</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Simple bar chart representation */}
                <div className="space-y-4">
                  {mockAnalytics.weeklyActivity.map((day, index) => (
                    <div key={day.day} className="flex items-center space-x-4">
                      <div className="w-12 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {day.day}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div 
                            className="h-6 bg-gradient-to-r from-primary to-blue-600 rounded transition-all duration-500"
                            style={{ width: `${(day.games / 70) * 100}%` }}
                          ></div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {day.games}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="h-4 bg-gradient-to-r from-secondary to-green-600 rounded transition-all duration-500"
                            style={{ width: `${(day.students / 50) * 100}%` }}
                          ></div>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {day.students} students
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-primary to-blue-600 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Games Played</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-secondary to-green-600 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Active Students</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Students */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <span>Top Performers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topStudents.map((student: any, index: number) => (
                    <div
                      key={student.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={student.profileImageUrl} />
                        <AvatarFallback>
                          {student.firstName?.[0] || student.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {student.firstName || student.email || `User ${student.id.slice(-4)}`}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress value={student.progress} className="h-2 flex-1" />
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {student.totalPoints || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-6"
                >
                  View Full Report
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Activity Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categoryStats.map((category, index) => (
                  <div
                    key={index}
                    className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4`}>
                      {category.percentage}%
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {category.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {category.sessions.toLocaleString()} sessions
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    📈 Key Insights
                  </h3>
                  <ul className="space-y-3 text-slate-700 dark:text-slate-300">
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <span>Student engagement increased by 28% this week</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                      <span>Empathy games show highest completion rates</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Trophy className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <span>Achievement unlock rate improved by 35%</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    🎯 Recommendations
                  </h3>
                  <ul className="space-y-3 text-slate-700 dark:text-slate-300">
                    <li>• Introduce more conflict resolution scenarios</li>
                    <li>• Consider group activities for social skills development</li>
                    <li>• Schedule regular mindfulness sessions</li>
                    <li>• Celebrate student achievements more frequently</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
