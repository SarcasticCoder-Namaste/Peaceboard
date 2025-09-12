import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import { z } from "zod";

// Import your existing modules
import { storage } from "../../server/storage";
import { chatWithAI, generateGameFeedback } from "../../server/openai";
import { insertUserProgressSchema, insertChatConversationSchema } from "../../shared/schema";
import { AuthService } from "../../server/auth";
import { authenticate, requireSchoolAdmin, authRateLimit } from "../../server/middleware";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// Authentication Routes
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

    const sessionToken = AuthService.generateSessionToken();
    const jwtToken = AuthService.generateJWT(user);

    res.cookie('sessionToken', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: (sessionDuration || 60) * 60 * 1000
    });

    res.json({ 
      user, 
      token: jwtToken,
      sessionToken,
      expiresIn: sessionDuration || 60
    });
  } catch (error) {
    console.error("Error creating guest user:", error);
    return res.status(500).json({ message: "Failed to create guest session" });
  }
});

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
    const sessionToken = AuthService.generateSessionToken();
    const token = AuthService.generateJWT(user);

    res.cookie('sessionToken', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({ 
      user, 
      token,
      message: "Registration successful" 
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(400).json({ 
      message: error instanceof Error ? error.message : "Registration failed" 
    });
  }
});

app.post("/api/auth/login", authRateLimit(10, 15), async (req, res) => {
  try {
    const { email, username, password, userType } = req.body;

    if ((!email && !username) || !password || !userType) {
      return res.status(400).json({ message: "Email/username, password, and user type are required" });
    }

    const { user, token, sessionToken } = await AuthService.loginUser({ 
      email, 
      username, 
      password,
      userType 
    });

    res.cookie('sessionToken', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
      user, 
      token,
      message: "Login successful" 
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(401).json({ 
      message: error instanceof Error ? error.message : "Login failed" 
    });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    res.clearCookie('sessionToken');
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Logout failed" });
  }
});

app.get("/api/auth/profile", authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.get("/api/auth/validate", async (req, res) => {
  try {
    const sessionToken = req.cookies?.sessionToken;
    const authHeader = req.headers.authorization;
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!sessionToken && !jwtToken) {
      return res.status(401).json({ 
        valid: false, 
        message: "No authentication token provided" 
      });
    }

    const user = await AuthService.validateSession(sessionToken);
    
    if (!user) {
      return res.status(401).json({ 
        valid: false, 
        message: "Invalid session" 
      });
    }

    res.json({ 
      valid: true, 
      user 
    });
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(401).json({ 
      valid: false, 
      message: "Session validation failed" 
    });
  }
});

// Game routes
app.get("/api/games", async (req, res) => {
  try {
    const games = await storage.getAllGames();
    res.json(games);
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).json({ message: "Failed to fetch games" });
  }
});

// User progress routes
app.post("/api/user-progress", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const progressData = insertUserProgressSchema.parse({
      ...req.body,
      userId
    });

    const progress = await storage.saveProgress(progressData);

    // Generate AI feedback if game completed
    if (progressData.completed && progressData.score !== undefined) {
      try {
        const games = await storage.getAllGames();
        const game = games.find(g => g.id === Number(progressData.gameId));
        if (game) {
          const feedback = await generateGameFeedback(game, progressData.score);
          res.json({ progress, feedback });
          return;
        }
      } catch (feedbackError) {
        console.error("Failed to generate feedback:", feedbackError);
      }
    }

    res.json({ progress });
  } catch (error) {
    console.error("Error saving user progress:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
    } else {
      return res.status(500).json({ message: "Failed to save progress" });
    }
  }
});

// Chat routes
app.post("/api/chat", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const conversationData = insertChatConversationSchema.parse({
      userId,
      userMessage: message,
      timestamp: new Date()
    });

    const response = await chatWithAI(message);
    const fullConversation = {
      ...conversationData,
      aiResponse: response
    };

    const savedConversation = await storage.saveChatConversation(fullConversation);
    res.json({ 
      message: response,
      conversationId: savedConversation.id
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return res.status(500).json({ message: "Chat service temporarily unavailable" });
  }
});

// Music routes
app.get("/api/music", async (req, res) => {
  try {
    const music = await storage.getAllMusicTracks();
    res.json(music);
  } catch (error) {
    console.error("Error fetching music:", error);
    res.status(500).json({ message: "Failed to fetch music" });
  }
});

// Leaderboard routes
app.get("/api/leaderboard", authenticate, async (req, res) => {
  try {
    const { period = "all" } = req.query;
    const leaderboard = await storage.getLeaderboard(period as string);
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

// Analytics routes (for school users)
app.get("/api/analytics/overview", authenticate, requireSchoolAdmin, async (req, res) => {
  try {
    const analytics = await storage.getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);