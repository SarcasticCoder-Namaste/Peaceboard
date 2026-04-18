import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { chatWithAI, generateGameFeedback } from "./openai";
import {
  insertUserProgressSchema,
  insertChatConversationSchema,
  insertMusicFavoriteSchema,
  insertMusicHistorySchema,
  insertEmotionLogSchema,
} from "@shared/schema";
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

      // Create temporary guest user (no database needed)
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const duration = sessionDuration || (24 * 60); // Default 24 hours
      const expiryTime = new Date(Date.now() + duration * 60 * 1000);

      const user = {
        id: guestId,
        firstName: firstName,
        lastName: lastName || '',
        userType: 'guest',
        guestSessionExpiry: expiryTime,
        isActive: true,
        username: null,
        email: null,
        schoolId: null,
        classId: null,
        grade: null
      };

      // Create session token for guest
      const sessionToken = AuthService.generateSessionToken();
      const jwtToken = AuthService.generateJWT(user);

      res.cookie('sessionToken', sessionToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: duration * 60 * 1000 // Convert to milliseconds
      });

      res.json({ 
        user, 
        token: jwtToken,
        sessionToken,
        expiresIn: duration
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
      
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get AI response
      const aiResponse = await chatWithAI(message);
      
      // Only save conversation for non-guest users who exist in the database
      const isGuest = !userId || String(userId).startsWith("guest_");
      if (!isGuest) {
        try {
          const conversationData = insertChatConversationSchema.parse({
            userId,
            messages: [
              { role: "user", content: message, timestamp: new Date() },
              { role: "assistant", content: aiResponse, timestamp: new Date() }
            ]
          });
          await storage.saveChatConversation(conversationData);
        } catch (saveError) {
          // Non-critical: log but don't fail the response
          console.error("Failed to save chat conversation:", saveError);
        }
      }
      
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // ─── Music favorites ──────────────────────────────────────────
  app.get("/api/music/favorites/:userId", async (req, res) => {
    try {
      const favs = await storage.getMusicFavorites(req.params.userId);
      res.json(favs);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/music/favorites", async (req, res) => {
    try {
      const data = insertMusicFavoriteSchema.parse({
        userId: String(req.body.userId),
        trackId: String(req.body.trackId),
      });
      const fav = await storage.addMusicFavorite(data);
      res.json(fav);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(400).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/music/favorites/:userId/:trackId", async (req, res) => {
    try {
      await storage.removeMusicFavorite(req.params.userId, req.params.trackId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // ─── Music history ────────────────────────────────────────────
  app.get("/api/music/history/:userId", async (req, res) => {
    try {
      const limit = req.query.limit ? Math.min(100, Number(req.query.limit)) : 20;
      const history = await storage.getMusicHistory(req.params.userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.post("/api/music/history", async (req, res) => {
    try {
      const data = insertMusicHistorySchema.parse({
        userId: String(req.body.userId),
        trackId: String(req.body.trackId),
        trackTitle: req.body.trackTitle ? String(req.body.trackTitle) : null,
      });
      const entry = await storage.addMusicHistory(data);
      res.json(entry);
    } catch (error) {
      console.error("Error adding history:", error);
      res.status(400).json({ message: "Failed to add history" });
    }
  });

  // ─── Emotion logs ─────────────────────────────────────────────
  app.get("/api/emotions/:userId", async (req, res) => {
    try {
      const limit = req.query.limit ? Math.min(200, Number(req.query.limit)) : 50;
      const logs = await storage.getEmotionLogs(req.params.userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching emotion logs:", error);
      res.status(500).json({ message: "Failed to fetch emotion logs" });
    }
  });

  app.post("/api/emotions", async (req, res) => {
    try {
      const data = insertEmotionLogSchema.parse({
        userId: String(req.body.userId),
        emotion: String(req.body.emotion),
        confidence: req.body.confidence != null ? Math.round(Number(req.body.confidence)) : null,
        wellnessScore: req.body.wellnessScore != null ? Math.round(Number(req.body.wellnessScore)) : null,
      });
      const log = await storage.addEmotionLog(data);
      res.json(log);
    } catch (error) {
      console.error("Error adding emotion log:", error);
      res.status(400).json({ message: "Failed to add emotion log" });
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

  // ─── Admin routes ─────────────────────────────────────────────
  // All admin endpoints require an authenticated teacher or school_admin
  app.use("/api/admin", authenticate, requireTeacher);

  app.get("/api/admin/overview", async (_req, res) => {
    try {
      res.json(await storage.getAdminOverview());
    } catch (error) {
      console.error("Error fetching admin overview:", error);
      res.status(500).json({ message: "Failed to fetch admin overview" });
    }
  });

  app.get("/api/admin/students", async (_req, res) => {
    try {
      res.json(await storage.getStudentsWithStats());
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/admin/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 30;
      res.json(await storage.getRecentActivity(limit));
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get("/api/admin/wellness", async (_req, res) => {
    try {
      res.json(await storage.getWellnessSummary());
    } catch (error) {
      console.error("Error fetching wellness summary:", error);
      res.status(500).json({ message: "Failed to fetch wellness summary" });
    }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const { isActive, userType } = req.body || {};
      let updated;
      if (typeof isActive === "boolean") {
        updated = await storage.setUserActive(req.params.id, isActive);
      }
      if (typeof userType === "string" && ["student", "teacher", "school_admin"].includes(userType)) {
        updated = await storage.setUserType(req.params.id, userType);
      }
      if (!updated) return res.status(400).json({ message: "Nothing to update" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      await storage.deleteUserCascade(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.delete("/api/admin/games/:id", async (req, res) => {
    try {
      const result = await storage.deleteGameSafe(Number(req.params.id));
      if (!result.deleted) return res.status(409).json(result);
      res.json(result);
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ message: "Failed to delete game" });
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
