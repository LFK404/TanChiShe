'use client';

import React, { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { Direction, Point, UserProfile, LeaderboardItem } from '@/types';
import { Trophy, Play, Pause, RotateCcw, User, Lock, LogOut } from 'lucide-react';

const GRID_SIZE = 24;
const CELL_SIZE = 20;
const TICK_MS = 110;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

const toKey = (x: number, y: number) => `${x},${y}`;

const isOpposite = (d1: Direction, d2: Direction) =>
  (d1 === 'UP' && d2 === 'DOWN') ||
  (d1 === 'DOWN' && d2 === 'UP') ||
  (d1 === 'LEFT' && d2 === 'RIGHT') ||
  (d1 === 'RIGHT' && d2 === 'LEFT');

// SSR 水合安全 Hook
const emptySubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export default function TanChiShe() {
  const isClient = useIsClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. 用户鉴权状态
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('tanchishe_auth');
      return saved ? JSON.parse(saved)?.user || null : null;
    } catch {
      return null;
    }
  });

  const [authForm, setAuthForm] = useState(() => {
    if (typeof window === 'undefined') return { username: '', password: '' };
    try {
      const saved = localStorage.getItem('tanchishe_auth');
      return saved ? JSON.parse(saved)?.form || { username: '', password: '' } : { username: '', password: '' };
    } catch {
      return { username: '', password: '' };
    }
  });

  const [authError, setAuthError] = useState('');
  const userRef = useRef<UserProfile | null>(user);
  const authFormRef = useRef(authForm);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    authFormRef.current = authForm;
  }, [authForm]);

  // 2. 游戏对局核心状态（Ref 保持定时器主循环最新）
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
  ]);
  const fenceSetRef = useRef<Set<string>>(new Set());
  const foodRef = useRef<Point>({ x: 16, y: 12 });
  const dirRef = useRef<Direction>('RIGHT');
  const dirQueueRef = useRef<Direction[]>([]);
  const isPlayingRef = useRef(false);
  const isGameOverRef = useRef(false);
  const isPausedRef = useRef(false);
  const scoreRef = useRef(0);
  const startTimeRef = useRef(0);

  // 3. UI 状态
  const [score, setScore] = useState(0);
  const [duration, setDuration] = useState(0);
  const [snakeLength, setSnakeLength] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  // -------------------------------------------------------------
  // API 通信与鉴权
  // -------------------------------------------------------------

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`);
      const json = await res.json();
      if (json.code === 200) {
        setLeaderboard(json.data || []);
      }
    } catch (e) {
      console.warn('获取排行榜失败:', e);
    }
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const u = authForm.username.trim();
    const p = authForm.password.trim();
    if (!u || !p) {
      setAuthError('请输入用户名和密码');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const json = await res.json();
      if (res.ok && json.code === 200) {
        setUser(json.data);
        try {
          localStorage.setItem('tanchishe_auth', JSON.stringify({ user: json.data, form: { username: u, password: p } }));
        } catch {}
      } else {
        setAuthError(json.message || '登录失败');
      }
    } catch {
      setAuthError('无法连接后端服务，请确认端口 8080');
    }
  }, [authForm]);

  const handleLogout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('tanchishe_auth');
    } catch {}
    isPlayingRef.current = false;
    isGameOverRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  const handleSettle = useCallback(async (finalScore: number, finalDur: number) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/api/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          password: authFormRef.current.password.trim(),
          score: finalScore,
          duration: finalDur,
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        if (json.isNewRecord) {
          setUser(json.data);
          try {
            localStorage.setItem('tanchishe_auth', JSON.stringify({ user: json.data, form: authFormRef.current }));
          } catch {}
        }
        fetchLeaderboard();
      }
    } catch (e) {
      console.warn('结算失败:', e);
    }
  }, [fetchLeaderboard]);

  // -------------------------------------------------------------
  // 浅色系 Canvas 渲染（砖墙障碍物 vs 翠绿活体蛇身）
  // -------------------------------------------------------------

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 清空背景
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 绘制细网格底纹
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // 3. 绘制围栏 (🧱 砖石墙障碍物：深灰砖石底色 + 浅色交错砖缝，一眼辨识为障碍物)
    fenceSetRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      const px = fx * CELL_SIZE;
      const py = fy * CELL_SIZE;

      // 砖石深灰本体
      ctx.fillStyle = '#475569';
      ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      // 砖石外边框
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      // 浅灰交错砖缝纹理（中间横线 + 错开竖线）
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px + 1, py + CELL_SIZE / 2);
      ctx.lineTo(px + CELL_SIZE - 1, py + CELL_SIZE / 2);
      ctx.moveTo(px + CELL_SIZE / 2, py + 1);
      ctx.lineTo(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
      ctx.stroke();
    });

    // 4. 绘制果实 (🍎 鲜亮红色果实)
    const fx = foodRef.current.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = foodRef.current.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE / 2.6, 0, Math.PI * 2);
    ctx.fill();

    // 果实高光
    ctx.fillStyle = '#fecaca';
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // 5. 绘制蛇身 (🟢 清新翡翠绿圆角独立胶囊) 与 蛇头
    snakeRef.current.forEach((pt, idx) => {
      const px = pt.x * CELL_SIZE;
      const py = pt.y * CELL_SIZE;

      if (idx === 0) {
        // --- 蛇头 ---
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
        ctx.fill();

        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 眼睛（随方向朝向）
        const curDir = dirRef.current;
        let eye1 = { x: px + 5, y: py + 5 };
        let eye2 = { x: px + 15, y: py + 5 };
        if (curDir === 'UP') { eye1 = { x: px + 5, y: py + 4 }; eye2 = { x: px + 15, y: py + 4 }; }
        if (curDir === 'DOWN') { eye1 = { x: px + 5, y: py + 16 }; eye2 = { x: px + 15, y: py + 16 }; }
        if (curDir === 'LEFT') { eye1 = { x: px + 4, y: py + 5 }; eye2 = { x: px + 4, y: py + 15 }; }
        if (curDir === 'RIGHT') { eye1 = { x: px + 16, y: py + 5 }; eye2 = { x: px + 16, y: py + 15 }; }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, 2.5, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, 1.2, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // --- 蛇身节段 ---
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
        ctx.fill();

        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 蛇身鳞片微光
        ctx.fillStyle = '#a7f3d0';
        ctx.beginPath();
        ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, []);

  // -------------------------------------------------------------
  // 游戏逻辑与移动推进
  // -------------------------------------------------------------

  const spawnFood = useCallback(() => {
    const emptyCells: Point[] = [];
    const snakeKeys = new Set(snakeRef.current.map((p) => toKey(p.x, p.y)));

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const k = toKey(c, r);
        if (!snakeKeys.has(k) && !fenceSetRef.current.has(k)) {
          emptyCells.push({ x: c, y: r });
        }
      }
    }

    if (emptyCells.length > 0) {
      const idx = Math.floor(Math.random() * emptyCells.length);
      foodRef.current = emptyCells[idx];
    }
  }, []);

  const gameOver = useCallback(() => {
    isGameOverRef.current = true;
    isPlayingRef.current = false;
    setIsGameOver(true);
    setIsPlaying(false);

    const now = Date.now();
    const finalDur = Math.floor((now - startTimeRef.current) / 1000);
    handleSettle(scoreRef.current, finalDur);
  }, [handleSettle]);

  const startGame = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
    ];
    fenceSetRef.current.clear();
    dirRef.current = 'RIGHT';
    dirQueueRef.current = [];
    scoreRef.current = 0;
    startTimeRef.current = Date.now();

    isGameOverRef.current = false;
    isPausedRef.current = false;
    isPlayingRef.current = true;

    setScore(0);
    setDuration(0);
    setSnakeLength(3);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);

    spawnFood();
  }, [spawnFood]);

  const updateTick = useCallback(() => {
    if (!isPlayingRef.current || isGameOverRef.current || isPausedRef.current) return;

    // 1. 更新秒表
    const now = Date.now();
    setDuration(Math.floor((now - startTimeRef.current) / 1000));

    // 2. 消费转向
    if (dirQueueRef.current.length > 0) {
      dirRef.current = dirQueueRef.current.shift()!;
    }
    const head = snakeRef.current[0];
    const nextHead: Point = { ...head };

    switch (dirRef.current) {
      case 'UP': nextHead.y--; break;
      case 'DOWN': nextHead.y++; break;
      case 'LEFT': nextHead.x--; break;
      case 'RIGHT': nextHead.x++; break;
    }

    // 3. 撞墙判定
    if (nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // 4. 撞围栏与撞自身判定
    const nextKey = toKey(nextHead.x, nextHead.y);
    if (fenceSetRef.current.has(nextKey)) {
      gameOver();
      return;
    }
    for (let i = 0; i < snakeRef.current.length; i++) {
      if (snakeRef.current[i].x === nextHead.x && snakeRef.current[i].y === nextHead.y) {
        gameOver();
        return;
      }
    }

    // 5. 移动推进：吃到果实身体增长并重置清空场上所有栅栏；未吃果实蛇尾离队并原地砌起砖墙围栏
    const newSnake = [nextHead, ...snakeRef.current];
    const ate = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;

    if (ate) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setSnakeLength(newSnake.length);
      fenceSetRef.current.clear(); // 每次吃完果实清空重置场上所有栅栏
      spawnFood();
    } else {
      const tail = newSnake.pop()!;
      fenceSetRef.current.add(toKey(tail.x, tail.y));
    }

    snakeRef.current = newSnake;
  }, [gameOver, spawnFood]);

  // -------------------------------------------------------------
  // 副作用监听
  // -------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!userRef.current) return;

      if (e.key === 'p' || e.key === 'P') {
        if (isPlayingRef.current && !isGameOverRef.current) {
          isPausedRef.current = !isPausedRef.current;
          setIsPaused(isPausedRef.current);
        }
        return;
      }

      if (e.key === ' ' && (!isPlayingRef.current || isGameOverRef.current)) {
        startGame();
        return;
      }

      let target: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') target = 'UP';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') target = 'DOWN';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') target = 'LEFT';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') target = 'RIGHT';

      if (target) {
        const queue = dirQueueRef.current;
        const last = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;
        if (target !== last && !isOpposite(last, target) && queue.length < 2) {
          queue.push(target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame]);

  useEffect(() => {
    const timer = setInterval(() => {
      updateTick();
      renderCanvas();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [updateTick, renderCanvas]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        const json = await res.json();
        if (isMounted && json.code === 200) {
          setLeaderboard(json.data || []);
        }
      } catch (e) {
        console.warn('拉取排行榜失败:', e);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [user]);

  if (!isClient) {
    return (
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-xs text-slate-400">
        加载中...
      </div>
    );
  }

  // -------------------------------------------------------------
  // 1. 未登录视图：仅展示居中登录卡片
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-800">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">贪吃蛇</h1>
          <p className="text-xs text-slate-500">请输入用户名和密码开始游戏</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <User size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="用户名"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="password"
              placeholder="密码"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {authError && <div className="text-xs text-rose-500 text-center">{authError}</div>}

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer shadow-sm"
          >
            登录 / 注册
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. 已登录视图：展示游戏界面与排行榜
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-4xl flex flex-col gap-5 text-slate-800">
      {/* 顶部状态栏 */}
      <header className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-900 text-base">贪吃蛇</span>
          <span className="text-xs text-slate-500">玩家: <strong className="text-slate-800">{user.username}</strong></span>
          <span className="text-xs text-amber-600 font-medium">最高分: {user.highScore} ({user.bestDuration}s)</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <LogOut size={13} /> 退出
        </button>
      </header>

      {/* 主体：游戏画布与排行榜 */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {/* 左侧：游戏区域 */}
        <div className="md:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col items-center">
          {/* 数据指标 */}
          <div className="w-full grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg text-xs">
              <span className="text-slate-500">得分: </span>
              <strong className="text-slate-800 text-sm">{score}</strong>
            </div>
            <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg text-xs">
              <span className="text-slate-500">用时: </span>
              <strong className="text-slate-800 text-sm">{duration}s</strong>
            </div>
            <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg text-xs">
              <span className="text-slate-500">长度: </span>
              <strong className="text-emerald-700 text-sm">{snakeLength}</strong>
            </div>
          </div>

          {/* 画布与状态遮罩 */}
          <div className="relative border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-50">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="block"
            />

            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs text-slate-600 mb-4 max-w-xs leading-relaxed">
                  蛇移动时留下的尾巴会砌成灰色砖墙障碍物，每次吃完果实将清空场上所有砖墙！
                </p>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                >
                  <Play size={15} /> 开始游戏
                </button>
              </div>
            )}

            {isPaused && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center">
                <Pause size={32} className="text-slate-700 mb-1" />
                <span className="text-sm font-medium text-slate-700">已暂停 (按 P 键继续)</span>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <span className="text-rose-600 text-xl font-bold mb-2">游戏结束</span>
                <div className="flex gap-4 text-xs text-slate-600 mb-4">
                  <span>得分: <strong className="text-slate-900">{score}</strong></span>
                  <span>用时: <strong className="text-slate-900">{duration}s</strong></span>
                  <span>长度: <strong className="text-emerald-700">{snakeLength}</strong></span>
                </div>
                <button
                  onClick={startGame}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <RotateCcw size={15} /> 重新开始 (空格键)
                </button>
              </div>
            )}
          </div>

          {/* 底部清晰图例与按键指引 */}
          <div className="mt-3 text-[11px] text-slate-500 flex flex-wrap gap-3 justify-center items-center">
            <span className="flex items-center gap-1 font-medium text-emerald-700">🟢 绿色为蛇身</span>
            <span className="flex items-center gap-1 font-medium text-slate-600">🧱 灰色为遗留砖墙(致死)</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">方向键转向 / 空格开局 / P暂停</span>
          </div>
        </div>

        {/* 右侧：排行榜 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Trophy size={15} className="text-amber-500" /> 排行榜 Top 10
            </h2>
            <button
              onClick={fetchLeaderboard}
              className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              刷新
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto">
            {leaderboard.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">暂无记录</div>
            ) : (
              leaderboard.map((item, idx) => (
                <div
                  key={item.username}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-4 font-bold text-center ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : idx === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 font-medium truncate max-w-[80px]">
                      {item.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="font-bold text-slate-900">{item.highScore}分</span>
                    <span className="text-[10px] text-slate-400">{item.bestDuration}s</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
