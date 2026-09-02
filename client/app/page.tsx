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
import Achievements from '@/components/Achievements';
import InGameToast, { ToastItem } from '@/components/InGameToast';
import { checkAndUnlockAchievements, AchievementTier } from '@/utils/achievements';
import { sound } from '@/utils/audio';

export default function Home() {
  const isClient = useIsClient();
  const { user, form, error, setForm, login, logout, updateUser } = useAuth();
  const [board, setBoard] = useState<User[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);

  // 添加局中即时微弹窗 (南大家园微拟态勋章体系)
  const addToast = useCallback((text: string, tier: AchievementTier = 'BRONZE', color?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, tier, color }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 当前对局防伪 Token 与种子 (支持后台预取，实现 0ms 瞬间开局)
  const sessionRef = useRef<{ sessionToken: string; seed: number } | null>(null);
  const isFetchingSession = useRef(false);

  // 记录本局已触发的局中里程碑集合，避免同局重复弹窗
  const firedMilestonesRef = useRef<Set<string>>(new Set());

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

  // 登录态就绪时自动预取并启动大厅待机温馨 BGM
  useEffect(() => {
    if (user) {
      prefetchSession();
      sound.startMenuBgm();
    }
  }, [user, prefetchSession]);

  // 刷新全服 Top 10 排行榜
  const refreshBoard = useCallback(async () => {
    setBoard(await apiLeaderboard());
  }, []);

  // 挂载时拉取排行榜
  useEffect(() => {
    let ignore = false;
    apiLeaderboard().then((data) => {
      if (!ignore) setBoard(data);
    }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  // 游戏结束结算与防伪 HMAC 会话上传
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
          sound.playVictory();
          addToast('刷新个人历史最佳纪录！', 'GOLD');
        }
      }

      // 刷新排行榜并校验榜单成就
      const newBoard = await apiLeaderboard();
      setBoard(newBoard);
      const userRank = newBoard.findIndex((u) => u.username === user.username) + 1;
      if (userRank > 0 && userRank <= 10) {
        addToast(`荣登全服风云榜第 ${userRank} 名！`, 'DIAMOND');
        const rankAch = checkAndUnlockAchievements({
          score: _finalScore,
          length: 3,
          duration: _finalDur,
          maxCombo: 1,
          bonusCount: 0,
          speedMs: 122,
          steps: totalTicks,
          rank: userRank,
        });
        rankAch.forEach((ach) => {
          sound.playGrandAchievement();
          addToast(`加冕至高成就: [${ach.name}]`, ach.tier);
        });
      }
    },
    [user, updateUser, prefetchSession, addToast, refreshBoard]
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
    steps,
    bonusCount,
    isPlaying,
    isGameOver,
    isPaused,
    isReplay,
    replayUser,
    replaySpeedRate,
    setReplaySpeedRate,
    startGame,
    startReplay,
    exitReplay,
    togglePause,
    changeDirection,
    tick,
  } = useSnake(handleGameOver);

  // 观摩排行榜高手通关微操录像
  const handleWatchReplay = useCallback(
    (targetUser: User) => {
      if (!targetUser.replayInputs || !targetUser.replaySeed) {
        addToast('该记录未包含操作录像轨迹', 'SILVER');
        return;
      }
      startReplay(targetUser.replaySeed, targetUser.replayInputs, targetUser.username);
      addToast(`正在观摩 [${targetUser.username}] 的通关走位`, 'DIAMOND');
    },
    [startReplay, addToast]
  );

  // 局中即时高光与成就达成监听 (南大家园微拟态勋章体系)
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const checkMilestone = (key: string, fn: () => void) => {
      if (!firedMilestonesRef.current.has(key)) {
        firedMilestonesRef.current.add(key);
        fn();
      }
    };

    // 1. 得分高光弹窗
    if (score >= 100) checkMilestone('score_100', () => addToast('得分突破 100 分!', 'BRONZE'));
    if (score >= 200) checkMilestone('score_200', () => addToast('得分突破 200 分!', 'BRONZE'));
    if (score >= 300) checkMilestone('score_300', () => addToast('得分突破 300 分!', 'SILVER'));
    if (score >= 500) checkMilestone('score_500', () => addToast('得分突破 500 分 (宗师境界)!', 'GOLD'));
    if (score >= 800) checkMilestone('score_800', () => addToast('得分突破 800 分 (旷世奇才)!', 'DIAMOND'));

    // 2. 身长高光弹窗
    if (length >= 15) checkMilestone('len_15', () => addToast('蛇身突破 15 节 (灵动巨蟒)', 'BRONZE'));
    if (length >= 25) checkMilestone('len_25', () => addToast('蛇身突破 25 节 (深海潜龙)', 'SILVER'));
    if (length >= 35) checkMilestone('len_35', () => addToast('蛇身突破 35 节 (万象苍龙)', 'GOLD'));

    // 3. 存活时长高光弹窗
    if (duration >= 60) checkMilestone('dur_60', () => addToast('稳健存活 1 分钟!', 'BRONZE'));
    if (duration >= 120) checkMilestone('dur_120', () => addToast('沉着坚守 2 分钟!', 'SILVER'));
    if (duration >= 180) checkMilestone('dur_180', () => addToast('长青传奇 3 分钟!', 'GOLD'));
    if (duration >= 300) checkMilestone('dur_300', () => addToast('不朽长生 5 分钟!', 'DIAMOND'));

    // 4. 金果高光弹窗
    if (bonusCount >= 1) checkMilestone('bonus_1', () => addToast('斩获金色幸运果 +30分!', 'BRONZE'));
    if (bonusCount >= 5) checkMilestone('bonus_5', () => addToast('连收 5 颗金果 (金果饕餮)!', 'GOLD'));
    if (bonusCount >= 8) checkMilestone('bonus_8', () => addToast('连收 8 颗金果 (金玉满堂)!', 'DIAMOND'));

    // 5. 极速高光弹窗
    if (speedMs <= 85 && score >= 250) checkMilestone('spd_15', () => addToast('速度突破 1.5x (极速掌控)!', 'SILVER'));
    if (speedMs <= 65 && score >= 600) checkMilestone('spd_20', () => addToast('达到极限速度 2.0x (极限狂飙)!', 'GOLD'));

    // 6. 检查 24 枚成就系统是否点亮
    const newlyUnlocked = checkAndUnlockAchievements({
      score,
      length,
      duration,
      maxCombo: 1,
      bonusCount,
      speedMs,
      steps,
    });

    newlyUnlocked.forEach((ach) => {
      sound.playAchievement();
      addToast(`解锁成就: [${ach.name}]`, ach.tier);
    });
  }, [isPlaying, isGameOver, score, length, duration, bonusCount, speedMs, steps, addToast]);

  // 开始新对局 (优先命中预取 Token，0ms 零延迟启动)
  const handleStartGame = useCallback(async () => {
    firedMilestonesRef.current.clear();
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
          <Header
            user={user}
            onLogout={logout}
            onOpenTutorial={handleOpenTutorial}
            onOpenAchievements={() => {
              sound.playGrandAchievement();
              setShowAchievements(true);
            }}
          />

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
                isReplay={isReplay}
                replayUser={replayUser}
                replaySpeedRate={replaySpeedRate}
                onSetReplaySpeed={setReplaySpeedRate}
                onExitReplay={exitReplay}
                onStart={handleStartGame}
                onTick={tick}
                onDirection={changeDirection}
                onTogglePause={togglePause}
              />
            </div>
            <Leaderboard
              items={board}
              currentUser={user}
              onRefresh={refreshBoard}
              onWatchReplay={handleWatchReplay}
            />
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

          {/* 局中即时高光微弹窗与弹窗交互层 */}
          <InGameToast toasts={toasts} onRemove={removeToast} />
          <Tutorial isOpen={showTutorial} onClose={handleCloseTutorial} />
          <Achievements isOpen={showAchievements} onClose={() => setShowAchievements(false)} />
        </div>
      )}
    </main>
  );
}
