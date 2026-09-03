import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Direction, Point } from '@/types';
import { CELL, GRID, BASE_SPEED_MS, TrajectoryEvent } from '@/hooks/useSnake';
import { sound } from '@/utils/audio';
import { haptics } from '@/utils/haptics';
import TrajectoryCardModal from './TrajectoryCardModal';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NCUCrestBadge } from './NCUIcon';

// 战局终了段位微拟态勋章加冕组件 (基于统一 NCUCrestBadge 极简实现)
function SettleTierCrest({ score }: { score: number }) {
  const tier =
    score >= 800
      ? 'DIAMOND'
      : score >= 500
      ? 'GOLD'
      : score >= 300
      ? 'SILVER'
      : score >= 100
      ? 'BRONZE'
      : null;

  const badgeConfig =
    tier === 'DIAMOND'
      ? { label: '钻石', color: '#8B5CF6' }
      : tier === 'GOLD'
      ? { label: '黄金', color: '#F59E0B' }
      : tier === 'SILVER'
      ? { label: '白银', color: '#64748B' }
      : tier === 'BRONZE'
      ? { label: '青铜', color: '#D97706' }
      : null;

  if (!tier || !badgeConfig) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-90 duration-300">
      <NCUCrestBadge tier={tier} size={48} className="drop-shadow-sm" />
      <span className="text-[11px] font-bold" style={{ color: badgeConfig.color }}>
        {badgeConfig.label}段位
      </span>
    </div>
  );
}

