import React, { useRef, useEffect, useCallback } from 'react';
import { Point, Direction } from '@/types';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { GRID_SIZE, CELL_SIZE } from '@/hooks/useSnakeGame';

interface GameBoardProps {
  snakeRef: React.RefObject<Point[]>;
  fenceSetRef: React.RefObject<Set<string>>;
  foodRef: React.RefObject<Point>;
  dirRef: React.RefObject<Direction>;
  score: number;
  duration: number;
  snakeLength: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  onStartGame: () => void;
  onTick: () => void;
}

export default function GameBoard({
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
  onStartGame,
  onTick,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 浅色系 Canvas 渲染逻辑
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 清空背景
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 细网格线
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // 3. 绘制砖墙围栏 (🧱 深灰石板砖 + 浅色交错砖缝)
    fenceSetRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      const px = fx * CELL_SIZE;
      const py = fy * CELL_SIZE;

      ctx.fillStyle = '#475569';
      ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px + 1, py + CELL_SIZE / 2);
      ctx.lineTo(px + CELL_SIZE - 1, py + CELL_SIZE / 2);
      ctx.moveTo(px + CELL_SIZE / 2, py + 1);
      ctx.lineTo(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
      ctx.stroke();
    });

    // 4. 绘制果实 (🍎 鲜红圆点)
    const fx = foodRef.current.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = foodRef.current.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE / 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fecaca';
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // 5. 绘制蛇头与蛇身 (🟢 翡翠绿圆角独立节段)
    snakeRef.current.forEach((pt, idx) => {
      const px = pt.x * CELL_SIZE;
      const py = pt.y * CELL_SIZE;

      if (idx === 0) {
        // 蛇头
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
        ctx.fill();

        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 眼睛
        const curDir = dirRef.current;
        let eye1 = { x: px + 5, y: py + 5 };
        let eye2 = { x: px + 15, y: py + 5 };
        if (curDir === 'UP') { eye1 = { x: px + 5, y: py + 4 }; eye2 = { x: px + 15, y: py + 4 }; }
        if (curDir === 'DOWN') { eye1 = { x: px + 5, y: py + 16 }; eye2 = { x: px + 15, y: py + 16 }; }
        if (curDir === 'LEFT') { eye1 = { x: px + 4, y: py + 5 }; eye2 = { x: px + 4, y: py + 15 }; }
        if (curDir === 'RIGHT') { eye1 = { x: px + 16, y: py + 5 }; eye2 = { x: px + 16, y: py + 15 }; }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, 2.5, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, 1.2, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 蛇身
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
        ctx.fill();

        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = '#a7f3d0';
        ctx.beginPath();
        ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [snakeRef, fenceSetRef, foodRef, dirRef]);

  // 驱动渲染主定时器
  useEffect(() => {
    const timer = setInterval(() => {
      onTick();
      renderCanvas();
    }, 110);
    return () => clearInterval(timer);
  }, [onTick, renderCanvas]);

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col items-center">
      {/* 顶部指标 */}
      <div className="w-full grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg text-xs">
          <span className="text-slate-500">得分: </span>
          <strong className="text-slate-800 text-sm">{score}</strong>
        </div>
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg text-xs">
          <span className="text-slate-500">用时: </span>
          <strong className="text-slate-800 text-sm">{duration}s</strong>
        </div>
        <div className="bg-slate-50 border border-slate-100 py-2 rounded-lg text-xs">
          <span className="text-slate-500">长度: </span>
          <strong className="text-emerald-700 text-sm">{snakeLength}</strong>
        </div>
      </div>

      {/* 画布 */}
      <div className="relative border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-50">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="block"
        />

        {/* 遮罩：未开局 */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs text-slate-600 mb-4 max-w-xs leading-relaxed">
              蛇移动时留下的尾巴会砌成灰色砖墙障碍物，每次吃完果实将清空场上所有砖墙！
            </p>
            <button
              onClick={onStartGame}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              <Play size={15} /> 开始游戏
            </button>
          </div>
        )}

        {/* 遮罩：暂停 */}
        {isPaused && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center">
            <Pause size={32} className="text-slate-700 mb-1" />
            <span className="text-sm font-medium text-slate-700">已暂停 (按 P 键继续)</span>
          </div>
        )}

        {/* 遮罩：游戏结束 */}
        {isGameOver && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <span className="text-rose-600 text-xl font-bold mb-2">游戏结束</span>
            <div className="flex gap-4 text-xs text-slate-600 mb-4">
              <span>得分: <strong className="text-slate-900">{score}</strong></span>
              <span>用时: <strong className="text-slate-900">{duration}s</strong></span>
              <span>长度: <strong className="text-emerald-700">{snakeLength}</strong></span>
            </div>
            <button
              onClick={onStartGame}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <RotateCcw size={15} /> 重新开始 (空格键)
            </button>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-3 text-[11px] text-slate-500 flex flex-wrap gap-3 justify-center items-center">
        <span className="flex items-center gap-1 font-medium text-emerald-700">🟢 绿色为蛇身</span>
        <span className="flex items-center gap-1 font-medium text-slate-600">🧱 灰色为遗留砖墙(致死)</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-400">方向键转向 / 空格开局 / P暂停</span>
      </div>
    </div>
  );
}
