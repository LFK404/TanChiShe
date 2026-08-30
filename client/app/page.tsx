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

  const { snakeRef, fenceRef, foodRef, bonusRef, hasBonus, dirRef, score, duration, length, speedMs, isPlaying, isGameOver, isPaused, startGame, togglePause, changeDirection, tick } =
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
    <main className="min-h-screen bg-white text-[#0F172A] flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {/* 南昌大学 NCU HOME 浅灰艺术水印与四色微徽标 (全局响应式通透浮现) */}
      <div className="fixed top-2 sm:top-4 left-3 sm:left-6 md:left-8 pointer-events-none select-none z-0 flex flex-col leading-none opacity-80">
        <div className="flex items-center gap-1.5 mb-1 pl-0.5">
          <span className="w-2 h-2 rounded-full bg-[#66CCFF]" />
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="w-2 h-2 rounded-full bg-[#EC4899]" />
        </div>
        <span className="font-black text-6xl sm:text-7xl md:text-8xl tracking-tighter text-[#E2E8F0]/80">NCU</span>
        <span className="font-extrabold text-xl sm:text-2xl md:text-3xl tracking-widest text-[#E2E8F0]/80 pl-1 sm:pl-1.5 -mt-1 sm:-mt-2">HOME</span>
      </div>

      {!user ? (
        <div className="z-10 w-full flex justify-center">
          <LoginCard form={form} error={error} setForm={setForm} onLogin={login} />
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-4 z-10 relative">
          {/* 导航顶栏 */}
          <Header
            user={user}
            onLogout={logout}
            onOpenTutorial={() => setShowTutorial(true)}
          />

          {/* 人文标语与留白区 (融入 #66CCFF 天青蓝点睛字与竖线) */}
          <div className="px-2 pt-1 pb-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight whitespace-nowrap">
              方寸之<span className="text-[#66CCFF]">间</span>，重温经<span className="text-[#66CCFF]">典</span>
            </h1>
            <blockquote className="mt-2 pl-2.5 border-l-[3px] border-[#66CCFF] text-xs text-[#334155] leading-relaxed">
              在方格与节奏的律动中，探寻每一次转身的从容。
            </blockquote>
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

          {/* 纯白紧凑页脚 */}
          <footer className="mt-2 py-4 border-t border-[#E2E8F0] text-center text-[11.5px] text-[#94A3B8] flex flex-wrap items-center justify-center gap-2">
            <span>贪吃蛇</span>
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
