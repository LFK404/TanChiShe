import { useRef, useState, useCallback, useEffect } from 'react';
import { Direction, Point, InputRecord } from '@/types';
import { sound } from '@/utils/audio';
import { haptics, HapticType } from '@/utils/haptics';
import { Mulberry32 } from '@/utils/prng';

// 游戏物理网格常量 (24x24 格子，单格 20px)
export const GRID = 24;
export const CELL = 20;
export const BASE_SPEED_MS = 122; // 基础速度 (~8.2 格/秒)
export const MIN_SPEED_MS = 61; // 极速上限 (2.0x 速度，~16.4 格/秒)

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
  const [hasBonus, setHasBonus] = useState(false);
  const [bonusKey, setBonusKey] = useState(0);
  const [bonusCount, setBonusCount] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastEatTimestamp, setLastEatTimestamp] = useState(0);
  const [isWaitingStart, setIsWaitingStart] = useState(false);
  const isWaitingStartRef = useRef(false);
  const durationRef = useRef<number>(0);
  const stepsRef = useRef<number>(0);
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
  const isReplayRef = useRef<boolean>(false);
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

        // 8秒金果物理步数到期点 (与 Go engine 对齐: 8000 / speedMs)
        bonusExpireTickRef.current = tickCountRef.current + Math.round(8000 / speedMs);
      }
    }
  }, [speedMs]);

  // 游戏结束结算 (自动剔除中途暂停时长)
  const gameOver = useCallback(() => {
    stateRef.current.over = true;
    stateRef.current.playing = false;
    setIsGameOver(true);
    setIsPlaying(false);
    clearBonus();
    sound.stopBgm();
    sound.playGameOver();
    vibrate('gameover');
    // 局后平滑切回温馨大厅 BGM
    setTimeout(() => {
      sound.startMenuBgm();
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
      setLength(3);
      setBonusCount(0);
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
      setLength(3);
      setBonusCount(0);
      setSpeedMs(BASE_SPEED_MS);
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
    }

    const q = queueRef.current;
    const last = q.length > 0 ? q[q.length - 1] : dirRef.current;
    if (t !== last && !isOpp(last, t) && q.length < 2) {
      q.push(t);
      inputsRef.current.push({ tick: tickCountRef.current, dir: t });
      sound.playMove();
      vibrate('move');
    }
  }, [vibrate]);

  // 暂停/继续游戏 (精准记录暂停时长并自动抵扣)
  const togglePause = useCallback(() => {
    if (stateRef.current.playing && !stateRef.current.over) {
      const nextPaused = !stateRef.current.paused;
      stateRef.current.paused = nextPaused;
      setIsPaused(nextPaused);
      if (nextPaused) {
        pauseStartRef.current = Date.now();
        sound.pauseBgm();
      } else {
        if (pauseStartRef.current > 0) {
          pausedMsRef.current += Date.now() - pauseStartRef.current;
          pauseStartRef.current = 0;
        }
        sound.resumeBgm();
      }
      sound.playToggle();
      vibrate('ui');
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
    totalElapsedMsRef.current += speedMs;

    // 连击结算辅助函数 (确保物理确定性时钟与 Go 后端完全一致)
    const applyComboEat = (baseScore: number) => {
      const elapsed = totalElapsedMsRef.current;
      const isCombo = lastEatElapsedMsRef.current >= 0 && elapsed - lastEatElapsedMsRef.current <= 3000;
      const currentCombo = isCombo ? comboCountRef.current + 1 : 1;
      comboCountRef.current = currentCombo;
      lastEatElapsedMsRef.current = elapsed;
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
      gameOver();
      return;
    }

    // 4. 自身身体碰撞
    const isEatingApple = head.x === foodRef.current.x && head.y === foodRef.current.y;
    const bodyToCheck = isEatingApple ? snakeRef.current : snakeRef.current.slice(0, -1);
    if (bodyToCheck.some((p) => p.x === head.x && p.y === head.y)) {
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
      sound.playEat();
      sound.playCombo(currentCombo);
      vibrate('eat', currentCombo);
      fenceRef.current.clear();
      const nextSpeed = Math.max(
        MIN_SPEED_MS,
        BASE_SPEED_MS - Math.floor(stateRef.current.score / 40) * 4
      );
      setSpeedMs(nextSpeed);
      sound.updateGameSpeed(nextSpeed);
      snakeRef.current = nextSnake;
      spawnFood();
      return;
    }

    // 6. 残留栅栏碰撞检测
    if (fenceRef.current.has(toKey(head.x, head.y))) {
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
      sound.playBonus();
      sound.playCombo(currentCombo);
      vibrate('bonus', currentCombo);
      clearBonus();
    }

    // 8. 金色幸运果 8 秒物理步数倒计时与临期警报 (严格与 Go 后端物理重放引擎对齐，杜绝暂停/变速回放时钟漂移)
    if (bonusRef.current && bonusExpireTickRef.current > 0) {
      if (tickCountRef.current >= bonusExpireTickRef.current) {
        bonusRef.current = null;
        bonusExpireTickRef.current = 0;
        setHasBonus(false);
      } else {
        const remainingTicks = bonusExpireTickRef.current - tickCountRef.current;
        const remainingMs = remainingTicks * speedMs;
        const prevRemainingMs = (remainingTicks + 1) * speedMs;
        if (remainingMs <= 3000 && remainingMs > 0) {
          if (Math.floor(prevRemainingMs / 1000) > Math.floor(remainingMs / 1000)) {
            sound.playCountdownTick();
            vibrate('countdown');
          }
        }
      }
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
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
        e.preventDefault();
      if (e.key === 'p' || e.key === 'P') return togglePause();
      if (e.key === ' ') {
        // 等待起跑状态下按空格立即唤醒出发
        if (isWaitingStartRef.current) {
          isWaitingStartRef.current = false;
          setIsWaitingStart(false);
          stateRef.current.start = Date.now();
          sound.playMove();
          return;
        }
        if (!stateRef.current.playing || stateRef.current.over) return;
        return togglePause();
      }
      const dir = KEY_DIR[e.key];
      if (dir) changeDirection(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeDirection, togglePause]);

  return {
    snakeRef,
    fenceRef,
    foodRef,
    bonusRef,
    hasBonus,
    bonusKey,
    dirRef,
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
    isReplay,
    replayUser,
    replaySpeedRate,
    setReplaySpeedRate,
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
