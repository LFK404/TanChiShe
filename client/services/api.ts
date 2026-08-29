import { UserProfile, LeaderboardItem } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

/**
 * 玩家登录与免注册自动建档
 */
export async function loginOrRegister(username: string, password: string): Promise<{ success: boolean; data?: UserProfile; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (res.ok && json.code === 200) {
      return { success: true, data: json.data };
    }
    return { success: false, message: json.message || '登录失败' };
  } catch {
    return { success: false, message: '无法连接后端服务 (8080)' };
  }
}

/**
 * 对局结算与同分比耗时更新
 */
export async function settleScore(username: string, password: string, score: number, duration: number): Promise<{ success: boolean; isNewRecord?: boolean; data?: UserProfile }> {
  try {
    const res = await fetch(`${API_BASE}/api/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, score, duration }),
    });
    const json = await res.json();
    if (res.ok && json.code === 200) {
      return { success: true, isNewRecord: json.isNewRecord, data: json.data };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * 获取全局 Top 10 排行榜
 */
export async function fetchLeaderboardList(): Promise<LeaderboardItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const json = await res.json();
    if (json.code === 200) {
      return json.data || [];
    }
    return [];
  } catch {
    return [];
  }
}
