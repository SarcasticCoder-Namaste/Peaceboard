import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type").notNull().default("guest"), // 'school', 'student', 'guest'
  schoolDomain: varchar("school_domain"),
  studentId: varchar("student_id"),
  schoolCode: varchar("school_code"),
  guestSessionExpiry: timestamp("guest_session_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
