import { useRef, useState, useCallback, useEffect } from 'react';
import { Direction, Point } from '@/types';

export const GRID_SIZE = 24;
export const CELL_SIZE = 20;

const toKey = (x: number, y: number) => `${x},${y}`;

const isOpposite = (d1: Direction, d2: Direction) =>
  (d1 === 'UP' && d2 === 'DOWN') ||
  (d1 === 'DOWN' && d2 === 'UP') ||
  (d1 === 'LEFT' && d2 === 'RIGHT') ||
  (d1 === 'RIGHT' && d2 === 'LEFT');

export function useSnakeGame(onGameOverCallback?: (finalScore: number, finalDuration: number) => void) {
  // 1. 核心状态 Ref (保持主循环定时器最新)
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
  ]);
  const fenceSetRef = useRef<Set<string>>(new Set());
  const foodRef = useRef<Point>({ x: 16, y: 12 });
  const dirRef = useRef<Direction>('RIGHT');
  const dirQueueRef = useRef<Direction[]>([]);
  const isPlayingRef = useRef(false);
  const isGameOverRef = useRef(false);
  const isPausedRef = useRef(false);
  const scoreRef = useRef(0);
  const startTimeRef = useRef(0);

  // 2. UI 渲染状态
  const [score, setScore] = useState(0);
  const [duration, setDuration] = useState(0);
  const [snakeLength, setSnakeLength] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 随机刷新果实
  const spawnFood = useCallback(() => {
    const emptyCells: Point[] = [];
    const snakeKeys = new Set(snakeRef.current.map((p) => toKey(p.x, p.y)));

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const k = toKey(c, r);
        if (!snakeKeys.has(k) && !fenceSetRef.current.has(k)) {
          emptyCells.push({ x: c, y: r });
        }
      }
    }

    if (emptyCells.length > 0) {
      const idx = Math.floor(Math.random() * emptyCells.length);
      foodRef.current = emptyCells[idx];
    }
  }, []);

  // 游戏结束
  const gameOver = useCallback(() => {
    isGameOverRef.current = true;
    isPlayingRef.current = false;
    setIsGameOver(true);
    setIsPlaying(false);

    const now = Date.now();
    const finalDur = Math.floor((now - startTimeRef.current) / 1000);
    onGameOverCallback?.(scoreRef.current, finalDur);
  }, [onGameOverCallback]);

  // 开始/重新开始游戏
  const startGame = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
    ];
    fenceSetRef.current.clear();
    dirRef.current = 'RIGHT';
    dirQueueRef.current = [];
    scoreRef.current = 0;
    startTimeRef.current = Date.now();

    isGameOverRef.current = false;
    isPausedRef.current = false;
    isPlayingRef.current = true;

    setScore(0);
    setDuration(0);
    setSnakeLength(3);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);

    spawnFood();
  }, [spawnFood]);

  // 帧更新逻辑
  const updateTick = useCallback(() => {
    if (!isPlayingRef.current || isGameOverRef.current || isPausedRef.current) return;

    // 1. 更新秒表
    const now = Date.now();
    setDuration(Math.floor((now - startTimeRef.current) / 1000));

    // 2. 消费转向队列
    if (dirQueueRef.current.length > 0) {
      dirRef.current = dirQueueRef.current.shift()!;
    }
    const head = snakeRef.current[0];
    const nextHead: Point = { ...head };

    switch (dirRef.current) {
      case 'UP': nextHead.y--; break;
      case 'DOWN': nextHead.y++; break;
      case 'LEFT': nextHead.x--; break;
      case 'RIGHT': nextHead.x++; break;
    }

    // 3. 边界碰撞检测
    if (nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // 4. 围栏与自身碰撞检测
    const nextKey = toKey(nextHead.x, nextHead.y);
    if (fenceSetRef.current.has(nextKey)) {
      gameOver();
      return;
    }
    for (let i = 0; i < snakeRef.current.length; i++) {
      if (snakeRef.current[i].x === nextHead.x && snakeRef.current[i].y === nextHead.y) {
        gameOver();
        return;
      }
    }

    // 5. 推进：吃到果实身体变长并清空场上围栏；未吃到果实尾巴留下砌成围栏
    const newSnake = [nextHead, ...snakeRef.current];
    const ate = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;

    if (ate) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setSnakeLength(newSnake.length);
      fenceSetRef.current.clear(); // 吃到果实清空重置场上围栏
      spawnFood();
    } else {
      const tail = newSnake.pop()!;
      fenceSetRef.current.add(toKey(tail.x, tail.y));
    }

    snakeRef.current = newSnake;
  }, [gameOver, spawnFood]);

  // 键盘操作响应 (90度转向锁与按键缓冲)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        if (isPlayingRef.current && !isGameOverRef.current) {
          isPausedRef.current = !isPausedRef.current;
          setIsPaused(isPausedRef.current);
        }
        return;
      }

      if (e.key === ' ' && (!isPlayingRef.current || isGameOverRef.current)) {
        startGame();
        return;
      }

      let target: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') target = 'UP';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') target = 'DOWN';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') target = 'LEFT';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') target = 'RIGHT';

      if (target) {
        const queue = dirQueueRef.current;
        const last = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;
        if (target !== last && !isOpposite(last, target) && queue.length < 2) {
          queue.push(target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame]);

  return {
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
  };
}
