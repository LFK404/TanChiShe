import React, { useRef, useEffect, useCallback } from 'react';
import { Point, Direction } from '@/types';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { GRID, CELL } from '@/hooks/useSnakeGame';

interface Props {
  snakeRef: React.RefObject<Point[]>;
  fenceRef: React.RefObject<Set<string>>;
  foodRef: React.RefObject<Point>;
  dirRef: React.RefObject<Direction>;
  score: number;
  duration: number;
  length: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  onStart: () => void;
  onTick: () => void;
}

export default function GameBoard({
  snakeRef,
  fenceRef,
  foodRef,
  dirRef,
  score,
  duration,
  length,
  isPlaying,
  isGameOver,
  isPaused,
  onStart,
  onTick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // 3. 苹果果实
    const fx = foodRef.current.x * CELL + CELL / 2;
    const fy = foodRef.current.y * CELL + CELL / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(fx, fy, CELL / 2.6, 0, Math.PI * 2); ctx.fill();

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
  }, [snakeRef, fenceRef, foodRef, dirRef]);

  useEffect(() => {
    render();
    if (!isPlaying || isPaused || isGameOver) return;
    const timer = setInterval(() => {
      onTick();
      render();
    }, 110);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, isGameOver, onTick, render]);

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col items-center">
      {/* 极简数据栏 */}
      <div className="w-full grid grid-cols-3 gap-3 mb-4 text-center text-xs">
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg">
          <span className="text-slate-500">得分 </span><strong className="text-slate-800 text-sm">{score}</strong>
        </div>
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg">
          <span className="text-slate-500">用时 </span><strong className="text-slate-800 text-sm">{duration}s</strong>
        </div>
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg">
          <span className="text-slate-500">长度 </span><strong className="text-emerald-700 text-sm">{length}</strong>
        </div>
      </div>

      {/* 画布与极简遮罩 */}
      <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="block" />

        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer shadow-sm"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw size={15} /> 重新开始 (空格)
            </button>
          </div>
        )}
      </div>

      {/* 极简快捷键提示 */}
      <div className="mt-3 text-[11px] text-slate-400">
        方向键移动 · 空格开始 · P 暂停
      </div>
    </div>
  );
}
