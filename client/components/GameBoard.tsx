import React, { useRef, useEffect, useCallback } from 'react';
import { Point, Direction } from '@/types';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { GRID, CELL } from '@/hooks/useSnakeGame';

interface Props {
  snakeRef: React.RefObject<Point[]>;
  fenceRef: React.RefObject<Set<string>>;
  foodRef: React.RefObject<Point>;
  bonusRef?: React.RefObject<Point | null>;
  hasBonus?: boolean;
  dirRef: React.RefObject<Direction>;
  score: number;
  duration: number;
  length: number;
  speedMs?: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  onStart: () => void;
  onTick: () => void;
  onDirection: (dir: Direction) => void;
}

export default function GameBoard({
  snakeRef,
  fenceRef,
  foodRef,
  bonusRef,
  hasBonus,
  dirRef,
  score,
  duration,
  length,
  speedMs = 110,
  isPlaying,
  isGameOver,
  isPaused,
  onStart,
  onTick,
  onDirection,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        onDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        onDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartRef.current = null;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 底色与浅网格
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
    }

    // 2. 砖墙障碍物
    fenceRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      const px = fx * CELL, py = fy * CELL;
      ctx.fillStyle = '#475569';
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px + 1, py + CELL / 2); ctx.lineTo(px + CELL - 1, py + CELL / 2);
      ctx.moveTo(px + CELL / 2, py + 1); ctx.lineTo(px + CELL / 2, py + CELL / 2);
      ctx.stroke();
    });

    // 3. 普通苹果果实
    const fx = foodRef.current.x * CELL + CELL / 2;
    const fy = foodRef.current.y * CELL + CELL / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(fx, fy, CELL / 2.6, 0, Math.PI * 2); ctx.fill();

    // 3.5 金色幸运果实 (限时奖励 +30分)
    if (bonusRef?.current) {
      const bx = bonusRef.current.x * CELL + CELL / 2;
      const by = bonusRef.current.y * CELL + CELL / 2;
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(bx, by, CELL / 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(bx, by, CELL / 4, 0, Math.PI * 2); ctx.fill();
    }

    // 4. 蛇身与蛇头
    snakeRef.current.forEach((pt, idx) => {
      const px = pt.x * CELL, py = pt.y * CELL;
      if (idx === 0) {
        ctx.fillStyle = '#047857';
        ctx.beginPath(); ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 4); ctx.fill();
        const d = dirRef.current;
        let e1 = { x: px + 5, y: py + 5 }, e2 = { x: px + 15, y: py + 5 };
        if (d === 'UP') { e1 = { x: px + 5, y: py + 4 }; e2 = { x: px + 15, y: py + 4 }; }
        if (d === 'DOWN') { e1 = { x: px + 5, y: py + 16 }; e2 = { x: px + 15, y: py + 16 }; }
        if (d === 'LEFT') { e1 = { x: px + 4, y: py + 5 }; e2 = { x: px + 4, y: py + 15 }; }
        if (d === 'RIGHT') { e1 = { x: px + 16, y: py + 5 }; e2 = { x: px + 16, y: py + 15 }; }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(e1.x, e1.y, 2, 0, Math.PI * 2); ctx.arc(e2.x, e2.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(e1.x, e1.y, 1, 0, Math.PI * 2); ctx.arc(e2.x, e2.y, 1, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.roundRect(px + 2, py + 2, CELL - 4, CELL - 4, 3); ctx.fill();
      }
    });
  }, [snakeRef, fenceRef, foodRef, bonusRef, dirRef]);

  useEffect(() => {
    render();
    if (!isPlaying || isPaused || isGameOver) return;
    const timer = setInterval(() => {
      onTick();
      render();
    }, speedMs);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, isGameOver, speedMs, onTick, render]);

  return (
    <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col items-center select-none">
      {/* 极简数据栏 */}
      <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 mb-3 sm:mb-4 text-center text-xs">
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg relative overflow-hidden">
          <span className="text-slate-500">得分 </span><strong className="text-slate-800 text-sm">{score}</strong>
          {hasBonus && (
            <span className="absolute top-1 right-1 flex items-center text-amber-500 font-bold text-[10px] animate-pulse">
              <Sparkles size={11} /> +30
            </span>
          )}
        </div>
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg">
          <span className="text-slate-500">用时 </span><strong className="text-slate-800 text-sm">{duration}s</strong>
        </div>
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg">
          <span className="text-slate-500">长度 </span><strong className="text-emerald-700 text-sm">{length}</strong>
        </div>
      </div>

      {/* 画布与极简遮罩（支持滑屏手势） */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-50 touch-none max-w-full"
      >
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="block max-w-full h-auto aspect-square" />

        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Play size={16} /> 开始游戏 (空格)
            </button>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center text-slate-700">
            <Pause size={28} className="mb-1" />
            <span className="text-xs font-medium">已暂停 (P 键继续)</span>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-center p-6">
            <span className="text-rose-600 text-lg font-bold mb-2">游戏结束</span>
            <div className="flex gap-4 text-xs text-slate-600 mb-4">
              <span>得分: <strong className="text-slate-900">{score}</strong></span>
              <span>用时: <strong className="text-slate-900">{duration}s</strong></span>
              <span>长度: <strong className="text-emerald-700">{length}</strong></span>
            </div>
            <button
              onClick={onStart}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw size={15} /> 重新开始 (空格)
            </button>
          </div>
        )}
      </div>

      {/* 移动端极简微型触控十字键 */}
      <div className="mt-4 flex flex-col items-center gap-1 sm:hidden">
        <button
          onClick={() => onDirection('UP')}
          className="w-12 h-10 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 shadow-sm"
        >
          <ChevronUp size={20} />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => onDirection('LEFT')}
            className="w-12 h-10 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => onDirection('DOWN')}
            className="w-12 h-10 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 shadow-sm"
          >
            <ChevronDown size={20} />
          </button>
          <button
            onClick={() => onDirection('RIGHT')}
            className="w-12 h-10 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <span className="text-[10px] text-slate-400 mt-1">支持滑动屏幕或触控键转向</span>
      </div>

      {/* 电脑端极简快捷键提示 */}
      <div className="mt-3 text-[11px] text-slate-400 hidden sm:block">
        方向键/WASD 移动 · 空格开始 · P 暂停
      </div>
    </div>
  );
}
