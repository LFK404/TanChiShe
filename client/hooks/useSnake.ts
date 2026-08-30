import { useRef, useState, useCallback, useEffect } from 'react';
import { Direction, Point } from '@/types';
import { sound } from '@/utils/audio';

export const GRID = 24;
export const CELL = 20;
export const BASE_SPEED_MS = 122;
export const MIN_SPEED_MS = 61;

const toKey = (x: number, y: number) => `${x},${y}`;
const isOpp = (d1: Direction, d2: Direction) =>
  (d1 === 'UP' && d2 === 'DOWN') || (d1 === 'DOWN' && d2 === 'UP') ||
  (d1 === 'LEFT' && d2 === 'RIGHT') || (d1 === 'RIGHT' && d2 === 'LEFT');

const KEY_DIR: Record<string, Direction> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
};

const DIR_DELTAS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
};

export function useSnake(onGameOver?: (score: number, duration: number) => void) {
  const snakeRef = useRef<Point[]>([{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }]);
  const fenceRef = useRef<Set<string>>(new Set());
  const foodRef = useRef<Point>({ x: 16, y: 12 });
  const bonusRef = useRef<Point | null>(null);
  const bonusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dirRef = useRef<Direction>('RIGHT');
  const queueRef = useRef<Direction[]>([]);
  const stateRef = useRef({ playing: false, over: false, paused: false, score: 0, start: 0 });

  const [score, setScore] = useState(0);
  const [duration, setDuration] = useState(0);
  const [length, setLength] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMs, setSpeedMs] = useState(BASE_SPEED_MS);
  const [hasBonus, setHasBonus] = useState(false);
  const [bonusKey, setBonusKey] = useState(0);

  const clearBonus = useCallback(() => {
    bonusRef.current = null;
    setHasBonus(false);
    if (bonusTimerRef.current) {
      clearTimeout(bonusTimerRef.current);
      bonusTimerRef.current = null;
    }
  }, []);

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

    const newFood = empty[Math.floor(Math.random() * empty.length)];
    foodRef.current = newFood;

    if (Math.random() < 0.25 && !bonusRef.current && empty.length > 3) {
      const remainingEmpty = empty.filter((p) => p.x !== newFood.x || p.y !== newFood.y);
      if (remainingEmpty.length > 0) {
        bonusRef.current = remainingEmpty[Math.floor(Math.random() * remainingEmpty.length)];
        setBonusKey((prev) => prev + 1);
        setHasBonus(true);
        if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current);
        bonusTimerRef.current = setTimeout(() => {
          bonusRef.current = null;
          setHasBonus(false);
        }, 8000);
      }
    }
  }, []);

  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch {}
    }
  };

  const gameOver = useCallback(() => {
    stateRef.current.over = true;
    stateRef.current.playing = false;
    setIsGameOver(true);
    setIsPlaying(false);
    clearBonus();
    sound.stopBgm();
    sound.playGameOver();
    vibrate(40);
    const dur = Math.floor((Date.now() - stateRef.current.start) / 1000);
    onGameOver?.(stateRef.current.score, dur);
  }, [onGameOver, clearBonus]);

  const startGame = useCallback(() => {
    sound.unlockAudio();
    snakeRef.current = [{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }];
    fenceRef.current.clear();
    dirRef.current = 'RIGHT';
    queueRef.current = [];
    stateRef.current = { playing: true, over: false, paused: false, score: 0, start: Date.now() };

    setScore(0);
    setDuration(0);
    setLength(3);
    setSpeedMs(BASE_SPEED_MS);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    clearBonus();
    sound.playStart();
    sound.startBgm();
    vibrate(10);
    spawnFood();
  }, [spawnFood, clearBonus]);

  const changeDirection = useCallback((t: Direction) => {
    if (!stateRef.current.playing || stateRef.current.over || stateRef.current.paused) return;
    const q = queueRef.current;
    const last = q.length > 0 ? q[q.length - 1] : dirRef.current;
    if (t !== last && !isOpp(last, t) && q.length < 2) q.push(t);
  }, []);

  const togglePause = useCallback(() => {
    if (stateRef.current.playing && !stateRef.current.over) {
      const nextPaused = !stateRef.current.paused;
      stateRef.current.paused = nextPaused;
      setIsPaused(nextPaused);
      if (nextPaused) sound.pauseBgm(); else sound.resumeBgm();
      sound.playToggle();
      vibrate(10);
    }
  }, []);

  const tick = useCallback(() => {
    const { playing, over, paused, start } = stateRef.current;
    if (!playing || over || paused) return;

    setDuration(Math.floor((Date.now() - start) / 1000));
    
    if (queueRef.current.length > 0) {
      const nextDir = queueRef.current.shift()!;
      if (!isOpp(dirRef.current, nextDir)) dirRef.current = nextDir;
    }

    const delta = DIR_DELTAS[dirRef.current];
    const head = { x: snakeRef.current[0].x + delta.x, y: snakeRef.current[0].y + delta.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      gameOver(); return;
    }

    const isEatingApple = head.x === foodRef.current.x && head.y === foodRef.current.y;
    const bodyToCheck = isEatingApple ? snakeRef.current : snakeRef.current.slice(0, -1);
    if (bodyToCheck.some((p) => p.x === head.x && p.y === head.y)) {
      gameOver(); return;
    }

    if (isEatingApple) {
      const nextSnake = [head, ...snakeRef.current];
      stateRef.current.score += 10;
      setScore(stateRef.current.score);
      setLength(nextSnake.length);
      sound.playEat();
      vibrate(12);
      fenceRef.current.clear();
      setSpeedMs(Math.max(MIN_SPEED_MS, BASE_SPEED_MS - Math.floor(stateRef.current.score / 40) * 4));
      snakeRef.current = nextSnake;
      spawnFood();
      return;
    }

    if (fenceRef.current.has(toKey(head.x, head.y))) {
      gameOver(); return;
    }

    if (bonusRef.current && head.x === bonusRef.current.x && head.y === bonusRef.current.y) {
      stateRef.current.score += 30;
      setScore(stateRef.current.score);
      sound.playBonus();
      vibrate([15, 30, 15]);
      clearBonus();
    }

    const nextSnake = [head, ...snakeRef.current];
    const tail = nextSnake.pop()!;
    fenceRef.current.add(toKey(tail.x, tail.y));
    snakeRef.current = nextSnake;
  }, [gameOver, spawnFood, clearBonus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (e.key === 'p' || e.key === 'P') return togglePause();
      if (e.key === ' ' && (!stateRef.current.playing || stateRef.current.over)) return startGame();
      const dir = KEY_DIR[e.key];
      if (dir) changeDirection(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame, changeDirection, togglePause]);

  useEffect(() => {
    return () => {
      if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current);
    };
  }, []);

  return { snakeRef, fenceRef, foodRef, bonusRef, hasBonus, bonusKey, dirRef, score, duration, length, speedMs, isPlaying, isGameOver, isPaused, startGame, togglePause, changeDirection, tick };
}
