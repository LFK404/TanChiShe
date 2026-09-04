import { useRef, useState, useCallback, useEffect } from 'react';
import { Direction, Point, InputRecord } from '@/types';
import { sound } from '@/utils/audio';
import { haptics, HapticType } from '@/utils/haptics';
import { Mulberry32 } from '@/utils/prng';

// 游戏物理网格常量 (24x24 格子，单格 20px)
export const GRID = 24;
export const CELL = 20;
export const BASE_SPEED_MS = 150; // 基础速度 (约 6.7 格/秒，温和从容)
export const MIN_SPEED_MS = 60;   // 极速上限 (2.5x 速度，约 16.7 格/秒)

// 0.1x 平滑非线性阶梯算速函数 (基础150ms=1.0x，上限60ms=2.5x，每档+0.1x，得分跨度每档逐次+10)
export function calcSpeedMs(score: number): number {
  if (score >= 2550) return 60; // 2.5x (极限封顶)
  if (score >= 2310) return 63; // 2.4x
  if (score >= 2080) return 65; // 2.3x
  if (score >= 1860) return 68; // 2.2x
  if (score >= 1650) return 71; // 2.1x
  if (score >= 1450) return 75; // 2.0x
  if (score >= 1260) return 79; // 1.9x
  if (score >= 1080) return 83; // 1.8x
  if (score >= 910)  return 88; // 1.7x (残影/心跳开启)
  if (score >= 750)  return 94; // 1.6x
  if (score >= 600)  return 100; // 1.5x
  if (score >= 460)  return 107; // 1.4x
  if (score >= 330)  return 115; // 1.3x
  if (score >= 210)  return 125; // 1.2x
  if (score >= 100)  return 136; // 1.1x
  return BASE_SPEED_MS;         // 1.0x (0~99分 150ms)
}

const toKey = (x: number, y: number) => `${x},${y}`;

// 判断两方向是否相反 (防 180 度掉头自杀)
const isOpp = (d1: Direction, d2: Direction) =>
  (d1 === 'UP' && d2 === 'DOWN') ||
  (d1 === 'DOWN' && d2 === 'UP') ||
  (d1 === 'LEFT' && d2 === 'RIGHT') ||
  (d1 === 'RIGHT' && d2 === 'LEFT');

// 键盘按键映射字典
const KEY_DIR: Record<string, Direction> = {
  ArrowUp: 'UP',
  w: 'UP',
  W: 'UP',
  ArrowDown: 'DOWN',
  s: 'DOWN',
  S: 'DOWN',
  ArrowLeft: 'LEFT',
  a: 'LEFT',
  A: 'LEFT',
  ArrowRight: 'RIGHT',
  d: 'RIGHT',
  D: 'RIGHT',
};

// 方向位移向量增量表
const DIR_DELTAS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// 走位轨迹高光进食事件
export interface TrajectoryEvent {
  x: number;
  y: number;
  type: 'APPLE' | 'BONUS';
  combo: number;
}

export type GameOverCallback = (
  score: number,
  duration: number,
  inputs: InputRecord[],
  totalTicks: number,
  maxCombo?: number,
  trajectory?: Point[],
  trajectoryEvents?: TrajectoryEvent[]
) => void;

