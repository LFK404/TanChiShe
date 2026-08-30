'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useIsClient } from '@/hooks/useAuth';
import { useSnakeGame } from '@/hooks/useSnakeGame';
import { apiSettle, apiLeaderboard } from '@/services/api';
import { User } from '@/types';
import Header from '@/components/Header';
import GameBoard from '@/components/GameBoard';
import Leaderboard from '@/components/Leaderboard';
import LoginCard from '@/components/LoginCard';
import TutorialModal from '@/components/TutorialModal';

export default function Home() {
  const isClient = useIsClient();
  const { user, form, error, setForm, login, logout, updateUser } = useAuth();
  const [board, setBoard] = useState<User[]>([]);
  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !localStorage.getItem('snake_tutorial_seen');
    } catch {
      return false;
    }
  });

  const refreshBoard = useCallback(async () => {
    setBoard(await apiLeaderboard());
  }, []);

  const handleGameOver = useCallback(
    async (finalScore: number, finalDur: number) => {
      if (!user) return;
      const res = await apiSettle(user.username, form.password.trim(), finalScore, finalDur);
      if (res.ok && res.isNewRecord && res.data) updateUser(res.data);
      refreshBoard();
    },
    [user, form.password, updateUser, refreshBoard]
  );

  const { snakeRef, fenceRef, foodRef, bonusRef, hasBonus, bonusKey, dirRef, score, duration, length, speedMs, isPlaying, isGameOver, isPaused, startGame, togglePause, changeDirection, tick } =
    useSnakeGame(handleGameOver);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    try {
      localStorage.setItem('snake_tutorial_seen', 'true');
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    apiLeaderboard().then((data) => {
      if (isMounted) setBoard(data);
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!isClient) return null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {!user ? (
        <div className="z-10 w-full flex justify-center">
          <LoginCard form={form} error={error} setForm={setForm} onLogin={login} />
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-3.5 z-10 relative">
          {/* 完整一体化导航顶栏 */}
          <Header
            user={user}
            onLogout={logout}
            onOpenTutorial={() => setShowTutorial(true)}
          />

          {/* 人文标语区 + 右侧 NCU HOME 艺术水印微标 (黄金留白区，100% 清晰可见不被遮挡) */}
          <div className="px-1 pt-0.5 pb-0.5 flex items-center justify-between gap-3">
            {/* 左侧金句与点睛字 */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight whitespace-nowrap">
                方寸之<span className="text-[#66CCFF]">间</span>，重温经<span className="text-[#66CCFF]">典</span>
              </h1>
              <blockquote className="mt-1.5 pl-2.5 border-l-[3px] border-[#66CCFF] text-xs text-[#334155] leading-relaxed">
                在方格与节奏的律动中，探寻每一次转身的从容。
              </blockquote>
            </div>

            {/* 右侧南昌大学 NCU HOME 艺术水印与四色微标 */}
            <div className="flex flex-col items-end leading-none select-none pointer-events-none opacity-85 shrink-0 pl-2">
              <div className="flex items-center gap-1.5 mb-1 pr-0.5">
                <span className="w-2 h-2 rounded-full bg-[#66CCFF]" />
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="w-2 h-2 rounded-full bg-[#EC4899]" />
              </div>
              <span className="font-black text-2xl sm:text-3xl md:text-4xl tracking-tighter text-[#CBD5E1]">NCU</span>
              <span className="font-extrabold text-[10px] sm:text-xs tracking-[0.22em] text-[#94A3B8] -mt-0.5 sm:-mt-1 pr-0.5">HOME</span>
            </div>
          </div>

          {/* 游戏主舞台与排行榜双列布局 */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <GameBoard
                snakeRef={snakeRef}
                fenceRef={fenceRef}
                foodRef={foodRef}
                bonusRef={bonusRef}
                hasBonus={hasBonus}
                bonusKey={bonusKey}
                dirRef={dirRef}
                score={score}
                duration={duration}
                length={length}
                speedMs={speedMs}
                isPlaying={isPlaying}
                isGameOver={isGameOver}
                isPaused={isPaused}
                onStart={startGame}
                onTick={tick}
                onDirection={changeDirection}
                onTogglePause={togglePause}
              />
            </div>
            <Leaderboard items={board} currentUser={user} onRefresh={refreshBoard} />
          </div>

          {/* 纯白紧凑页脚与南大家园微徽标 (无框极简人文印章) */}
          <footer className="mt-3 py-3 text-center text-[11.5px] text-[#94A3B8] flex flex-wrap items-center justify-center gap-2 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#66CCFF]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
            </div>
            <span>NCU HOME · 南大家园</span>
            <span>•</span>
            <span>贪吃蛇 经典排位版</span>
          </footer>

          {/* 极简新手指南模态框 */}
          <TutorialModal
            isOpen={showTutorial}
            onClose={handleCloseTutorial}
          />
        </div>
      )}
    </main>
  );
}
