import {
  users,
  games,
  userProgress,
  achievements,
  userAchievements,
  musicTracks,
  chatConversations,
  type User,
  type UpsertUser,
  type Game,
  type InsertGame,
  type UserProgress,
  type InsertUserProgress,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type MusicTrack,
  type InsertMusicTrack,
  type ChatConversation,
  type InsertChatConversation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createGuestUser(): Promise<User>;
  getUsersByType(userType: string): Promise<User[]>;
  
  // Game operations
  getAllGames(): Promise<Game[]>;
  getGamesByCategory(category: string): Promise<Game[]>;
  getGamesByDifficulty(difficulty: string): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  
  // Progress operations
  getUserProgress(userId: string): Promise<UserProgress[]>;
  getGameProgress(userId: string, gameId: number): Promise<UserProgress | undefined>;
  saveProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  // Leaderboard operations
  getLeaderboard(timeframe?: string): Promise<Array<User & { totalPoints: number; rank: number }>>;
  getUserRank(userId: string): Promise<number>;
  
  // Achievement operations
  getAllAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<Array<Achievement & { earnedAt: Date }>>;
  awardAchievement(userId: string, achievementId: number): Promise<UserAchievement>;
  
  // Music operations
  getAllMusicTracks(): Promise<MusicTrack[]>;
  getMusicTracksByCategory(category: string): Promise<MusicTrack[]>;
  
  // Chat operations
  getChatHistory(userId: string): Promise<ChatConversation[]>;
  saveChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  
  // Analytics operations
  getAnalytics(): Promise<{
    activeStudents: number;
    gamesCompleted: number;
    avgSessionTime: number;
    achievementsEarned: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createGuestUser(): Promise<User> {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24); // 24 hour expiry

    const [user] = await db
      .insert(users)
      .values({
        id: guestId,
        userType: "guest",
        guestSessionExpiry: expiryDate,
      })
      .returning();
    return user;
  }

  async getUsersByType(userType: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.userType, userType));
  }

  // Game operations
  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(games.title);
  }

  async getGamesByCategory(category: string): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.category, category));
  }

  async getGamesByDifficulty(difficulty: string): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.difficulty, difficulty));
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  // Progress operations
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.createdAt));
  }

  async getGameProgress(userId: string, gameId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.gameId, gameId)));
    return progress;
  }

  async saveProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [savedProgress] = await db
      .insert(userProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.gameId],
        set: {
          ...progress,
          completedAt: progress.completed ? new Date() : null,
        },
      })
      .returning();
    return savedProgress;
  }

  // Leaderboard operations
  async getLeaderboard(timeframe?: string): Promise<Array<User & { totalPoints: number; rank: number }>> {
    let dateFilter = sql`true`;
    
    if (timeframe === 'weekly') {
      dateFilter = sql`${userProgress.completedAt} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}`;
    } else if (timeframe === 'monthly') {
      dateFilter = sql`${userProgress.completedAt} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}`;
    }

    const leaderboardData = await db
      .select({
        user: users,
        totalPoints: sql<number>`COALESCE(SUM(${userProgress.pointsEarned}), 0)`,
      })
      .from(users)
      .leftJoin(userProgress, eq(users.id, userProgress.userId))
      .where(dateFilter)
      .groupBy(users.id)
      .orderBy(desc(sql`COALESCE(SUM(${userProgress.pointsEarned}), 0)`));

    return leaderboardData.map((row, index) => ({
      ...row.user,
      rank: index + 1,
      totalPoints: row.totalPoints,
    }));
  }

  async getUserRank(userId: string): Promise<number> {
    const leaderboard = await this.getLeaderboard();
    const userRank = leaderboard.findIndex(user => user.id === userId);
    return userRank >= 0 ? userRank + 1 : 0;
  }

  // Achievement operations
  async getAllAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async getUserAchievements(userId: string): Promise<Array<Achievement & { earnedAt: Date }>> {
    const results = await db
      .select()
      .from(achievements)
      .innerJoin(userAchievements, eq(achievements.id, userAchievements.achievementId))
      .where(eq(userAchievements.userId, userId));
    
    return results
      .filter(result => result.user_achievements.earnedAt !== null)
      .map(result => ({
        ...result.achievements,
        earnedAt: result.user_achievements.earnedAt as Date
      }));
  }

  async awardAchievement(userId: string, achievementId: number): Promise<UserAchievement> {
    const [achievement] = await db
      .insert(userAchievements)
      .values({ userId, achievementId })
      .returning();
    return achievement;
  }

  // Music operations
  async getAllMusicTracks(): Promise<MusicTrack[]> {
    return await db.select().from(musicTracks).orderBy(musicTracks.title);
  }

  async getMusicTracksByCategory(category: string): Promise<MusicTrack[]> {
    return await db.select().from(musicTracks).where(eq(musicTracks.category, category));
  }

  // Chat operations
  async getChatHistory(userId: string): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.updatedAt));
  }

  async saveChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [savedConversation] = await db
      .insert(chatConversations)
      .values({
        ...conversation,
        updatedAt: new Date(),
      })
      .returning();
    return savedConversation;
  }

  // Analytics operations
  async getAnalytics(): Promise<{
    activeStudents: number;
    gamesCompleted: number;
    avgSessionTime: number;
    achievementsEarned: number;
  }> {
    // Active students in the last 7 days
    const activeStudentsResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.updatedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          eq(users.userType, 'student')
        )
      );

    // Completed games
    const completedGamesResult = await db
      .select({ count: count() })
      .from(userProgress)
      .where(eq(userProgress.completed, true));

    // Total achievements earned
    const achievementsResult = await db
      .select({ count: count() })
      .from(userAchievements);

    return {
      activeStudents: activeStudentsResult[0]?.count || 0,
      gamesCompleted: completedGamesResult[0]?.count || 0,
      avgSessionTime: 24.5, // This would need more complex tracking
      achievementsEarned: achievementsResult[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
