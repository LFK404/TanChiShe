export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export interface UserProfile {
  username: string;
  highScore: number;
  bestDuration: number;
  updatedAt?: string;
}

export interface LeaderboardItem {
  username: string;
  highScore: number;
  bestDuration: number;
  updatedAt: string;
}