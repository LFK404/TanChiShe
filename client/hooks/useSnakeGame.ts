import { useRef, useState, useCallback, useEffect } from 'react';
import { Direction, Point } from '@/types';

export const GRID = 24;
export const CELL = 20;

const toKey = (x: number, y: number) => `${x},${y}`;
const isOpp = (d1: Direction, d2: Direction) =>
  (d1 === 'UP' && d2 === 'DOWN') ||
  (d1 === 'DOWN' && d2 === 'UP') ||
  (d1 === 'LEFT' && d2 === 'RIGHT') ||
  (d1 === 'RIGHT' && d2 === 'LEFT');

export function useSnakeGame(onGameOver?: (score: number, duration: number) => void) {
  const snakeRef = useRef<Point[]>([{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }]);
  const fenceRef = useRef<Set<string>>(new Set());
  const foodRef = useRef<Point>({ x: 16, y: 12 });
  const dirRef = useRef<Direction>('RIGHT');
  const queueRef = useRef<Direction[]>([]);
  const stateRef = useRef({ playing: false, over: false, paused: false, score: 0, start: 0 });

  const [score, setScore] = useState(0);
  const [duration, setDuration] = useState(0);
  const [length, setLength] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const spawnFood = useCallback(() => {
    const empty: Point[] = [];
    const snakeKeys = new Set(snakeRef.current.map((p) => toKey(p.x, p.y)));
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const k = toKey(c, r);
        if (!snakeKeys.has(k) && !fenceRef.current.has(k)) empty.push({ x: c, y: r });
      }
    }
    if (empty.length > 0) foodRef.current = empty[Math.floor(Math.random() * empty.length)];
  }, []);

  const gameOver = useCallback(() => {
    stateRef.current.over = true;
    stateRef.current.playing = false;
    setIsGameOver(true);
    setIsPlaying(false);
    const dur = Math.floor((Date.now() - stateRef.current.start) / 1000);
    onGameOver?.(stateRef.current.score, dur);
  }, [onGameOver]);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }];
    fenceRef.current.clear();
    dirRef.current = 'RIGHT';
    queueRef.current = [];
    stateRef.current = { playing: true, over: false, paused: false, score: 0, start: Date.now() };

    setScore(0);
    setDuration(0);
    setLength(3);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    spawnFood();
  }, [spawnFood]);

  const changeDirection = useCallback((t: Direction) => {
    if (!stateRef.current.playing || stateRef.current.over || stateRef.current.paused) return;
    const q = queueRef.current;
    const last = q.length > 0 ? q[q.length - 1] : dirRef.current;
    if (t !== last && !isOpp(last, t) && q.length < 2) {
      q.push(t);
    }
  }, []);

  const togglePause = useCallback(() => {
    if (stateRef.current.playing && !stateRef.current.over) {
      stateRef.current.paused = !stateRef.current.paused;
      setIsPaused(stateRef.current.paused);
    }
  }, []);

  const tick = useCallback(() => {
    const { playing, over, paused, start } = stateRef.current;
    if (!playing || over || paused) return;

    setDuration(Math.floor((Date.now() - start) / 1000));
    if (queueRef.current.length > 0) dirRef.current = queueRef.current.shift()!;

    const head = { ...snakeRef.current[0] };
    if (dirRef.current === 'UP') head.y--;
    if (dirRef.current === 'DOWN') head.y++;
    if (dirRef.current === 'LEFT') head.x--;
    if (dirRef.current === 'RIGHT') head.x++;

    // 碰撞边界、围栏或自身
    if (
      head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
      fenceRef.current.has(toKey(head.x, head.y)) ||
      snakeRef.current.some((p) => p.x === head.x && p.y === head.y)
    ) {
      gameOver();
      return;
    }

    const nextSnake = [head, ...snakeRef.current];
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      stateRef.current.score += 10;
      setScore(stateRef.current.score);
      setLength(nextSnake.length);
      fenceRef.current.clear();
      spawnFood();
    } else {
      const tail = nextSnake.pop()!;
      fenceRef.current.add(toKey(tail.x, tail.y));
    }
    snakeRef.current = nextSnake;
  }, [gameOver, spawnFood]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }
      if (e.key === ' ' && (!stateRef.current.playing || stateRef.current.over)) {
        startGame();
        return;
      }
      let t: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') t = 'UP';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') t = 'DOWN';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') t = 'LEFT';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') t = 'RIGHT';
      if (t) changeDirection(t);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame, changeDirection, togglePause]);

  return { snakeRef, fenceRef, foodRef, dirRef, score, duration, length, isPlaying, isGameOver, isPaused, startGame, togglePause, changeDirection, tick };
}
