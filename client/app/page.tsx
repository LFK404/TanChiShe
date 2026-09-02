'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useIsClient } from '@/hooks/useAuth';
import { useSnake } from '@/hooks/useSnake';
import { apiStartGame, apiSettleGame, apiLeaderboard } from '@/services/api';
import { User, InputRecord } from '@/types';
import Header from '@/components/Header';
import Board from '@/components/Board';
import Leaderboard from '@/components/Leaderboard';
import Login from '@/components/Login';
import Tutorial from '@/components/Tutorial';

export default function Home() {
  const isClient = useIsClient();
  const { user, form, error, setForm, login, logout, updateUser } = useAuth();
  const [board, setBoard] = useState<User[]>([]);

  // 当前对局防伪 Token 与种子 (支持后台预取，实现 0ms 瞬间开局)
  const sessionRef = useRef<{ sessionToken: string; seed: number } | null>(null);
  const isFetchingSession = useRef(false);

  // 首次访问自动唤起新手指南
  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !localStorage.getItem('snake_tutorial_seen');
    } catch {
      return false;
    }
  });

  // 静默预拉取下一局对局 Token (消除开局网络延迟)
  const prefetchSession = useCallback(async () => {
    if (!user || isFetchingSession.current || sessionRef.current) return;
    isFetchingSession.current = true;
    try {
      const res = await apiStartGame(user.token);
      if (res.ok && res.data) {
        sessionRef.current = {
          sessionToken: res.data.sessionToken,
          seed: res.data.seed,
        };
      }
    } catch {} finally {
      isFetchingSession.current = false;
    }
  }, [user]);

  // 登录态就绪时自动预取
  useEffect(() => {
    if (user) prefetchSession();
  }, [user, prefetchSession]);

  // 刷新全服 Top 10 排行榜
  const refreshBoard = useCallback(async () => {
    setBoard(await apiLeaderboard());
  }, []);

  // 游戏结束回调：自动上报操作轨迹由 Go 后端 1ms 无头重放验算
  const handleGameOver = useCallback(
    async (
      _finalScore: number,
      _finalDur: number,
      inputs: InputRecord[],
      totalTicks: number
    ) => {
      if (!user) return;
      const currentSession = sessionRef.current;
      sessionRef.current = null; // 消费当前 session

      // 静默为下一局预取新 session
      prefetchSession();

      if (!currentSession) {
        refreshBoard();
        return;
      }

      const res = await apiSettleGame(
        {
          sessionToken: currentSession.sessionToken,
          inputs,
          totalTicks,
        },
        user.token
      );

      if (res.ok && res.data) {
        if (res.isNewRecord && res.data.user) {
          updateUser(res.data.user);
        }
      }
      refreshBoard();
    },
    [user, updateUser, refreshBoard, prefetchSession]
  );

  // 贪吃蛇游戏核心状态机
  const {
    snakeRef,
    fenceRef,
    foodRef,
    bonusRef,
    hasBonus,
    bonusKey,
    score,
    duration,
    length,
    speedMs,
    isPlaying,
    isGameOver,
    isPaused,
    startGame,
    togglePause,
    changeDirection,
    tick,
  } = useSnake(handleGameOver);

  // 开始新对局 (优先命中预取 Token，0ms 零延迟启动)
  const handleStartGame = useCallback(async () => {
    if (!user) {
      startGame(Date.now());
      return;
    }

    if (sessionRef.current) {
      const { seed } = sessionRef.current;
      startGame(seed);
      return;
    }

    // 若未命中预取，快速即时拉取
    try {
      const res = await apiStartGame(user.token);
      if (res.ok && res.data) {
        sessionRef.current = {
          sessionToken: res.data.sessionToken,
          seed: res.data.seed,
        };
        startGame(res.data.seed);
      } else {
        startGame(Date.now());
      }
    } catch {
      startGame(Date.now());
    }
  }, [user, startGame]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    try {
      localStorage.setItem('snake_tutorial_seen', 'true');
    } catch {}
  }, []);

  const handleOpenTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // 组件挂载时初始拉取排行榜
  useEffect(() => {
    let isMounted = true;
    apiLeaderboard().then((data) => {
      if (isMounted) setBoard(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 服务端渲染骨架屏防水合闪烁
  if (!isClient) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#66CCFF] border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-start p-3 sm:p-5 relative overflow-x-hidden">
      {!user ? (
        /* 未登录态：居中登录/注册卡片 */
        <div className="w-full min-h-[85vh] flex items-center justify-center relative z-10">
          <Login form={form} error={error} setForm={setForm} onLogin={login} />
        </div>
      ) : (
        /* 已登录态：游戏主界面 */
        <div className="w-full max-w-4xl flex flex-col gap-3 sm:gap-4 relative z-10">
          <Header user={user} onLogout={logout} onOpenTutorial={handleOpenTutorial} />

          {/* 页面主标题 + 右侧 NCU HOME 单行水印 */}
          <div className="px-1 pt-0.5 pb-0.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight whitespace-nowrap">
                方寸之<span className="text-[#66CCFF]">间</span>，重温经
                <span className="text-[#66CCFF]">典</span>
              </h1>
              <blockquote className="mt-1.5 pl-2.5 border-l-[3px] border-[#66CCFF] text-xs text-[#334155] leading-relaxed">
                在方格与节奏的律动中，探寻每一次转身的从容。
              </blockquote>
            </div>

            <div className="flex flex-col items-end leading-none select-none pointer-events-none opacity-80 shrink-0 pl-2">
              <div className="flex items-center gap-1.5 mb-1.5 pr-0.5">
                <span className="w-2 h-2 rounded-full bg-[#66CCFF]" />
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="w-2 h-2 rounded-full bg-[#EC4899]" />
              </div>
              <div className="flex items-baseline gap-2 sm:gap-3 font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#CBD5E1]">
                <span>NCU</span>
                <span>HOME</span>
              </div>
            </div>
          </div>

          {/* 响应式主内容区：左侧游戏主舞台 (2/3) + 右侧风云榜 (1/3) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <Board
                snakeRef={snakeRef}
                fenceRef={fenceRef}
                foodRef={foodRef}
                bonusRef={bonusRef}
                hasBonus={hasBonus}
                bonusKey={bonusKey}
                score={score}
                duration={duration}
                length={length}
                speedMs={speedMs}
                isPlaying={isPlaying}
                isGameOver={isGameOver}
                isPaused={isPaused}
                onStart={handleStartGame}
                onTick={tick}
                onDirection={changeDirection}
                onTogglePause={togglePause}
              />
            </div>
            <Leaderboard items={board} currentUser={user} onRefresh={refreshBoard} />
          </div>

          {/* 极简底部署名 */}
          <footer className="mt-3 py-3 text-center text-[11.5px] text-[#94A3B8] flex flex-wrap items-center justify-center gap-2 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#66CCFF]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
            </div>
            <span>NCU HOME</span>
            <span>•</span>
            <span>贪吃蛇</span>
          </footer>

          <Tutorial isOpen={showTutorial} onClose={handleCloseTutorial} />
        </div>
      )}
    </main>
  );
}
