import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Wind, Brain, Sun, Moon, Waves } from "lucide-react";

export default function WellnessTips() {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const wellnessTips = [
    {
      id: "breathing",
      title: "Deep Breathing",
      icon: Wind,
      color: "from-blue-500 to-indigo-600",
      bgColor: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      description: "Practice the 4-7-8 breathing technique: Inhale for 4, hold for 7, exhale for 8.",
      fullDescription: "The 4-7-8 breathing technique is a powerful relaxation method. Sit comfortably, place your tongue against the roof of your mouth, and breathe in through your nose for 4 counts, hold for 7, then exhale through your mouth for 8 counts. This activates your parasympathetic nervous system, promoting calm and reducing anxiety.",
      category: "Breathing",
      duration: "5 minutes",
    },
    {
      id: "mindfulness",
      title: "Mindfulness",
      icon: Brain,
      color: "from-green-500 to-emerald-600",
      bgColor: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      borderColor: "border-green-200 dark:border-green-800",
      description: "Focus on the present moment. Notice five things you can see, four you can touch, three you can hear.",
      fullDescription: "The 5-4-3-2-1 grounding technique helps anchor you in the present moment. Look around and name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. This practice reduces anxiety and improves focus by engaging all your senses.",
      category: "Mindfulness",
      duration: "3 minutes",
    },
    {
      id: "gratitude",
      title: "Gratitude",
      icon: Heart,
      color: "from-pink-500 to-rose-600",
      bgColor: "from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20",
      borderColor: "border-pink-200 dark:border-pink-800",
      description: "Write down three things you're grateful for today. Small or big, they all matter.",
      fullDescription: "Gratitude practice rewires your brain for positivity. Each day, write down three specific things you're grateful for and why. This could be anything from a warm cup of tea to a friend's kindness. Regular gratitude practice increases happiness, improves relationships, and builds resilience.",
      category: "Emotional",
      duration: "5 minutes",
    },
    {
      id: "morning",
      title: "Morning Intention",
      icon: Sun,
      color: "from-yellow-500 to-orange-600",
      bgColor: "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      description: "Start your day by setting a positive intention and taking three mindful breaths.",
      fullDescription: "Begin each morning by setting a clear, positive intention for your day. This could be 'I will approach challenges with curiosity' or 'I will be kind to myself and others.' Take three deep, mindful breaths while holding this intention. This practice creates mental clarity and emotional stability for the day ahead.",
      category: "Daily Practice",
      duration: "2 minutes",
    },
    {
      id: "evening",
      title: "Evening Reflection",
      icon: Moon,
      color: "from-indigo-500 to-purple-600",
      bgColor: "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
      borderColor: "border-indigo-200 dark:border-indigo-800",
      description: "Reflect on your day with compassion. What went well? What can you learn?",
      fullDescription: "End your day with gentle self-reflection. Ask yourself: What am I proud of today? What challenged me and how did I grow? What am I grateful for? Approach this with self-compassion, treating yourself as you would a good friend. This practice promotes emotional intelligence and continuous growth.",
      category: "Reflection",
      duration: "10 minutes",
    },
    {
      id: "body-scan",
      title: "Body Scan",
      icon: Waves,
      color: "from-teal-500 to-cyan-600",
      bgColor: "from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20",
      borderColor: "border-teal-200 dark:border-teal-800",
      description: "Slowly scan your body from head to toe, noticing areas of tension and relaxation.",
      fullDescription: "Lie down comfortably and close your eyes. Starting from the top of your head, slowly move your attention through each part of your body. Notice any sensations, tension, or areas of relaxation without trying to change anything. This practice increases body awareness, reduces physical tension, and promotes deep relaxation.",
      category: "Relaxation",
      duration: "15 minutes",
    },
  ];

  const startExercise = (exerciseId: string) => {
    setActiveExercise(exerciseId);
    // In a real app, this could start a guided meditation or timer
  };

  return (
    <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-red-500" />
          <span>Wellness Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {wellnessTips.map((tip, index) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`bg-gradient-to-br ${tip.bgColor} rounded-xl p-6 border ${tip.borderColor} ${
                activeExercise === tip.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${tip.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                  <tip.icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {tip.title}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {tip.category}
                    </Badge>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {activeExercise === tip.id ? tip.fullDescription : tip.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>⏱️ {tip.duration}</span>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => startExercise(tip.id)}
                      className={`${
                        activeExercise === tip.id
                          ? "bg-primary text-white"
                          : `bg-gradient-to-r ${tip.color} text-white hover:opacity-90`
                      } transition-all duration-300`}
                    >
                      {activeExercise === tip.id ? "Active" : "Start"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Wellness Resources */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            💡 Quick Wellness Tips
          </h4>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="space-y-2">
              <p>• Take a 2-minute walk every hour</p>
              <p>• Drink water mindfully</p>
              <p>• Practice micro-meditations (30 seconds)</p>
            </div>
            <div className="space-y-2">
              <p>• Smile at yourself in the mirror</p>
              <p>• Send a kind message to someone</p>
              <p>• Take three deep breaths before meals</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
