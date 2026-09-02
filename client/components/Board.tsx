import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Direction, Point } from '@/types';
import { CELL, GRID, BASE_SPEED_MS } from '@/hooks/useSnake';
import { sound } from '@/utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  Keyboard,
  Film,
  LogOut,
} from 'lucide-react';

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
  isReplay?: boolean;
  replayUser?: string;
  replaySpeedRate?: number;
  onSetReplaySpeed?: (speed: number) => void;
  onExitReplay?: () => void;
  onStart: () => void;
  onTick: () => void;
  onDirection: (d: Direction) => void;
  onTogglePause?: () => void;
}

// 兼容老旧 WebView / QQ / 微信内置浏览器 Canvas 2D roundRect
const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
};

// 粒子爆发微特效实体
interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; alpha: number; life: number; maxLife: number;
}

// 冲击波扩散光环实体
interface Shockwave {
  x: number; y: number; radius: number; maxRadius: number;
  color: string; alpha: number; lineWidth: number;
}

// 浮空得分/连击微文字实体
interface FloatingText {
  x: number; y: number; text: string; color: string;
  alpha: number; scale: number; life: number; maxLife: number;
}

// 欢庆四色彩纸微特效实体
interface Confetti {
  x: number; y: number; vx: number; vy: number;
  rot: number; vRot: number;
  color: string; size: number; alpha: number; life: number; maxLife: number;
}

// 蛇身吞咽物理传导波
interface DigestionWave {
  startTime: number;
}

