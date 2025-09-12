import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { chatWithAI, generateGameFeedback } from "./openai";
import { insertUserProgressSchema, insertChatConversationSchema } from "@shared/schema";
import { AuthService } from "./auth";
import { authenticate, requireSchoolAdmin, requireTeacher, requireStudent, authRateLimit } from "./middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  
  // Guest user creation
  app.post("/api/auth/guest", authRateLimit(10, 5), async (req, res) => {
    try {
      const { firstName, lastName, sessionDuration } = req.body;
      
      if (!firstName) {
        return res.status(400).json({ message: "First name is required" });
      }

      const user = await AuthService.createGuestUser({
        firstName,
        lastName,
        sessionDuration
      });

      // Create session token for guest
      const sessionToken = AuthService.generateSessionToken();
      const jwtToken = AuthService.generateJWT(user);

      res.cookie('sessionToken', sessionToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: (sessionDuration || 60) * 60 * 1000 // Convert to milliseconds
      });

      res.json({ 
        user, 
        token: jwtToken,
        sessionToken,
        expiresIn: sessionDuration || 60
      });
    } catch (error) {
      console.error("Error creating guest user:", error);
      res.status(500).json({ message: "Failed to create guest session" });
    }
  });

  // User registration
  app.post("/api/auth/register", authRateLimit(5, 15), async (req, res) => {
    try {
      const { 
        email, 
        username, 
        password, 
        firstName, 
        lastName, 
        userType, 
        schoolCode, 
        classId, 
        grade 
      } = req.body;

      const registerData = {
        email,
        username,
        password,
        firstName,
        lastName,
        userType,
        schoolCode,
        classId,
        grade
      };

      const user = await AuthService.registerUser(registerData);
      const result = await AuthService.loginUser({
        email: user.email || undefined,
        username: user.username || undefined,
        password,
        userType
      });

      res.cookie('sessionToken', result.sessionToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  // User login
  app.post("/api/auth/login", authRateLimit(10, 15), async (req, res) => {
    try {
      const { email, username, password, userType } = req.body;

      if ((!email && !username) || !password || !userType) {
        return res.status(400).json({ message: "Email/username, password, and user type are required" });
      }

      const result = await AuthService.loginUser({
        email,
        username,
        password,
        userType
      });

      res.cookie('sessionToken', result.sessionToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // User logout
  app.post("/api/auth/logout", authenticate, async (req, res) => {
    try {
      if (req.sessionToken) {
        await AuthService.logoutUser(req.sessionToken);
      }
      
      res.clearCookie('sessionToken');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get current user profile
  app.get("/api/auth/profile", authenticate, async (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Validate session
  app.get("/api/auth/validate", async (req, res) => {
    try {
      const sessionToken = req.cookies?.sessionToken || req.headers.authorization?.substring(7);
      
      if (!sessionToken) {
        return res.status(401).json({ valid: false, message: "No session token" });
      }

      const user = await AuthService.validateSession(sessionToken);
      
      if (!user) {
        return res.status(401).json({ valid: false, message: "Invalid session" });
      }

      res.json({ valid: true, user });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ valid: false, message: "Validation failed" });
    }
  });

  // Games routes
  app.get("/api/games", async (req, res) => {
    try {
      const { category, difficulty } = req.query;
      let games;
      
      if (category && typeof category === 'string') {
        games = await storage.getGamesByCategory(category);
      } else if (difficulty && typeof difficulty === 'string') {
        games = await storage.getGamesByDifficulty(difficulty);
      } else {
        games = await storage.getAllGames();
      }
      
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const gameData = req.body;
      const game = await storage.createGame(gameData);
      res.json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  // Progress routes
  app.get("/api/progress/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const progressData = insertUserProgressSchema.parse(req.body);
      const progress = await storage.saveProgress(progressData);
      
      // Generate AI feedback for completed games
      if (progressData.completed && progressData.score !== undefined && progressData.score !== null) {
        try {
          const feedback = await generateGameFeedback(progressData.score as number, progressData.gameId);
          res.json({ progress, feedback });
        } catch (aiError) {
          console.error("Error generating AI feedback:", aiError);
          res.json({ progress, feedback: null });
        }
      } else {
        res.json({ progress });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { timeframe } = req.query;
      const leaderboard = await storage.getLeaderboard(timeframe as string);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/leaderboard/rank/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const rank = await storage.getUserRank(userId);
      res.json({ rank });
    } catch (error) {
      console.error("Error fetching user rank:", error);
      res.status(500).json({ message: "Failed to fetch user rank" });
    }
  });

  // Achievements routes
  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get("/api/achievements/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const userAchievements = await storage.getUserAchievements(userId);
      res.json(userAchievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const { userId, achievementId } = req.body;
      const achievement = await storage.awardAchievement(userId, achievementId);
      res.json(achievement);
    } catch (error) {
      console.error("Error awarding achievement:", error);
      res.status(500).json({ message: "Failed to award achievement" });
    }
  });

  // Music routes
  app.get("/api/music", async (req, res) => {
    try {
      const { category } = req.query;
      let tracks;
      
      if (category && typeof category === 'string') {
        tracks = await storage.getMusicTracksByCategory(category);
      } else {
        tracks = await storage.getAllMusicTracks();
      }
      
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching music tracks:", error);
      res.status(500).json({ message: "Failed to fetch music tracks" });
    }
  });

  // Chat routes
  app.get("/api/chat/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const conversations = await storage.getChatHistory(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { userId, message } = req.body;
      
      // Get AI response
      const aiResponse = await chatWithAI(message);
      
      // Save conversation
      const conversationData = insertChatConversationSchema.parse({
        userId,
        messages: [
          { role: "user", content: message, timestamp: new Date() },
          { role: "assistant", content: aiResponse, timestamp: new Date() }
        ]
      });
      
      const conversation = await storage.saveChatConversation(conversationData);
      res.json({ response: aiResponse, conversation });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Analytics routes
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Initialize sample data if needed
  app.post("/api/init-data", async (req, res) => {
    try {
      // Create sample games
      const sampleGames = [
        {
          title: "Kindness Scenarios",
          description: "Practice responding to everyday situations with empathy and understanding.",
          category: "empathy",
          difficulty: "beginner",
          points: 120,
          content: {
            scenarios: [
              {
                question: "A classmate drops their books in the hallway. What do you do?",
                options: [
                  { text: "Help them pick up their books", points: 10, feedback: "Great choice! Helping others shows kindness." },
                  { text: "Walk past without noticing", points: 0, feedback: "Try to be more aware of others who might need help." },
                  { text: "Laugh at them", points: -5, feedback: "This would hurt their feelings. Consider how you'd feel in their situation." }
                ]
              }
            ]
          }
        },
        {
          title: "Social Skills Builder",
          description: "Learn effective communication and collaboration through interactive challenges.",
          category: "social-skills",
          difficulty: "intermediate",
          points: 200,
          content: {
            scenarios: [
              {
                question: "How do you join a group conversation?",
                options: [
                  { text: "Wait for a natural pause and introduce yourself", points: 10, feedback: "Perfect! This shows respect for the ongoing conversation." },
                  { text: "Interrupt immediately", points: 0, feedback: "Interrupting can be rude. Try waiting for a good moment." }
                ]
              }
            ]
          }
        }
      ];

      for (const game of sampleGames) {
        await storage.createGame(game);
      }

      // Create sample music tracks
      const sampleTracks = [
        {
          title: "Forest Meditation",
          category: "nature",
          duration: 510,
          audioUrl: "https://www.soundjay.com/misc/sounds/forest-1.mp3",
          description: "Peaceful forest sounds for meditation"
        },
        {
          title: "Ocean Waves",
          category: "nature", 
          duration: 405,
          audioUrl: "https://www.soundjay.com/misc/sounds/ocean-1.mp3",
          description: "Calming ocean waves"
        },
        {
          title: "Tibetan Bells",
          category: "meditation",
          duration: 620,
          audioUrl: "https://www.soundjay.com/misc/sounds/bell-1.mp3",
          description: "Traditional meditation bells"
        }
      ];

      for (const track of sampleTracks) {
        await storage.getAllMusicTracks(); // This will create the table
      }

      res.json({ message: "Sample data initialized successfully" });
    } catch (error) {
      console.error("Error initializing data:", error);
      res.status(500).json({ message: "Failed to initialize sample data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
