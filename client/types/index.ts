// 贪吃蛇移动方向
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// 二维网格坐标点
export interface Point {
  x: number;
  y: number;
}

// 玩家数据结构
export interface User {
  username: string;
  highScore: number;
  bestDuration: number;
  updatedAt?: string;
}