// 贪吃蛇全套确定性物理时序与状态驱动引擎
export function useSnake(onGameOver?: GameOverCallback) {
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
  ]);
  const fenceRef = useRef<Set<string>>(new Set());
  const foodRef = useRef<Point>({ x: 16, y: 12 });
  const bonusRef = useRef<Point | null>(null);
  const dirRef = useRef<Direction>('RIGHT');
  const queueRef = useRef<Direction[]>([]);
  const stateRef = useRef({ playing: false, over: false, paused: false, score: 0, start: 0 });

  // 确定性随机数发生器与按键轨迹记录
  const rngRef = useRef<Mulberry32 | null>(null);
  const tickCountRef = useRef<number>(0);
  const inputsRef = useRef<InputRecord[]>([]);
  const pausedMsRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [duration, setDuration] = useState(0);
  const [length, setLength] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMs, setSpeedMs] = useState(BASE_SPEED_MS);
  const speedMsRef = useRef<number>(BASE_SPEED_MS);
  const [hasBonus, setHasBonus] = useState(false);
  const [bonusKey, setBonusKey] = useState(0);
  const [bonusCount, setBonusCount] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastEatTimestamp, setLastEatTimestamp] = useState(0);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [lastEatElapsedMs, setLastEatElapsedMs] = useState(-99999);
  const [bonusProgressPercent, setBonusProgressPercent] = useState(100);
  const [bonusRemainSec, setBonusRemainSec] = useState(8.0);
  const [isWaitingStart, setIsWaitingStart] = useState(false);
  const isWaitingStartRef = useRef(false);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menuBgmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [deathReason, setDeathReason] = useState<string>('');
  const deathReasonRef = useRef<string>('');
  const durationRef = useRef<number>(0);
  const stepsRef = useRef<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const bonusCountRef = useRef<number>(0);
  const comboCountRef = useRef<number>(0);
  const totalElapsedMsRef = useRef<number>(0);
  const lastEatElapsedMsRef = useRef<number>(-99999);
  const lastEatTimestampRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const bonusExpireTickRef = useRef<number>(0);
  const trajectoryRef = useRef<Point[]>([]);
  const trajectoryEventsRef = useRef<TrajectoryEvent[]>([]);

  // 电竞对局录像回放状态机
  const [isReplay, setIsReplay] = useState(false);
  const [replayUser, setReplayUser] = useState<string>('');
  const [replaySpeedRate, setReplaySpeedRate] = useState<number>(1);
  const [replayCurrentTick, setReplayCurrentTick] = useState<number>(0);
  const [replayTotalTicks, setReplayTotalTicks] = useState<number>(0);
  const isReplayRef = useRef<boolean>(false);
  const replaySeedRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const replayInputsMapRef = useRef<Map<number, Direction[]>>(new Map());

  // 移动端振动触觉反馈 (智能接入多层级触觉管理器)
  const vibrate = useCallback((type: HapticType | number | number[], combo = 1) => {
    if (sound.muted || sound.sfxVolume <= 0) return;
    if (typeof type === 'string') {
      haptics.trigger(type, combo);
    } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(type);
      } catch {}
    }
  }, []);

  // 清除金色幸运果 (重置物理截止步数，杜绝宏任务漂移)
  const clearBonus = useCallback(() => {
    bonusRef.current = null;
    bonusExpireTickRef.current = 0;
    setHasBonus(false);
    setBonusProgressPercent(0);
    setBonusRemainSec(0);
  }, []);

  // 确定性独立双果生成算法 (保证与 Go 后端 PRNG 消费序列绝对一致)
  const spawnFood = useCallback(() => {
    const snakeKeys = new Set(snakeRef.current.map((p) => toKey(p.x, p.y)));
    const empty: Point[] = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const k = toKey(c, r);
        if (!snakeKeys.has(k) && !fenceRef.current.has(k)) empty.push({ x: c, y: r });
      }
    }
    if (empty.length === 0) return;

    const rng = rngRef.current;

    // 1. 红苹果保底生成 (消费 1 个随机数)
    const r1 = rng ? rng.next() : Math.random();
    const newFood = empty[Math.floor(r1 * empty.length)];
    foodRef.current = newFood;

    // 2. 金色幸运果判定 (消费第 2 个随机数判定概率)
    const r2 = rng ? rng.next() : Math.random();
    if (r2 < 0.25 && !bonusRef.current && empty.length > 3) {
      const remainingEmpty = empty.filter((p) => p.x !== newFood.x || p.y !== newFood.y);
      if (remainingEmpty.length > 0) {
        // 消费第 3 个随机数选择坐标
        const r3 = rng ? rng.next() : Math.random();
        bonusRef.current = remainingEmpty[Math.floor(r3 * remainingEmpty.length)];
        setBonusKey((prev) => prev + 1);
        setHasBonus(true);
        setBonusProgressPercent(100);
        setBonusRemainSec(8.0);

        // 若处于开局等待起步态，步数暂不扣减，待迈出第一步后再正确定位到期步数
        if (!isWaitingStartRef.current) {
          bonusExpireTickRef.current = tickCountRef.current + Math.round(8000 / speedMsRef.current);
        } else {
          bonusExpireTickRef.current = 0;
        }
      }
    }
  }, []);

  // 游戏结束结算 (自动剔除中途暂停时长)
  const gameOver = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setResumeCountdown(null);
    if (isSeekingRef.current) {
      stateRef.current.over = true;
      stateRef.current.playing = false;
      return;
    }
    // 物理受击瞬间：立即冻结逻辑主物理时钟
    stateRef.current.over = true;
    stateRef.current.playing = false;
    clearBonus();
    vibrate('gameover');

    // 播放磁带停机微滑音 (Tape-Stop) 与街机游戏结束和弦
    sound.stopBgmWithTapeDrop();
    sound.playGameOver();

    setSteps(stepsRef.current);
    // 维持受击定格 60ms 后才正式弹出结算面板 (动作游戏打击感灵魂 Hit-Stop)
    setTimeout(() => {
      setIsGameOver(true);
      setIsPlaying(false);
    }, 60);

    // 局后平滑切回温馨大厅 BGM (句柄守护，开局时立即取消，杜绝偷跑打架)
    if (menuBgmTimerRef.current) clearTimeout(menuBgmTimerRef.current);
    menuBgmTimerRef.current = setTimeout(() => {
      sound.startMenuBgm();
      menuBgmTimerRef.current = null;
    }, 1200);
    if (!isReplayRef.current) {
      const dur = Math.max(1, Math.floor((Date.now() - stateRef.current.start - pausedMsRef.current) / 1000));
      onGameOver?.(
        stateRef.current.score,
        dur,
        inputsRef.current,
        tickCountRef.current,
        maxComboRef.current,
        trajectoryRef.current,
        trajectoryEventsRef.current
      );
    }
  }, [onGameOver, clearBonus, vibrate]);

  // 开始新对局 (支持传入服务端下发的确定性 seed)
  const startGame = useCallback(
    (seed?: number) => {
      sound.unlockAudio();
      if (menuBgmTimerRef.current) {
        clearTimeout(menuBgmTimerRef.current);
        menuBgmTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setResumeCountdown(null);
      deathReasonRef.current = '';
      setDeathReason('');
      isReplayRef.current = false;
      setIsReplay(false);
      setReplayUser('');
      setReplaySpeedRate(1);

      rngRef.current = new Mulberry32(seed !== undefined ? seed : Date.now());
      tickCountRef.current = 0;
      inputsRef.current = [];
      pausedMsRef.current = 0;
      pauseStartRef.current = 0;
      stepsRef.current = 0;
      bonusCountRef.current = 0;
      comboCountRef.current = 0;
      totalElapsedMsRef.current = 0;
      lastEatElapsedMsRef.current = -99999;
      lastEatTimestampRef.current = 0;
      maxComboRef.current = 0;
      setComboCount(0);
      setMaxCombo(0);
      setLastEatTimestamp(0);
      trajectoryRef.current = [{ x: 10, y: 12 }];
      trajectoryEventsRef.current = [];

      snakeRef.current = [
        { x: 10, y: 12 },
        { x: 9, y: 12 },
        { x: 8, y: 12 },
      ];
      fenceRef.current.clear();
      dirRef.current = 'RIGHT';
      queueRef.current = [];
      stateRef.current = { playing: true, over: false, paused: false, score: 0, start: Date.now() };

      durationRef.current = 0;
      setScore(0);
      setDuration(0);
      setSteps(0);
      setLength(3);
      setBonusCount(0);
      speedMsRef.current = BASE_SPEED_MS;
      setSpeedMs(BASE_SPEED_MS);
      setIsGameOver(false);
      setIsPaused(false);
      setIsPlaying(true);
      isWaitingStartRef.current = true;
      setIsWaitingStart(true);
      clearBonus();
      sound.playReadyGo();
      sound.startInGameBgm();
      vibrate('ui');
      spawnFood();
    },
    [spawnFood, clearBonus, vibrate]
  );

  // 启动电竞对局录像回放模式 (基于确定性种子与输入流 100% 还原)
  const startReplay = useCallback(
    (seed: number, inputsData: InputRecord[] | string, targetUser?: string) => {
      sound.unlockAudio();
      isWaitingStartRef.current = false;
      setIsWaitingStart(false);
      let parsedInputs: InputRecord[] = [];
      if (typeof inputsData === 'string') {
        try {
          parsedInputs = JSON.parse(inputsData);
        } catch {
          parsedInputs = [];
        }
      } else if (Array.isArray(inputsData)) {
        parsedInputs = inputsData;
      }

      const map = new Map<number, Direction[]>();
      parsedInputs.forEach((item) => {
        if (!map.has(item.tick)) map.set(item.tick, []);
        map.get(item.tick)!.push(item.dir);
      });
      replayInputsMapRef.current = map;

      isReplayRef.current = true;
      setIsReplay(true);
      setReplayUser(targetUser || '高手玩家');
      setReplaySpeedRate(1);

      const maxTick = parsedInputs.length > 0 ? parsedInputs[parsedInputs.length - 1].tick + 8 : 100;
      setReplayTotalTicks(maxTick);
      setReplayCurrentTick(0);
      replaySeedRef.current = seed;
      speedMsRef.current = BASE_SPEED_MS;
      setSpeedMs(BASE_SPEED_MS);

      rngRef.current = new Mulberry32(seed);
      tickCountRef.current = 0;
      inputsRef.current = [];
      pausedMsRef.current = 0;
      pauseStartRef.current = 0;
      stepsRef.current = 0;
      bonusCountRef.current = 0;
      comboCountRef.current = 0;
      totalElapsedMsRef.current = 0;
      lastEatElapsedMsRef.current = -99999;
      lastEatTimestampRef.current = 0;
      maxComboRef.current = 0;
      setComboCount(0);
      setMaxCombo(0);
      setLastEatTimestamp(0);
      trajectoryRef.current = [{ x: 10, y: 12 }];
      trajectoryEventsRef.current = [];

      snakeRef.current = [
        { x: 10, y: 12 },
        { x: 9, y: 12 },
        { x: 8, y: 12 },
      ];
      fenceRef.current.clear();
      dirRef.current = 'RIGHT';
      queueRef.current = [];
      stateRef.current = { playing: true, over: false, paused: false, score: 0, start: Date.now() };

      durationRef.current = 0;
      setScore(0);
      setDuration(0);
      setSteps(0);
      setLength(3);
      setBonusCount(0);
      setIsGameOver(false);
      setIsPaused(false);
      setIsPlaying(true);
      clearBonus();
      sound.playReplayIntro();
      sound.startInGameBgm();
      spawnFood();
    },
    [spawnFood, clearBonus]
  );

  // 退出对局录像回放
  const exitReplay = useCallback(() => {
    isWaitingStartRef.current = false;
    setIsWaitingStart(false);
    isReplayRef.current = false;
    setIsReplay(false);
    setReplayUser('');
    setReplaySpeedRate(1);
    stateRef.current = { playing: false, over: false, paused: false, score: 0, start: 0 };
    setIsPlaying(false);
    setIsGameOver(false);
    setIsPaused(false);
    clearBonus();
    sound.startMenuBgm();
  }, [clearBonus]);

  // 转向指令压入排队缓冲队列 (最大缓冲 2 条指令，并捕获当前 tick 帧)
  const changeDirection = useCallback((t: Direction) => {
    if (isReplayRef.current) return; // 回放模式禁止手动干预转向
    if (!stateRef.current.playing || stateRef.current.over || stateRef.current.paused) return;

    // 若当前处于开局等待唤醒状态，任意有效转向输入立即唤醒起跑
    if (isWaitingStartRef.current) {
      isWaitingStartRef.current = false;
      setIsWaitingStart(false);
      stateRef.current.start = Date.now();
      // 迈出第一步时正式激活金果的物理步数到期点 (消除开局提前倒数)
      if (bonusRef.current) {
        bonusExpireTickRef.current = tickCountRef.current + Math.round(8000 / speedMsRef.current);
        setBonusProgressPercent(100);
        setBonusRemainSec(8.0);
      }
    }

    const q = queueRef.current;
    const last = q.length > 0 ? q[q.length - 1] : dirRef.current;
    if (t !== last && !isOpp(last, t) && q.length < 2) {
      const isBuffering = q.length > 0;
      q.push(t);
      inputsRef.current.push({ tick: tickCountRef.current, dir: t });
      sound.playMove();
      // 第一指令触发即时轻震，第二指令入队缓冲触发机械段落卡扣感 (snap)
      vibrate(isBuffering ? 'snap' : 'move');
    }
  }, [vibrate]);

  // 暂停/继续游戏 (解除暂停时启动轻量 3 拍微倒数，彻底杜绝极速下恢复瞬死)
  const togglePause = useCallback(() => {
    if (!stateRef.current.playing || stateRef.current.over) return;

    // 若当前正处于 3 秒微倒数中，再次按暂停则立即取消倒数并维持暂停状态
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setResumeCountdown(null);
      stateRef.current.paused = true;
      setIsPaused(true);
      sound.pauseBgm();
      sound.playToggle();
      vibrate('ui');
      return;
    }

    if (!stateRef.current.paused) {
      // 触发暂停：立即冻结
      pauseStartRef.current = Date.now();
      stateRef.current.paused = true;
      setIsPaused(true);
      sound.pauseBgm();
      sound.playToggle();
      vibrate('ui');
    } else {
      // 从暂停中恢复：先隐藏暂停遮罩看清棋盘，启动 3-2-1 快速微倒数 (每拍 360ms，共约 1 秒)
      setIsPaused(false);
      let count = 3;
      setResumeCountdown(count);
      sound.playCountdownTick();
      vibrate('snap');

      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setResumeCountdown(count);
          sound.playCountdownTick();
          vibrate('snap');
        } else {
          // 倒数归零：物理时钟正式解冻，蛇恢复前行
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setResumeCountdown(null);
          stateRef.current.paused = false;
          if (pauseStartRef.current > 0) {
            pausedMsRef.current += Date.now() - pauseStartRef.current;
            pauseStartRef.current = 0;
          }
          sound.playResumeGo();
          sound.resumeBgm();
          vibrate('move');
        }
      }, 360);
    }
  }, [vibrate]);

  // 核心主物理 Tick 时序 (净物理用时实时计算)
  const tick = useCallback(() => {
    const { playing, over, paused, start } = stateRef.current;
    if (!playing || over || paused || isWaitingStartRef.current) return;

    const currentDur = Math.max(0, Math.floor((Date.now() - start - pausedMsRef.current) / 1000));
    if (currentDur !== durationRef.current) {
      durationRef.current = currentDur;
      setDuration(currentDur);
      setSteps(stepsRef.current);
    }

    // 如果处于电竞对局回放模式，从录像映射表中消费当前 tick 的转向输入
    if (isReplayRef.current) {
      const dirs = replayInputsMapRef.current.get(tickCountRef.current);
      if (dirs) {
        dirs.forEach((d) => {
          const q = queueRef.current;
          const last = q.length > 0 ? q[q.length - 1] : dirRef.current;
          if (d !== last && !isOpp(last, d) && q.length < 2) {
            q.push(d);
          }
        });
      }
    }

    tickCountRef.current += 1;
    totalElapsedMsRef.current += speedMsRef.current;
    setTotalElapsedMs(totalElapsedMsRef.current);
    if (isReplayRef.current && !isSeekingRef.current) {
      setReplayCurrentTick(tickCountRef.current);
    }

    // 连击结算辅助函数 (确保物理确定性时钟与 Go 后端完全一致)
    const applyComboEat = (baseScore: number) => {
      const elapsed = totalElapsedMsRef.current;
      const isCombo = lastEatElapsedMsRef.current >= 0 && elapsed - lastEatElapsedMsRef.current <= 3000;
      const currentCombo = isCombo ? comboCountRef.current + 1 : 1;
      comboCountRef.current = currentCombo;
      lastEatElapsedMsRef.current = elapsed;
      setLastEatElapsedMs(elapsed);
      const now = Date.now();
      lastEatTimestampRef.current = now;
      if (currentCombo > maxComboRef.current) {
        maxComboRef.current = currentCombo;
        setMaxCombo(currentCombo);
      }
      setComboCount(currentCombo);
      setLastEatTimestamp(now);

      let extraScore = 0;
      if (currentCombo >= 3) {
        extraScore = (currentCombo - 2) * 5;
      }
      stateRef.current.score += baseScore + extraScore;
      setScore(stateRef.current.score);
      return { currentCombo, extraScore };
    };

    // 1. 消费转向队列
    if (queueRef.current.length > 0) {
      const nextDir = queueRef.current.shift()!;
      if (!isOpp(dirRef.current, nextDir)) dirRef.current = nextDir;
    }

    // 2. 计算新蛇头坐标并记录走位轨迹
    const delta = DIR_DELTAS[dirRef.current];
    const head = { x: snakeRef.current[0].x + delta.x, y: snakeRef.current[0].y + delta.y };
    trajectoryRef.current.push(head);

    // 3. 边界碰撞
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      deathReasonRef.current = '撞上边界边缘墙体';
      setDeathReason('撞上边界边缘墙体');
      gameOver();
      return;
    }

    // 4. 自身身体碰撞
    const isEatingApple = head.x === foodRef.current.x && head.y === foodRef.current.y;
    const bodyToCheck = isEatingApple ? snakeRef.current : snakeRef.current.slice(0, -1);
    const collideBodyIndex = bodyToCheck.findIndex((p) => p.x === head.x && p.y === head.y);
    if (collideBodyIndex !== -1) {
      const reason = `追尾自身躯干 (第 ${collideBodyIndex + 1} 节)`;
      deathReasonRef.current = reason;
      setDeathReason(reason);
      gameOver();
      return;
    }

    // 5. 吃到普通红苹果 (增长 1 节 + 连击刷新 + 阶梯加分 + 清空栅栏 + 动态加速)
    if (isEatingApple) {
      const nextSnake = [head, ...snakeRef.current];
      const { currentCombo } = applyComboEat(10);
      trajectoryEventsRef.current.push({
        x: head.x,
        y: head.y,
        type: 'APPLE',
        combo: currentCombo,
      });
      setLength(nextSnake.length);
      if (!isSeekingRef.current) {
        sound.playEat();
        sound.playCombo(currentCombo);
        vibrate('eat', currentCombo);
      }
      fenceRef.current.clear();
      const nextSpeed = calcSpeedMs(stateRef.current.score);
      speedMsRef.current = nextSpeed;
      setSpeedMs(nextSpeed);
      sound.updateGameSpeed(nextSpeed);
      snakeRef.current = nextSnake;
      spawnFood();
      return;
    }

    // 6. 残留栅栏碰撞检测
    if (fenceRef.current.has(toKey(head.x, head.y))) {
      deathReasonRef.current = '误入身后死路障壁';
      setDeathReason('误入身后死路障壁');
      gameOver();
      return;
    }

    // 7. 吃到金色幸运果 (+30 分并纳入连击链，第3次起阶梯加分，保留栅栏)
    if (bonusRef.current && head.x === bonusRef.current.x && head.y === bonusRef.current.y) {
      const { currentCombo } = applyComboEat(30);
      trajectoryEventsRef.current.push({
        x: head.x,
        y: head.y,
        type: 'BONUS',
        combo: currentCombo,
      });
      bonusCountRef.current += 1;
      setBonusCount(bonusCountRef.current);
      if (!isSeekingRef.current) {
        sound.playBonus();
        sound.playCombo(currentCombo);
        vibrate('bonus', currentCombo);
      }
      clearBonus();
    }

    // 8. 金色幸运果 8 秒物理步数倒计时与临期警报 (纯物理步数百分比驱动，绝不失步)
    if (bonusRef.current && bonusExpireTickRef.current > 0) {
      if (tickCountRef.current >= bonusExpireTickRef.current) {
        bonusRef.current = null;
        bonusExpireTickRef.current = 0;
        setHasBonus(false);
        setBonusProgressPercent(0);
        setBonusRemainSec(0);
      } else {
        const totalTicks = Math.round(8000 / speedMs);
        const remainingTicks = bonusExpireTickRef.current - tickCountRef.current;
        const percent = totalTicks > 0 ? (remainingTicks / totalTicks) * 100 : 0;
        const remainSec = (remainingTicks * speedMs) / 1000;
        setBonusProgressPercent(percent);
        setBonusRemainSec(remainSec);

        const remainingMs = remainingTicks * speedMs;
        const prevRemainingMs = (remainingTicks + 1) * speedMs;
        if (remainingMs <= 3000 && remainingMs > 0) {
          if (Math.floor(prevRemainingMs / 1000) > Math.floor(remainingMs / 1000)) {
            sound.playCountdownTick();
            vibrate('countdown');
          }
        }
      }
    } else if (bonusRef.current && isWaitingStartRef.current) {
      setBonusProgressPercent(100);
      setBonusRemainSec(8.0);
    }

    // 9. 正常移动：蛇头前进，蛇尾留下残留栅栏 (纯 Ref 高速步进，零 React 状态调度开销)
    stepsRef.current += 1;
    const nextSnake = [head, ...snakeRef.current];
    const tail = nextSnake.pop()!;
    fenceRef.current.add(toKey(tail.x, tail.y));
    snakeRef.current = nextSnake;
  }, [gameOver, spawnFood, clearBonus, vibrate, speedMs]);

  // 全局键盘监听 (方向键 / WASD / 空格 / P)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 若当前焦点在输入框或文本域内，绝不劫持任何按键 (防止登录输入账号密码被拦截或吞空格)
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      sound.unlockAudio();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
        // 自动失焦页面按钮，防止空格键误触之前点击过的按钮
        if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
      }

      // M 键：自习室/工位快速一键静音/取消静音
      if (e.key === 'm' || e.key === 'M') {
        sound.toggleMute();
        return;
      }

      if (e.key === 'p' || e.key === 'P') return togglePause();
      if (e.key === ' ') {
        // 等待起跑状态下按空格立即唤醒出发
        if (isWaitingStartRef.current) {
          isWaitingStartRef.current = false;
          setIsWaitingStart(false);
          stateRef.current.start = Date.now();
          if (bonusRef.current) {
            bonusExpireTickRef.current = tickCountRef.current + Math.round(8000 / speedMsRef.current);
            setBonusProgressPercent(100);
            setBonusRemainSec(8.0);
          }
          sound.playMove();
          return;
        }
        if (!stateRef.current.playing || stateRef.current.over) return;
        return togglePause();
      }
      const dir = KEY_DIR[e.key];
      if (dir) changeDirection(dir);
    };

    // 切出后台自动安全暂停保护 (防玩家回微信、切屏接电话导致对局意外撞死)
    const onVisibilityChange = () => {
      if (document.hidden && stateRef.current.playing && !stateRef.current.paused && !stateRef.current.over) {
        togglePause();
      }
    };

    // 激烈对局防误触退出/刷新保护 (得分达到 200 分以上且对局进行中时拦截误触关闭)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateRef.current.playing && !stateRef.current.over && stateRef.current.score >= 200) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [changeDirection, togglePause]);

  // 接入 Web 原生 Gamepad API 游戏手柄 (支持 Xbox / PS / Switch Pro / 街机摇杆即插即玩)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator.getGamepads !== 'function') return;

    let animId: number;
    let lastDir: Direction | null = null;
    let lastBtnA = false;
    let lastBtnStart = false;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      let activeGp: Gamepad | null = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          activeGp = gamepads[i];
          break;
        }
      }

      if (activeGp) {
        // 读取 D-Pad 方向键 (12: 上, 13: 下, 14: 左, 15: 右) 与左摇杆 axes
        const dUp = activeGp.buttons[12]?.pressed;
        const dDown = activeGp.buttons[13]?.pressed;
        const dLeft = activeGp.buttons[14]?.pressed;
        const dRight = activeGp.buttons[15]?.pressed;

        const stickX = activeGp.axes[0] || 0;
        const stickY = activeGp.axes[1] || 0;
        const deadZone = 0.45;

        let curDir: Direction | null = null;
        if (dUp || stickY < -deadZone) curDir = 'UP';
        else if (dDown || stickY > deadZone) curDir = 'DOWN';
        else if (dLeft || stickX < -deadZone) curDir = 'LEFT';
        else if (dRight || stickX > deadZone) curDir = 'RIGHT';

        // 边沿触发检测：方向变化或回中后推下才触发，杜绝长按塞满缓冲队列
        if (curDir && curDir !== lastDir) {
          changeDirection(curDir);
        }
        lastDir = curDir;

        // A 键 (buttons[0]) 与 Start / Menu 键 (buttons[9])
        const btnA = activeGp.buttons[0]?.pressed || false;
        const btnStart = activeGp.buttons[9]?.pressed || false;

        if (btnA && !lastBtnA) {
          if (isWaitingStartRef.current) {
            isWaitingStartRef.current = false;
            setIsWaitingStart(false);
            stateRef.current.start = Date.now();
          }
        }
        if (btnStart && !lastBtnStart) {
          togglePause();
        }
        lastBtnA = btnA;
        lastBtnStart = btnStart;
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [changeDirection, togglePause]);

  // 电竞录像毫秒级瞬态快进复盘 (Seek Replay)
  const seekReplay = useCallback(
    (targetTick: number) => {
      if (!isReplayRef.current) return;
      const boundedTarget = Math.max(0, Math.min(targetTick, replayTotalTicks));
      isSeekingRef.current = true;

      // 若回退至先前的步数，先瞬间重置回初始第 0 步
      if (boundedTarget < tickCountRef.current) {
        rngRef.current = new Mulberry32(replaySeedRef.current);
        tickCountRef.current = 0;
        inputsRef.current = [];
        pausedMsRef.current = 0;
        pauseStartRef.current = 0;
        stepsRef.current = 0;
        bonusCountRef.current = 0;
        comboCountRef.current = 0;
        totalElapsedMsRef.current = 0;
        lastEatElapsedMsRef.current = -99999;
        lastEatTimestampRef.current = 0;
        maxComboRef.current = 0;
        snakeRef.current = [
          { x: 10, y: 12 },
          { x: 9, y: 12 },
          { x: 8, y: 12 },
        ];
        fenceRef.current.clear();
        dirRef.current = 'RIGHT';
        queueRef.current = [];
        stateRef.current = { playing: true, over: false, paused: false, score: 0, start: Date.now() };
        clearBonus();
        spawnFood();
      }

      // 纳秒级在内存中快速物理迭代推进
      while (tickCountRef.current < boundedTarget && !stateRef.current.over) {
        tick();
      }

      isSeekingRef.current = false;
      setReplayCurrentTick(tickCountRef.current);
      setScore(stateRef.current.score);
      setLength(snakeRef.current.length);
      setComboCount(comboCountRef.current);
      setMaxCombo(maxComboRef.current);
      setTotalElapsedMs(totalElapsedMsRef.current);
      setLastEatElapsedMs(lastEatElapsedMsRef.current);
      if (bonusRef.current && bonusExpireTickRef.current > 0) {
        const totalTicks = Math.round(8000 / speedMs);
        const remainingTicks = Math.max(0, bonusExpireTickRef.current - tickCountRef.current);
        setBonusProgressPercent(totalTicks > 0 ? (remainingTicks / totalTicks) * 100 : 0);
        setBonusRemainSec((remainingTicks * speedMs) / 1000);
      } else {
        setBonusProgressPercent(0);
        setBonusRemainSec(0);
      }
    },
    [replayTotalTicks, clearBonus, spawnFood, tick, speedMs]
  );

  return {
    snakeRef,
    fenceRef,
    foodRef,
    bonusRef,
    hasBonus,
    bonusKey,
    bonusProgressPercent,
    bonusRemainSec,
    dirRef,
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
  };
}
