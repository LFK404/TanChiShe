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
  const [showTutorial, setShowTutorial] = useState(false);

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

  // 首次登录自动弹出新手教程
  useEffect(() => {
    if (!user) return;
    try {
      const seen = localStorage.getItem('snake_tutorial_seen');
      if (!seen) {
        setShowTutorial(true);
      }
    } catch {}
  }, [user]);

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
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-3 sm:p-6">
      {!user ? (
        <LoginCard form={form} error={error} setForm={setForm} onLogin={login} />
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-4">
          {/* 导航顶栏 (包含教程入口与声音开关) */}
          <Header
            user={user}
            onLogout={logout}
            onOpenTutorial={() => setShowTutorial(true)}
          />

          {/* 人文标语与留白区 */}
          <div className="px-2 pt-1 pb-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight whitespace-nowrap">
              方寸之间，重温经典。
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
            <span>极简全栈贪吃蛇</span>
            <span>·</span>
            <span>天青蓝视觉精修版</span>
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
