'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Direction, Point, UserProfile, LeaderboardItem } from '@/types';
import { Trophy, Timer, Play, Pause, RefreshCw, User, Lock, LogIn, AlertCircle } from 'lucide-react';

// 地图规格与主频配置
const GRID_SIZE = 24; // 24x24 网格
const CELL_PIXELS = 20; // 每个网格 20 像素
const SPEED_MS = 110; // 蛇移动间隔 110ms

export default function CyberSnake() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
  const nextDirRef = useRef<Direction>('RIGHT'); // 按键缓冲锁，防止一帧内反向掉头自杀
  
  const isPlayingRef = useRef<boolean>(false);
  const isGameOverRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  
  const scoreRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // React UI 渲染状态
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [score, setScore] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [apiBase, setApiBase] = useState<string>('http://localhost:8080');

  // 生成坐标 Key
  const toKey = (x: number, y: number) => `${x},${y}`;

  // -------------------------------------------------------------
  // 2. API 通信方法
  // -------------------------------------------------------------

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/leaderboard`);
      const json = await res.json();
      if (json.code === 200) {
        setLeaderboard(json.data || []);
      }
    } catch (err) {
      console.warn('拉取排行榜异常，请确保后端服务正常运行:', err);
    }
  }, [apiBase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.username.trim() || !authForm.password.trim()) {
      setAuthError('请输入用户名和密码');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const json = await res.json();
      if (res.ok && json.code === 200) {
        setUser(json.data);
      } else {
        setAuthError(json.message || '登录失败');
      }
    } catch {
      setAuthError('无法连接后端服务，请检查 8080 端口');
    }
  };

  const handleSettle = async (finalScore: number, finalDuration: number) => {
    if (!user) return;
    try {
      const res = await fetch(`${apiBase}/api/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          password: authForm.password,
          score: finalScore,
          duration: finalDuration,
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        if (json.isNewRecord) {
          setUser(json.data);
        }
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('战绩上报失败:', err);
    }
  };

  // -------------------------------------------------------------
  // 3. 游戏机制与算法实现
  // -------------------------------------------------------------

  // 随机生成果实（不能落在蛇身和围栏上）
  const spawnFood = () => {
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
  };

  // 开始/重置游戏
  const resetGame = () => {
    snakeRef.current = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
    ];
    fenceSetRef.current.clear();
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    scoreRef.current = 0;
    startTimeRef.current = Date.now();
    
    isGameOverRef.current = false;
    isPausedRef.current = false;
    isPlayingRef.current = true;

    setScore(0);
    setDuration(0);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);

    spawnFood();
  };

  // 核心单步逻辑
  const updateTick = () => {
    if (!isPlayingRef.current || isGameOverRef.current || isPausedRef.current) return;

    // 1. 更新秒表
    const currentDur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setDuration(currentDur);

    // 2. 锁定并应用当前方向
    dirRef.current = nextDirRef.current;
    const head = snakeRef.current[0];
    const newHead: Point = { ...head };

    switch (dirRef.current) {
      case 'UP':    newHead.y--; break;
      case 'DOWN':  newHead.y++; break;
      case 'LEFT':  newHead.x--; break;
      case 'RIGHT': newHead.x++; break;
    }

    // 3. 边界碰撞检测[cite: 1]
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // 4. 围栏与身体碰撞检测[cite: 1]
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

    // 5. 推进蛇身[cite: 1]
    const nextSnake = [newHead, ...snakeRef.current];
    const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;[cite: 1]

    if (ateFood) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      spawnFood();
    } else {
      // 题目关键机制：蛇尾离开的格子砌起围栏[cite: 1]
      const tail = nextSnake.pop()!;
      fenceSetRef.current.add(toKey(tail.x, tail.y));[cite: 1]
    }

    snakeRef.current = nextSnake;
  };

  const gameOver = () => {
    isGameOverRef.current = true;
    isPlayingRef.current = false;
    setIsGameOver(true);
    setIsPlaying(false);

    const finalDur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    handleSettle(scoreRef.current, finalDur);
  };

  // -------------------------------------------------------------
  // 4. Canvas 画面渲染
  // -------------------------------------------------------------

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空背景
    ctx.fillStyle = '#0f172a'; // 深 Slate 底色
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制浅色背景网格线
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
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

    // 绘制砌起来的围栏 (带发光质感的紫蓝色)
    ctx.fillStyle = '#6366f1';
    fenceSetRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      ctx.fillRect(fx * CELL_PIXELS + 1, fy * CELL_PIXELS + 1, CELL_PIXELS - 2, CELL_PIXELS - 2);
    });

    // 绘制果实 (鲜亮琥珀金)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * CELL_PIXELS + CELL_PIXELS / 2,
      foodRef.current.y * CELL_PIXELS + CELL_PIXELS / 2,
      CELL_PIXELS / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 绘制蛇身体与头部
    snakeRef.current.forEach((pt, idx) => {
      if (idx === 0) {
        ctx.fillStyle = '#22c55e'; // 鲜绿蛇头
      } else {
        ctx.fillStyle = '#15803d'; // 深绿蛇身
      }
      ctx.fillRect(pt.x * CELL_PIXELS + 1, pt.y * CELL_PIXELS + 1, CELL_PIXELS - 2, CELL_PIXELS - 2);
    });
  };

  // -------------------------------------------------------------
  // 5. 副作用驱动：按键响应、定时器与初始化
  // -------------------------------------------------------------

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 阻止方向键滚动页面
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

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

      const cur = dirRef.current;
      let target: Direction | null = null;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') target = 'UP';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') target = 'DOWN';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') target = 'LEFT';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') target = 'RIGHT';

      if (target) {
        // 90度转弯限制：禁止直接反向掉头[cite: 1]
        const isOpposite =
          (cur === 'UP' && target === 'DOWN') ||
          (cur === 'DOWN' && target === 'UP') ||
          (cur === 'LEFT' && target === 'RIGHT') ||
          (cur === 'RIGHT' && target === 'LEFT');

        if (!isOpposite) {
          nextDirRef.current = target;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 驱动主逻辑与渲染
  useEffect(() => {
    const timer = setInterval(() => {
      updateTick();
      renderCanvas();
    }, SPEED_MS);

    return () => clearInterval(timer);
  }, []);

  // 初次载入榜单
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 顶部身份栏与环境配置 */}
      <header className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold text-sm">
            CyberSnake 2026
          </div>
          <span className="text-xs text-slate-400">南昌大学程序设计课程实践（前后端分离架构）</span>
        </div>

        {user ? (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-200">
              <User size={14} className="text-emerald-400" />
              <span>玩家：<strong>{user.username}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              <Trophy size={14} />
              <span>最佳纪录：{user.highScore}分 ({user.bestDuration}s)</span>
            </div>
            <button
              onClick={() => setUser(null)}
              className="text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
            >
              切换账号
            </button>
          </div>
        ) : (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle size={14} /> 请先登录以同步对局记录与排行榜
          </span>
        )}
      </header>

      {/* 主体交互区域 */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左侧：游戏视口与按键控制 */}
        <div className="lg:col-span-2 flex flex-col items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl relative">
          {/* HUD 数据状态 */}
          <div className="w-full flex justify-between items-center mb-4 px-2">
            <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
              <Trophy size={16} className="text-amber-400" />
              <span>当前得分：<strong className="text-amber-400 text-lg">{score}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
              <Timer size={16} className="text-cyan-400" />
              <span>耗时：<strong className="text-cyan-400 text-lg">{duration}</strong> 秒</span>
            </div>
          </div>

          {/* Canvas 画布容器 */}
          <div className="relative border-2 border-slate-700 rounded-lg overflow-hidden bg-slate-950 shadow-inner">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_PIXELS}
              height={GRID_SIZE * CELL_PIXELS}
              className="block"
            />

            {/* 未开始遮罩 */}
            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-xl font-bold text-slate-100 mb-2">所经之处·砌起围栏</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                  蛇移动经过的路径将逐步固化为不可穿越的围栏。请谨慎规划转弯路线！
                </p>
                <button
                  onClick={resetGame}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Play size={16} /> 开始游戏
                </button>
              </div>
            )}

            {/* 暂停遮罩 */}
            {isPaused && (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center">
                <Pause size={36} className="text-amber-400 mb-2" />
                <span className="text-sm font-bold text-slate-200">游戏已暂停 (按 P 键继续)</span>
              </div>
            )}

            {/* 死亡结算遮罩 */}
            {isGameOver && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <span className="text-rose-500 text-2xl font-black mb-1 tracking-wider">GAME OVER</span>
                <p className="text-xs text-slate-400 mb-4">碰撞阻挡或边界，本局已结束</p>
                <div className="bg-slate-900 px-6 py-3 rounded-lg border border-slate-800 mb-6 flex gap-6">
                  <div>
                    <div className="text-[10px] text-slate-500">本局得分</div>
                    <div className="text-xl font-black text-amber-400">{score}</div>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div>
                    <div className="text-[10px] text-slate-500">存活耗时</div>
                    <div className="text-xl font-black text-cyan-400">{duration}s</div>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw size={16} /> 按空格键重新开始
                </button>
              </div>
            )}
          </div>

          {/* 底部操作指引 */}
          <div className="mt-4 text-[11px] text-slate-500 flex flex-wrap gap-4 justify-center">
            <span>方向键 / WASD：90度控制转弯</span>
            <span>P：暂停/继续</span>
            <span>空格：快速重新开局</span>
          </div>
        </div>

        {/* 右侧：登录鉴权与排行榜 */}
        <div className="flex flex-col gap-6">
          {/* 简易账号登录卡片 */}
          {!user && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <LogIn size={16} className="text-emerald-400" /> 玩家登录 / 注册
              </h3>
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="玩家昵称"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    placeholder="简易密码"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {authError && <span className="text-[11px] text-rose-400">{authError}</span>}
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  一键登录 / 自动建档
                </button>
              </form>
            </div>
          )}

          {/* 全局 Top 10 风云榜 */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" /> 历史排行榜 (Top 10)
              </h3>
              <button
                onClick={fetchLeaderboard}
                className="text-[11px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
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