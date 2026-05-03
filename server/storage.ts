import {
  users,
  games,
  userProgress,
  achievements,
  userAchievements,
  musicTracks,
  chatConversations,
  musicFavorites,
  musicHistory,
  emotionLogs,
  invitations,
  compliments,
  schools,
  userSessions,
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
  type MusicFavorite,
  type InsertMusicFavorite,
  type MusicHistory,
  type InsertMusicHistory,
  type EmotionLog,
  type InsertEmotionLog,
  type Invitation,
  type InsertInvitation,
  type Compliment,
  type InsertCompliment,
  type School,
  type UserSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, count, ne, or, inArray } from "drizzle-orm";

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
  
  // Music favorites
  getMusicFavorites(userId: string): Promise<MusicFavorite[]>;
  addMusicFavorite(fav: InsertMusicFavorite): Promise<MusicFavorite>;
  removeMusicFavorite(userId: string, trackId: string): Promise<void>;

  // Music history
  getMusicHistory(userId: string, limit?: number): Promise<MusicHistory[]>;
  addMusicHistory(entry: InsertMusicHistory): Promise<MusicHistory>;

  // Emotion logs
  getEmotionLogs(userId: string, limit?: number): Promise<EmotionLog[]>;
  addEmotionLog(entry: InsertEmotionLog): Promise<EmotionLog>;

  // Analytics operations
  getAnalytics(): Promise<{
    activeStudents: number;
    gamesCompleted: number;
    avgSessionTime: number;
    achievementsEarned: number;
  }>;

  // Admin operations
  getAdminOverview(): Promise<AdminOverview>;
  getStudentsWithStats(): Promise<StudentWithStats[]>;
  getRecentActivity(limit?: number): Promise<ActivityEntry[]>;
  getWellnessSummary(): Promise<WellnessSummary>;
  setUserActive(userId: string, isActive: boolean): Promise<User>;
  setUserType(userId: string, userType: string): Promise<User>;
  deleteUserCascade(userId: string): Promise<void>;
  deleteGameSafe(gameId: number): Promise<{ deleted: boolean; reason?: string }>;

  // Invitations
  createInvitation(data: InsertInvitation & { code: string; expiresAt?: Date }): Promise<Invitation>;
  getInvitationByCode(code: string): Promise<Invitation | undefined>;
  getInvitationsByInviter(inviterId: string): Promise<Invitation[]>;
  claimInvitation(code: string, claimedById: string): Promise<Invitation | undefined>;
  revokeInvitation(code: string, inviterId: string): Promise<boolean>;

  // Linked devices / sessions
  getActiveSessionsForUser(userId: string): Promise<UserSession[]>;
  revokeUserSession(sessionId: string, userId: string): Promise<void>;
  revokeAllUserSessions(userId: string, exceptToken?: string): Promise<number>;

  // Schools (admin)
  getAllSchools(): Promise<Array<School & { studentCount: number; activeCount: number }>>;
}

export type AdminOverview = {
  totalStudents: number;
  activeStudents: number;
  totalGamesCompleted: number;
  totalAchievementsEarned: number;
  totalMusicPlays: number;
  totalEmotionChecks: number;
  avgWellness: number;
  weeklyActivity: Array<{ day: string; games: number; music: number; checks: number }>;
  categoryBreakdown: Array<{ category: string; sessions: number; percentage: number }>;
};

export type StudentWithStats = User & {
  totalPoints: number;
  gamesCompleted: number;
  lastActive: Date | null;
  avgWellness: number | null;
};

export type ActivityEntry = {
  type: "game" | "music" | "emotion";
  userId: string;
  userName: string;
  detail: string;
  meta?: string;
  at: Date;
};

