'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useIsClient } from '@/hooks/useAuth';
import { useSnake } from '@/hooks/useSnake';
import { apiStartGame, apiSettleGame, apiLeaderboard } from '@/services/api';
import { User, InputRecord, LocalMatchRecord, Point } from '@/types';
import Header from '@/components/Header';
import Board from '@/components/Board';
import Leaderboard from '@/components/Leaderboard';
import Login from '@/components/Login';
import Tutorial from '@/components/Tutorial';
import Achievements from '@/components/Achievements';
import InGameToast, { ToastItem } from '@/components/InGameToast';
import TrajectoryCardModal from '@/components/TrajectoryCardModal';
import { checkAndUnlockAchievements, AchievementTier } from '@/utils/achievements';
import { sound } from '@/utils/audio';

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

  // 刷新全服 Top 10 排行榜 (带骨架屏过渡)
  const refreshBoard = useCallback(async () => {
    setIsBoardLoading(true);
    try {
      const data = await apiLeaderboard();
      setBoard(data);
    } catch {} finally {
      setIsBoardLoading(false);
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

      const currentSession = sessionRef.current;
      sessionRef.current = null; // 消费当前 session

      // 静默为下一局预取新 session
      prefetchSession();

      if (!currentSession) {
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

  // 贪吃蛇游戏核心状态机
  const {
    snakeRef,
    fenceRef,
    foodRef,
    bonusRef,
    hasBonus,
    bonusKey,
    queueRef,
    score,
    duration,
    length,
    speedMs,
    bonusCount,
    comboCount,
    maxCombo,
    lastEatTimestamp,
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
    startGame,
    startReplay,
    exitReplay,
    togglePause,
    changeDirection,
    tick,
  } = useSnake(handleGameOver);

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
      addToast(`正在观摩 [${targetUser.username}] 的通关走位`, 'DIAMOND');
    },
    [startReplay, addToast]
  );

  // 回放结束后重新观摩
  const handleRestartReplay = useCallback(() => {
    if (lastReplayRef.current) {
      const { seed, inputs, username } = lastReplayRef.current;
      startReplay(seed, inputs, username);
      addToast(`重新观摩 [${username}] 的通关走位`, 'DIAMOND');
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

    // 检查 24 枚成就系统是否达成点亮 (仅在达成新成就时低频轻提示，杜绝跑马灯刷屏骚扰)
    const newlyUnlocked = checkAndUnlockAchievements({
      score,
      length,
      duration,
      maxCombo,
      bonusCount,
      speedMs,
      steps: 0,
    }, user?.username);

    newlyUnlocked.forEach((ach) => {
      sound.playAchievement();
      addToast(`解锁成就: [${ach.name}]`, ach.tier);
    });
  }, [isPlaying, isGameOver, isReplay, score, length, duration, maxCombo, bonusCount, speedMs, user?.username, addToast]);

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

            <div className="hidden sm:flex flex-col items-end leading-none select-none pointer-events-none opacity-80 shrink-0 pl-2">
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
                queueRef={queueRef}
                score={score}
                duration={duration}
                length={length}
                speedMs={speedMs}
                comboCount={comboCount}
                maxCombo={maxCombo}
                lastEatTimestamp={lastEatTimestamp}
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
              />
            </div>
            <Leaderboard
              items={board}
              currentUser={user}
              isLoading={isBoardLoading}
              recentScores={recentScores}
              localHistory={localHistory}
              onRefresh={refreshBoard}
              onWatchReplay={handleWatchReplay}
              onViewHistoryArt={setHistoryArtRecord}
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
