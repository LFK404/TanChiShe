import { User } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

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

export const apiAuth = (username: string, password: string) => post<User>('/api/auth', { username, password });
export const apiSettle = (username: string, password: string, score: number, duration: number) =>
  post<User>('/api/settle', { username, password, score, duration });

export async function apiLeaderboard(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const json = await res.json();
    return json.code === 200 ? json.data || [] : [];
  } catch {
    return [];
  }
}
