export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  userType: "school" | "student" | "guest";
  schoolDomain?: string;
  studentId?: string;
  schoolCode?: string;
  guestSessionExpiry?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Game {
  id: number;
  title: string;
  description: string;
  category: "empathy" | "social-skills" | "conflict-resolution" | "kindness";
  difficulty: "beginner" | "intermediate" | "advanced";
  points: number;
  content: {
    scenarios: GameScenario[];
  };
  createdAt?: string;
}

export interface GameScenario {
  question: string;
  options: GameOption[];
}

export interface GameOption {
  text: string;
  points: number;
  feedback: string;
}

export interface UserProgress {
  id: number;
  userId: string;
  gameId: number;
  completed: boolean;
  score?: number;
  stars?: number;
  pointsEarned: number;
  completedAt?: string;
  createdAt?: string;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  criteria: any;
  pointsReward: number;
  createdAt?: string;
}

export interface UserAchievement {
  id: number;
  userId: string;
  achievementId: number;
  earnedAt: string;
}

export interface MusicTrack {
  id: number;
  title: string;
  category: "nature" | "meditation" | "ambient" | "instrumental";
  duration: number;
  audioUrl: string;
  thumbnailUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatConversation {
  id: number;
  userId: string;
  messages: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Analytics {
  activeStudents: number;
  gamesCompleted: number;
  avgSessionTime: number;
  achievementsEarned: number;
}

export interface LeaderboardEntry {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  userType: string;
  schoolDomain?: string;
  totalPoints: number;
  rank: number;
}

export interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  suggestions: string[];
}

export interface KindnessActivity {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

// Form types
export interface SchoolLoginForm {
  schoolDomain: string;
  adminId: string;
  password: string;
}

export interface StudentLoginForm {
  studentId: string;
  schoolCode: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface GameProgressResponse {
  progress: UserProgress;
  feedback?: string;
}

export interface ChatResponse {
  response: string;
  conversation: ChatConversation;
}

// Component prop types
export interface GameCardProps {
  game: Game;
  viewMode: "grid" | "list";
  userProgress?: UserProgress;
  onPlay: () => void;
  delay?: number;
}

export interface MusicPlayerProps {
  currentTrack: MusicTrack | null;
  onTrackChange: (track: MusicTrack) => void;
  tracks: MusicTrack[];
}

export interface TrackListProps {
  tracks: MusicTrack[];
  currentTrack: MusicTrack | null;
  onTrackSelect: (track: MusicTrack) => void;
  isLoading?: boolean;
}

// Theme types
export type Theme = "light" | "dark";

// Authentication types
export type AuthTab = "school" | "student" | "guest";

// Filter types
export interface GameFilters {
  category: string;
  difficulty: string;
}

export interface MusicFilters {
  category: string;
}

// Utility types
export type Timeframe = "weekly" | "monthly" | "alltime";

export type ViewMode = "grid" | "list";

export type UserType = "school" | "student" | "guest";

export type GameCategory = "empathy" | "social-skills" | "conflict-resolution" | "kindness";

export type GameDifficulty = "beginner" | "intermediate" | "advanced";

export type MusicCategory = "nature" | "meditation" | "ambient" | "instrumental";
