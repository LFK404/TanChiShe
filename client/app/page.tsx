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

export default function Home() {
  const isClient = useIsClient();
  const { user, form, error, setForm, login, logout, updateUser } = useAuth();
  const [board, setBoard] = useState<User[]>([]);

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

  const { snakeRef, fenceRef, foodRef, dirRef, score, duration, length, isPlaying, isGameOver, isPaused, startGame, changeDirection, tick } =
    useSnakeGame(handleGameOver);

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
    <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      {!user ? (
        <LoginCard form={form} error={error} setForm={setForm} onLogin={login} />
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-4">
          <Header user={user} onLogout={logout} />
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <GameBoard
                snakeRef={snakeRef}
                fenceRef={fenceRef}
                foodRef={foodRef}
                dirRef={dirRef}
                score={score}
                duration={duration}
                length={length}
                isPlaying={isPlaying}
                isGameOver={isGameOver}
                isPaused={isPaused}
                onStart={startGame}
                onTick={tick}
                onDirection={changeDirection}
              />
            </div>
            <Leaderboard items={board} onRefresh={refreshBoard} />
          </div>
        </div>
      )}
    </main>
  );
}