export type WellnessSummary = {
  moodCounts: Array<{ emotion: string; count: number }>;
  averageWellness: number;
  totalChecks: number;
  lowWellnessStudents: Array<{
    userId: string;
    name: string;
    avgWellness: number;
    lastChecked: Date;
  }>;
};

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

  // Music favorites
  async getMusicFavorites(userId: string): Promise<MusicFavorite[]> {
    return await db.select().from(musicFavorites)
      .where(eq(musicFavorites.userId, userId))
      .orderBy(desc(musicFavorites.createdAt));
  }

  async addMusicFavorite(fav: InsertMusicFavorite): Promise<MusicFavorite> {
    // Avoid duplicates
    const existing = await db.select().from(musicFavorites)
      .where(and(eq(musicFavorites.userId, fav.userId), eq(musicFavorites.trackId, fav.trackId)));
    if (existing.length) return existing[0];
    const [row] = await db.insert(musicFavorites).values(fav).returning();
    return row;
  }

  async removeMusicFavorite(userId: string, trackId: string): Promise<void> {
    await db.delete(musicFavorites)
      .where(and(eq(musicFavorites.userId, userId), eq(musicFavorites.trackId, trackId)));
  }

  // Music history
  async getMusicHistory(userId: string, limit = 20): Promise<MusicHistory[]> {
    return await db.select().from(musicHistory)
      .where(eq(musicHistory.userId, userId))
      .orderBy(desc(musicHistory.playedAt))
      .limit(limit);
  }

  async addMusicHistory(entry: InsertMusicHistory): Promise<MusicHistory> {
    const [row] = await db.insert(musicHistory).values(entry).returning();
    return row;
  }

  // Emotion logs
  async getEmotionLogs(userId: string, limit = 50): Promise<EmotionLog[]> {
    return await db.select().from(emotionLogs)
      .where(eq(emotionLogs.userId, userId))
      .orderBy(desc(emotionLogs.createdAt))
      .limit(limit);
  }

  async addEmotionLog(entry: InsertEmotionLog): Promise<EmotionLog> {
    const [row] = await db.insert(emotionLogs).values(entry).returning();
    return row;
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

  // ─── Admin operations ─────────────────────────────────────────
  async getAdminOverview(): Promise<AdminOverview> {
    const studentFilter = or(eq(users.userType, "student"), eq(users.userType, "guest"));
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalStudents] = await db.select({ c: count() }).from(users).where(studentFilter!);
    const [activeStudents] = await db.select({ c: count() }).from(users)
      .where(and(studentFilter!, gte(users.updatedAt, sevenDaysAgo)));
    const [gamesCompleted] = await db.select({ c: count() }).from(userProgress)
      .where(eq(userProgress.completed, true));
    const [achievementsEarned] = await db.select({ c: count() }).from(userAchievements);
    const [musicPlays] = await db.select({ c: count() }).from(musicHistory);
    const [emotionChecks] = await db.select({ c: count() }).from(emotionLogs);
    const [wellnessAvg] = await db.select({
      a: sql<number>`COALESCE(AVG(${emotionLogs.wellnessScore}), 0)`,
    }).from(emotionLogs);

    // Last-7-day buckets
    const dayKey = (d: Date) => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    };
    const buckets = new Map<number, { day: string; games: number; music: number; checks: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      buckets.set(d.getTime(), {
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        games: 0, music: 0, checks: 0,
      });
    }
    const inc = (rows: Array<{ at: Date | null }>, field: "games" | "music" | "checks") => {
      for (const r of rows) {
        if (!r.at) continue;
        const k = dayKey(r.at);
        const b = buckets.get(k);
        if (b) b[field]++;
      }
    };
    const gameRows = await db.select({ at: userProgress.completedAt }).from(userProgress)
      .where(and(eq(userProgress.completed, true), gte(userProgress.completedAt, sevenDaysAgo)));
    const musicRows = await db.select({ at: musicHistory.playedAt }).from(musicHistory)
      .where(gte(musicHistory.playedAt, sevenDaysAgo));
    const checkRows = await db.select({ at: emotionLogs.createdAt }).from(emotionLogs)
      .where(gte(emotionLogs.createdAt, sevenDaysAgo));
    inc(gameRows, "games");
    inc(musicRows, "music");
    inc(checkRows, "checks");

    // Category breakdown via join games -> userProgress
    const catRows = await db.select({
      category: games.category,
      sessions: sql<number>`COUNT(${userProgress.id})`,
    })
      .from(games)
      .leftJoin(userProgress, eq(userProgress.gameId, games.id))
      .groupBy(games.category);
    const totalSessions = catRows.reduce((s, r) => s + Number(r.sessions || 0), 0) || 1;
    const categoryBreakdown = catRows
      .map(r => ({
        category: r.category,
        sessions: Number(r.sessions || 0),
        percentage: Math.round((Number(r.sessions || 0) / totalSessions) * 100),
      }))
      .sort((a, b) => b.sessions - a.sessions);

    return {
      totalStudents: Number(totalStudents?.c || 0),
      activeStudents: Number(activeStudents?.c || 0),
      totalGamesCompleted: Number(gamesCompleted?.c || 0),
      totalAchievementsEarned: Number(achievementsEarned?.c || 0),
      totalMusicPlays: Number(musicPlays?.c || 0),
      totalEmotionChecks: Number(emotionChecks?.c || 0),
      avgWellness: Math.round(Number(wellnessAvg?.a || 0)),
      weeklyActivity: Array.from(buckets.values()),
      categoryBreakdown,
    };
  }

  async getStudentsWithStats(): Promise<StudentWithStats[]> {
    const studentRows = await db.select().from(users)
      .where(or(eq(users.userType, "student"), eq(users.userType, "guest"))!)
      .orderBy(desc(users.updatedAt));

    if (!studentRows.length) return [];
    const ids = studentRows.map(s => s.id);

    const progressAgg = await db.select({
      userId: userProgress.userId,
      points: sql<number>`COALESCE(SUM(${userProgress.pointsEarned}), 0)`,
      games: sql<number>`COUNT(*) FILTER (WHERE ${userProgress.completed} = true)`,
      lastAt: sql<Date | null>`MAX(${userProgress.completedAt})`,
    }).from(userProgress)
      .where(inArray(userProgress.userId, ids))
      .groupBy(userProgress.userId);

    const wellnessAgg = await db.select({
      userId: emotionLogs.userId,
      avg: sql<number>`COALESCE(AVG(${emotionLogs.wellnessScore}), 0)`,
      lastAt: sql<Date | null>`MAX(${emotionLogs.createdAt})`,
    }).from(emotionLogs)
      .where(inArray(emotionLogs.userId, ids))
      .groupBy(emotionLogs.userId);

    const pMap = new Map(progressAgg.map(r => [r.userId, r]));
    const wMap = new Map(wellnessAgg.map(r => [r.userId, r]));

    return studentRows.map(s => {
      const p = pMap.get(s.id);
      const w = wMap.get(s.id);
      const lastDates = [s.updatedAt, p?.lastAt ?? null, w?.lastAt ?? null]
        .filter(Boolean)
        .map(d => new Date(d as Date).getTime());
      const lastActive = lastDates.length ? new Date(Math.max(...lastDates)) : null;
      return {
        ...s,
        totalPoints: Number(p?.points || 0),
        gamesCompleted: Number(p?.games || 0),
        lastActive,
        avgWellness: w ? Math.round(Number(w.avg)) : null,
      };
    });
  }

  async getRecentActivity(limit = 30): Promise<ActivityEntry[]> {
    const cap = Math.min(100, Math.max(5, limit));

    const gameRows = await db.select({
      userId: userProgress.userId,
      first: users.firstName,
      email: users.email,
      gameTitle: games.title,
      score: userProgress.score,
      stars: userProgress.stars,
      at: userProgress.completedAt,
    }).from(userProgress)
      .innerJoin(games, eq(games.id, userProgress.gameId))
      .leftJoin(users, eq(users.id, userProgress.userId))
      .where(eq(userProgress.completed, true))
      .orderBy(desc(userProgress.completedAt))
      .limit(cap);

    const musicRows = await db.select({
      userId: musicHistory.userId,
      first: users.firstName,
      email: users.email,
      track: musicHistory.trackTitle,
      at: musicHistory.playedAt,
    }).from(musicHistory)
      .leftJoin(users, eq(users.id, musicHistory.userId))
      .orderBy(desc(musicHistory.playedAt))
      .limit(cap);

    const emoRows = await db.select({
      userId: emotionLogs.userId,
      first: users.firstName,
      email: users.email,
      emotion: emotionLogs.emotion,
      wellness: emotionLogs.wellnessScore,
      at: emotionLogs.createdAt,
    }).from(emotionLogs)
      .leftJoin(users, eq(users.id, emotionLogs.userId))
      .orderBy(desc(emotionLogs.createdAt))
      .limit(cap);

    const nameOf = (first: string | null, email: string | null, id: string) =>
      first || (email ? email.split("@")[0] : null) || `User ${id.slice(-5)}`;

    const all: ActivityEntry[] = [
      ...gameRows.filter(r => r.at).map(r => ({
        type: "game" as const,
        userId: r.userId,
        userName: nameOf(r.first, r.email, r.userId),
        detail: `Completed "${r.gameTitle}"`,
        meta: `${r.score ?? 0} pts · ${r.stars ?? 0}★`,
        at: r.at as Date,
      })),
      ...musicRows.filter(r => r.at).map(r => ({
        type: "music" as const,
        userId: r.userId,
        userName: nameOf(r.first, r.email, r.userId),
        detail: `Played "${r.track || "track"}"`,
        at: r.at as Date,
      })),
      ...emoRows.filter(r => r.at).map(r => ({
        type: "emotion" as const,
        userId: r.userId,
        userName: nameOf(r.first, r.email, r.userId),
        detail: `Wellness check: ${r.emotion}`,
        meta: r.wellness != null ? `${r.wellness}%` : undefined,
        at: r.at as Date,
      })),
    ];

    return all.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, cap);
  }

  async getWellnessSummary(): Promise<WellnessSummary> {
    const moodRows = await db.select({
      emotion: emotionLogs.emotion,
      c: count(),
    }).from(emotionLogs).groupBy(emotionLogs.emotion);

    const [avgRow] = await db.select({
      a: sql<number>`COALESCE(AVG(${emotionLogs.wellnessScore}), 0)`,
      t: count(),
    }).from(emotionLogs);

    const perUser = await db.select({
      userId: emotionLogs.userId,
      avg: sql<number>`COALESCE(AVG(${emotionLogs.wellnessScore}), 0)`,
      lastAt: sql<Date | null>`MAX(${emotionLogs.createdAt})`,
      cnt: count(),
    }).from(emotionLogs).groupBy(emotionLogs.userId);

    const lowOnes = perUser.filter(p => p.cnt >= 2 && Number(p.avg) < 60);
    const ids = lowOnes.map(p => p.userId);
    const userMap = new Map<string, User>();
    if (ids.length) {
      const us = await db.select().from(users).where(inArray(users.id, ids));
      for (const u of us) userMap.set(u.id, u);
    }
    const lowWellnessStudents = lowOnes
      .map(p => {
        const u = userMap.get(p.userId);
        const name = u?.firstName || u?.email?.split("@")[0] || `User ${p.userId.slice(-5)}`;
        return {
          userId: p.userId,
          name,
          avgWellness: Math.round(Number(p.avg)),
          lastChecked: p.lastAt as Date,
        };
      })
      .sort((a, b) => a.avgWellness - b.avgWellness)
      .slice(0, 10);

    return {
      moodCounts: moodRows.map(r => ({ emotion: r.emotion, count: Number(r.c) })),
      averageWellness: Math.round(Number(avgRow?.a || 0)),
      totalChecks: Number(avgRow?.t || 0),
      lowWellnessStudents,
    };
  }

  async setUserActive(userId: string, isActive: boolean): Promise<User> {
    const [u] = await db.update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return u;
  }

  async setUserType(userId: string, userType: string): Promise<User> {
    const [u] = await db.update(users)
      .set({ userType, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return u;
  }

  async deleteUserCascade(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(userProgress).where(eq(userProgress.userId, userId));
      await tx.delete(userAchievements).where(eq(userAchievements.userId, userId));
      await tx.delete(chatConversations).where(eq(chatConversations.userId, userId));
      await tx.delete(musicFavorites).where(eq(musicFavorites.userId, userId));
      await tx.delete(musicHistory).where(eq(musicHistory.userId, userId));
      await tx.delete(emotionLogs).where(eq(emotionLogs.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async deleteGameSafe(gameId: number): Promise<{ deleted: boolean; reason?: string }> {
    const [hasProgress] = await db.select({ c: count() }).from(userProgress)
      .where(eq(userProgress.gameId, gameId));
    if (Number(hasProgress?.c || 0) > 0) {
      return { deleted: false, reason: "Game has student progress and cannot be removed." };
    }
    await db.delete(games).where(eq(games.id, gameId));
    return { deleted: true };
  }

  // ─── Invitations ──────────────────────────────────────────────
  async createInvitation(data: InsertInvitation & { code: string; expiresAt?: Date }): Promise<Invitation> {
    const [row] = await db.insert(invitations).values({
      code: data.code,
      inviterId: data.inviterId,
      inviterName: data.inviterName ?? null,
      message: data.message ?? null,
      expiresAt: data.expiresAt ?? null,
    }).returning();
    return row;
  }
  async getInvitationByCode(code: string): Promise<Invitation | undefined> {
    const [row] = await db.select().from(invitations).where(eq(invitations.code, code));
    return row;
  }
  async getInvitationsByInviter(inviterId: string): Promise<Invitation[]> {
    return db.select().from(invitations)
      .where(eq(invitations.inviterId, inviterId))
      .orderBy(desc(invitations.createdAt));
  }
  async claimInvitation(code: string, claimedById: string): Promise<Invitation | undefined> {
    const [row] = await db.update(invitations)
      .set({ status: "accepted", claimedById, claimedAt: new Date() })
      .where(and(eq(invitations.code, code), eq(invitations.status, "pending")))
      .returning();
    return row;
  }
  async revokeInvitation(code: string, inviterId: string): Promise<boolean> {
    const result = await db.update(invitations)
      .set({ status: "revoked" })
      .where(and(eq(invitations.code, code), eq(invitations.inviterId, inviterId)))
      .returning({ id: invitations.id });
    return result.length > 0;
  }

  // ─── Linked devices ──────────────────────────────────────────
  async getActiveSessionsForUser(userId: string): Promise<UserSession[]> {
    return db.select().from(userSessions)
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isActive, true)))
      .orderBy(desc(userSessions.createdAt));
  }
  async revokeUserSession(sessionId: string, userId: string): Promise<void> {
    await db.update(userSessions)
      .set({ isActive: false })
      .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId)));
  }
  async revokeAllUserSessions(userId: string, exceptToken?: string): Promise<number> {
    const where = exceptToken
      ? and(eq(userSessions.userId, userId), eq(userSessions.isActive, true), ne(userSessions.sessionToken, exceptToken))
      : and(eq(userSessions.userId, userId), eq(userSessions.isActive, true));
    const result = await db.update(userSessions).set({ isActive: false }).where(where).returning();
    return result.length;
  }

  // ─── Schools (admin) ─────────────────────────────────────────
  async getAllSchools(): Promise<Array<School & { studentCount: number; activeCount: number }>> {
    const allSchools = await db.select().from(schools).orderBy(schools.name);
    if (allSchools.length === 0) return [];
    const counts = await db.select({
      schoolId: users.schoolId,
      total: count(users.id),
      active: sql<number>`count(*) filter (where ${users.isActive} = true)`,
    }).from(users).groupBy(users.schoolId);
    const map = new Map<string, { total: number; active: number }>();
    for (const c of counts) {
      if (c.schoolId) map.set(c.schoolId, { total: Number(c.total), active: Number(c.active) });
    }
    return allSchools.map(s => ({
      ...s,
      studentCount: map.get(s.id)?.total ?? 0,
      activeCount: map.get(s.id)?.active ?? 0,
    }));
  }
}

