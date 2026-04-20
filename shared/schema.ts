import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table with comprehensive authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  passwordHash: text("password_hash"), // For non-guest users
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type").notNull().default("guest"), // 'school_admin', 'teacher', 'student', 'guest'
  schoolId: varchar("school_id"),
  classId: varchar("class_id"),
  grade: varchar("grade"),
  studentId: varchar("student_id"),
  schoolCode: varchar("school_code"),
  guestSessionExpiry: timestamp("guest_session_expiry"),
  emailVerified: boolean("email_verified").default(false),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schools table for institutional management
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  domain: varchar("domain").unique(),
  address: text("address"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  adminUserId: varchar("admin_user_id"),
  settings: jsonb("settings"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Classes table for classroom organization
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  schoolId: varchar("school_id").notNull(),
  teacherId: varchar("teacher_id"),
  grade: varchar("grade"),
  subject: varchar("subject"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions for authentication management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: text("session_token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  deviceInfo: text("device_info"),
  ipAddress: varchar("ip_address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  resetToken: text("reset_token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Games table
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // 'empathy', 'social-skills', 'conflict-resolution', 'kindness'
  difficulty: varchar("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  points: integer("points").notNull().default(0),
  content: jsonb("content").notNull(), // Game scenarios and questions
  createdAt: timestamp("created_at").defaultNow(),
});

// User progress tracking
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  gameId: integer("game_id").notNull().references(() => games.id),
  completed: boolean("completed").default(false),
  score: integer("score"),
  stars: integer("stars"), // 1-5 star rating
  pointsEarned: integer("points_earned").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  icon: varchar("icon").notNull(),
  criteria: jsonb("criteria").notNull(), // Requirements to unlock
  pointsReward: integer("points_reward").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Music tracks
export const musicTracks = pgTable("music_tracks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  category: varchar("category").notNull(), // 'nature', 'meditation', 'ambient', 'instrumental'
  duration: integer("duration").notNull(), // Duration in seconds
  audioUrl: varchar("audio_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chatbot conversations
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  messages: jsonb("messages").notNull(), // Array of message objects
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Music favorites — per-user saved tracks (track id can be numeric or string slug)
export const musicFavorites = pgTable("music_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  trackId: varchar("track_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Music history — per-user recently played tracks
export const musicHistory = pgTable("music_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  trackId: varchar("track_id").notNull(),
  trackTitle: varchar("track_title"),
  playedAt: timestamp("played_at").defaultNow(),
});

// Emotion logs — face analysis results
export const emotionLogs = pgTable("emotion_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  emotion: varchar("emotion").notNull(),
  confidence: integer("confidence"),
  wellnessScore: integer("wellness_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Friend invitations — share a link with a friend to join PeaceBoard
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 16 }).unique().notNull(),
  inviterId: varchar("inviter_id").notNull().references(() => users.id),
  inviterName: varchar("inviter_name"),
  message: text("message"),
  status: varchar("status").notNull().default("pending"), // pending | accepted | revoked
  claimedById: varchar("claimed_by_id").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true, code: true, status: true, claimedById: true, claimedAt: true, createdAt: true,
});
export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export const insertMusicFavoriteSchema = createInsertSchema(musicFavorites).omit({ id: true, createdAt: true });
export const insertMusicHistorySchema  = createInsertSchema(musicHistory).omit({ id: true, playedAt: true });
export const insertEmotionLogSchema    = createInsertSchema(emotionLogs).omit({ id: true, createdAt: true });

export type MusicFavorite       = typeof musicFavorites.$inferSelect;
export type InsertMusicFavorite = z.infer<typeof insertMusicFavoriteSchema>;
export type MusicHistory        = typeof musicHistory.$inferSelect;
export type InsertMusicHistory  = z.infer<typeof insertMusicHistorySchema>;
export type EmotionLog          = typeof emotionLogs.$inferSelect;
export type InsertEmotionLog    = z.infer<typeof insertEmotionLogSchema>;

// Session storage table for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  progress: many(userProgress),
  achievements: many(userAchievements),
  conversations: many(chatConversations),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  progress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, { fields: [userProgress.userId], references: [users.id] }),
  game: one(games, { fields: [userProgress.gameId], references: [games.id] }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one }) => ({
  user: one(users, { fields: [chatConversations.userId], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertGameSchema = createInsertSchema(games).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ 
  id: true,
  earnedAt: true 
});

export const insertMusicTrackSchema = createInsertSchema(musicTracks).omit({ 
  id: true, 
  createdAt: true 
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSchoolSchema = createInsertSchema(schools).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertClassSchema = createInsertSchema(classes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type MusicTrack = typeof musicTracks.$inferSelect;
export type InsertMusicTrack = z.infer<typeof insertMusicTrackSchema>;

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
