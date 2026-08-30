import React, { useRef, useEffect, useCallback } from 'react';
import { Direction, Point } from '@/types';
import { CELL, GRID, BASE_SPEED_MS } from '@/hooks/useSnakeGame';
import { sound } from '@/utils/audio';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  snakeRef: React.MutableRefObject<Point[]>;
  fenceRef: React.MutableRefObject<Set<string>>;
  foodRef: React.MutableRefObject<Point>;
  bonusRef: React.MutableRefObject<Point | null>;
  hasBonus: boolean;
  bonusKey?: number;
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
  bonusKey = 0,
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

  // 手势滑动检测 (同时触发移动端音频引擎解锁)
  const handleTouchStart = (e: React.TouchEvent) => {
    sound.unlockAudio();
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

  // 计算速度梯度倍率 (1.0x ~ 2.0x)
  const speedRatio = (BASE_SPEED_MS / speedMs).toFixed(1);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl flex flex-col items-center select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* 顶部四段式南大家园多巴胺复合状态胶囊栏 (得分·红、长度·绿、用时·紫、速度·天青蓝) */}
      <div className="w-full grid grid-cols-4 gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-center text-xs">
        {/* 1. 得分 (珊瑚红纯净浅底) */}
        <div className="bg-rose-50/90 py-2 px-1 rounded-2xl relative overflow-hidden">
          <span className="text-rose-500 text-[11px] font-medium">得分 </span>
          <strong className="text-rose-600 text-sm font-mono font-black">{score}</strong>
          {hasBonus && (
            <span className="absolute top-0.5 right-1 flex items-center text-[#D97706] font-extrabold text-[9px] animate-pulse">
              <Sparkles size={9} /> +30
            </span>
          )}
        </div>

        {/* 2. 长度 (翡翠绿纯净浅底) */}
        <div className="bg-emerald-50/90 py-2 px-1 rounded-2xl">
          <span className="text-emerald-600 text-[11px] font-medium">长度 </span>
          <strong className="text-emerald-700 text-sm font-mono font-black">{length}</strong>
        </div>

        {/* 3. 用时 (罗兰紫纯净浅底) */}
        <div className="bg-purple-50/90 py-2 px-1 rounded-2xl">
          <span className="text-purple-600 text-[11px] font-medium">用时 </span>
          <strong className="text-purple-700 text-sm font-mono font-bold">{duration}s</strong>
        </div>

        {/* 4. 速度 (标志性天青蓝纯净浅底) */}
        <div className="bg-[#EBF8FF] py-2 px-1 rounded-2xl">
          <span className="text-[#0099FF] text-[11px] font-bold">速度 </span>
          <strong className="text-[#0099FF] text-sm font-mono font-black">{speedRatio}x</strong>
        </div>
      </div>

      {/* 画布与悬浮交互层 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-2xl overflow-hidden bg-white touch-none max-w-full"
      >
        {/* 限时金色幸运果顶置 8 秒倒计时进度条 (金果被吃或超时立即提前消失，游戏暂停时定格) */}
        {hasBonus && (
          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-[#EBF8FF] overflow-hidden z-20 pointer-events-none">
            <div
              key={bonusKey}
              className="h-full bg-[#66CCFF] shadow-[0_0_6px_#66CCFF]"
              style={{
                animation: 'bonusProgress 8s linear forwards',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>
        )}

        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="block max-w-full h-auto aspect-square bg-[#F8FAFC]" />

        {/* 开始游戏遮罩 */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex items-center justify-center">
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
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
            <div className="flex gap-4 text-xs text-[#334155] mb-4 bg-[#F8FAFC] px-4 py-2 rounded-2xl">
              <span>得分: <strong className="text-[#0F172A] font-mono font-black text-sm">{score}</strong></span>
              <span>长度: <strong className="text-[#0099FF] font-mono font-bold">{length}</strong></span>
              <span>用时: <strong className="text-[#0F172A] font-mono font-bold">{duration}s</strong></span>
            </div>
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw size={15} /> 再来一局 (空格)
            </button>
          </div>
        )}
      </div>

      {/* 移动端极简微型十字控制台：4个方向键中间嵌入暂停/继续键 (纯净无框浅灰圆角块) */}
      <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden touch-manipulation select-none">
        {/* 上方向键 */}
        <button
          onClick={() => { sound.unlockAudio(); onDirection('UP'); }}
          className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all touch-manipulation select-none"
        >
          <ChevronUp size={20} />
        </button>

        {/* 中间行：左键 + 暂停键 + 右键 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { sound.unlockAudio(); onDirection('LEFT'); }}
            className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all touch-manipulation select-none"
          >
            <ChevronLeft size={20} />
          </button>

          {/* 暂停/继续控制键 (位于4个移动键正中心) */}
          <button
            onClick={() => { sound.unlockAudio(); onTogglePause?.(); }}
            disabled={!isPlaying || isGameOver}
            title={isPaused ? '继续游戏' : '暂停游戏'}
            className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all touch-manipulation select-none ${
              isPaused
                ? 'bg-[#EBF8FF] text-[#0099FF]'
                : 'bg-slate-100 active:bg-[#EBF8FF] text-[#334155] active:text-[#0099FF]'
            } ${(!isPlaying || isGameOver) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>

          <button
            onClick={() => { sound.unlockAudio(); onDirection('RIGHT'); }}
            className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all touch-manipulation select-none"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 下方向键 */}
        <button
          onClick={() => { sound.unlockAudio(); onDirection('DOWN'); }}
          className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all touch-manipulation select-none"
        >
          <ChevronDown size={20} />
        </button>

        <span className="text-[10px] text-[#94A3B8] mt-1">支持全屏滑屏或虚拟触控键 · 中心按键暂停</span>
      </div>

      {/* 电脑端：地图正下方暂停/继续按钮与按键指引 */}
      <div className="mt-4 hidden sm:flex flex-col items-center gap-2 select-none">
        <button
          onClick={onTogglePause}
          disabled={!isPlaying || isGameOver}
          className={`px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            isPaused
              ? 'bg-[#0099FF] text-white hover:bg-[#0284C7]'
              : 'bg-slate-100 hover:bg-[#EBF8FF] text-[#334155] hover:text-[#0099FF]'
          } ${(!isPlaying || isGameOver) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span>{isPaused ? '继续游戏 (P / 空格)' : '暂停游戏 (P / 空格)'}</span>
        </button>
        <div className="text-[11px] text-[#94A3B8]">
          方向键 / WASD 转向 · 空格键开始 · P 键暂停
        </div>
      </div>
    </div>
  );
}