interface Props {
  snakeRef: React.MutableRefObject<Point[]>;
  fenceRef: React.MutableRefObject<Set<string>>;
  foodRef: React.MutableRefObject<Point>;
  bonusRef: React.MutableRefObject<Point | null>;
  hasBonus: boolean;
  bonusKey?: number;
  queueRef?: React.MutableRefObject<Direction[]>;
  score: number;
  duration: number;
  length: number;
  speedMs: number;
  comboCount?: number;
  maxCombo?: number;
  lastEatTimestamp?: number;
  trajectoryRef?: React.MutableRefObject<Point[]>;
  trajectoryEventsRef?: React.MutableRefObject<TrajectoryEvent[]>;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  isWaitingStart?: boolean;
  isReplay?: boolean;
  replayUser?: string;
  replaySpeedRate?: number;
  onSetReplaySpeed?: (speed: number) => void;
  onExitReplay?: () => void;
  onRestartReplay?: () => void;
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
  color: string; size: number; alpha: number;
  life: number; maxLife: number;
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
  queueRef,
  score, duration, length, speedMs, comboCount = 0, maxCombo = 0, lastEatTimestamp = 0,
  trajectoryRef, trajectoryEventsRef,
  isPlaying, isGameOver, isPaused,
  isWaitingStart = false,
  isReplay = false, replayUser = '', replaySpeedRate = 1, onSetReplaySpeed, onExitReplay, onRestartReplay,
  onStart, onTick, onDirection, onTogglePause,
}: Props) {
  const [showArtModal, setShowArtModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
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
  const fenceSpawnTimeRef = useRef<Map<string, number>>(new Map());

  // 监听开局与吃果得分，触发红果果冻微弹跳与得分胶囊微弹性脉冲
  const [scorePulse, setScorePulse] = useState(false);
  const [speedPulse, setSpeedPulse] = useState(false);
  const prevSpeedMsRef = useRef(speedMs);
  useEffect(() => {
    foodSpawnTimeRef.current = Date.now();
    if (score > 0) {
      const anim = requestAnimationFrame(() => setScorePulse(true));
      const timer = setTimeout(() => setScorePulse(false), 180);
      return () => {
        cancelAnimationFrame(anim);
        clearTimeout(timer);
      };
    }
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

  // 在吃果位置生成飘字反馈 (延长寿命并强化视觉存在感)
  const spawnFloatingText = (gridX: number, gridY: number, text: string, color: string) => {
    const px = gridX * CELL + CELL / 2;
    const py = gridY * CELL - 6;
    floatingTextsRef.current.push({
      x: px,
      y: py,
      text,
      color,
      alpha: 1,
      scale: 0.8,
      life: 0,
      maxLife: 38,
    });
  };

  // 监听移速提升：仅通过顶部速度胶囊高光微弹跳与指尖触感轻巧反馈，杜绝遮挡视野
  useEffect(() => {
    if (speedMs < prevSpeedMsRef.current && isPlaying && !isPaused && !isGameOver) {
      setSpeedPulse(true);
      const timer = setTimeout(() => setSpeedPulse(false), 240);
      haptics.trigger('snap');
      prevSpeedMsRef.current = speedMs;
      return () => clearTimeout(timer);
    }
    prevSpeedMsRef.current = speedMs;
  }, [speedMs, isPlaying, isPaused, isGameOver]);

  // 吃到红苹果清空栅栏时爆发浅灰粉尘消散粒子 (强化瓦解打击感)
  const spawnCrumbleParticles = (gridX: number, gridY: number) => {
    const centerX = gridX * CELL + CELL / 2;
    const centerY = gridY * CELL + CELL / 2;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.6;
      particlesRef.current.push({
        x: centerX + (Math.random() - 0.5) * 8,
        y: centerY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#94A3B8',
        size: 1.2 + Math.random() * 1.6,
        alpha: 0.85,
        life: 0,
        maxLife: 16 + Math.floor(Math.random() * 8),
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

      const currentCombo = comboCount || 1;

      // 判定是金果还是普通红苹果 (金果基础分 30，红果基础分 10)
      const isBonusFruit = diff >= 30;

      if (isBonusFruit) {
        // 金色幸运果：微阻尼收敛震动 (3帧/1.2px)，多巴胺微光粒子
        triggerShake(3, 1.2);
        spawnParticles(head.x, head.y, '#F59E0B', 18);

        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+30 幸运金果!', '#D97706');
        } else if (currentCombo === 2) {
          spawnFloatingText(head.x, head.y, '+30 2连击! (下次+5)', '#D97706');
        } else {
          const extra = (currentCombo - 2) * 5;
          spawnFloatingText(head.x, head.y, `+${diff} 金果 ${currentCombo}连击! (+${extra})`, '#D97706');
        }
      } else {
        // 普通红苹果：轻柔微震 (2帧/0.8px)，清空栅栏并爆发强化粉尘消散粒子
        triggerShake(2, 0.8);
        spawnParticles(head.x, head.y, '#EF4444', 10);
        fenceRef.current.forEach((k) => {
          const [fx, fy] = k.split(',').map(Number);
          spawnCrumbleParticles(fx, fy);
        });
        fenceSpawnTimeRef.current.clear();

        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+10', '#10B981');
        } else if (currentCombo === 2) {
          spawnFloatingText(head.x, head.y, '+10 2连击! (下次+5)', '#0099FF');
        } else {
          const extra = (currentCombo - 2) * 5;
          spawnFloatingText(head.x, head.y, `+${diff} ${currentCombo}连击! (+${extra})`, '#0099FF');
        }
      }
    }
    prevScoreRef.current = score;
  }, [score, snakeRef, fenceRef, comboCount]);

  // 监听游戏结束，触发死亡轻微震屏 (6帧/2.5px)、粒子消散与高光礼花
  useEffect(() => {
    if (isGameOver && !prevGameOverRef.current) {
      triggerShake(6, 2.5);
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

    // 2. 绘制残留栅栏 (余温石化渐变微动效 + 现代微定位暗标)
    const currentNow = Date.now();
    fenceRef.current.forEach((k) => {
      if (!fenceSpawnTimeRef.current.has(k)) {
        fenceSpawnTimeRef.current.set(k, currentNow);
      }
      const spawnT = fenceSpawnTimeRef.current.get(k) || currentNow;
      const age = currentNow - spawnT;

      // 刚蜕下的 180ms 内，由蛇身浅天青 #BAE6FD 柔和冷却石化至浅灰 #E2E8F0
      let blockColor = '#E2E8F0';
      if (age < 180) {
        blockColor = age < 90 ? '#BAE6FD' : '#CBD5E1';
      }

      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = blockColor;
      ctx.beginPath();
      drawRoundRect(ctx, x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, 3);
      ctx.fill();

      // 现代建筑极简中心定位微标 (微凹点质感)
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 1.2, 0, Math.PI * 2);
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

      // 水滴晶莹月牙微高光 (与主图标 icon.svg 保持统一纯净质感)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(
        food.x * CELL + CELL / 2 - foodR * 0.35,
        food.y * CELL + CELL / 2 - foodR * 0.35,
        foodR * 0.28,
        0,
        Math.PI * 2
      );
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

    // 5. 绘制蛇身 (多巴胺晶体平滑渐变 + 连击流光动效与濒危急促呼吸频闪 + 物理吞咽传导波)
    const snake = snakeRef.current;
    const nowTime = Date.now();
    digestionWavesRef.current = digestionWavesRef.current.filter((w) => nowTime - w.startTime < 750);

    const comboElapsed = nowTime - (lastEatTimestamp || 0);
    const inCombo = (comboCount || 0) >= 2 && comboElapsed < 3000;
    const isEndingSoon = inCombo && comboElapsed >= 2000; // 剩余 1 秒快终止
    const endingBlink = isEndingSoon && Math.sin((comboElapsed - 2000) * 0.024) > 0;

    if (snake.length > 1) {
      const len = snake.length;
      for (let i = len - 1; i >= 1; i--) {
        const seg = snake[i];
        const ratio = 1 - i / len;

        let color = ratio > 0.6 ? '#38BDF8' : ratio > 0.3 ? '#7DD3FC' : '#BAE6FD';
        if (inCombo) {
          if (endingBlink) {
            // 快终止频闪：急促橙红亮起
            color = i % 2 === 0 ? '#F59E0B' : '#EF4444';
          } else {
            // 连击进行中：耀金高光流光穿梭
            const wave = 0.5 + 0.5 * Math.sin(nowTime / 150 - i * 0.4);
            color = wave > 0.6 ? '#F59E0B' : ratio > 0.5 ? '#38BDF8' : '#7DD3FC';
          }
        }

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

        ctx.save();
        if (inCombo && !endingBlink) {
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 4;
        } else if (endingBlink) {
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 6;
        }

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

        // 晶体纯白微描边 (密集折叠转弯时各节边界清晰透气)
        ctx.strokeStyle = inCombo && endingBlink ? 'rgba(255, 237, 213, 0.9)' : 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. 极速狂飙运动残影 (speedMs <= 82，即 1.7x 破风档以上开启)
    const head = snake[0];
    if (speedMs <= 82 && isPlaying && !isPaused && !isGameOver && head) {
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

    // 7. 绘制蛇头 (南大家园天青蓝 #66CCFF + 连击濒危频闪 + 纯白晶体描边 + 灵动双眼视线追踪)
    if (head) {
      ctx.save();
      let headColor = '#66CCFF';
      if (inCombo) {
        if (endingBlink) {
          headColor = '#F59E0B';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 5;
        }
      }

      ctx.fillStyle = headColor;
      ctx.beginPath();
      drawRoundRect(ctx, head.x * CELL + 1, head.y * CELL + 1, CELL - 2, CELL - 2, 5);
      ctx.fill();

      ctx.strokeStyle = endingBlink ? 'rgba(254, 243, 199, 0.95)' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // 连击进行时在蛇头上方微标显示 3 秒倒计时灵动微弧
      if (inCombo) {
        const remainRatio = Math.max(0, 1 - comboElapsed / 3000);
        ctx.beginPath();
        ctx.arc(head.x * CELL + CELL / 2, head.y * CELL - 4, 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainRatio);
        ctx.strokeStyle = isEndingSoon ? '#EF4444' : '#F59E0B';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 计算双眼在蛇头上的朝向偏移与视线追踪 (聚拢机敏间距 7.6px，面容神采奕奕)
      let e1x = 6.2, e1y = 4.5;
      let e2x = 13.8, e2y = 4.5;
      let px = 0, py = 0;

      if (snake.length > 1) {
        const next = snake[1];
        const dx = head.x - next.x;
        const dy = head.y - next.y;
        if (dx === 1) {
          // 向右移动：面朝右侧，双眼居右并收紧垂直间距
          e1x = 15.5; e1y = 6.2;
          e2x = 15.5; e2y = 13.8;
          px = 0.8; py = 0;
        } else if (dx === -1) {
          // 向左移动：面朝左侧，双眼居左并收紧垂直间距
          e1x = 4.5; e1y = 6.2;
          e2x = 4.5; e2y = 13.8;
          px = -0.8; py = 0;
        } else if (dy === 1) {
          // 向下移动：面朝下方，双眼居下并收紧水平间距
          e1x = 6.2; e1y = 15.5;
          e2x = 13.8; e2y = 15.5;
          px = 0; py = 0.8;
        } else {
          // 向上移动：面朝上方，双眼居上并收紧水平间距
          e1x = 6.2; e1y = 4.5;
          e2x = 13.8; e2y = 4.5;
          px = 0; py = -0.8;
        }
      }

      // 灵动视线预瞄：若缓冲队列中有下一个待执行指令，瞳孔提前向目标方向瞥视预瞄
      const nextQueued = queueRef?.current && queueRef.current.length > 0 ? queueRef.current[0] : null;
      if (nextQueued) {
        if (nextQueued === 'UP') { px = 0; py = -1.2; }
        else if (nextQueued === 'DOWN') { px = 0; py = 1.2; }
        else if (nextQueued === 'LEFT') { px = -1.2; py = 0; }
        else if (nextQueued === 'RIGHT') { px = 1.2; py = 0; }
      }

      // 蛇头情绪微表情状态机 (落幕闭目 / 吃果笑弯 / 濒死惊慌 / 灵动明眸)
      const isDeadState = isGameOver;
      const isSatisfied = !isDeadState && nowTime - (lastEatTimestamp || 0) < 220;

      // 探测正前方 1 格死角危险状态 (Panic Glance)
      let isPanic = false;
      if (!isDeadState && !isSatisfied && snake.length > 1) {
        const next = snake[1];
        const hdx = head.x - next.x;
        const hdy = head.y - next.y;
        const frontX = head.x + hdx;
        const frontY = head.y + hdy;
        const isBlocked =
          frontX < 0 || frontX >= GRID || frontY < 0 || frontY >= GRID ||
          fenceRef.current.has(`${frontX},${frontY}`) ||
          snake.some((s) => s.x === frontX && s.y === frontY);
        if (isBlocked) isPanic = true;
      }

      if (isDeadState) {
        // 1. 游戏落幕：闭目微线
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(head.x * CELL + e1x - 2, head.y * CELL + e1y);
        ctx.lineTo(head.x * CELL + e1x + 2, head.y * CELL + e1y);
        ctx.moveTo(head.x * CELL + e2x - 2, head.y * CELL + e2y);
        ctx.lineTo(head.x * CELL + e2x + 2, head.y * CELL + e2y);
        ctx.stroke();
      } else if (isSatisfied) {
        // 2. 吃果满足：灵动笑弯月牙弧线
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x, head.y * CELL + e1y + 1, 2.2, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(head.x * CELL + e2x, head.y * CELL + e2y + 1, 2.2, Math.PI, 0);
        ctx.stroke();
      } else if (isPanic) {
        // 3. 濒死惊慌：眼白瞪大至 2.6px，瞳孔急剧微缩至 0.75px 并施加高频微颤抖
        const jitterX = Math.sin(nowTime * 0.04) * 0.6;
        const jitterY = Math.cos(nowTime * 0.04) * 0.6;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x, head.y * CELL + e1y, 2.6, 0, Math.PI * 2);
        ctx.arc(head.x * CELL + e2x, head.y * CELL + e2y, 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x + px + jitterX, head.y * CELL + e1y + py + jitterY, 0.75, 0, Math.PI * 2);
        ctx.arc(head.x * CELL + e2x + px + jitterX, head.y * CELL + e2y + py + jitterY, 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 4. 常态：机敏明眸与视线追踪预瞄
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x, head.y * CELL + e1y, 2.2, 0, Math.PI * 2);
        ctx.arc(head.x * CELL + e2x, head.y * CELL + e2y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x + px, head.y * CELL + e1y + py, 1.2, 0, Math.PI * 2);
        ctx.arc(head.x * CELL + e2x + px, head.y * CELL + e2y + py, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
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
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = ft.text.includes('30')
          ? 'bold 14px system-ui, sans-serif'
          : 'bold 12px system-ui, sans-serif';
        // 纯白晶体微描边，消除画布杂色干扰
        ctx.strokeStyle = `rgba(255, 255, 255, ${ft.alpha * 0.9})`;
        ctx.lineWidth = 2.2;
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
        activeTexts.push(ft);
      }
    });
    floatingTextsRef.current = activeTexts;

    ctx.restore();
  }, [fenceRef, foodRef, bonusRef, snakeRef, speedMs, isPlaying, isPaused, isGameOver, queueRef]);

  // 全屏连续滑屏手势引擎 (Swipe Engine：16px 动态死区 + 0ms 瞬间触发 + 连贯过弯不断触)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0 || !touchStartPosRef.current) return;
    if (isReplay || !isPlaying || isGameOver || isPaused) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // 16px 黄金触发门限：既滤除手抖，又实现瞬发 0 延迟转弯
    if (Math.max(absX, absY) >= 16) {
      sound.unlockAudio();
      let targetDir: Direction;
      if (absX > absY) {
        targetDir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        targetDir = dy > 0 ? 'DOWN' : 'UP';
      }

      // 执行转向与机械吸附触感
      onDirection(targetDir);
      haptics.trigger('snap');

      // 连续滑行不断触：将当前触点重置为新起点，允许一笔划连续过弯
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  };

  const handleTouchEnd = () => {
    touchStartPosRef.current = null;
  };

  // 电竞级 Delta-Time 累加物理积分时钟引擎 (统一 rAF 单时钟驱动，彻底消灭 setInterval 抖动与顿挫)
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (currentTime: number) => {
      // 100ms 保护门限，防止切后台标签页恢复时由于时间过大产生连续冲撞
      const delta = Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;

      if (isPlaying && !isPaused && !isGameOver) {
        const effectiveSpeed = isReplay ? speedMs / (replaySpeedRate || 1) : speedMs;
        accumulator += delta;

        // 物理走步时序积分：达到一个步进周期时触发物理判定
        while (accumulator >= effectiveSpeed) {
          onTick();
          accumulator -= effectiveSpeed;
        }
      }

      // 无论游戏是否暂停，统一按屏幕刷新率 (60Hz/120Hz) 平滑渲染 Canvas 与粒子光效
      render();
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
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
    haptics.trigger('snap');
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl flex flex-col items-center select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* 观摩回放模式专属横幅 */}
      {isReplay && (
        <div className="w-full mb-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#EBF8FF] to-[#E0F2FE] border border-[#66CCFF]/40 text-[#0099FF] flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#0099FF] shrink-0 animate-pulse" />
            <span className="truncate">观摩走位中：<strong className="text-slate-900">{replayUser}</strong></span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white font-mono text-[#0099FF] shadow-2xs">
              {replaySpeedRate}x 倍速
            </span>
            <button
              onClick={onExitReplay}
              className="text-[11px] text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
            >
              退出
            </button>
          </div>
        </div>
      )}

      {/* 顶部四段式状态胶囊栏 */}
      <div className="w-full grid grid-cols-4 gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-center text-xs">
        {statCapsules.map((st) => (
          <div
            key={st.label}
            className={`${st.bg} py-2 px-1 rounded-2xl relative overflow-hidden transition-all duration-150 ${
              st.label === '得分' && scorePulse ? 'scale-105' : 'scale-100'
            } ${
              st.label === '速度' && speedPulse ? 'scale-105 ring-2 ring-[#0099FF]/40 shadow-xs' : ''
            }`}
          >
            <span className={`${st.text} text-[11px] font-medium`}>{st.label} </span>
            <strong className={`${st.valColor} text-sm font-mono font-black tabular-nums tracking-tight`}>{st.val}</strong>
            {st.isBonus && (
              <span className="absolute top-0.5 right-1 text-[#D97706] font-mono font-extrabold text-[9px] animate-pulse">
                +30
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Canvas 画布与全屏滑屏手势感应层 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative rounded-2xl overflow-hidden bg-[#F8FAFC] border border-slate-200/70 touch-none max-w-full shadow-inner select-none"
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

        {/* 开始游戏遮罩 (非回放模式：带新手直觉操作指引气泡) */}
        {!isPlaying && !isGameOver && !isReplay && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 select-none">
            <button
              onClick={onStart}
              className="px-7 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Play size={16} />
              <span>开始游戏</span>
              <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#66CCFF]" />
              <span>按空格/方向键 或 屏幕任意处划动启程</span>
            </div>
          </div>
        )}

        {/* 开局就绪等待唤醒指示器 (消除重开瞬发猝死，按键或触控即走) */}
        {isPlaying && !isGameOver && !isPaused && isWaitingStart && !isReplay && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-black/[0.02]">
            <div className="animate-pulse flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 border border-slate-200/90 shadow-sm text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#0099FF]" />
              <span>按方向键 / 滑动屏幕出发</span>
            </div>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-0.8 rounded-full bg-rose-50 text-rose-500 font-bold text-xs mb-2.5">
              <span>{isReplay ? '观摩播放结束' : '游戏结束'}</span>
            </div>

            {/* 荣耀加冕：南大家园多巴胺微拟态段位勋章 */}
            <div className="mb-2">
              <SettleTierCrest score={score} />
            </div>

            <div className="text-2xl sm:text-3xl font-black text-[#0F172A] font-mono tracking-tight mb-1.5">
              {score} <span className="text-xs font-normal text-slate-400">分</span>
            </div>

            {/* 诗意短评 (融入南大情怀与对局特征) */}
            <p className="text-[11px] text-slate-400 font-medium mb-3 max-w-xs leading-relaxed">
              “{(() => {
                const hour = new Date().getHours();
                if (hour >= 23 || hour < 5) return '夜深了，南昌的风微凉，注意休息。';
                if (score >= 500) return '方寸棋盘之间，走出了一片从容开阔天地。';
                if (maxCombo >= 4) return '行云流水，节拍如诗，连击节奏令人赞叹。';
                if (length >= 25) return '游弋如龙，穿行在自己织就的开阔回廊中。';
                if (duration >= 80) return '心平气和，百转千回，沉着笃定。';
                if (score < 100) return '步子迈得有些急，南昌的微风还在等你。';
                return '每一次急转，皆是对广阔空间的精妙度量。';
              })()}”
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-600 mb-4 bg-[#F8FAFC] border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">蛇身长度</span>
                <strong className="text-[#0099FF] font-mono font-bold text-sm tabular-nums">{length}</strong>
              </div>
              <span className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">存活用时</span>
                <strong className="text-[#8B5CF6] font-mono font-bold text-sm tabular-nums">{duration}s</strong>
              </div>
              <span className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">最终移速</span>
                <strong className="text-[#10B981] font-mono font-bold text-sm tabular-nums">
                  {Math.round((BASE_SPEED_MS / speedMs) * 10) / 10}x
                </strong>
              </div>
            </div>

            {isReplay ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowArtModal(true)}
                  className="px-3.5 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border border-slate-200/60"
                  title="生成走位艺术卡片"
                >
                  <Sparkles size={13} className="text-[#0099FF]" />
                  <span>走位卡片</span>
                </button>
                <button
                  onClick={onRestartReplay || onStart}
                  className="px-4 py-2 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={13} />
                  <span>重播</span>
                </button>
                <button
                  onClick={onExitReplay}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 rounded-full text-xs font-bold cursor-pointer shadow-xs"
                >
                  <span>退出</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowArtModal(true)}
                  className="px-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] active:scale-95 text-slate-700 border border-slate-200/80 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Sparkles size={14} className="text-[#0099FF]" />
                  <span>走位艺术卡片</span>
                </button>
                <button
                  onClick={onStart}
                  className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] active:scale-95 transition-all text-white rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={14} />
                  <span>再来一局</span>
                  <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
                </button>
              </div>
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
                className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
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
          <div className="flex items-center justify-center gap-2.5 text-[11px] text-[#94A3B8] pt-1 select-none">
            <span>{showDpad ? '屏幕任意处滑屏 / 十字键随时可用' : '全屏滑屏已就绪 · 享受沉浸大视野'}</span>
            <span>•</span>
            <button
              onClick={toggleDpad}
              title="切换沉浸滑屏视野或经典十字键模式"
              className="text-[11px] font-semibold text-[#0099FF] hover:text-[#0284C7] bg-[#EBF8FF] hover:bg-[#E0F2FE] px-2.5 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs"
            >
              {showDpad ? '切为沉浸滑屏' : '展开十字按键'}
            </button>
          </div>
        )}
      </div>

      {/* 走位几何抽象艺术卡片海报模态弹窗 */}
      <TrajectoryCardModal
        isOpen={showArtModal}
        onClose={() => setShowArtModal(false)}
        trajectory={trajectoryRef?.current || []}
        events={trajectoryEventsRef?.current || []}
        score={score}
        duration={duration}
        maxCombo={maxCombo}
        steps={trajectoryRef?.current?.length || 0}
        username={replayUser || '南大家园极客'}
      />
    </div>
  );
}
