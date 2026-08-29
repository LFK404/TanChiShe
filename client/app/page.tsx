'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useIsClient } from '@/hooks/useAuth';
import { useSnakeGame } from '@/hooks/useSnakeGame';
import { settleScore, fetchLeaderboardList } from '@/services/api';
import { LeaderboardItem } from '@/types';
import Header from '@/components/Header';
import GameBoard from '@/components/GameBoard';
import Leaderboard from '@/components/Leaderboard';
import LoginCard from '@/components/LoginCard';

export default function Home() {
  const isClient = useIsClient();
  const { user, authForm, authError, setAuthForm, handleLogin, handleLogout, updateUserRecord } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  // 拉取排行榜
  const loadLeaderboard = useCallback(async () => {
    const list = await fetchLeaderboardList();
    setLeaderboard(list);
  }, []);

  // 对局结束时的结算回调
  const handleGameOver = useCallback(
    async (finalScore: number, finalDuration: number) => {
      if (!user) return;
      const res = await settleScore(user.username, authForm.password.trim(), finalScore, finalDuration);
      if (res.success && res.isNewRecord && res.data) {
        updateUserRecord(res.data);
      }
      loadLeaderboard();
    },
    [user, authForm, updateUserRecord, loadLeaderboard]
  );

  // 挂载游戏引擎 Hook
  const {
    snakeRef,
    fenceSetRef,
    foodRef,
    dirRef,
    score,
    duration,
    snakeLength,
    isPlaying,
    isGameOver,
    isPaused,
    startGame,
    updateTick,
  } = useSnakeGame(handleGameOver);

  // 登录后初次拉取榜单
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const load = async () => {
      const list = await fetchLeaderboardList();
      if (isMounted) {
        setLeaderboard(list);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!isClient) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-xs text-slate-400">
          加载中...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {!user ? (
        /* 1. 登录门禁卡片 */
        <LoginCard
          authForm={authForm}
          authError={authError}
          setAuthForm={setAuthForm}
          onLogin={handleLogin}
        />
      ) : (
        /* 2. 游戏主界面与排行榜 */
        <div className="w-full max-w-4xl flex flex-col gap-5">
          <Header user={user} onLogout={handleLogout} />

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            <div className="md:col-span-2">
              <GameBoard
                snakeRef={snakeRef}
                fenceSetRef={fenceSetRef}
                foodRef={foodRef}
                dirRef={dirRef}
                score={score}
                duration={duration}
                snakeLength={snakeLength}
                isPlaying={isPlaying}
                isGameOver={isGameOver}
                isPaused={isPaused}
                onStartGame={startGame}
                onTick={updateTick}
              />
            </div>

            <Leaderboard items={leaderboard} onRefresh={loadLeaderboard} />
          </div>
        </div>
      )}
    </main>
  );
}