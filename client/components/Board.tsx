import React, { useRef, useEffect, useCallback } from 'react';
import { Direction, Point } from '@/types';
import { CELL, GRID, BASE_SPEED_MS } from '@/hooks/useSnake';
import { sound } from '@/utils/audio';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  snakeRef: React.MutableRefObject<Point[]>;
  fenceRef: React.MutableRefObject<Set<string>>;
  foodRef: React.MutableRefObject<Point>;
  bonusRef: React.MutableRefObject<Point | null>;
  hasBonus: boolean;
  bonusKey?: number;
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

// 粒子爆发微特效实体
interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; alpha: number; life: number; maxLife: number;
}

// 浮空得分/连击微文字实体
interface FloatingText {
  x: number; y: number; text: string; color: string;
  alpha: number; scale: number; life: number; maxLife: number;
}

export default function Board({
  snakeRef, fenceRef, foodRef, bonusRef, hasBonus, bonusKey = 0,
  score, duration, length, speedMs, isPlaying, isGameOver, isPaused,
  onStart, onTick, onDirection, onTogglePause,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const comboRef = useRef({ count: 0, lastTime: 0 });
  const shakeRef = useRef({ frames: 0, intensity: 0 });
  const prevScoreRef = useRef(score);
  const prevGameOverRef = useRef(isGameOver);

  // 吃到苹果/金果时向四周发射微粒子爆发
  const emitParticles = useCallback((gridX: number, gridY: number, type: 'apple' | 'bonus') => {
    const originX = gridX * CELL + CELL / 2, originY = gridY * CELL + CELL / 2;
    const colors = type === 'apple'
      ? ['#EF4444', '#F87171', '#FDA4AF', '#FFFFFF', '#10B981']
      : ['#F59E0B', '#FBBF24', '#FEF08A', '#FFFFFF', '#66CCFF'];

    for (let i = 0; i < (type === 'apple' ? 12 : 18); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.8 + 1.2;
      const life = Math.floor(Math.random() * 10) + 16;
      particlesRef.current.push({
        x: originX, y: originY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 2.4 + 1.2, alpha: 1, life, maxLife: life,
      });
    }
  }, []);

  // 发射向上浮动的得分/Combo数字
  const emitFloatingText = useCallback((gridX: number, gridY: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      x: gridX * CELL + CELL / 2, y: gridY * CELL,
      text, color, alpha: 1, scale: 1.25, life: 26, maxLife: 26,
    });
  }, []);

  // 死亡瞬间蛇身晶体向四周破裂微特效
  const emitShatter = useCallback(() => {
    snakeRef.current.forEach((pt) => {
      const originX = pt.x * CELL + CELL / 2, originY = pt.y * CELL + CELL / 2;
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3.2 + 1.2;
        const life = Math.floor(Math.random() * 10) + 16;
        particlesRef.current.push({
          x: originX, y: originY,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          color: Math.random() > 0.4 ? '#66CCFF' : '#38BDF8',
          size: Math.random() * 2.2 + 1.2, alpha: 1, life, maxLife: life,
        });
      }
    });
  }, [snakeRef]);

  // 监听分数变动触发打击感特效与连击统计
  useEffect(() => {
    if (score > prevScoreRef.current) {
      const diff = score - prevScoreRef.current;
      if (snakeRef.current.length > 0) {
        const head = snakeRef.current[0];
        const isBonus = diff >= 30;
        emitParticles(head.x, head.y, isBonus ? 'bonus' : 'apple');

        // 3秒内连续吃果判定为连击 Combo
        const now = Date.now();
        comboRef.current.count = now - comboRef.current.lastTime < 3000 ? comboRef.current.count + 1 : 1;
        comboRef.current.lastTime = now;

        const label = `${isBonus ? '+30' : '+10'}${comboRef.current.count > 1 ? ` x${comboRef.current.count}` : ''}`;
        emitFloatingText(head.x, head.y, label, isBonus ? '#D97706' : '#EF4444');
      }
    }
    prevScoreRef.current = score;
  }, [score, snakeRef, emitParticles, emitFloatingText]);

  // 监听死亡触发微震屏
  useEffect(() => {
    if (isGameOver && !prevGameOverRef.current) {
      shakeRef.current = { frames: 8, intensity: 3.0 };
      emitShatter();
    }
    prevGameOverRef.current = isGameOver;
  }, [isGameOver, emitShatter]);

  // 移动端全屏滑动手势检测
  const handleTouchStart = (e: React.TouchEvent) => {
    sound.unlockAudio();
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.hypot(dx, dy) < 24) return;
    onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
  };

  // 核心 Canvas 2D 游戏画面逐帧渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    // 1. 死亡微震屏位移
    if (shakeRef.current.frames > 0) {
      const decay = shakeRef.current.frames / 8;
      ctx.translate((Math.random() - 0.5) * shakeRef.current.intensity * decay * 2, (Math.random() - 0.5) * shakeRef.current.intensity * decay * 2);
      shakeRef.current.frames--;
    }

    // 2. 柔白底板与极细隐形网格
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
    }

    // 3. 绘制身后残留栅栏
    ctx.fillStyle = '#CBD5E1';
    fenceRef.current.forEach((k) => {
      const [fx, fy] = k.split(',').map(Number);
      ctx.beginPath();
      ctx.roundRect(fx * CELL + 2.5, fy * CELL + 2.5, CELL - 5, CELL - 5, 2.5);
      ctx.fill();
    });

    // 4. 绘制食物 (普通红苹果 / 限时金色幸运果)
    const fx = foodRef.current.x * CELL + CELL / 2, fy = foodRef.current.y * CELL + CELL / 2;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(fx, fy, CELL / 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(fx - 2, fy - 2.5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22C55E';
    ctx.beginPath(); ctx.ellipse(fx + 2.5, fy - 5.5, 2.2, 1.2, Math.PI / 4, 0, Math.PI * 2); ctx.fill();

    if (bonusRef.current) {
      const bx = bonusRef.current.x * CELL + CELL / 2, by = bonusRef.current.y * CELL + CELL / 2;
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath(); ctx.arc(bx, by, CELL / 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath(); ctx.arc(bx, by, CELL / 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath(); ctx.arc(bx, by, CELL / 5, 0, Math.PI * 2); ctx.fill();
    }

    // 5. 绘制蛇身 (丝滑胶囊连结桥 + 呼吸律动)
    const snake = snakeRef.current;
    const snakeLen = snake.length;
    const nowTime = Date.now() / 220;

    // 5.1 绘制相邻节点间的圆润胶囊连结桥，消除方块割裂感
    for (let i = 0; i < snakeLen - 1; i++) {
      const c = snake[i], n = snake[i + 1];
      const cx = c.x * CELL, cy = c.y * CELL, nx = n.x * CELL, ny = n.y * CELL;
      ctx.fillStyle = i / snakeLen < 0.5 ? '#38BDF8' : '#7DD3FC';
      ctx.beginPath();
      ctx.roundRect(Math.min(cx, nx) + 2, Math.min(cy, ny) + 2, Math.abs(cx - nx) + CELL - 4, Math.abs(cy - ny) + CELL - 4, 4);
      ctx.fill();
    }

    // 5.2 绘制蛇头与各身体节点
    snake.forEach((pt, idx) => {
      const px = pt.x * CELL, py = pt.y * CELL;

      if (idx === 0) {
        // 蛇头：天青蓝底色 + 灵动双圆眼珠
        ctx.fillStyle = '#66CCFF';
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 5);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px + 6, py + 6, 2.2, 0, Math.PI * 2);
        ctx.arc(px + 14, py + 6, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(px + 6, py + 6, 1.1, 0, Math.PI * 2);
        ctx.arc(px + 14, py + 6, 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px + 5.6, py + 5.6, 0.4, 0, Math.PI * 2);
        ctx.arc(px + 13.6, py + 5.6, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 蛇身：微正弦呼吸律动
        ctx.fillStyle = idx / snakeLen < 0.5 ? '#38BDF8' : '#7DD3FC';
        const pad = Math.max(1, 2 - Math.sin(nowTime + idx * 0.45) * 0.4);
        ctx.beginPath();
        ctx.roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, 4);
        ctx.fill();
      }
    });

    // 6. 粒子微爆发运动与衰减
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.96; p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return p.life > 0;
    });

    // 7. 浮空得分微文字渲染
    floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
      ft.y -= 0.6; ft.life--;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      const curScale = ft.scale - (1 - ft.life / ft.maxLife) * 0.25;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `bold ${Math.round(11 * curScale)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
      return ft.life > 0;
    });

    ctx.restore();
  }, [snakeRef, fenceRef, foodRef, bonusRef]);

  // 60FPS 动画循环与游戏 Tick 定时器
  useEffect(() => {
    render();
    let animFrame: number;
    const animate = () => {
      if (particlesRef.current.length > 0 || floatingTextsRef.current.length > 0 || shakeRef.current.frames > 0 || isPlaying) {
        render();
      }
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);

    if (!isPlaying || isPaused || isGameOver) return () => cancelAnimationFrame(animFrame);

    const timer = setInterval(() => {
      onTick();
      render();
    }, speedMs);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isPlaying, isPaused, isGameOver, speedMs, onTick, render]);

  // 顶部四段式复合胶囊数据配置
  const statCapsules = [
    { label: '得分', val: score, bg: 'bg-rose-50/90', text: 'text-rose-500', valColor: 'text-rose-600', isBonus: hasBonus },
    { label: '长度', val: length, bg: 'bg-emerald-50/90', text: 'text-emerald-600', valColor: 'text-emerald-700' },
    { label: '用时', val: `${duration}s`, bg: 'bg-purple-50/90', text: 'text-purple-600', valColor: 'text-purple-700' },
    { label: '速度', val: `${(BASE_SPEED_MS / speedMs).toFixed(1)}x`, bg: 'bg-[#EBF8FF]', text: 'text-[#0099FF]', valColor: 'text-[#0099FF]' },
  ];

  const handleDirBtn = (d: Direction) => {
    sound.unlockAudio();
    onDirection(d);
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl flex flex-col items-center select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* 顶部四段式状态胶囊栏 */}
      <div className="w-full grid grid-cols-4 gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-center text-xs">
        {statCapsules.map((st) => (
          <div key={st.label} className={`${st.bg} py-2 px-1 rounded-2xl relative overflow-hidden`}>
            <span className={`${st.text} text-[11px] font-medium`}>{st.label} </span>
            <strong className={`${st.valColor} text-sm font-mono font-black`}>{st.val}</strong>
            {st.isBonus && (
              <span className="absolute top-0.5 right-1 flex items-center text-[#D97706] font-extrabold text-[9px] animate-pulse">
                <Sparkles size={9} /> +30
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Canvas 画布与状态遮罩层 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-2xl overflow-hidden bg-[#F8FAFC] border border-slate-200/70 touch-none max-w-full shadow-inner"
      >
        {/* 限时幸运果 8 秒倒计时条 */}
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
              className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play size={16} />
              <span>开始游戏</span>
              <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
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
            <span className="text-xs text-[#94A3B8] mt-1">
              点击任意位置<span className="hidden sm:inline">或按空格/P</span>继续
            </span>
          </div>
        )}

        {/* 游戏结束结算面板 */}
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
              className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw size={15} />
              <span>再来一局</span>
              <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
            </button>
          </div>
        )}
      </div>

      {/* 移动端微型十字按键控制台 */}
      <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden touch-manipulation select-none">
        <button onClick={() => handleDirBtn('UP')} className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all">
          <ChevronUp size={20} />
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => handleDirBtn('LEFT')} className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => { sound.unlockAudio(); onTogglePause?.(); }}
            disabled={!isPlaying || isGameOver}
            className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all ${
              isPaused ? 'bg-[#EBF8FF] text-[#0099FF]' : 'bg-slate-100 active:bg-[#EBF8FF] text-[#334155] active:text-[#0099FF]'
            } ${(!isPlaying || isGameOver) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button onClick={() => handleDirBtn('RIGHT')} className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all">
            <ChevronRight size={20} />
          </button>
        </div>

        <button onClick={() => handleDirBtn('DOWN')} className="w-12 h-10 bg-slate-100 active:bg-[#EBF8FF] rounded-xl flex items-center justify-center text-[#334155] active:text-[#0099FF] transition-all">
          <ChevronDown size={20} />
        </button>
        <span className="text-[10px] text-[#94A3B8] mt-1">支持全屏滑屏或虚拟触控键 · 中心按键暂停</span>
      </div>

      {/* 电脑端快捷键提示 */}
      <div className="mt-4 hidden sm:flex flex-col items-center gap-2 select-none">
        <button
          onClick={onTogglePause}
          disabled={!isPlaying || isGameOver}
          className={`px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            isPaused ? 'bg-[#0099FF] text-white hover:bg-[#0284C7]' : 'bg-slate-100 hover:bg-[#EBF8FF] text-[#334155] hover:text-[#0099FF]'
          } ${(!isPlaying || isGameOver) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span>{isPaused ? '继续游戏 (P / 空格)' : '暂停游戏 (P / 空格)'}</span>
        </button>
        <div className="text-[11px] text-[#94A3B8]">方向键 / WASD 转向 · 空格键开始 · P 键暂停</div>
      </div>
    </div>
  );
}
