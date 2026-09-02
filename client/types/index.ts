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
  replaySeed?: number;
  replayInputs?: string;
  updatedAt?: string;
  token?: string;
}

// 玩家操作输入流帧记录
export interface InputRecord {
  tick: number;
  dir: Direction;
}

// 开局握手返回实体
export interface GameStartResponse {
  sessionToken: string;
  seed: number;
}

// 战绩结算请求实体
export interface GameSettleRequest {
  sessionToken: string;
  inputs: InputRecord[];
  totalTicks: number;
}

// 战绩结算返回实体
export interface GameSettleResponse {
  score: number;
  duration: number;
  length: number;
  isNewRecord: boolean;
  user: User;
}