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
import NcuCubeIcon from '@/components/NcuCubeIcon';
import { checkAndUnlockAchievements, Achievement, AchievementTier } from '@/utils/achievements';
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

  // 添加局中即时微弹窗 (NCU HOME 极简微拟态勋章体系)
  const addToast = useCallback(
    (text: string, tier: AchievementTier = 'BRONZE', color?: string, achievement?: Achievement) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, tier, color, achievement }]);
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
    bonusProgressPercent,
    bonusRemainSec,
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

    // 按段位稀有度降序排序，确保钻石与黄金等高阶压轴成就优先登场
    const tierWeight: Record<string, number> = { DIAMOND: 4, GOLD: 3, SILVER: 2, BRONZE: 1 };
    const sorted = [...newlyUnlocked].sort(
      (a, b) => (tierWeight[b.tier] || 0) - (tierWeight[a.tier] || 0)
    );

    sorted.forEach((ach) => {
      sound.playAchievement();
      addToast(ach.name, ach.tier, ach.color, ach);
    });
  }, [isPlaying, isGameOver, isReplay, score, length, duration, maxCombo, bonusCount, speedMs, steps, user?.username, addToast]);

  // 开始新对局 (独占锁定当前局 Session，杜绝混用与二次消费，0ms 零延迟启动)
  const handleStartGame = useCallback(async () => {
    firedMilestonesRef.current.clear();
    isSettlingRef.current = false;

    if (!user) {
      activeSessionRef.current = null;
      startGame(Date.now());
      return;
    }

    if (sessionRef.current) {
      // 命中预取：立即独占转移到当前局并清空公共槽，杜绝混用
      activeSessionRef.current = sessionRef.current;
      sessionRef.current = null;
      // 异步提前为下一局预取新会话
      prefetchSession();
      startGame(activeSessionRef.current.seed);
      return;
    }

    // 若未命中预取，快速即时拉取并独占锁定
    try {
      const res = await apiStartGame(user.token);
      if (res.ok && res.data) {
        activeSessionRef.current = {
          sessionToken: res.data.sessionToken,
          seed: res.data.seed,
        };
        prefetchSession();
        startGame(res.data.seed);
      } else {
        activeSessionRef.current = null;
        startGame(Date.now());
      }
    } catch {
      activeSessionRef.current = null;
      startGame(Date.now());
    }
  }, [user, startGame, prefetchSession]);

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
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] flex flex-col items-center justify-start px-1.5 py-2 sm:p-5 relative overflow-x-hidden transition-colors">
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
              <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">
                贪吃蛇
              </h1>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                极简几何 · 现代竞技
              </p>
            </div>

            {/* 南大家园官方 3D 魔方徽标与彩色 NCUHOME 水印 (与官方品牌形象一模一样) */}
            <div className="hidden sm:flex items-center gap-2.5 select-none pointer-events-none opacity-90 shrink-0 pl-2">
              <NcuCubeIcon className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
              <div className="flex items-center font-black text-2xl sm:text-3xl tracking-tight leading-none">
                <span className="text-[#FF5A5F]">N</span>
                <span className="text-[#F59E0B]">C</span>
                <span className="text-[#0099FF]">U</span>
                <span className="text-[#262626] dark:text-slate-100 ml-0.5">HOME</span>
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
                bonusProgressPercent={bonusProgressPercent}
                bonusRemainSec={bonusRemainSec}
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
          <footer className="mt-3 py-3 text-center text-[11.5px] text-[#94A3B8] flex flex-wrap items-center justify-center gap-1.5 select-none">
            <NcuCubeIcon className="w-3.5 h-3.5 inline-block shrink-0" />
            <div className="flex items-center font-bold tracking-tight">
              <span className="text-[#FF5A5F]">N</span>
              <span className="text-[#F59E0B]">C</span>
              <span className="text-[#0099FF]">U</span>
              <span className="text-slate-600 dark:text-slate-300 ml-0.5">HOME</span>
            </div>
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
