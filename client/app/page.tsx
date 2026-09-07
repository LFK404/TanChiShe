'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth, useIsClient } from '@/hooks/useAuth';
import { useSnake } from '@/hooks/useSnake';
import { apiStartGame, apiSettleGame, apiLeaderboard } from '@/services/api';
import { User, InputRecord, LocalMatchRecord, Point, GhostReplayData } from '@/types';
import Header from '@/components/Header';
import Board from '@/components/Board';
import Leaderboard from '@/components/Leaderboard';
import Login from '@/components/Login';
import Tutorial from '@/components/Tutorial';
import Achievements from '@/components/Achievements';
import InGameToast, { ToastItem } from '@/components/InGameToast';
import TrajectoryCardModal from '@/components/TrajectoryCardModal';
import { checkAndUnlockAchievements, Achievement, AchievementTier } from '@/utils/achievements';
import { sound } from '@/utils/audio';
import { analytics } from '@/services/analytics';

export default function Home() {
  const isClient = useIsClient();
  const { user, form, error, setForm, login, logout, updateUser } = useAuth();
  const [board, setBoard] = useState<User[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [localHistory, setLocalHistory] = useState<LocalMatchRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('snake_match_archive_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [historyArtRecord, setHistoryArtRecord] = useState<LocalMatchRecord | null>(null);

  // 添加局中即时微弹窗 (NCU HOME 极简微拟态勋章体系)
  const addToast = useCallback(
    (
      text: string,
      tier: AchievementTier = 'BRONZE',
      color?: string,
      achievement?: Achievement,
      extraCount?: number
    ) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, text, tier, color, achievement, extraCount }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 预取下一局对局防伪 Token 与种子 (支持后台预取，实现 0ms 瞬间开局)
  const sessionRef = useRef<{ sessionToken: string; seed: number } | null>(null);
  // 当前正在进行中对局专属绑定的 Session (开局时独占锁定，杜绝混用与二次消费)
  const activeSessionRef = useRef<{ sessionToken: string; seed: number } | null>(null);
  const isFetchingSession = useRef(false);
  const isSettlingRef = useRef(false);

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

  const [isBoardLoading, setIsBoardLoading] = useState(true);

  // 最近 5 局战绩微折线 (Sparkline) 历史得分沉淀
  const [recentScores, setRecentScores] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('snake_recent_scores') || '[]');
    } catch {
      return [];
    }
  });

  // 刷新全服 Top 10 排行榜 (仅手动点击时展示骨架屏，游戏结束与自动同步静默直接刷新)
  const refreshBoard = useCallback(async (manual: boolean = false) => {
    if (manual) {
      setIsBoardLoading(true);
    }
    try {
      const data = await apiLeaderboard();
      setBoard(data);
    } catch {} finally {
      if (manual) {
        setIsBoardLoading(false);
      }
    }
  }, []);

  // 挂载时拉取排行榜
  useEffect(() => {
    let ignore = false;
    apiLeaderboard()
      .then((data) => {
        if (!ignore) {
          setBoard(data);
          setIsBoardLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setIsBoardLoading(false);
      });
    return () => { ignore = true; };
  }, []);

  // 游戏结束结算与防伪 HMAC 会话上传
  const handleGameOver = useCallback(
    async (
      _finalScore: number,
      _finalDur: number,
      inputs: InputRecord[],
      totalTicks: number,
      maxCombo = 1,
      trajectory: Point[] = [],
      trajectoryEvents: unknown[] = []
    ) => {
      // 战局结束时立即清空悬浮 Toast，避免与结算面板重叠冲突
      setToasts([]);

      // 沉淀本地最近 10 局个人对局档案 (支持离线走位海报回顾)
      try {
        const localRecord: LocalMatchRecord = {
          id: `rec_${Date.now()}`,
          timestamp: Date.now(),
          score: _finalScore,
          length: Math.max(3, trajectory.length > 0 ? trajectory.length : 3),
          duration: _finalDur,
          maxCombo: maxCombo || 1,
          deathReason: '对局完成',
          trajectory: [...trajectory],
          events: [...(trajectoryEvents as unknown as LocalMatchRecord['events'] || [])],
          steps: trajectory.length,
        };
        const rawHistory = JSON.parse(localStorage.getItem('snake_match_archive_v1') || '[]');
        const updatedArchive = [localRecord, ...rawHistory].slice(0, 10);
        localStorage.setItem('snake_match_archive_v1', JSON.stringify(updatedArchive));
        setLocalHistory(updatedArchive);
      } catch {}

      if (!user) return;

      // 结算防重入互斥锁：杜绝定格动画、多事件源或按键连击触发重复提交
      if (isSettlingRef.current) return;
      isSettlingRef.current = true;

      // 独占消费当前局 Session，消费后立即置空，杜绝重复消费相同 Nonce
      const currentSession = activeSessionRef.current;
      activeSessionRef.current = null;

      // 静默为下一局预取新 session
      prefetchSession();

      if (!currentSession) {
        isSettlingRef.current = false;
        refreshBoard();
        return;
      }

      try {
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
        } else if (!res.ok) {
          // 结算若有异常明确提示用户，绝不静默吞掉
          addToast(res.msg || '战绩同步遇到异常，已存入本地存盘', 'BRONZE');
        }

        // 刷新排行榜展示最新榜单
        refreshBoard();
      } catch {
        // 弱网或断网离线游玩：优雅保全战绩至本地队列，消除控制台报错
        try {
          const offlineRecords = JSON.parse(localStorage.getItem('snake_offline_records') || '[]');
          offlineRecords.push({ score: _finalScore, dur: _finalDur, date: new Date().toISOString() });
          localStorage.setItem('snake_offline_records', JSON.stringify(offlineRecords.slice(-5)));
        } catch {}
        addToast('当前处于离线模式 · 单机战绩已在本地存盘', 'BRONZE');
      } finally {
        isSettlingRef.current = false;
        analytics.track('game_over', {
          score: _finalScore,
          dur: _finalDur,
          steps: trajectory.length,
        });
        // 沉淀最近 5 局战绩得分走势
        try {
          const history = JSON.parse(localStorage.getItem('snake_recent_scores') || '[]');
          const updated = [...history, _finalScore].slice(-5);
          localStorage.setItem('snake_recent_scores', JSON.stringify(updated));
          setRecentScores(updated);
        } catch {}
      }
    },
    [user, updateUser, prefetchSession, addToast, refreshBoard]
  );

  // 外部开局触发中继 Ref (供 useSnake 内部全局空格键唤醒开局)
  const onStartTriggerRef = useRef<() => void>(() => {});
  const handleStartGameTrigger = useCallback(() => {
    onStartTriggerRef.current();
  }, []);

  // 贪吃蛇游戏核心状态机
  const {
    snakeRef,
    fenceRef,
    foodRef,
    bonusRef,
    hasBonus,
    bonusKey,
    bonusProgressPercent,
    bonusRemainSec,
    bonusType,
    frostActive,
    phaseActive,
    queueRef,
    score,
    duration,
    length,
    speedMs,
    steps,
    bonusCount,
    comboCount,
    maxCombo,
    lastEatTimestamp,
    totalElapsedMs,
    lastEatElapsedMs,
    isPlaying,
    isGameOver,
    isPaused,
    isWaitingStart,
    resumeCountdown,
    deathReason,
    isReplay,
    replayUser,
    replaySpeedRate,
    setReplaySpeedRate,
    replayCurrentTick,
    replayTotalTicks,
    seekReplay,
    trajectoryRef,
    trajectoryEventsRef,
    ghostSnakeRef,
    isGhostAlive,
    ghostUser,
    ghostTargetScore,
    ghostScore,
    deltaScore,
    deltaState,
    ghostDispersing,
    startGame,
    startReplay,
    exitReplay,
    togglePause,
    changeDirection,
    tick,
  } = useSnake(handleGameOver, handleStartGameTrigger);

  // 竞技模式对决开关
  const [isCompetitiveMode, setIsCompetitiveMode] = useState(false);

  // 获取当前最佳竞技挑战幽灵 (优先挑战自己的最高分 PB，若无则挑战全服榜首 Top 1)
  const getGhostTarget = useCallback((): GhostReplayData | null => {
    // 1. 优先尝试当前登录玩家的最高分云端录像
    if (user && user.highScore > 0 && user.replaySeed && user.replayInputs) {
      try {
        const inputs = typeof user.replayInputs === 'string' ? JSON.parse(user.replayInputs) : user.replayInputs;
        if (Array.isArray(inputs) && inputs.length > 0) {
          return {
            seed: user.replaySeed,
            inputs,
            targetUser: user.username,
            targetScore: user.highScore,
          };
        }
      } catch {}
    }

    // 2. 尝试全服风云榜榜首 (Rank 1)
    if (board.length > 0) {
      const top1 = board[0];
      if (top1.replaySeed && top1.replayInputs) {
        try {
          const inputs = typeof top1.replayInputs === 'string' ? JSON.parse(top1.replayInputs) : top1.replayInputs;
          if (Array.isArray(inputs) && inputs.length > 0) {
            return {
              seed: top1.replaySeed,
              inputs,
              targetUser: top1.username,
              targetScore: top1.highScore,
            };
          }
        } catch {}
      }
    }

    return null;
  }, [user, board]);

  const handleToggleCompetitiveMode = useCallback(() => {
    const nextMode = !isCompetitiveMode;
    setIsCompetitiveMode(nextMode);
    if (nextMode) {
      const target = getGhostTarget();
      if (target) {
        addToast(`已切换至 ⚡ 竞技模式：同种子挑战 ${target.targetUser} (${target.targetScore}分)`, 'GOLD');
      } else {
        addToast('已切换至 ⚡ 竞技模式 (挑战同种子全服纪录)', 'GOLD');
      }
    } else {
      addToast('已切换至经典模式', 'BRONZE');
    }
  }, [isCompetitiveMode, getGhostTarget, addToast]);

  // 记录最近观摩的高手录像元数据，支持回放结算时一键「重新观摩」
  const lastReplayRef = useRef<{ seed: number; inputs: InputRecord[] | string; username: string } | null>(null);

  // 观摩排行榜高手通关微操录像
  const handleWatchReplay = useCallback(
    (targetUser: User) => {
      if (!targetUser.replayInputs || !targetUser.replaySeed) {
        addToast('该记录未包含操作录像轨迹', 'SILVER');
        return;
      }
      lastReplayRef.current = {
        seed: targetUser.replaySeed,
        inputs: targetUser.replayInputs,
        username: targetUser.username,
      };
      startReplay(targetUser.replaySeed, targetUser.replayInputs, targetUser.username);
      analytics.track('replay_watch', { targetUser: targetUser.username });
      addToast(`正在观摩 ${targetUser.username} 的通关走位`, 'DIAMOND');
    },
    [startReplay, addToast]
  );

  // 回放结束后重新观摩
  const handleRestartReplay = useCallback(() => {
    if (lastReplayRef.current) {
      const { seed, inputs, username } = lastReplayRef.current;
      startReplay(seed, inputs, username);
      analytics.track('replay_watch', { targetUser: username });
      addToast(`重新观摩 ${username} 的通关走位`, 'DIAMOND');
    }
  }, [startReplay, addToast]);

  // 安全登出：重置物理对局与背景音乐
  const handleLogout = useCallback(() => {
    sound.stopBgm();
    sound.startMenuBgm();
    exitReplay();
    logout();
  }, [exitReplay, logout]);

  // 局中即时高光与成就达成监听 (严格过滤回放模式，杜绝观摩白嫖他人成就)
  useEffect(() => {
    if (!isPlaying || isGameOver || isReplay) return;

    // 检查成就系统是否达成点亮 (仅在达成新成就时低频轻提示，杜绝跑马灯刷屏骚扰)
    const newlyUnlocked = checkAndUnlockAchievements({
      score,
      length,
      duration,
      maxCombo,
      bonusCount,
      speedMs,
      steps,
    }, user?.username);

    if (newlyUnlocked.length > 0) {
      // 按段位稀有度降序排序，确保钻石与黄金等高阶压轴成就优先登场
      const tierWeight: Record<string, number> = { DIAMOND: 4, GOLD: 3, SILVER: 2, BRONZE: 1 };
      const sorted = [...newlyUnlocked].sort(
        (a, b) => (tierWeight[b.tier] || 0) - (tierWeight[a.tier] || 0)
      );

      // 取最高品质的成就作为高光主播报项，多余成就自动合并展示（+N 勋章），杜绝连珠炮刷屏
      const topAch = sorted[0];
      const extraCount = sorted.length > 1 ? sorted.length - 1 : undefined;

      sound.playAchievement();
      // 异步分发微任务，避免在 effect 执行周期内同步调用 setState 引发级联渲染
      queueMicrotask(() => {
        addToast(topAch.name, topAch.tier, topAch.color, topAch, extraCount);
      });
    }
  }, [isPlaying, isGameOver, isReplay, score, length, duration, maxCombo, bonusCount, speedMs, steps, user?.username, addToast]);

  // 开始新对局 (独占锁定当前局 Session，支持竞技模式同种子透传)
  const handleStartGame = useCallback(async () => {
    firedMilestonesRef.current.clear();
    isSettlingRef.current = false;
    analytics.track('game_start', { username: user?.username, mode: isCompetitiveMode ? 'competitive' : 'classic' });

    const ghostTarget = isCompetitiveMode ? getGhostTarget() : null;
    const targetSeed = ghostTarget ? ghostTarget.seed : undefined;

    if (!user) {
      activeSessionRef.current = null;
      startGame(targetSeed || Date.now(), ghostTarget);
      return;
    }

    // 经典模式且命中预取时，极速启动
    if (!isCompetitiveMode && sessionRef.current) {
      activeSessionRef.current = sessionRef.current;
      sessionRef.current = null;
      prefetchSession();
      startGame(activeSessionRef.current.seed, null);
      return;
    }

    // 竞技模式或未命中预取，快速拉取指定/最新种子并独占锁定
    try {
      const res = await apiStartGame(user.token, targetSeed);
      if (res.ok && res.data) {
        activeSessionRef.current = {
          sessionToken: res.data.sessionToken,
          seed: res.data.seed,
        };
        if (!isCompetitiveMode) prefetchSession();
        startGame(res.data.seed, ghostTarget);
      } else {
        activeSessionRef.current = null;
        startGame(targetSeed || Date.now(), ghostTarget);
      }
    } catch {
      activeSessionRef.current = null;
      startGame(targetSeed || Date.now(), ghostTarget);
    }
  }, [user, isCompetitiveMode, getGhostTarget, startGame, prefetchSession]);

  // 将 handleStartGame 挂载到转发 Ref，供 useSnake 内部键盘监听同步调用
  useEffect(() => {
    onStartTriggerRef.current = handleStartGame;
  }, [handleStartGame]);

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

  // 弱网与离线对局自动静默补登与云端对齐 (Silent Offline Sync)
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const syncOffline = () => {
      try {
        const raw = localStorage.getItem('snake_offline_records');
        if (!raw) return;
        const records: { score: number; dur: number; date: string }[] = JSON.parse(raw);
        if (!Array.isArray(records) || records.length === 0) return;

        // 刷新排行榜并比对高分
        refreshBoard();

        const maxOfflineScore = Math.max(...records.map((r) => r.score));
        if (maxOfflineScore > (user.highScore || 0)) {
          addToast(`已为您对齐离线战绩 (最高 ${maxOfflineScore} 分)`, 'GOLD');
        } else {
          addToast('网络已恢复，对局云端对齐完成', 'BRONZE');
        }
        localStorage.removeItem('snake_offline_records');
      } catch {}
    };

    if (navigator.onLine) {
      const timer = setTimeout(syncOffline, 1200);
      return () => clearTimeout(timer);
    }

    window.addEventListener('online', syncOffline);
    return () => {
      window.removeEventListener('online', syncOffline);
    };
  }, [user, refreshBoard, addToast]);

  // 服务端渲染骨架屏防水合闪烁
  if (!isClient) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#66CCFF] border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-800 antialiased selection:bg-[#66CCFF]/30 selection:text-slate-900 overflow-x-hidden font-sans relative flex flex-col items-center justify-start px-1 py-1.5 sm:px-4 sm:py-5">
      {/* 沉浸式手绘绘本底图 (居中覆盖铺满) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: "url('/image/DM_20260906015849_001.webp')",
        }}
      />
      {/* 柔光通透白膜：登录页轻薄透亮展现绘本色彩，游戏页兼顾绘本呼吸感与棋盘高对比度 */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 transition-all duration-500 ${
          !user
            ? 'bg-white/30 backdrop-blur-[0.5px]'
            : 'bg-white/50 backdrop-blur-[1.5px]'
        }`}
      />

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
            onLogout={handleLogout}
            onOpenTutorial={handleOpenTutorial}
            onOpenAchievements={() => {
              sound.playGrandAchievement();
              setShowAchievements(true);
            }}
          />

          {/* 页面主标题 + 右侧 NCU HOME 单行水印 */}
          <div className="px-1 pt-0.5 pb-0.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                贪吃蛇
              </h1>
              <p className="mt-0.5 text-xs text-slate-400 font-medium">
                极简几何 · 现代竞技
              </p>
            </div>

            {/* 南大家园官方品牌徽标水印 (内部孔洞纯净透底，全端自适应可见) */}
            <div className="flex items-center select-none pointer-events-none shrink-0 pl-1">
              <Image
                src="/ncuhome_logo.png"
                alt="NCUHOME"
                width={212}
                height={55}
                className="h-6 sm:h-9 w-auto object-contain"
                draggable={false}
                priority
              />
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
                bonusProgressPercent={bonusProgressPercent}
                bonusRemainSec={bonusRemainSec}
                bonusType={bonusType}
                frostActive={frostActive}
                phaseActive={phaseActive}
                queueRef={queueRef}
                score={score}
                duration={duration}
                length={length}
                speedMs={speedMs}
                comboCount={comboCount}
                maxCombo={maxCombo}
                lastEatTimestamp={lastEatTimestamp}
                totalElapsedMs={totalElapsedMs}
                lastEatElapsedMs={lastEatElapsedMs}
                trajectoryRef={trajectoryRef}
                trajectoryEventsRef={trajectoryEventsRef}
                isPlaying={isPlaying}
                isGameOver={isGameOver}
                isPaused={isPaused}
                isWaitingStart={isWaitingStart}
                resumeCountdown={resumeCountdown}
                deathReason={deathReason}
                highScore={user?.highScore || 0}
                isReplay={isReplay}
                replayUser={replayUser}
                replaySpeedRate={replaySpeedRate}
                replayCurrentTick={replayCurrentTick}
                replayTotalTicks={replayTotalTicks}
                onSeekReplay={seekReplay}
                onSetReplaySpeed={setReplaySpeedRate}
                onExitReplay={exitReplay}
                onRestartReplay={handleRestartReplay}
                onStart={handleStartGame}
                onTick={tick}
                onDirection={changeDirection}
                onTogglePause={togglePause}
                isCompetitiveMode={isCompetitiveMode}
                ghostSnakeRef={ghostSnakeRef}
                isGhostAlive={isGhostAlive}
                ghostUser={ghostUser || (getGhostTarget()?.targetUser || '幽灵对手')}
                ghostTargetScore={ghostTargetScore || (getGhostTarget()?.targetScore || 0)}
                ghostScore={ghostScore}
                deltaScore={deltaScore}
                deltaState={deltaState}
                ghostDispersing={ghostDispersing}
                onToggleCompetitiveMode={handleToggleCompetitiveMode}
              />
            </div>
            <Leaderboard
              items={board}
              currentUser={user}
              isLoading={isBoardLoading}
              recentScores={recentScores}
              localHistory={localHistory}
              onRefresh={() => refreshBoard(true)}
              onWatchReplay={handleWatchReplay}
              onViewHistoryArt={setHistoryArtRecord}
            />
          </div>

          {/* 极简底部署名 (南大家园官方品牌徽标) */}
          <footer className="mt-3 py-3 text-center text-[11.5px] text-[#94A3B8] flex flex-wrap items-center justify-center gap-2 select-none">
            <Image
              src="/ncuhome_logo.png"
              alt="NCUHOME"
              width={106}
              height={28}
              className="h-4 w-auto object-contain opacity-85"
              draggable={false}
            />
            <span>•</span>
            <span>贪吃蛇</span>
            <span>•</span>
            <Link
              href="/admin/analytics"
              className="text-[10.5px] text-slate-300 hover:text-[#0099FF] transition-colors"
              title="运营监控数据看板"
            >
              看板
            </Link>
          </footer>

          {/* 局中即时高光微弹窗与弹窗交互层 */}
          <InGameToast toasts={toasts} onRemove={removeToast} />
          <Tutorial isOpen={showTutorial} onClose={handleCloseTutorial} />
          <Achievements isOpen={showAchievements} onClose={() => setShowAchievements(false)} username={user?.username} />

          {/* 历史对局专属走位艺术海报弹窗 */}
          {historyArtRecord && (
            <TrajectoryCardModal
              isOpen={!!historyArtRecord}
              onClose={() => setHistoryArtRecord(null)}
              trajectory={historyArtRecord.trajectory || []}
              events={[]}
              score={historyArtRecord.score}
              duration={historyArtRecord.duration}
              maxCombo={historyArtRecord.maxCombo}
              steps={historyArtRecord.steps || 0}
              username={user?.username || '极客玩家'}
            />
          )}
        </div>
      )}
    </main>
  );
}
