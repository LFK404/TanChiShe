import { User } from '@/types';

// 后端 API 服务基地址 (支持环境变量动态注入与本地调试回退)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

// 通用 POST 请求封装
async function post<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; isNewRecord?: boolean; msg?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { ok: res.ok && json.code === 200, data: json.data, isNewRecord: json.isNewRecord, msg: json.message };
  } catch {
    return { ok: false, msg: '网络异常' };
  }
}

// 玩家登录/自动注册
export const apiAuth = (username: string, password: string) => post<User>('/api/auth', { username, password });

// 结算上报对局战绩
export const apiSettle = (username: string, password: string, score: number, duration: number) =>
  post<User>('/api/settle', { username, password, score, duration });

// 获取 Top 10 排行榜
export async function apiLeaderboard(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const json = await res.json();
    return json.code === 200 ? json.data || [] : [];
  } catch {
    return [];
  }
}
