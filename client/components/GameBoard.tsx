import React, { useRef, useEffect, useCallback } from 'react';
import { Direction, Point } from '@/types';
import { CELL, GRID } from '@/hooks/useSnakeGame';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  snakeRef: React.MutableRefObject<Point[]>;
  fenceRef: React.MutableRefObject<Set<string>>;
  foodRef: React.MutableRefObject<Point>;
  bonusRef: React.MutableRefObject<Point | null>;
  hasBonus: boolean;
  dirRef: React.MutableRefObject<Direction>;
  score: number;
  duration: number;
  length: number;
  speedMs: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  onStart: () => void;
  onTick: () => void;
  onDirection: (d: Direction) => void;
  onTogglePause?: () => void;
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
  speedMs,
  isPlaying,
  isGameOver,
  isPaused,
  onStart,
  onTick,
  onDirection,
  onTogglePause,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 手势滑动检测
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      onDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      onDirection(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  // 渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 纯白底板
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

    // 浅灰极简隐形网格点
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, GRID * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(GRID * CELL, i * CELL);
      ctx.stroke();
    }

    // 2. 残留栅栏 (极简浅灰方块)
    ctx.fillStyle = '#E2E8F0';
    fenceRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      ctx.beginPath();
      ctx.roundRect(fx * CELL + 2.5, fy * CELL + 2.5, CELL - 5, CELL - 5, 2.5);
      ctx.fill();
    });

    // 3. 食物渲染
    // 3.1 鲜红小苹果
    const fx = foodRef.current.x * CELL + CELL / 2;
    const fy = foodRef.current.y * CELL + CELL / 2;
    // 苹果主体
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2.6, 0, Math.PI * 2);
    ctx.fill();
    // 苹果高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // 苹果小叶子
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(fx + 2.5, fy - 5.5, 2.2, 1.2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 3.2 限时金色幸运果 (+30分)
    if (bonusRef.current) {
      const bx = bonusRef.current.x * CELL + CELL / 2;
      const by = bonusRef.current.y * CELL + CELL / 2;
      // 呼吸光晕
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(bx, by, CELL / 1.8, 0, Math.PI * 2);
      ctx.fill();
      // 金色主体
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(bx, by, CELL / 2.4, 0, Math.PI * 2);
      ctx.fill();
      // 内部亮心
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(bx, by, CELL / 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. 天青蓝 (#66CCFF) 蛇身与蛇头
    const snakeLen = snakeRef.current.length;
    snakeRef.current.forEach((pt, idx) => {
      const px = pt.x * CELL, py = pt.y * CELL;

      if (idx === 0) {
        // --- 蛇头 (天青蓝主色 #66CCFF) ---
        ctx.fillStyle = '#66CCFF';
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 5);
        ctx.fill();

        // 灵动微眼神 (方向自适应)
        const d = dirRef.current;
        let e1 = { x: px + 5, y: py + 5 }, e2 = { x: px + 15, y: py + 5 };
        if (d === 'UP') { e1 = { x: px + 5, y: py + 4 }; e2 = { x: px + 15, y: py + 4 }; }
        if (d === 'DOWN') { e1 = { x: px + 5, y: py + 16 }; e2 = { x: px + 15, y: py + 16 }; }
        if (d === 'LEFT') { e1 = { x: px + 4, y: py + 5 }; e2 = { x: px + 4, y: py + 15 }; }
        if (d === 'RIGHT') { e1 = { x: px + 16, y: py + 5 }; e2 = { x: px + 16, y: py + 15 }; }

        // 眼白
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(e1.x, e1.y, 2.2, 0, Math.PI * 2);
        ctx.arc(e2.x, e2.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // 眼珠
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(e1.x, e1.y, 1.1, 0, Math.PI * 2);
        ctx.arc(e2.x, e2.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // --- 蛇身 (平滑渐变浅天蓝) ---
        const ratio = idx / snakeLen;
        ctx.fillStyle = ratio < 0.5 ? '#38BDF8' : '#7DD3FC';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, CELL - 4, CELL - 4, 4);
        ctx.fill();
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

  // 计算速度梯度倍率
  const speedRatio = (110 / speedMs).toFixed(1);

  return (
    <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-3xl flex flex-col items-center select-none">
      {/* 顶部四段式复合状态胶囊栏 (得分、长度、用时、速度) */}
      <div className="w-full grid grid-cols-4 gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-center text-xs">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] py-2 px-1 rounded-2xl relative overflow-hidden">
          <span className="text-[#94A3B8] text-[11px]">得分 </span>
          <strong className="text-[#0F172A] text-sm font-mono font-black">{score}</strong>
          {hasBonus && (
            <span className="absolute top-0.5 right-1 flex items-center text-[#D97706] font-extrabold text-[9px] animate-pulse">
              <Sparkles size={9} /> +30
            </span>
          )}
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] py-2 px-1 rounded-2xl">
          <span className="text-[#94A3B8] text-[11px]">长度 </span>
          <strong className="text-[#0099FF] text-sm font-mono font-black">{length}</strong>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] py-2 px-1 rounded-2xl">
          <span className="text-[#94A3B8] text-[11px]">用时 </span>
          <strong className="text-[#0F172A] text-sm font-mono font-bold">{duration}s</strong>
        </div>

        <div className="bg-[#EBF8FF] border border-[#66CCFF]/30 py-2 px-1 rounded-2xl">
          <span className="text-[#0099FF] text-[11px] font-medium">速度 </span>
          <strong className="text-[#0099FF] text-sm font-mono font-black">{speedRatio}x</strong>
        </div>
      </div>

      {/* 画布与悬浮交互层 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white touch-none max-w-full"
      >
        {/* 限时金色幸运果顶置流光进度条 */}
        {hasBonus && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#66CCFF] animate-pulse z-10" />
        )}

        {/* 游戏中途暂停悬浮快捷键 (右上角) */}
        {isPlaying && !isGameOver && (
          <button
            onClick={onTogglePause}
            title={isPaused ? '继续游戏' : '暂停游戏'}
            className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-xl bg-white/90 hover:bg-white border border-[#E2E8F0] flex items-center justify-center text-[#334155] hover:text-[#0099FF] active:scale-95 transition-all cursor-pointer"
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        )}

        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="block max-w-full h-auto aspect-square" />

        {/* 开始游戏遮罩 */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex items-center justify-center">
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <Play size={16} /> 开始游戏 (空格)
            </button>
          </div>
        )}

        {/* 暂停遮罩 */}
        {isPaused && (
          <div
            onClick={onTogglePause}
            className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-[#0F172A] cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center mb-2">
              <Pause size={24} />
            </div>
            <span className="text-sm font-bold">游戏已暂停</span>
            <span className="text-xs text-[#94A3B8] mt-1">点击任意位置或按空格/P继续</span>
          </div>
        )}

        {/* 游戏结束结算面板 (仿 Bottom Sheet) */}
        {isGameOver && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-[3px] flex flex-col items-center justify-center text-center p-6">
            <span className="text-rose-500 text-lg font-black mb-2">游戏结束</span>
            <div className="flex gap-4 text-xs text-[#334155] mb-4 bg-[#F8FAFC] px-4 py-2 rounded-2xl border border-[#E2E8F0]">
              <span>得分: <strong className="text-[#0F172A] font-mono font-black text-sm">{score}</strong></span>
              <span>长度: <strong className="text-[#0099FF] font-mono font-bold">{length}</strong></span>
              <span>用时: <strong className="text-[#0F172A] font-mono font-bold">{duration}s</strong></span>
            </div>
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={15} /> 再来一局 (空格)
            </button>
          </div>
        )}
      </div>

      {/* 移动端极简半透明虚拟十字键 */}
      <div className="mt-4 flex flex-col items-center gap-1 sm:hidden">
        <button
          onClick={() => onDirection('UP')}
          className="w-12 h-10 bg-[#F8FAFC] active:bg-[#EBF8FF] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all"
        >
          <ChevronUp size={20} />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => onDirection('LEFT')}
            className="w-12 h-10 bg-[#F8FAFC] active:bg-[#EBF8FF] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => onDirection('DOWN')}
            className="w-12 h-10 bg-[#F8FAFC] active:bg-[#EBF8FF] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all"
          >
            <ChevronDown size={20} />
          </button>
          <button
            onClick={() => onDirection('RIGHT')}
            className="w-12 h-10 bg-[#F8FAFC] active:bg-[#EBF8FF] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <span className="text-[10px] text-[#94A3B8] mt-1">支持全屏滑屏或虚拟触控键</span>
      </div>

      {/* 桌面端按键说明 */}
      <div className="mt-3 text-[11px] text-[#94A3B8] hidden sm:block">
        方向键 / WASD 转向 · 空格开始 · P / 按钮暂停
      </div>
    </div>
  );
}
