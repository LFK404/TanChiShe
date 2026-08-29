'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Direction, Point, UserProfile, LeaderboardItem } from '@/types';
import { Trophy, Timer, Play, Pause, RefreshCw, User, Lock, LogIn, AlertCircle, Sparkles, Ruler } from 'lucide-react';

// 地图规格与主频配置
const GRID_SIZE = 24; // 24x24 网格
const CELL_PIXELS = 20; // 每个网格 20 像素
const SPEED_MS = 110; // 蛇移动间隔 110ms
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

// 坐标转换辅助函数
const toKey = (x: number, y: number) => `${x},${y}`;

// 判断两方向是否相反
const isOpposite = (d1: Direction, d2: Direction) =>
  (d1 === 'UP' && d2 === 'DOWN') ||
  (d1 === 'DOWN' && d2 === 'UP') ||
  (d1 === 'LEFT' && d2 === 'RIGHT') ||
  (d1 === 'RIGHT' && d2 === 'LEFT');

export default function TanChiShe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  // -------------------------------------------------------------
  // 1. 游戏核心状态（使用 Ref 保持高频主循环内部状态一致）
  // -------------------------------------------------------------
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
  ]);
  const fenceSetRef = useRef<Set<string>>(new Set()); // 存储围栏坐标哈希 "x,y"
  const foodRef = useRef<Point>({ x: 16, y: 12 });
  const dirRef = useRef<Direction>('RIGHT');
  const dirQueueRef = useRef<Direction[]>([]); // 转向缓冲队列
  
  const isPlayingRef = useRef<boolean>(false);
  const isGameOverRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  
  const scoreRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // -------------------------------------------------------------
  // 2. React UI 渲染状态（惰性初始化避免 Effect 内同步 setState 级联渲染）
  // -------------------------------------------------------------
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('tanchishe_auth');
      return saved ? JSON.parse(saved)?.user || null : null;
    } catch {
      return null;
    }
  });

  const [authForm, setAuthForm] = useState<{ username: string; password: string }>(() => {
    if (typeof window === 'undefined') return { username: '', password: '' };
    try {
      const saved = localStorage.getItem('tanchishe_auth');
      return saved ? JSON.parse(saved)?.form || { username: '', password: '' } : { username: '', password: '' };
    } catch {
      return { username: '', password: '' };
    }
  });

  const [authError, setAuthError] = useState('');
  
  // 使用 Ref 解决主游戏循环定时器闭包中 user 与 authForm 状态陈旧问题
  const userRef = useRef<UserProfile | null>(user);
  const authFormRef = useRef<{ username: string; password: string }>(authForm);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    authFormRef.current = authForm;
  }, [authForm]);

  const [score, setScore] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [snakeLength, setSnakeLength] = useState<number>(3);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  // -------------------------------------------------------------
  // 3. API 通信与鉴权方法
  // -------------------------------------------------------------

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`);
      const json = await res.json();
      if (json.code === 200) {
        setLeaderboard(json.data || []);
      }
    } catch (err) {
      console.warn('拉取排行榜异常，请确保后端服务正常运行:', err);
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
          localStorage.setItem(
            'tanchishe_auth',
            JSON.stringify({ user: json.data, form: { username: u, password: p } })
          );
        } catch {}
      } else {
        setAuthError(json.message || '登录失败');
      }
    } catch {
      setAuthError('无法连接后端服务，请检查 8080 端口');
    }
  }, [authForm]);

  const handleSettle = useCallback(async (finalScore: number, finalDuration: number) => {
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
          duration: finalDuration,
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        if (json.isNewRecord) {
          setUser(json.data);
          try {
            localStorage.setItem(
              'tanchishe_auth',
              JSON.stringify({ user: json.data, form: authFormRef.current })
            );
          } catch {}
        }
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('战绩上报失败:', err);
    }
  }, [fetchLeaderboard]);

  // -------------------------------------------------------------
  // 4. Canvas 画面渲染
  // -------------------------------------------------------------

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空背景
    ctx.fillStyle = '#090d16'; // 深邃黑底
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制背景科技网格线
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.8;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_PIXELS, 0);
      ctx.lineTo(i * CELL_PIXELS, GRID_SIZE * CELL_PIXELS);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_PIXELS);
      ctx.lineTo(GRID_SIZE * CELL_PIXELS, i * CELL_PIXELS);
      ctx.stroke();
    }

    // 1. 绘制围栏 (Fence)：赛博激光能量栅栏
    fenceSetRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      const px = fx * CELL_PIXELS;
      const py = fy * CELL_PIXELS;

      ctx.fillStyle = '#312e81';
      ctx.fillRect(px + 1, py + 1, CELL_PIXELS - 2, CELL_PIXELS - 2);

      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(px + 1, py + 1, CELL_PIXELS - 2, CELL_PIXELS - 2);

      ctx.strokeStyle = 'rgba(199, 210, 254, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3);
      ctx.lineTo(px + CELL_PIXELS - 3, py + CELL_PIXELS - 3);
      ctx.moveTo(px + CELL_PIXELS - 3, py + 3);
      ctx.lineTo(px + 3, py + CELL_PIXELS - 3);
      ctx.stroke();
    });

    // 2. 绘制果实 (Food)：金色发光能量晶核
    const fx = foodRef.current.x * CELL_PIXELS + CELL_PIXELS / 2;
    const fy = foodRef.current.y * CELL_PIXELS + CELL_PIXELS / 2;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_PIXELS / 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_PIXELS / 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // 3. 绘制蛇身与蛇头
    snakeRef.current.forEach((pt, idx) => {
      const px = pt.x * CELL_PIXELS;
      const py = pt.y * CELL_PIXELS;

      if (idx === 0) {
        // --- 蛇头绘制 ---
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, CELL_PIXELS - 4, CELL_PIXELS - 4, 5);
        ctx.fill();

        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const curDir = dirRef.current;
        let eye1 = { x: px + 6, y: py + 6 };
        let eye2 = { x: px + 14, y: py + 6 };

        if (curDir === 'UP') {
          eye1 = { x: px + 6, y: py + 5 };
          eye2 = { x: px + 14, y: py + 5 };
        } else if (curDir === 'DOWN') {
          eye1 = { x: px + 6, y: py + 15 };
          eye2 = { x: px + 14, y: py + 15 };
        } else if (curDir === 'LEFT') {
          eye1 = { x: px + 5, y: py + 6 };
          eye2 = { x: px + 5, y: py + 14 };
        } else if (curDir === 'RIGHT') {
          eye1 = { x: px + 15, y: py + 6 };
          eye2 = { x: px + 15, y: py + 14 };
        }

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
        // --- 蛇身节段绘制 ---
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, CELL_PIXELS - 4, CELL_PIXELS - 4, 4);
        ctx.fill();

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = 'rgba(134, 239, 172, 0.4)';
        ctx.beginPath();
        ctx.arc(px + CELL_PIXELS / 2, py + CELL_PIXELS / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, []);

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
    setScore(0);
    setDuration(0);
    setSnakeLength(3);
    snakeRef.current = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
    ];
    fenceSetRef.current.clear();
    dirRef.current = 'RIGHT';
    dirQueueRef.current = [];
    renderCanvas();
  }, [renderCanvas]);

  // -------------------------------------------------------------
  // 5. 游戏机制与循环逻辑
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

  const resetGame = useCallback(() => {
    if (!userRef.current) {
      usernameInputRef.current?.focus();
      return;
    }

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
    const currentDur = Math.floor((now - startTimeRef.current) / 1000);
    setDuration(currentDur);

    // 2. 从转向队列中消费下一个方向
    if (dirQueueRef.current.length > 0) {
      dirRef.current = dirQueueRef.current.shift()!;
    }
    const head = snakeRef.current[0];
    const newHead: Point = { ...head };

    switch (dirRef.current) {
      case 'UP':    newHead.y--; break;
      case 'DOWN':  newHead.y++; break;
      case 'LEFT':  newHead.x--; break;
      case 'RIGHT': newHead.x++; break;
    }

    // 3. 边界碰撞检测
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // 4. 围栏与身体碰撞检测
    const targetKey = toKey(newHead.x, newHead.y);
    if (fenceSetRef.current.has(targetKey)) {
      gameOver();
      return;
    }
    for (let i = 0; i < snakeRef.current.length; i++) {
      if (snakeRef.current[i].x === newHead.x && snakeRef.current[i].y === newHead.y) {
        gameOver();
        return;
      }
    }

    // 5. 推进蛇身
    const nextSnake = [newHead, ...snakeRef.current];
    const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;

    if (ateFood) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setSnakeLength(nextSnake.length);
      spawnFood();
    } else {
      const tail = nextSnake.pop()!;
      fenceSetRef.current.add(toKey(tail.x, tail.y));
    }

    snakeRef.current = nextSnake;
  }, [gameOver, spawnFood]);

  // -------------------------------------------------------------
  // 6. 副作用驱动：按键响应、定时器与初始化
  // -------------------------------------------------------------

  // 键盘事件监听
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

      if (e.key === ' ' && isGameOverRef.current) {
        resetGame();
        return;
      }

      let target: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') target = 'UP';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') target = 'DOWN';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') target = 'LEFT';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') target = 'RIGHT';

      if (target) {
        const queue = dirQueueRef.current;
        const lastTarget = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;

        if (target !== lastTarget && !isOpposite(lastTarget, target) && queue.length < 2) {
          queue.push(target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetGame]);

  // 驱动主逻辑与渲染
  useEffect(() => {
    const timer = setInterval(() => {
      updateTick();
      renderCanvas();
    }, SPEED_MS);

    return () => clearInterval(timer);
  }, [updateTick, renderCanvas]);

  // 初次载入榜单（规范异步请求）
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        const json = await res.json();
        if (isMounted && json.code === 200) {
          setLeaderboard(json.data || []);
        }
      } catch (err) {
        console.warn('拉取排行榜异常:', err);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶部身份栏与环境配置 */}
      <header className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold text-sm flex items-center gap-1.5 shadow-sm">
            <Sparkles size={15} /> TanChiShe 2026
          </div>
          <span className="text-xs text-slate-400">南昌大学程序设计课程实践（前后端分离架构）</span>
        </div>

        {user ? (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-200 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <User size={14} className="text-emerald-400" />
              <span>玩家：<strong className="text-emerald-300">{user.username}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <Trophy size={14} />
              <span>最佳纪录：{user.highScore}分 ({user.bestDuration}s)</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 rounded cursor-pointer transition-colors"
            >
              切换账号
            </button>
          </div>
        ) : (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle size={14} /> 账号未登录（需先在右侧建档以开启游戏）
          </div>
        )}
      </header>

      {/* 主体交互区域 */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左侧：游戏视口与按键控制 */}
        <div className="lg:col-span-2 flex flex-col items-center bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl relative backdrop-blur-md">
          {/* HUD 数据状态 */}
          <div className="w-full grid grid-cols-3 gap-2 mb-4 px-1 text-center">
            <div className="flex items-center justify-center gap-2 bg-slate-950/70 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-medium">
              <Trophy size={15} className="text-amber-400" />
              <span>得分：<strong className="text-amber-400 text-base">{score}</strong></span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-slate-950/70 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-medium">
              <Timer size={15} className="text-cyan-400" />
              <span>耗时：<strong className="text-cyan-400 text-base">{duration}</strong>s</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-slate-950/70 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-medium">
              <Ruler size={15} className="text-emerald-400" />
              <span>蛇长：<strong className="text-emerald-400 text-base">{snakeLength}</strong>节</span>
            </div>
          </div>

          {/* Canvas 画布容器 */}
          <div className="relative border-2 border-slate-700/80 rounded-xl overflow-hidden bg-slate-950 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_PIXELS}
              height={GRID_SIZE * CELL_PIXELS}
              className="block"
            />

            {/* 1. 未登录锁屏遮罩 */}
            {!user && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 mb-3">
                  <Lock size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-1.5">游戏已锁定</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
                  请先在右侧输入昵称与密码进行登录或自动建档，以解锁游戏并同步战绩至风云榜！
                </p>
                <button
                  onClick={() => usernameInputRef.current?.focus()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <LogIn size={15} /> 前往右侧登录 / 建档
                </button>
              </div>
            )}

            {/* 2. 已登录·未开始遮罩 */}
            {user && !isPlaying && !isGameOver && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-xl font-black text-slate-100 mb-2 tracking-wide">所经之处·砌起围栏</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                  蛇爬行时尾部离开的格子将砌成紫色激光栅栏。未吃果实时蛇长不变，吃果实后蛇身增长！
                </p>
                <button
                  onClick={resetGame}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-900/50 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Play size={16} /> 开始游戏
                </button>
              </div>
            )}

            {/* 3. 暂停遮罩 */}
            {isPaused && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center">
                <Pause size={40} className="text-amber-400 mb-2" />
                <span className="text-sm font-bold text-slate-200">游戏已暂停 (按 P 键继续)</span>
              </div>
            )}

            {/* 4. 死亡结算遮罩 */}
            {isGameOver && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <span className="text-rose-500 text-2xl font-black mb-1 tracking-wider">GAME OVER</span>
                <p className="text-xs text-slate-400 mb-4">碰撞围栏、自身或边界，本局已结束</p>
                <div className="bg-slate-900/90 px-6 py-3 rounded-xl border border-slate-800 mb-6 flex gap-6 shadow-lg">
                  <div>
                    <div className="text-[10px] text-slate-500">本局得分</div>
                    <div className="text-xl font-black text-amber-400">{score}</div>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div>
                    <div className="text-[10px] text-slate-500">存活耗时</div>
                    <div className="text-xl font-black text-cyan-400">{duration}s</div>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div>
                    <div className="text-[10px] text-slate-500">最终蛇长</div>
                    <div className="text-xl font-black text-emerald-400">{snakeLength}节</div>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw size={16} /> 按空格键重新开局
                </button>
              </div>
            )}
          </div>

          {/* 底部操作指引 */}
          <div className="mt-4 text-[11px] text-slate-500 flex flex-wrap gap-4 justify-center">
            <span>方向键 / WASD：90度精确转向</span>
            <span>P：暂停/继续</span>
            <span>空格：快速重新开局</span>
          </div>
        </div>

        {/* 右侧：登录鉴权与排行榜 */}
        <div className="flex flex-col gap-6">
          {/* 简易账号登录卡片 */}
          {!user && (
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <LogIn size={16} className="text-emerald-400" /> 玩家登录 / 自动建档
              </h3>
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    ref={usernameInputRef}
                    type="text"
                    placeholder="玩家昵称"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    placeholder="登录密码"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                {authError && <span className="text-[11px] text-rose-400">{authError}</span>}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-emerald-900/30"
                >
                  一键登录 / 自动建档
                </button>
              </form>
            </div>
          )}

          {/* 全局 Top 10 风云榜 */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex-1 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" /> 历史排行榜 (Top 10)
              </h3>
              <button
                onClick={fetchLeaderboard}
                className="text-[11px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw size={12} /> 刷新
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600">暂无上榜记录</div>
              ) : (
                leaderboard.map((item, index) => (
                  <div
                    key={item.username}
                    className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-black w-4 text-center ${
                          index === 0
                            ? 'text-amber-400'
                            : index === 1
                            ? 'text-slate-300'
                            : index === 2
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-300 truncate max-w-[90px]">
                        {item.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-400">{item.highScore}分</span>
                      <span className="text-slate-500 text-[10px]">{item.bestDuration}s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
