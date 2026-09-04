import { User, GameStartResponse, GameSettleRequest, GameSettleResponse } from '@/types';

// 后端 API 服务基地址 (支持环境变量动态注入与本地调试回退)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

// 通用 POST 请求封装 (自动挂载 Bearer Token)
async function post<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<{ ok: boolean; data?: T; isNewRecord?: boolean; msg?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return {
      ok: res.ok && json.code === 200,
      data: json.data,
      isNewRecord: json.isNewRecord,
      msg: json.message,
    };
  } catch {
    return { ok: false, msg: '网络连接异常' };
  }
}

// 玩家登录/自动注册 (仅登录阶段传递一次凭据)
export const apiAuth = (username: string, password: string) =>
  post<User>('/api/auth', { username, password });

// 开局申请会话与确定性随机种子 (基于 Token 鉴权)
export const apiStartGame = (token?: string) =>
  post<GameStartResponse>('/api/game/start', {}, token);

// 结算上报对局轨迹与验算 (基于 Token 鉴权)
export const apiSettleGame = (req: GameSettleRequest, token?: string) =>
  post<GameSettleResponse>('/api/game/settle', req, token);

// 获取 Top 10 全服排行榜 (强制穿透中间层与浏览器缓存，保障实时同步)
export async function apiLeaderboard(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    const json = await res.json();
    return json.code === 200 ? json.data || [] : [];
  } catch {
    return [];
  }
}
