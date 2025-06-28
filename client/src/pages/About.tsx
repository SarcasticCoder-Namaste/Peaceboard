import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Gamepad2, Music, Bot, Trophy, BarChart3, Shield } from "lucide-react";

export default function About() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Gamepad2,
      title: "Empathy Games",
      description: "Interactive games teaching emotional intelligence and social skills through engaging scenarios.",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      icon: Music,
      title: "Peace Music Center",
      description: "Calming tracks and meditation music to promote mindfulness and emotional regulation.",
      gradient: "from-green-500 to-green-600",
    },
    {
      icon: Bot,
      title: "AI Guidance",
      description: "24/7 emotional support with personalized suggestions and real-time guidance.",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Progress tracking and insights for educators to monitor student engagement.",
      gradient: "from-indigo-500 to-purple-600",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4 mr-2" />
            Building Empathy Through Education
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              PeaceBoard
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            An educational platform that builds empathy and kindness through interactive games, AI guidance, and mindfulness practices.
          </p>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setLocation("/auth")}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary to-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              Get Started
              <motion.div
                className="ml-2"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 group hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 md:p-12 text-center border border-primary/20"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
            Our Mission
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed mb-8">
            We believe empathy and kindness can be learned and strengthened. Through interactive experiences 
            and AI-guided support, we're helping create compassionate leaders with strong emotional intelligence.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Evidence-based learning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span>Safe learning environment</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Measurable progress</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