// ─── Compliments (mixed in via prototype) ─────────────────────────────────
declare module "./storage" {}
(DatabaseStorage.prototype as any).createCompliment = async function (input: InsertCompliment): Promise<Compliment> {
  const [row] = await db.insert(compliments).values(input).returning();
  return row;
};
(DatabaseStorage.prototype as any).getInboxCompliments = async function (recipientId: string): Promise<Array<Omit<Compliment, "senderId">>> {
  // Critically — do NOT return senderId. Recipients see anonymous notes only.
  const rows = await db.select({
    id: compliments.id,
    recipientId: compliments.recipientId,
    message: compliments.message,
    emoji: compliments.emoji,
    readAt: compliments.readAt,
    isHidden: compliments.isHidden,
    isFlagged: compliments.isFlagged,
    createdAt: compliments.createdAt,
  }).from(compliments)
    .where(and(eq(compliments.recipientId, recipientId), eq(compliments.isHidden, false)))
    .orderBy(desc(compliments.createdAt))
    .limit(100);
  return rows as any;
};
(DatabaseStorage.prototype as any).getSentCompliments = async function (senderId: string): Promise<Compliment[]> {
  return db.select().from(compliments)
    .where(eq(compliments.senderId, senderId))
    .orderBy(desc(compliments.createdAt))
    .limit(100);
};
(DatabaseStorage.prototype as any).markComplimentRead = async function (id: number, recipientId: string): Promise<boolean> {
  const result = await db.update(compliments)
    .set({ readAt: new Date() })
    .where(and(eq(compliments.id, id), eq(compliments.recipientId, recipientId)))
    .returning({ id: compliments.id });
  return result.length > 0;
};
(DatabaseStorage.prototype as any).hideCompliment = async function (id: number, recipientId: string): Promise<boolean> {
  const result = await db.update(compliments)
    .set({ isHidden: true })
    .where(and(eq(compliments.id, id), eq(compliments.recipientId, recipientId)))
    .returning({ id: compliments.id });
  return result.length > 0;
};
(DatabaseStorage.prototype as any).flagCompliment = async function (id: number, recipientId: string): Promise<boolean> {
  const result = await db.update(compliments)
    .set({ isFlagged: true, isHidden: true })
    .where(and(eq(compliments.id, id), eq(compliments.recipientId, recipientId)))
    .returning({ id: compliments.id });
  return result.length > 0;
};

export const storage = new DatabaseStorage();