export default function Board({
  snakeRef, fenceRef, foodRef, bonusRef, hasBonus, bonusKey = 0,
  score, duration, length, speedMs, isPlaying, isGameOver, isPaused,
  isReplay = false, replayUser = '', replaySpeedRate = 1, onSetReplaySpeed, onExitReplay,
  onStart, onTick, onDirection, onTogglePause,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const motionTrailsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const confettiRef = useRef<Confetti[]>([]);
  const digestionWavesRef = useRef<DigestionWave[]>([]);
  const comboRef = useRef({ count: 0, lastTime: 0 });
  const shakeRef = useRef({ frames: 0, intensity: 0 });
  const prevScoreRef = useRef(score);
  const prevGameOverRef = useRef(isGameOver);
  const offscreenBgRef = useRef<HTMLCanvasElement | null>(null);
  const bonusSpawnTimeRef = useRef<number>(0);
  const foodSpawnTimeRef = useRef<number>(0);

  // 监听开局与吃果得分，触发红果果冻微弹跳
  useEffect(() => {
    foodSpawnTimeRef.current = Date.now();
  }, [score, isPlaying]);

  // 监听金果生成时间用于临期急速频闪判定
  useEffect(() => {
    if (hasBonus) {
      bonusSpawnTimeRef.current = Date.now();
    }
  }, [hasBonus, bonusKey]);

  // 混合输入设备 (平板/iPad/Surface/触屏电脑) 智能触控能力探测与偏好持久化
  const [showDpad, setShowDpad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('snake_show_dpad');
      if (saved !== null) return saved === 'true';
      const hasTouch =
        navigator.maxTouchPoints > 0 ||
        'ontouchstart' in window ||
        window.matchMedia('(any-pointer: coarse)').matches;
      return hasTouch || window.innerWidth < 1024;
    } catch {
      return true;
    }
  });

  const toggleDpad = useCallback(() => {
    setShowDpad((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('snake_show_dpad', String(next));
      } catch {}
      return next;
    });
  }, []);

  // 离屏 Canvas 预渲染静态网格背景 (极大减少主线程绘制开销)
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = GRID * CELL;
    offscreen.height = GRID * CELL;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.fillStyle = '#FFFFFF';
      offCtx.fillRect(0, 0, GRID * CELL, GRID * CELL);
      offCtx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
      offCtx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        offCtx.beginPath();
        offCtx.moveTo(i * CELL, 0);
        offCtx.lineTo(i * CELL, GRID * CELL);
        offCtx.stroke();
        offCtx.beginPath();
        offCtx.moveTo(0, i * CELL);
        offCtx.lineTo(GRID * CELL, i * CELL);
        offCtx.stroke();
      }
    }
    offscreenBgRef.current = offscreen;
  }, []);

  // 触发屏幕轻微震颤动效
  const triggerShake = (frames = 6, intensity = 2.5) => {
    shakeRef.current = { frames, intensity };
  };

  // 吃到果实时在对应格子爆发多巴胺微光粒子
  const spawnParticles = (gridX: number, gridY: number, color: string, count = 12) => {
    const centerX = gridX * CELL + CELL / 2;
    const centerY = gridY * CELL + CELL / 2;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 0.8 + Math.random() * 2.2;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 1.5 + Math.random() * 2,
        alpha: 1,
        life: 0,
        maxLife: 16 + Math.floor(Math.random() * 8),
      });
    }
  };

  // 在吃果位置生成飘字反馈
  const spawnFloatingText = (gridX: number, gridY: number, text: string, color: string) => {
    const px = gridX * CELL + CELL / 2;
    const py = gridY * CELL - 4;
    floatingTextsRef.current.push({
      x: px,
      y: py,
      text,
      color,
      alpha: 1,
      scale: 0.8,
      life: 0,
      maxLife: 28,
    });
  };

  // 吃到红苹果清空栅栏时爆发浅灰粉尘消散粒子
  const spawnCrumbleParticles = (gridX: number, gridY: number) => {
    const centerX = gridX * CELL + CELL / 2;
    const centerY = gridY * CELL + CELL / 2;
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.2;
      particlesRef.current.push({
        x: centerX + (Math.random() - 0.5) * 6,
        y: centerY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#CBD5E1',
        size: 1.2 + Math.random() * 1.2,
        alpha: 0.8,
        life: 0,
        maxLife: 14 + Math.floor(Math.random() * 6),
      });
    }
  };

  // 破纪录 / 高分加冕时屏幕两侧喷射南大家园四色彩纸礼花
  const spawnConfetti = () => {
    const colors = ['#66CCFF', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'];
    for (let i = 0; i < 36; i++) {
      const fromLeft = i % 2 === 0;
      confettiRef.current.push({
        x: fromLeft ? 8 + Math.random() * 15 : GRID * CELL - 8 - Math.random() * 15,
        y: GRID * CELL - 10,
        vx: (fromLeft ? 1 : -1) * (1.8 + Math.random() * 3.8),
        vy: -(4.5 + Math.random() * 5.2),
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3.5 + Math.random() * 3.5,
        alpha: 1,
        life: 0,
        maxLife: 65 + Math.floor(Math.random() * 20),
      });
    }
  };

  // 监听得分变化，精确捕捉连击、吞咽波、粉尘瓦解与音效反馈
  useEffect(() => {
    if (score > prevScoreRef.current) {
      const diff = score - prevScoreRef.current;
      const head = snakeRef.current[0] || { x: 10, y: 12 };
      const now = Date.now();

      // 触发蛇身物理吞咽传导波
      digestionWavesRef.current.push({ startTime: now });

      // 3 秒内连续吃果判定为连击 Combo
      if (now - comboRef.current.lastTime <= 3000) {
        comboRef.current.count += 1;
      } else {
        comboRef.current.count = 1;
      }
      comboRef.current.lastTime = now;

      // 播放 8-bit 递增动态连击升阶音阶
      sound.playCombo(comboRef.current.count);

      if (diff >= 30) {
        // 金色幸运果
        triggerShake(8, 3.5);
        spawnParticles(head.x, head.y, '#F59E0B', 18);
        spawnFloatingText(head.x, head.y, '+30 幸运金果!', '#D97706');
        shockwavesRef.current.push({
          x: head.x * CELL + CELL / 2,
          y: head.y * CELL + CELL / 2,
          radius: CELL / 2,
          maxRadius: CELL * 2.2,
          color: '#F59E0B',
          alpha: 0.85,
          lineWidth: 2,
        });
      } else {
        // 普通红苹果 (清空栅栏并触发粉尘瓦解)
        triggerShake(4, 1.8);
        spawnParticles(head.x, head.y, '#EF4444', 10);
        fenceRef.current.forEach((k) => {
          const [fx, fy] = k.split(',').map(Number);
          spawnCrumbleParticles(fx, fy);
        });

        shockwavesRef.current.push({
          x: head.x * CELL + CELL / 2,
          y: head.y * CELL + CELL / 2,
          radius: CELL / 2,
          maxRadius: CELL * 1.6,
          color: '#0099FF',
          alpha: 0.75,
          lineWidth: 1.5,
        });
        if (comboRef.current.count > 1) {
          spawnFloatingText(head.x, head.y, `+10 ${comboRef.current.count}连击!`, '#0099FF');
        } else {
          spawnFloatingText(head.x, head.y, '+10', '#10B981');
        }
      }
    }
    prevScoreRef.current = score;
  }, [score, snakeRef, fenceRef]);

  // 监听游戏结束，触发死亡震屏、粒子消散与高光礼花
  useEffect(() => {
    if (isGameOver && !prevGameOverRef.current) {
      triggerShake(12, 5.0);
      const head = snakeRef.current[0];
      if (head) {
        spawnParticles(head.x, head.y, '#EF4444', 24);
      }
      if (score >= 100) {
        spawnConfetti();
      }
    }
    prevGameOverRef.current = isGameOver;
  }, [isGameOver, snakeRef, score]);

  // 主渲染流程 (Canvas 2D 极简现代主义绘制引擎)
  const render = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.save();

    // 处理屏幕震颤偏移
    if (shakeRef.current.frames > 0) {
      const s = shakeRef.current.intensity;
      const ox = (Math.random() - 0.5) * s * 2;
      const oy = (Math.random() - 0.5) * s * 2;
      ctx.translate(ox, oy);
      shakeRef.current.frames -= 1;
    }

    // 1. 快速绘制预渲染的极简静态网格底板
    if (offscreenBgRef.current) {
      ctx.drawImage(offscreenBgRef.current, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }

    // 2. 绘制残留栅栏 (浅灰无阴影对称方块)
    ctx.fillStyle = '#E2E8F0';
    fenceRef.current.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      ctx.beginPath();
      drawRoundRect(ctx, x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, 3);
      ctx.fill();
    });

    // 3. 绘制普通红苹果 (果冻弹性微弹跳 + 纯净扁平无脏阴影 + 棕色果梗与翠绿果叶细节)
    const food = foodRef.current;
    if (food) {
      const elapsedFood = Date.now() - foodSpawnTimeRef.current;
      let fScale = 1;
      if (elapsedFood < 220 && elapsedFood > 0) {
        const p = elapsedFood / 220;
        fScale = 1 + 0.32 * Math.sin(p * Math.PI) * (1 - p * 0.4);
      }
      const foodR = Math.max(1, (CELL / 2 - 1.5) * fScale);

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, foodR, 0, Math.PI * 2);
      ctx.fill();

      // 果梗与果叶
      ctx.fillStyle = '#78350F';
      ctx.fillRect(food.x * CELL + CELL / 2 - 0.8, food.y * CELL + 1, 1.6, 3);
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2 + 2.5, food.y * CELL + 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. 绘制金色幸运果 (双态光晕：常态呼吸 / 临期 5~8s 急速红金频闪 + 果冻弹跳)
    const bonus = bonusRef.current;
    if (bonus) {
      const bx = bonus.x * CELL + CELL / 2;
      const by = bonus.y * CELL + CELL / 2;
      const elapsed = Date.now() - bonusSpawnTimeRef.current;
      const isExpiring = elapsed >= 5000;
      let bScale = 1;
      if (elapsed < 220 && elapsed > 0) {
        const p = elapsed / 220;
        bScale = 1 + 0.32 * Math.sin(p * Math.PI) * (1 - p * 0.4);
      }
      const pulse = (1 + Math.sin(Date.now() / 150) * 0.08) * bScale;

      let glowColor = 'rgba(245, 158, 11, 0.22)';
      let fruitColor = '#F59E0B';
      if (isExpiring) {
        const strobe = Math.sin(Date.now() / 60) > 0;
        glowColor = strobe ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.35)';
        fruitColor = strobe ? '#EF4444' : '#F59E0B';
      }

      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(bx, by, (CELL / 2 + (isExpiring ? 3 : 1)) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = fruitColor;
      ctx.beginPath();
      ctx.arc(bx, by, (CELL / 2 - 1.5) * pulse, 0, Math.PI * 2);
      ctx.fill();

      // 金果星芒高光
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. 绘制蛇身 (多巴胺晶体平滑渐变 + 物理吞咽传导波)
    const snake = snakeRef.current;
    const nowTime = Date.now();
    digestionWavesRef.current = digestionWavesRef.current.filter((w) => nowTime - w.startTime < 750);

    if (snake.length > 1) {
      const len = snake.length;
      for (let i = len - 1; i >= 1; i--) {
        const seg = snake[i];
        const ratio = 1 - i / len;
        const color = ratio > 0.6 ? '#38BDF8' : ratio > 0.3 ? '#7DD3FC' : '#BAE6FD';

        // 计算物理吞咽波传导到当前节时的微隆起弹性形变
        let bulge = 0;
        digestionWavesRef.current.forEach((w) => {
          const waveElapsed = nowTime - w.startTime;
          const targetIdx = waveElapsed / 35;
          const dist = Math.abs(i - targetIdx);
          if (dist < 1.2) {
            bulge = Math.max(bulge, (1 - dist / 1.2) * 0.24);
          }
        });

        const scaleFactor = 1 + bulge;
        const segSize = (CELL - 2) * scaleFactor;
        const offset = ((CELL - 2) * (scaleFactor - 1)) / 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        drawRoundRect(
          ctx,
          seg.x * CELL + 1 - offset,
          seg.y * CELL + 1 - offset,
          segSize,
          segSize,
          4
        );
        ctx.fill();
      }
    }

    // 6. 极速狂飙运动残影 (speedMs <= 75 时)
    const head = snake[0];
    if (speedMs <= 75 && isPlaying && !isPaused && !isGameOver && head) {
      const lastTrail = motionTrailsRef.current[0];
      if (!lastTrail || lastTrail.x !== head.x || lastTrail.y !== head.y) {
        motionTrailsRef.current.unshift({ x: head.x, y: head.y, alpha: 0.35 });
        if (motionTrailsRef.current.length > 3) motionTrailsRef.current.pop();
      }
    } else {
      motionTrailsRef.current = [];
    }

    motionTrailsRef.current.forEach((tr, idx) => {
      const trAlpha = Math.max(0, tr.alpha - idx * 0.1);
      if (trAlpha > 0.02) {
        ctx.save();
        ctx.fillStyle = '#66CCFF';
        ctx.globalAlpha = trAlpha;
        ctx.beginPath();
        drawRoundRect(ctx, tr.x * CELL + 1, tr.y * CELL + 1, CELL - 2, CELL - 2, 5);
        ctx.fill();
        ctx.restore();
      }
    });

    // 7. 绘制蛇头 (南大家园天青蓝 #66CCFF + 灵动双眼视线追踪)
    if (head) {
      ctx.fillStyle = '#66CCFF';
      ctx.beginPath();
      drawRoundRect(ctx, head.x * CELL + 1, head.y * CELL + 1, CELL - 2, CELL - 2, 5);
      ctx.fill();

      // 计算双眼在蛇头上的朝向偏移与视线追踪
      let eyeOffset1 = { x: 4, y: 4 };
      let eyeOffset2 = { x: CELL - 4, y: 4 };
      let pupilOffset = { x: 0, y: 0 };

      if (snake.length > 1) {
        const next = snake[1];
        const dx = head.x - next.x;
        const dy = head.y - next.y;
        if (dx === 1) {
          eyeOffset1 = { x: CELL - 5, y: 4 };
          eyeOffset2 = { x: CELL - 5, y: CELL - 4 };
          pupilOffset = { x: 0.8, y: 0 };
        } else if (dx === -1) {
          eyeOffset1 = { x: 5, y: 4 };
          eyeOffset2 = { x: 5, y: CELL - 4 };
          pupilOffset = { x: -0.8, y: 0 };
        } else if (dy === 1) {
          eyeOffset1 = { x: 4, y: CELL - 5 };
          eyeOffset2 = { x: CELL - 4, y: CELL - 5 };
          pupilOffset = { x: 0, y: 0.8 };
        } else {
          eyeOffset1 = { x: 4, y: 5 };
          eyeOffset2 = { x: CELL - 4, y: 5 };
          pupilOffset = { x: 0, y: -0.8 };
        }
      }

      // 眼白
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(head.x * CELL + eyeOffset1.x, head.y * CELL + eyeOffset1.y, 2.4, 0, Math.PI * 2);
      ctx.arc(head.x * CELL + eyeOffset2.x, head.y * CELL + eyeOffset2.y, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // 瞳孔
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(
        head.x * CELL + eyeOffset1.x + pupilOffset.x,
        head.y * CELL + eyeOffset1.y + pupilOffset.y,
        1.2,
        0,
        Math.PI * 2
      );
      ctx.arc(
        head.x * CELL + eyeOffset2.x + pupilOffset.x,
        head.y * CELL + eyeOffset2.y + pupilOffset.y,
        1.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 8. 更新并绘制粒子微特效
    const activeParticles: Particle[] = [];
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life < p.maxLife) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        activeParticles.push(p);
      }
    });
    particlesRef.current = activeParticles;
    ctx.globalAlpha = 1;

    // 9. 更新并绘制冲击波扩散光环
    const activeShockwaves: Shockwave[] = [];
    shockwavesRef.current.forEach((sw) => {
      sw.radius += 1.4;
      sw.alpha *= 0.88;
      if (sw.alpha > 0.03 && sw.radius < sw.maxRadius) {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        activeShockwaves.push(sw);
      }
    });
    shockwavesRef.current = activeShockwaves;

    // 10. 更新并绘制四色彩纸欢庆礼花 (重力加速度与空气阻力)
    const activeConfetti: Confetti[] = [];
    confettiRef.current.forEach((c) => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.16; // 柔和重力加速度
      c.vx *= 0.98; // 空气阻力
      c.rot += c.vRot;
      c.life += 1;
      c.alpha = Math.max(0, 1 - c.life / c.maxLife);
      if (c.life < c.maxLife) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = c.alpha;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        ctx.restore();
        activeConfetti.push(c);
      }
    });
    confettiRef.current = activeConfetti;

    // 11. 更新并绘制连击飘字特效 (带果冻弹性缩放回弹)
    const activeTexts: FloatingText[] = [];
    floatingTextsRef.current.forEach((ft) => {
      ft.y -= 0.65;
      ft.life += 1;
      ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      if (ft.life < ft.maxLife) {
        const p = Math.min(1, ft.life / 7);
        const scale = ft.life < 7 ? 1.4 - 0.4 * p : 1.0;
        ctx.save();
        ctx.translate(ft.x, ft.y);
        ctx.scale(scale, scale);
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
        activeTexts.push(ft);
      }
    });
    floatingTextsRef.current = activeTexts;

    ctx.restore();
  }, [fenceRef, foodRef, bonusRef, snakeRef, speedMs, isPlaying, isPaused, isGameOver]);

  // 全屏滑屏手势判定 (Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 20) {
      sound.unlockAudio();
      if (absX > absY) {
        onDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        onDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
  };

  // 物理时序主循环 (支持回放倍速调整)
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

    const effectiveSpeed = isReplay ? speedMs / (replaySpeedRate || 1) : speedMs;

    const timer = setInterval(() => {
      onTick();
      render();
    }, effectiveSpeed);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isPlaying, isPaused, isGameOver, speedMs, isReplay, replaySpeedRate, onTick, render]);

  // 顶部四段式复合胶囊数据配置
  const statCapsules = [
    { label: '得分', val: score, bg: 'bg-rose-50/90', text: 'text-rose-500', valColor: 'text-rose-600', isBonus: hasBonus },
    { label: '长度', val: length, bg: 'bg-emerald-50/90', text: 'text-emerald-600', valColor: 'text-emerald-700' },
    { label: '用时', val: `${duration}s`, bg: 'bg-purple-50/90', text: 'text-purple-600', valColor: 'text-purple-700' },
    { label: '速度', val: `${((BASE_SPEED_MS / speedMs) * (isReplay ? replaySpeedRate : 1)).toFixed(1)}x`, bg: 'bg-[#EBF8FF]', text: 'text-[#0099FF]', valColor: 'text-[#0099FF]' },
  ];

  const handleDirBtn = (d: Direction) => {
    sound.unlockAudio();
    onDirection(d);
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl flex flex-col items-center select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* 观摩回放模式专属横幅 */}
      {isReplay && (
        <div className="w-full mb-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#EBF8FF] to-[#E0F2FE] border border-[#66CCFF]/40 text-[#0099FF] flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <Film size={14} className="text-[#0099FF] shrink-0" />
            <span className="truncate">观摩走位中：<strong className="text-slate-900">{replayUser}</strong></span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white font-mono text-[#0099FF] shadow-2xs">
              {replaySpeedRate}x 倍速
            </span>
            <button
              onClick={onExitReplay}
              className="text-[11px] text-slate-500 hover:text-rose-500 flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <LogOut size={12} /> 退出
            </button>
          </div>
        </div>
      )}

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
        {/* 限时幸运果 8 秒倒计时条 (GPU 硬件加速丝滑渐变) */}
        {hasBonus && (
          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-[#EBF8FF] overflow-hidden z-20 pointer-events-none">
            <div
              key={bonusKey}
              className="w-full h-full origin-left will-change-transform bg-gradient-to-r from-[#66CCFF] to-[#0099FF] shadow-[0_0_8px_#66CCFF]"
              style={{
                animation: 'bonusProgress 8s linear forwards',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>
        )}

        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="block max-w-full h-auto aspect-square bg-[#F8FAFC]" />

        {/* 开始游戏遮罩 (非回放模式) */}
        {!isPlaying && !isGameOver && !isReplay && (
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
            <span className="text-sm font-bold">{isReplay ? '回放已暂停' : '游戏已暂停'}</span>
            <span className="text-xs text-[#94A3B8] mt-1">
              点击任意位置<span className="hidden sm:inline">或按空格/P</span>继续
            </span>
          </div>
        )}

        {/* 游戏结束结算面板 (极简南大家园现代主义几何卡片) */}
        {isGameOver && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-[4px] flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.8 rounded-full bg-rose-50 text-rose-500 font-bold text-xs mb-2">
              <span>{isReplay ? '观摩播放结束' : '游戏结束'}</span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono tracking-tight mb-3">
              {score} <span className="text-xs font-normal text-slate-400">分</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 mb-5 bg-[#F8FAFC] border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">蛇身长度</span>
                <strong className="text-[#0099FF] font-mono font-bold text-sm">{length}</strong>
              </div>
              <span className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">存活用时</span>
                <strong className="text-[#8B5CF6] font-mono font-bold text-sm">{duration}s</strong>
              </div>
              <span className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">最终移速</span>
                <strong className="text-[#10B981] font-mono font-bold text-sm">
                  {Math.round((BASE_SPEED_MS / speedMs) * 10) / 10}x
                </strong>
              </div>
            </div>

            {isReplay ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onStart}
                  className="px-5 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={14} />
                  <span>重新观摩</span>
                </button>
                <button
                  onClick={onExitReplay}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogOut size={14} />
                  <span>退出观摩</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onStart}
                className="px-7 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
              >
                <RotateCcw size={15} />
                <span>再来一局</span>
                <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 自适应操控区：电竞回放控制台 VS 触控十字键/键盘控制台 */}
      <div className="mt-4 flex flex-col items-center gap-3 select-none w-full">
        {isReplay ? (
          /* 电竞对局录像播放器控制台 */
          <div className="flex flex-col items-center gap-2.5 py-2 w-full">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* 暂停/继续 */}
              <button
                onClick={onTogglePause}
                disabled={isGameOver}
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  isGameOver
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isPaused
                    ? 'bg-[#0099FF] text-white hover:bg-[#0284C7] cursor-pointer active:scale-95'
                    : 'bg-slate-100 hover:bg-[#EBF8FF] text-[#334155] hover:text-[#0099FF] cursor-pointer active:scale-95'
                }`}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                <span>{isPaused ? '继续播放' : '暂停回放'}</span>
              </button>

              {/* 倍速切换 */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
                {[1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => onSetReplaySpeed?.(sp)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      replaySpeedRate === sp
                        ? 'bg-white text-[#0099FF] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>

              {/* 退出观摩 */}
              <button
                onClick={onExitReplay}
                className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <LogOut size={13} />
                <span>退出观摩</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-400">电竞级无头物理重放引擎 · 100% 还原真实操作轨迹</div>
          </div>
        ) : showDpad ? (
          /* 触控十字按键控制台 (手机/平板/触屏二合一设备默认可用) */
          <div className="flex flex-col items-center gap-2.5 touch-manipulation">
            <button
              onClick={() => handleDirBtn('UP')}
              className="w-[74px] sm:w-[84px] h-[48px] sm:h-[50px] bg-slate-100 active:bg-[#EBF8FF] rounded-2xl flex items-center justify-center text-[#334155] active:text-[#0099FF] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <ChevronUp size={28} />
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDirBtn('LEFT')}
                className="w-[74px] sm:w-[84px] h-[48px] sm:h-[50px] bg-slate-100 active:bg-[#EBF8FF] rounded-2xl flex items-center justify-center text-[#334155] active:text-[#0099FF] active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={() => {
                  sound.unlockAudio();
                  onTogglePause?.();
                }}
                disabled={!isPlaying || isGameOver}
                className={`w-[74px] sm:w-[84px] h-[48px] sm:h-[50px] rounded-2xl flex items-center justify-center transition-all shadow-xs ${
                  isPaused ? 'bg-[#0099FF] text-white' : 'bg-slate-100 active:bg-[#EBF8FF] text-[#334155] active:text-[#0099FF]'
                } ${!isPlaying || isGameOver ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
              <button
                onClick={() => handleDirBtn('RIGHT')}
                className="w-[74px] sm:w-[84px] h-[48px] sm:h-[50px] bg-slate-100 active:bg-[#EBF8FF] rounded-2xl flex items-center justify-center text-[#334155] active:text-[#0099FF] active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <ChevronRight size={28} />
              </button>
            </div>

            <button
              onClick={() => handleDirBtn('DOWN')}
              className="w-[74px] sm:w-[84px] h-[48px] sm:h-[50px] bg-slate-100 active:bg-[#EBF8FF] rounded-2xl flex items-center justify-center text-[#334155] active:text-[#0099FF] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <ChevronDown size={28} />
            </button>
          </div>
        ) : (
          /* 纯净键盘快捷模式 (外接键盘平板/桌面PC专属) */
          <div className="flex flex-col items-center gap-2 py-2">
            <button
              onClick={onTogglePause}
              disabled={!isPlaying || isGameOver}
              className={`px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isPaused ? 'bg-[#0099FF] text-white hover:bg-[#0284C7]' : 'bg-slate-100 hover:bg-[#EBF8FF] text-[#334155] hover:text-[#0099FF]'
              } ${!isPlaying || isGameOver ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isPaused ? '继续游戏 (P / 空格)' : '暂停游戏 (P / 空格)'}</span>
            </button>
            <div className="text-[11px] text-[#94A3B8]">方向键 / WASD 转向 · 空格键开始 · P 键暂停</div>
          </div>
        )}

        {/* 底部微型模式切换条与全屏滑屏说明 (回放模式隐藏) */}
        {!isReplay && (
          <div className="flex items-center justify-center gap-2.5 text-[11px] text-[#94A3B8] pt-1">
            <span>全屏滑屏 / 键盘 WASD 随时可用</span>
            <span>•</span>
            <button
              onClick={toggleDpad}
              title="切换触控十字键或纯净键盘模式"
              className="text-[11px] font-semibold text-[#0099FF] hover:text-[#0284C7] bg-[#EBF8FF] hover:bg-[#E0F2FE] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer"
            >
              {showDpad ? (
                <>
                  <Keyboard size={12} />
                  <span>切为纯键盘</span>
                </>
              ) : (
                <>
                  <Gamepad2 size={12} />
                  <span>开启触控键</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
