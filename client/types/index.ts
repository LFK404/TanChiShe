export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export interface User {
  username: string;
  highScore: number;
  bestDuration: number;
  updatedAt?: string;
}