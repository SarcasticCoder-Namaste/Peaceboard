import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Star, Trophy, ArrowRight, ArrowLeft } from "lucide-react";

interface GameModalProps {
  game: any;
  userProgress?: any;
  isOpen: boolean;
  onClose: () => void;
}

interface GameQuestion {
  question: string;
  options: Array<{
    text: string;
    points: number;
    feedback: string;
  }>;
}

export default function GameModal({ game, userProgress, isOpen, onClose }: GameModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>("");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock game content - in a real app this would come from the game data
  const gameQuestions: GameQuestion[] = game?.content?.scenarios || [
    {
      question: "A classmate drops their books in the hallway. What do you do?",
      options: [
        {
          text: "Help them pick up their books",
          points: 10,
          feedback: "Excellent! Helping others shows kindness and empathy. You recognized someone in need and took action to help."
        },
        {
          text: "Walk past without noticing",
          points: 2,
          feedback: "Try to be more aware of others who might need help. Being mindful of our surroundings helps us notice when others need support."
        },
        {
          text: "Laugh at them",
          points: 0,
          feedback: "This would hurt their feelings. Consider how you'd feel in their situation. Empathy means understanding others' emotions."
        }
      ]
    },
    {
      question: "Your friend seems upset after getting a low grade. How do you respond?",
      options: [
        {
          text: "Listen and offer emotional support",
          points: 10,
          feedback: "Perfect! Being a good listener and offering emotional support shows true empathy and strengthens friendships."
        },
        {
          text: "Tell them grades don't matter",
          points: 5,
          feedback: "While you're trying to help, sometimes acknowledging their feelings first is more important than minimizing their concerns."
        },
        {
          text: "Share your own good grade",
          points: 1,
          feedback: "This might make them feel worse. Focus on their feelings rather than comparing situations."
        }
      ]
    },
    {
      question: "You notice a new student sitting alone at lunch. What do you do?",
      options: [
        {
          text: "Invite them to sit with you and your friends",
          points: 10,
          feedback: "Wonderful! Including others and making them feel welcome shows great empathy and kindness."
        },
        {
          text: "Smile at them but stay with your friends",
          points: 6,
          feedback: "A smile is nice, but taking action to include them would make an even bigger difference."
        },
        {
          text: "Ignore them - it's not your problem",
          points: 0,
          feedback: "Everyone deserves to feel included. Consider how you'd feel if you were new and alone."
        }
      ]
    }
  ];

  const saveProgressMutation = useMutation({
    mutationFn: async (progressData: any) => {
      const response = await apiRequest("POST", "/api/progress", progressData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/progress/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      
      if (data.feedback) {
        setAiFeedback(data.feedback);
      }
      
      toast({
        title: "Progress Saved!",
        description: "Your game progress has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnswerSelect = (optionIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(optionIndex);
    setShowFeedback(true);
    
    const points = gameQuestions[currentQuestionIndex].options[optionIndex].points;
    setGameScore(prev => prev + points);
    setTotalPoints(prev => prev + points);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < gameQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      completeGame();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const completeGame = () => {
    const finalScore = Math.round((totalPoints / (gameQuestions.length * 10)) * 100);
    const stars = Math.min(5, Math.max(1, Math.round(finalScore / 20)));
    
    if (user) {
      saveProgressMutation.mutate({
        userId: user.id,
        gameId: game.id,
        completed: true,
        score: finalScore,
        stars,
        pointsEarned: totalPoints,
      });
    }
    
    setGameCompleted(true);
  };

  const resetGame = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setGameScore(0);
    setTotalPoints(0);
    setGameCompleted(false);
    setAiFeedback("");
  };

  const handleClose = () => {
    resetGame();
    onClose();
  };

  const currentQuestion = gameQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + (showFeedback ? 1 : 0)) / gameQuestions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{game?.title}</span>
            {gameCompleted && <Trophy className="w-5 h-5 text-yellow-500" />}
          </DialogTitle>
          <DialogDescription>
            {game?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Question {currentQuestionIndex + 1} of {gameQuestions.length}
              </span>
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">{totalPoints} points</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {!gameCompleted ? (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    {currentQuestion.question}
                  </h3>
                </CardContent>
              </Card>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: showFeedback ? 1 : 1.02 }}
                    whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-300 ${
                        selectedAnswer === index
                          ? option.points >= 8
                            ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                            : option.points >= 5
                            ? "ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                            : "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20"
                          : "hover:shadow-lg border border-slate-200 dark:border-slate-700"
                      } ${showFeedback ? "cursor-default" : ""}`}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-900 dark:text-white">{option.text}</span>
                          {selectedAnswer === index && showFeedback && (
                            <div className="flex items-center space-x-2">
                              {option.points >= 8 ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : option.points >= 5 ? (
                                <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                                  <span className="text-white text-xs">!</span>
                                </div>
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <Badge variant="outline">+{option.points}</Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {showFeedback && selectedAnswer !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                          Feedback:
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300">
                          {currentQuestion.options[selectedAnswer].feedback}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <Button
                  onClick={handleNextQuestion}
                  disabled={!showFeedback}
                  className="bg-gradient-to-r from-primary to-primary text-white"
                >
                  {currentQuestionIndex === gameQuestions.length - 1 ? "Finish" : "Next"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Game Completion */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-6"
            >
              <div className="space-y-4">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Congratulations!
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  You've completed the game and earned {totalPoints} points!
                </p>
              </div>

              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {Math.round((totalPoints / (gameQuestions.length * 10)) * 100)}%
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {totalPoints}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Points</div>
                    </div>
                    <div>
                      <div className="flex justify-center space-x-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.min(5, Math.max(1, Math.round((totalPoints / (gameQuestions.length * 10)) * 5)))
                                ? "text-yellow-400 fill-current"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Stars</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {aiFeedback && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      AI Feedback:
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300">{aiFeedback}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={resetGame}>
                  Play Again
                </Button>
                <Button onClick={handleClose} className="bg-gradient-to-r from-primary to-primary text-white">
                  Continue
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
