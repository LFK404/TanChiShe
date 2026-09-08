import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Direction, Point, BonusType } from '@/types';
import { CELL, GRID, BASE_SPEED_MS, TrajectoryEvent } from '@/hooks/useSnake';
import { sound } from '@/utils/audio';
import { haptics } from '@/utils/haptics';
import TrajectoryCardModal from './TrajectoryCardModal';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// 极简高性能微动效：基于 rAF 与 Ease-Out Cubic 的丝滑滚数插值组件 (零外置依赖，严格等宽防抖)
function AnimatedNumber({ value }: { value: number }) {
  const [displayVal, setDisplayVal] = useState(value);
  const prevValRef = useRef(value);

  useEffect(() => {
    if (value === prevValRef.current) return;
    const startVal = prevValRef.current;
    const endVal = value;
    prevValRef.current = value;

    let animFrame: number;
    const startTime = performance.now();
    const duration = 220;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * ease);
      setDisplayVal(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [value]);

  return <>{displayVal}</>;
}

interface Props {
  snakeRef: React.MutableRefObject<Point[]>;
  fenceRef: React.MutableRefObject<Set<string>>;
  foodRef: React.MutableRefObject<Point>;
  bonusRef: React.MutableRefObject<Point | null>;
  hasBonus: boolean;
  bonusKey?: number;
  bonusType?: import('@/types').BonusType;
  frostActive?: boolean;
  phaseActive?: boolean;
  queueRef?: React.MutableRefObject<Direction[]>;
  score: number;
  duration: number;
  length: number;
  speedMs: number;
  comboCount?: number;
  maxCombo?: number;
  lastEatTimestamp?: number;
  totalElapsedMs?: number;
  lastEatElapsedMs?: number;
  bonusProgressPercent?: number;
  bonusRemainSec?: number;
  trajectoryRef?: React.MutableRefObject<Point[]>;
  trajectoryEventsRef?: React.MutableRefObject<TrajectoryEvent[]>;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  isWaitingStart?: boolean;
  resumeCountdown?: number | null;
  deathReason?: string;
  highScore?: number;
  isReplay?: boolean;
  replayUser?: string;
  replaySpeedRate?: number;
  replayCurrentTick?: number;
  replayTotalTicks?: number;
  onSeekReplay?: (tick: number) => void;
  onSetReplaySpeed?: (speed: number) => void;
  onExitReplay?: () => void;
  onRestartReplay?: () => void;
  onStart: () => void;
  onTick: () => void;
  onDirection: (d: Direction) => void;
  onTogglePause?: () => void;
  isCompetitiveMode?: boolean;
  ghostSnakeRef?: React.MutableRefObject<Point[]>;
  isGhostAlive?: boolean;
  ghostUser?: string;
  ghostTargetScore?: number;
  ghostScore?: number;
  deltaScore?: number;
  deltaState?: import('@/types').DeltaState;
  ghostDispersing?: boolean;
  onToggleCompetitiveMode?: () => void;
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

type ParticleShape = 'circle' | 'star' | 'leaf' | 'voxel' | 'spark';

// 粒子爆发微特效实体 (支持对象池零GC复用与高阶物理阻尼、自转与多形态)
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  coreColor?: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity?: number;
  shape: ParticleShape;
  rot?: number;
  vRot?: number;
  active: boolean;
}

const PARTICLE_POOL_SIZE = 160;
const createParticlePool = (): Particle[] =>
  Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: '#FFFFFF',
    size: 2,
    alpha: 0,
    life: 0,
    maxLife: 20,
    drag: 0.9,
    shape: 'circle',
    active: false,
  }));

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

// 蛇身吞咽物理流光传导波
interface DigestionWave {
  startTime: number;
  isBonus: boolean;
  bonusType?: BonusType;
  totalSegments: number;
}

export default function Board({
  snakeRef, fenceRef, foodRef, bonusRef, hasBonus, bonusKey = 0,
  bonusType = 'GOLD', frostActive = false, phaseActive = false,
  bonusProgressPercent = 100, bonusRemainSec = 8.0,
  queueRef,
  score, duration, length, speedMs, comboCount = 0, maxCombo = 0,
  lastEatTimestamp = 0, totalElapsedMs = 0, lastEatElapsedMs = -99999,
  trajectoryRef, trajectoryEventsRef,
  isPlaying, isGameOver, isPaused,
  isWaitingStart = false,
  resumeCountdown = null,
  deathReason = '',
  highScore = 0,
  isReplay = false, replayUser = '', replaySpeedRate = 1,
  replayCurrentTick = 0, replayTotalTicks = 0, onSeekReplay,
  onSetReplaySpeed, onExitReplay, onRestartReplay,
  onStart, onTick, onDirection, onTogglePause,
  isCompetitiveMode = false,
  ghostSnakeRef,
  isGhostAlive = false,
  ghostUser = '',
  ghostTargetScore = 0,
  ghostScore = 0,
  deltaScore = 0,
  onToggleCompetitiveMode,
}: Props) {
  const [showArtModal, setShowArtModal] = useState(false);
  const [artData, setArtData] = useState<{
    trajectory: Point[];
    events: TrajectoryEvent[];
    steps: number;
  } | null>(null);

  // 打开走位艺术卡片：在事件回调中安全捕获轨迹快照，避免在 render 阶段直接读取 ref.current
  const handleOpenArtModal = useCallback(() => {
    setArtData({
      trajectory: [...(trajectoryRef?.current || [])],
      events: [...(trajectoryEventsRef?.current || [])],
      steps: trajectoryRef?.current?.length || 0,
    });
    setShowArtModal(true);
  }, [trajectoryRef, trajectoryEventsRef]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const particlesRef = useRef<Particle[]>(createParticlePool());
  const motionTrailsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const confettiRef = useRef<Confetti[]>([]);
  const digestionWavesRef = useRef<DigestionWave[]>([]);
  const shakeRef = useRef({ frames: 0, intensity: 0 });
  const prevScoreRef = useRef(score);
  const prevGameOverRef = useRef(isGameOver);
  const offscreenBgRef = useRef<HTMLCanvasElement | null>(null);
  const bonusSpawnTimeRef = useRef<number>(0);
  const foodSpawnTimeRef = useRef<number>(0);
  const fenceSpawnTimeRef = useRef<Map<string, number>>(new Map());

  // 监听首次超越个人历史最佳纪录 (PB Broken Moment)
  const hasBrokenRecordRef = useRef(false);
  useEffect(() => {
    if (!isPlaying) {
      hasBrokenRecordRef.current = false;
    } else if (highScore > 0 && score > highScore && !hasBrokenRecordRef.current && !isReplay) {
      hasBrokenRecordRef.current = true;
      sound.playAchievement();
      haptics.trigger('bonus');
    }
  }, [score, highScore, isPlaying, isReplay]);

  // 街机连击狂潮专属手绘大字报弹出状态 (3x COMBO / 5x RUSH / MAX ULTRA)
  const [prevCombo, setPrevCombo] = useState(comboCount);
  const [comboSplash, setComboSplash] = useState<'3x' | '5x' | 'max' | null>(null);

  if (comboCount !== prevCombo) {
    setPrevCombo(comboCount);
    if (isPlaying && !isGameOver && !isReplay && comboCount > prevCombo) {
      if (comboCount >= 8) {
        setComboSplash('max');
      } else if (comboCount >= 5) {
        setComboSplash('5x');
      } else if (comboCount >= 3) {
        setComboSplash('3x');
      }
    }
  }

  useEffect(() => {
    if (!comboSplash) return;
    const timer = setTimeout(() => {
      setComboSplash(null);
    }, 850);
    return () => clearTimeout(timer);
  }, [comboSplash]);

  // 监听开局与吃果得分，记录食物生成时间用于果冻微弹跳渲染
  const prevSpeedMsRef = useRef(speedMs);
  useEffect(() => {
    foodSpawnTimeRef.current = Date.now();
  }, [score, isPlaying]);

  // 监听金果生成时间用于临期急速频闪判定
  useEffect(() => {
    if (hasBonus) {
      bonusSpawnTimeRef.current = Date.now();
    }
  }, [hasBonus, bonusKey]);

  // 混合输入设备 (平板/iPad/电脑/手机) 智能触控能力探测：大屏设备默认不展示十字键，手机小屏才默认展示
  const [showDpad, setShowDpad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('snake_show_dpad');
      if (saved !== null) return saved === 'true';
      const hasTouch =
        navigator.maxTouchPoints > 0 ||
        'ontouchstart' in window ||
        window.matchMedia('(any-pointer: coarse)').matches;
      // 仅在宽度小于 768px 的触屏手机上才默认开启虚拟按键；PC/平板大屏默认关闭，给予纯净大屏视野
      return hasTouch && window.innerWidth < 768;
    } catch {
      return false;
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

  // 虚拟方向键形态偏好：'cross' (经典超椭圆一体十字盘) 或 't' (电脑键盘倒T布局)
  const [dpadLayout, setDpadLayout] = useState<'cross' | 't'>(() => {
    if (typeof window === 'undefined') return 'cross';
    try {
      const saved = localStorage.getItem('snake_dpad_layout');
      return saved === 't' ? 't' : 'cross';
    } catch {
      return 'cross';
    }
  });

  const toggleDpadLayout = useCallback(() => {
    setDpadLayout((prev) => {
      const next = prev === 'cross' ? 't' : 'cross';
      try {
        localStorage.setItem('snake_dpad_layout', next);
      } catch {}
      sound.playToggle();
      haptics.trigger('ui');
      return next;
    });
  }, []);

  // 离屏 Canvas 预渲染静态网格背景 (自适应深空墨蓝夜间态与明亮态，监听主题切换热重绘)
  useEffect(() => {
    const renderBg = () => {
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
    };

    renderBg();

    const observer = new MutationObserver(() => {
      renderBg();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // 触发屏幕轻微震颤动效
  const triggerShake = (frames = 6, intensity = 2.5) => {
    shakeRef.current = { frames, intensity };
  };

  // 从预分配对象池中复用或置换激活粒子 (Zero-GC 零垃圾回收微引擎)
  const spawnFromPool = (props: Omit<Particle, 'active' | 'life' | 'alpha'>) => {
    const pool = particlesRef.current;
    let p = pool.find((item) => !item.active);
    if (!p) {
      p = pool.reduce(
        (oldest, item) => (item.life / item.maxLife > oldest.life / oldest.maxLife ? item : oldest),
        pool[0]
      );
    }
    p.x = props.x;
    p.y = props.y;
    p.vx = props.vx;
    p.vy = props.vy;
    p.color = props.color;
    p.coreColor = props.coreColor;
    p.size = props.size;
    p.alpha = 1;
    p.life = 0;
    p.maxLife = props.maxLife;
    p.drag = props.drag;
    p.gravity = props.gravity;
    p.shape = props.shape;
    p.rot = props.rot || 0;
    p.vRot = props.vRot || 0;
    p.active = true;
  };

  // 吃到金色幸运果：高初速瞬间爆裂 + 强空气阻尼悬停 + 经典南大家园四芒微星曜与流金微粒
  const spawnBonusParticles = useCallback((gridX: number, gridY: number) => {
    const cx = gridX * CELL + CELL / 2;
    const cy = gridY * CELL + CELL / 2;
    const colors = ['#F59E0B', '#FBBF24', '#FEF3C7', '#FFFFFF'];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 4.0 + Math.random() * 3.2; // 瞬间高爆发初速
      const isStar = i % 3 === 0; // 30% 经典四芒星曜
      const isCoreGlow = i % 4 === 0;
      spawnFromPool({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        coreColor: isCoreGlow ? '#FFFFFF' : undefined,
        size: isStar ? 4.8 + Math.random() * 2.2 : 2.8 + Math.random() * 1.8,
        drag: 0.88, // 强空气阻尼：瞬间炸开后悬停减速
        gravity: 0.04,
        shape: isStar ? 'star' : 'circle',
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        maxLife: 26 + Math.floor(Math.random() * 10),
      });
    }
  }, []);

  // 吃到冰霜寒果：天青晶蓝微晶雪花爆发 + 强空气阻尼悬停
  const spawnFrostParticles = useCallback((gridX: number, gridY: number) => {
    const cx = gridX * CELL + CELL / 2;
    const cy = gridY * CELL + CELL / 2;
    const colors = ['#38BDF8', '#7DD3FC', '#BAE6FD', '#FFFFFF'];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 3.6 + Math.random() * 2.8;
      const isStar = i % 3 === 0;
      spawnFromPool({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        coreColor: '#FFFFFF',
        size: isStar ? 4.5 + Math.random() * 2.0 : 2.5 + Math.random() * 1.6,
        drag: 0.88,
        gravity: 0.03,
        shape: isStar ? 'star' : 'spark',
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        maxLife: 24 + Math.floor(Math.random() * 8),
      });
    }
  }, []);

  // 吃到极光虚化果：极光紫粉星芒爆裂 + 穿透虚化粒子
  const spawnPhaseParticles = useCallback((gridX: number, gridY: number) => {
    const cx = gridX * CELL + CELL / 2;
    const cy = gridY * CELL + CELL / 2;
    const colors = ['#A855F7', '#C084FC', '#F472B6', '#FFFFFF'];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 3.8 + Math.random() * 3.0;
      const isStar = i % 3 === 0;
      spawnFromPool({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        coreColor: '#FFFFFF',
        size: isStar ? 4.8 + Math.random() * 2.2 : 2.8 + Math.random() * 1.8,
        drag: 0.88,
        gravity: 0.02,
        shape: isStar ? 'star' : 'spark',
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        maxLife: 26 + Math.floor(Math.random() * 10),
      });
    }
  }, []);

  // 吃到普通红苹果：珊瑚红多汁果肉微粒 + 翡翠绿嫩叶碎屑微切片
  const spawnFruitParticles = useCallback((gridX: number, gridY: number) => {
    const cx = gridX * CELL + CELL / 2;
    const cy = gridY * CELL + CELL / 2;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 3.2 + Math.random() * 2.2;
      const isLeaf = i % 4 === 0; // 25% 翡翠绿嫩叶
      spawnFromPool({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: isLeaf ? '#10B981' : i % 2 === 0 ? '#EF4444' : '#F87171',
        coreColor: isLeaf ? '#A7F3D0' : '#FECACA',
        size: isLeaf ? 3.8 + Math.random() * 1.8 : 2.6 + Math.random() * 1.8,
        drag: 0.89,
        gravity: 0.05,
        shape: isLeaf ? 'leaf' : 'circle',
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        maxLife: 22 + Math.floor(Math.random() * 8),
      });
    }
  }, []);

  // 连击飞驰或极限移速下的蛇尾流光微星轨 (低频轻巧发射，寿命仅9帧，绝不干扰视线)
  const spawnSpeedTrailParticle = useCallback((tailX: number, tailY: number, isCombo: boolean) => {
    spawnFromPool({
      x: tailX * CELL + CELL / 2 + (Math.random() - 0.5) * 4,
      y: tailY * CELL + CELL / 2 + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      color: isCombo ? '#FBBF24' : '#38BDF8',
      coreColor: '#FFFFFF',
      size: 1.4 + Math.random() * 1.0,
      drag: 0.84,
      shape: 'spark',
      rot: Math.random() * Math.PI * 2,
      maxLife: 9,
    });
  }, []);

  // 死亡撞墙冲击波爆发粒子
  const spawnDeathExplosion = useCallback((gridX: number, gridY: number) => {
    const cx = gridX * CELL + CELL / 2;
    const cy = gridY * CELL + CELL / 2;
    const colors = ['#EF4444', '#F87171', '#FCA5A5', '#FFFFFF'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.3;
      const speed = 3.6 + Math.random() * 3.2;
      spawnFromPool({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        coreColor: '#FFFFFF',
        size: 2.0 + Math.random() * 2.2,
        drag: 0.87,
        gravity: 0.06,
        shape: i % 4 === 0 ? 'star' : 'circle',
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        maxLife: 26 + Math.floor(Math.random() * 10),
      });
    }
  }, []);

  // 吃到红苹果清空栅栏时爆发体素砖石瓦解小碎块 (带角速度与微重力，逼真崩解打击感)
  const spawnCrumbleParticles = useCallback((gridX: number, gridY: number) => {
    const cx = gridX * CELL + CELL / 2;
    const cy = gridY * CELL + CELL / 2;
    const colors = ['#94A3B8', '#CBD5E1', '#64748B'];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 2.2;
      spawnFromPool({
        x: cx + (Math.random() - 0.5) * 6,
        y: cy + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.7, // 向上轻抛
        color: colors[i % colors.length],
        size: 3.2 + Math.random() * 1.8,
        drag: 0.91,
        gravity: 0.12, // 砖石瓦解重力下坠
        shape: 'voxel',
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        maxLife: 22 + Math.floor(Math.random() * 8),
      });
    }
  }, []);

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

  // 监听移速提升：指尖触感轻巧反馈，杜绝遮挡视野
  useEffect(() => {
    if (speedMs < prevSpeedMsRef.current && isPlaying && !isPaused && !isGameOver) {
      haptics.trigger('snap');
      prevSpeedMsRef.current = speedMs;
    }
    prevSpeedMsRef.current = speedMs;
  }, [speedMs, isPlaying, isPaused, isGameOver]);

  // 破纪录 / 高分加冕时屏幕两侧喷射 NCU HOME 四色彩纸礼花
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

  // 监听得分变化，精确捕捉连击、吞咽波、粉尘瓦解与音效反馈 (支持开局重置视觉残余)
  useEffect(() => {
    if (score < prevScoreRef.current) {
      // 重新开局：清空上一局残留的视觉特效与时间戳缓存，重置粒子对象池
      fenceSpawnTimeRef.current.clear();
      particlesRef.current.forEach((p) => {
        p.active = false;
      });
      floatingTextsRef.current = [];
      confettiRef.current = [];
      digestionWavesRef.current = [];
    } else if (score > prevScoreRef.current) {
      const diff = score - prevScoreRef.current;
      const head = snakeRef.current[0] || { x: 10, y: 12 };
      const now = Date.now();

      // 精确判定吃到的果实类型 (优先基于轨迹事件流，100% 区分金果、冰果、虚化果与红苹果)
      const lastEvent = trajectoryEventsRef?.current?.[trajectoryEventsRef.current.length - 1];
      const isBonusEat = Boolean(lastEvent && lastEvent.type === 'BONUS' && lastEvent.x === head.x && lastEvent.y === head.y);
      const eatenBonusType = isBonusEat ? (lastEvent?.bonusType || 'GOLD') : null;

      // 触发蛇身物理吞咽传导波 (包含具体果实属性与当前蛇节长度，用于流光传导)
      digestionWavesRef.current.push({
        startTime: now,
        isBonus: isBonusEat,
        bonusType: eatenBonusType || undefined,
        totalSegments: snakeRef.current.length,
      });

      const currentCombo = comboCount || 1;

      if (eatenBonusType === 'FROST') {
        // 吃到冰霜寒果：天青晶蓝粒子爆发、专属飘字、减速微震
        triggerShake(2, 0.9);
        spawnFrostParticles(head.x, head.y);
        fenceSpawnTimeRef.current.clear();
        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+10 寒霜减速 (3s)!', '#0284C7');
        } else {
          spawnFloatingText(head.x, head.y, `+${diff} 冰果 ${currentCombo}连击!`, '#0284C7');
        }
      } else if (eatenBonusType === 'PHASE') {
        // 吃到极光虚化果：极光紫粉星芒爆裂、专属飘字、穿透微震
        triggerShake(3, 1.2);
        spawnPhaseParticles(head.x, head.y);
        fenceSpawnTimeRef.current.clear();
        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+10 极光穿墙 (2s)!', '#A855F7');
        } else {
          spawnFloatingText(head.x, head.y, `+${diff} 虚化 ${currentCombo}连击!`, '#A855F7');
        }
      } else if (eatenBonusType === 'GOLD' || diff >= 30) {
        // 金色幸运果：微阻尼收敛震动 (3帧/1.2px)，高初速多巴胺微星曜爆发，清空栅栏
        triggerShake(3, 1.2);
        spawnBonusParticles(head.x, head.y);
        fenceSpawnTimeRef.current.clear();

        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+30 幸运金果!', '#D97706');
        } else if (currentCombo === 2) {
          spawnFloatingText(head.x, head.y, '+30 (2连击)', '#D97706');
        } else {
          const extra = (currentCombo - 2) * 5;
          spawnFloatingText(head.x, head.y, `+${diff} 金果 ${currentCombo}连击! (+${extra})`, '#D97706');
        }
      } else {
        // 普通红苹果：轻柔微震 (2帧/0.8px)，清空栅栏并爆发珊瑚红果肉与翡翠绿嫩叶粒子
        triggerShake(2, 0.8);
        spawnFruitParticles(head.x, head.y);
        fenceRef.current.forEach((k) => {
          const [fx, fy] = k.split(',').map(Number);
          spawnCrumbleParticles(fx, fy);
        });
        fenceSpawnTimeRef.current.clear();

        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+10', '#10B981');
        } else if (currentCombo === 2) {
          spawnFloatingText(head.x, head.y, '+10 (2连击)', '#0099FF');
        } else {
          const extra = (currentCombo - 2) * 5;
          spawnFloatingText(head.x, head.y, `+${diff} ${currentCombo}连击! (+${extra})`, '#0099FF');
        }
      }
    }
    prevScoreRef.current = score;
  }, [score, snakeRef, fenceRef, comboCount, spawnBonusParticles, spawnFrostParticles, spawnPhaseParticles, spawnFruitParticles, spawnCrumbleParticles, trajectoryEventsRef]);

  // 监听游戏结束，触发死亡轻微震屏 (6帧/2.5px)、冲击波粒子消散与高光礼花
  useEffect(() => {
    if (isGameOver && !prevGameOverRef.current) {
      triggerShake(6, 2.5);
      const head = snakeRef.current[0];
      if (head) {
        spawnDeathExplosion(head.x, head.y);
      }
      if (score >= 100) {
        spawnConfetti();
      }
    }
    prevGameOverRef.current = isGameOver;
  }, [isGameOver, snakeRef, score, spawnDeathExplosion]);

  // 初始化与视口缩放时维护 Canvas 视网膜高清分辨率 (DPR 物理像素无损映射)
  useEffect(() => {
    const updateCanvasResolution = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
      const size = GRID * CELL;
      const expectedSize = Math.round(size * dpr);
      if (cvs.width !== expectedSize || cvs.height !== expectedSize) {
        cvs.width = expectedSize;
        cvs.height = expectedSize;
      }
    };
    updateCanvasResolution();
    window.addEventListener('resize', updateCanvasResolution);
    return () => window.removeEventListener('resize', updateCanvasResolution);
  }, []);

  // 主渲染流程 (Canvas 2D 极简现代主义绘制引擎)
  const render = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
    const expectedSize = Math.round(GRID * CELL * dpr);
    // 防御性分辨率校准：彻底杜绝 React VDOM 重渲染覆盖 DOM 物理分辨率导致的画面裁切与 2 倍放大错位
    if (cvs.width !== expectedSize || cvs.height !== expectedSize) {
      cvs.width = expectedSize;
      cvs.height = expectedSize;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 处理屏幕震颤偏移 (暂停状态下冻结震颤帧数，解除暂停后顺畅衰减)
    if (shakeRef.current.frames > 0) {
      if (!isPaused) shakeRef.current.frames -= 1;
      const s = shakeRef.current.intensity;
      const ox = (Math.random() - 0.5) * s * 2;
      const oy = (Math.random() - 0.5) * s * 2;
      ctx.translate(ox, oy);
    }

    // 1. 快速绘制预渲染的极简静态网格底板
    if (offscreenBgRef.current) {
      ctx.drawImage(offscreenBgRef.current, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }

    // 1.5 绘制竞技模式幽灵残影 (26% Alpha 天青蓝柔光半透明投影，绝对零物理碰撞)
    if (isCompetitiveMode && ghostSnakeRef && ghostSnakeRef.current && ghostSnakeRef.current.length > 0 && isGhostAlive) {
      const gSnake = ghostSnakeRef.current;
      ctx.save();
      ctx.globalAlpha = 0.28;

      gSnake.forEach((p, idx) => {
        const gx = p.x * CELL;
        const gy = p.y * CELL;
        const isGHead = idx === 0;

        ctx.fillStyle = isGHead ? '#66CCFF' : '#38BDF8';
        ctx.beginPath();
        drawRoundRect(ctx, gx + 1.5, gy + 1.5, CELL - 3, CELL - 3, isGHead ? 6 : 4);
        ctx.fill();

        if (isGHead) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(gx + CELL / 2, gy + CELL / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 虚线电竞轮廓
      ctx.strokeStyle = 'rgba(102, 204, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2.5, 2.5]);
      gSnake.forEach((p) => {
        const gx = p.x * CELL;
        const gy = p.y * CELL;
        ctx.strokeRect(gx + 1.5, gy + 1.5, CELL - 3, CELL - 3);
      });
      ctx.setLineDash([]);
      ctx.restore();
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

    // 4. 绘制特殊幸运果 (金果/冰果/虚化果，常态呼吸与临期频闪)
    const bonus = bonusRef.current;
    if (bonus) {
      const bx = bonus.x * CELL + CELL / 2;
      const by = bonus.y * CELL + CELL / 2;
      const isExpiring = bonusRemainSec <= (bonusType === 'GOLD' ? 3.0 : 1.2) && !isWaitingStart;
      const bScale = 1;
      const pulse = (1 + Math.sin(Date.now() / 150) * 0.08) * bScale;

      let glowColor = 'rgba(245, 158, 11, 0.25)';
      let fruitColor = '#F59E0B';
      let highlightColor = '#FEF3C7';

      if (bonusType === 'FROST') {
        glowColor = 'rgba(56, 189, 248, 0.35)';
        fruitColor = '#38BDF8';
        highlightColor = '#FFFFFF';
      } else if (bonusType === 'PHASE') {
        glowColor = 'rgba(168, 85, 247, 0.35)';
        fruitColor = '#A855F7';
        highlightColor = '#F472B6';
      }

      if (isExpiring) {
        const strobe = Math.sin(Date.now() / 60) > 0;
        glowColor = strobe ? 'rgba(239, 68, 68, 0.45)' : glowColor;
        fruitColor = strobe ? '#EF4444' : fruitColor;
      }

      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(bx, by, (CELL / 2 + (isExpiring ? 3 : 1)) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = fruitColor;
      ctx.beginPath();
      ctx.arc(bx, by, (CELL / 2 - 1.5) * pulse, 0, Math.PI * 2);
      ctx.fill();

      // 专属晶体星标高光
      ctx.fillStyle = highlightColor;
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. 绘制蛇身 (多巴胺晶体平滑渐变 + 连击流光动效与濒危急促呼吸频闪 + 物理吞咽传导波)
    const snake = snakeRef.current;
    const nowTime = Date.now();
    digestionWavesRef.current = digestionWavesRef.current.filter(
      (w) => nowTime - w.startTime < Math.max(1200, (w.totalSegments + 2) * 45)
    );

    // 采用物理时钟计算连击剩余时间 (彻底杜绝暂停期间与倍速回放误灭灯)
    const comboElapsed = (totalElapsedMs !== undefined && lastEatElapsedMs !== undefined && lastEatElapsedMs >= 0)
      ? (totalElapsedMs - lastEatElapsedMs)
      : (nowTime - (lastEatTimestamp || 0));
    // 严格 3 连击起激活全蛇身流金环绕与频闪特效，2 连击保持轻量专注
    const inCombo = (comboCount || 0) >= 3 && comboElapsed >= 0 && comboElapsed < 3000;
    const isEndingSoon = inCombo && comboElapsed >= 2000; // 剩余 1 秒快终止
    const endingBlink = isEndingSoon && Math.sin((comboElapsed - 2000) * 0.025) > 0;

    // 连击飞驰或极限移速状态下蛇尾向后留下的流光微星轨 (低频轻量，寿命仅9帧，绝不干扰走位)
    if (isPlaying && !isPaused && !isGameOver && snake.length >= 3 && (inCombo || speedMs <= 95)) {
      if (Math.random() < 0.32) {
        const tail = snake[snake.length - 1];
        spawnSpeedTrailParticle(tail.x, tail.y, inCombo);
      }
    }

    if (snake.length > 1) {
      const len = snake.length;
      for (let i = len - 1; i >= 1; i--) {
        const seg = snake[i];
        const ratio = 1 - i / len;

        // 基底天青晶体平滑色彩 (蛇头天青 #38BDF8 -> 蛇尾冰蓝 #7DD3FC)
        const baseR = Math.round(56 + (1 - ratio) * 69);
        const baseG = Math.round(189 + (1 - ratio) * 22);
        const baseB = Math.round(248 + (1 - ratio) * 4);
        let color = `rgb(${baseR},${baseG},${baseB})`;
        let goldIntensity = 0;

        if (frostActive) {
          // 冰果减速中：纯澈冰晶天蓝渐变
          const fR = Math.round(56 + (1 - ratio) * 60);
          const fG = Math.round(189 + (1 - ratio) * 40);
          color = `rgb(${fR},${fG},255)`;
        } else if (phaseActive) {
          // 虚化果穿墙中：极光霓虹紫渐变
          const pR = Math.round(168 + (1 - ratio) * 50);
          const pG = Math.round(85 + (1 - ratio) * 50);
          const pB = Math.round(247 + (1 - ratio) * 8);
          color = `rgb(${pR},${pG},${pB})`;
        } else if (inCombo) {
          if (endingBlink) {
            // 快终止急促频闪预警
            color = (i + Math.floor(nowTime / 120)) % 2 === 0 ? '#F59E0B' : '#EF4444';
          } else {
            // 连击进行中：精确 5 节流金波峰 (角频率 0.628 即 π/5，半波正峰完整跨越 5 节)，周期 150ms 奔腾顺传
            const rawWave = Math.sin(nowTime / 150 - i * 0.628);
            goldIntensity = rawWave > 0 ? Math.pow(rawWave, 1.05) : 0;
            // 数学级连续 RGB 线性插值：过渡至浓郁纯正流金橙黄 [245, 158, 11] (#F59E0B)
            const r = Math.round(baseR + (245 - baseR) * goldIntensity);
            const g = Math.round(baseG + (158 - baseG) * goldIntensity);
            const b = Math.round(baseB + (11 - baseB) * goldIntensity);
            color = `rgb(${r},${g},${b})`;
          }
        }

        // 计算物理吞咽波传导到当前节时的微隆起弹性形变与流光发光核
        let bulge = 0;
        let activeBonusType: BonusType | null = null;
        for (const w of digestionWavesRef.current) {
          const waveElapsed = nowTime - w.startTime;
          // 每节传导约 40ms，波形自然顺畅流动
          const targetIdx = waveElapsed / 40;
          const dist = Math.abs(i - targetIdx);
          const isGoldWave = w.isBonus || w.bonusType === 'GOLD';
          const waveRadius = isGoldWave ? 2.5 : 1.3; // 金果吞咽波峰跨度扩展为整整 5 节 (半径 2.5 节)
          if (dist < waveRadius) {
            const intensity = 1 - dist / waveRadius;
            if (intensity * 0.28 > bulge) {
              bulge = intensity * 0.28;
              activeBonusType = w.bonusType || (w.isBonus ? 'GOLD' : null);
            }
          }
        }

        // 检测当前节是否处于转弯拐角 (前后节构成 90° 折角，赋予流线型柔性管道圆角)
        const prevSeg = snake[i - 1];
        const nextSeg = snake[i + 1];
        const isCorner = prevSeg && nextSeg && prevSeg.x !== nextSeg.x && prevSeg.y !== nextSeg.y;

        const scaleFactor = 1 + bulge;
        const segSize = (CELL - 2) * scaleFactor;
        const offset = ((CELL - 2) * (scaleFactor - 1)) / 2;
        const cornerRadius = isCorner ? 6 : 4;

        ctx.save();
        // 蛇身专属技能与状态外发光光晕
        if (phaseActive) {
          ctx.globalAlpha = 0.55;
          ctx.shadowColor = 'rgba(168, 85, 247, 0.85)';
          ctx.shadowBlur = 8;
        } else if (frostActive) {
          ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
          ctx.shadowBlur = 7;
        } else if (inCombo) {
          if (endingBlink) {
            ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
            ctx.shadowBlur = 6;
          } else {
            // 全身金光随流光微动柔和呼吸，光晕温润
            const glowAlpha = 0.4 + 0.35 * goldIntensity;
            ctx.shadowColor = `rgba(245, 158, 11, ${glowAlpha.toFixed(2)})`;
            ctx.shadowBlur = 3 + 3 * goldIntensity;
          }
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        drawRoundRect(
          ctx,
          seg.x * CELL + 1 - offset,
          seg.y * CELL + 1 - offset,
          segSize,
          segSize,
          cornerRadius
        );
        ctx.fill();

        // 晶体描边：连击时泛出温润流动金光，平时纯白晶莹
        if (inCombo && !endingBlink) {
          const strokeAlpha = (0.75 + 0.2 * goldIntensity).toFixed(2);
          ctx.strokeStyle = goldIntensity > 0.4 ? `rgba(254, 240, 138, ${strokeAlpha})` : `rgba(255, 255, 255, ${strokeAlpha})`;
          ctx.lineWidth = goldIntensity > 0.4 ? 1.0 : 0.8;
        } else if (inCombo && endingBlink) {
          ctx.strokeStyle = 'rgba(255, 237, 213, 0.9)';
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();

        // 连击能量行波流光微核 (在流金光梭中心点亮精巧高光核)
        if (inCombo && !endingBlink && goldIntensity > 0.75 && bulge <= 0.05) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(
            seg.x * CELL + 1 + (CELL - 2) / 2,
            seg.y * CELL + 1 + (CELL - 2) / 2,
            1.6,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // 吞咽流光波经过当前节时：在关节内部叠加绘制晶莹发光核 (普通果晶白，金果流金，冰果冰蓝，虚化果极光紫)
        if (bulge > 0.05) {
          const coreAlpha = Math.min(0.85, bulge * 3.4);
          let coreFill = `rgba(255, 255, 255, ${coreAlpha})`;
          if (activeBonusType === 'FROST') {
            coreFill = `rgba(186, 230, 253, ${coreAlpha})`;
          } else if (activeBonusType === 'PHASE') {
            coreFill = `rgba(243, 232, 255, ${coreAlpha})`;
          } else if (activeBonusType === 'GOLD') {
            coreFill = `rgba(254, 243, 199, ${coreAlpha})`;
          }
          ctx.fillStyle = coreFill;
          ctx.beginPath();
          ctx.arc(
            seg.x * CELL + 1 + (CELL - 2) / 2,
            seg.y * CELL + 1 + (CELL - 2) / 2,
            ((CELL - 2) / 2) * (0.35 + bulge * 1.4),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // 6. 极速狂飙运动残影 (speedMs <= 88，即 1.7x 破风档以上开启)
    const head = snake[0];
    if (speedMs <= 88 && isPlaying && !isPaused && !isGameOver && head) {
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

    // 7. 绘制蛇头 (NCU HOME 天青蓝 #66CCFF + 连击濒危频闪 + 纯白晶体描边 + 灵动双眼视线追踪)
    if (head) {
      ctx.save();
      let headColor = '#66CCFF';
      if (phaseActive) {
        headColor = '#A855F7';
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.95)';
        ctx.shadowBlur = 10;
      } else if (frostActive) {
        headColor = '#38BDF8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.95)';
        ctx.shadowBlur = 8;
      } else if (inCombo) {
        if (endingBlink) {
          headColor = '#F59E0B';
          ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
          ctx.shadowBlur = 7;
        } else {
          const headPulse = Math.sin(nowTime / 150);
          headColor = headPulse > 0.2 ? '#FBBF24' : '#66CCFF';
          ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
          ctx.shadowBlur = 6;
        }
      }

      ctx.fillStyle = headColor;
      ctx.beginPath();
      drawRoundRect(ctx, head.x * CELL + 1, head.y * CELL + 1, CELL - 2, CELL - 2, 5);
      ctx.fill();

      // 吃果瞬态咬合微张嘴 (Bite Aperture 70ms: 吃下红苹果/金果瞬间前唇微张倒V咬合微缺口)
      const isBiting = nowTime - (lastEatTimestamp || 0) < 70;
      if (isBiting && snake.length > 1) {
        const next = snake[1];
        const dx = head.x - next.x;
        const dy = head.y - next.y;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const hx = head.x * CELL;
        const hy = head.y * CELL;
        if (dx === 1) {
          // 面朝右方咬合
          ctx.moveTo(hx + CELL - 1, hy + CELL / 2 - 2.8);
          ctx.lineTo(hx + CELL - 4, hy + CELL / 2);
          ctx.lineTo(hx + CELL - 1, hy + CELL / 2 + 2.8);
        } else if (dx === -1) {
          // 面朝左方咬合
          ctx.moveTo(hx + 1, hy + CELL / 2 - 2.8);
          ctx.lineTo(hx + 4, hy + CELL / 2);
          ctx.lineTo(hx + 1, hy + CELL / 2 + 2.8);
        } else if (dy === 1) {
          // 面朝下方咬合
          ctx.moveTo(hx + CELL / 2 - 2.8, hy + CELL - 1);
          ctx.lineTo(hx + CELL / 2, hy + CELL - 4);
          ctx.lineTo(hx + CELL / 2 + 2.8, hy + CELL - 1);
        } else {
          // 面朝上方咬合
          ctx.moveTo(hx + CELL / 2 - 2.8, hy + 1);
          ctx.lineTo(hx + CELL / 2, hy + 4);
          ctx.lineTo(hx + CELL / 2 + 2.8, hy + 1);
        }
        ctx.closePath();
        ctx.fill();
      }

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

      // 计算双眼在蛇头上的朝向偏移与视线追踪 (后移1.5px留出前额自然留白，呆萌灵动)
      let e1x = 6.2, e1y = 6.0;
      let e2x = 13.8, e2y = 6.0;
      let px = 0, py = 0;

      if (snake.length > 1) {
        const next = snake[1];
        const dx = head.x - next.x;
        const dy = head.y - next.y;
        if (dx === 1) {
          // 向右移动：面朝右侧，眼睛自最右边缘后移 1.5px (至 14.0px)
          e1x = 14.0; e1y = 6.2;
          e2x = 14.0; e2y = 13.8;
          px = 0.8; py = 0;
        } else if (dx === -1) {
          // 向左移动：面朝左侧，眼睛自最左边缘后移 1.5px (至 6.0px)
          e1x = 6.0; e1y = 6.2;
          e2x = 6.0; e2y = 13.8;
          px = -0.8; py = 0;
        } else if (dy === 1) {
          // 向下移动：面朝下方，眼睛自最下边缘后移 1.5px (至 14.0px)
          e1x = 6.2; e1y = 14.0;
          e2x = 13.8; e2y = 14.0;
          px = 0; py = 0.8;
        } else {
          // 向上移动：面朝上方，眼睛自最上边缘后移 1.5px (至 6.0px)
          e1x = 6.2; e1y = 6.0;
          e2x = 13.8; e2y = 6.0;
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
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(head.x * CELL + e1x - 2.2, head.y * CELL + e1y);
        ctx.lineTo(head.x * CELL + e1x + 2.2, head.y * CELL + e1y);
        ctx.moveTo(head.x * CELL + e2x - 2.2, head.y * CELL + e2y);
        ctx.lineTo(head.x * CELL + e2x + 2.2, head.y * CELL + e2y);
        ctx.stroke();
      } else if (isSatisfied) {
        // 2. 吃果满足：灵动笑弯月牙弧线 (微放大至 2.5px 半径)
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.35;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x, head.y * CELL + e1y + 1, 2.5, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(head.x * CELL + e2x, head.y * CELL + e2y + 1, 2.5, Math.PI, 0);
        ctx.stroke();
      } else if (isPanic) {
        // 3. 濒死惊慌：眼白瞪大至 3.0px，瞳孔急剧微缩至 0.85px 并施加高频微颤抖
        const jitterX = Math.sin(nowTime * 0.04) * 0.6;
        const jitterY = Math.cos(nowTime * 0.04) * 0.6;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x, head.y * CELL + e1y, 3.0, 0, Math.PI * 2);
        ctx.arc(head.x * CELL + e2x, head.y * CELL + e2y, 3.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(head.x * CELL + e1x + px + jitterX, head.y * CELL + e1y + py + jitterY, 0.85, 0, Math.PI * 2);
        ctx.arc(head.x * CELL + e2x + px + jitterX, head.y * CELL + e2y + py + jitterY, 0.85, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 4. 常态：机敏明眸与视线追踪预瞄 (待机/暂停时每隔 3.8 秒自然眨眼 120ms)
        const isIdleOrPaused = !isPlaying || isPaused;
        const isBlinking = isIdleOrPaused && (nowTime % 3800 < 130);

        if (isBlinking) {
          // 灵动眨眼微表情：眼皮自然闭合成两道清澈微弧
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 1.35;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(head.x * CELL + e1x - 2.1, head.y * CELL + e1y);
          ctx.lineTo(head.x * CELL + e1x + 2.1, head.y * CELL + e1y);
          ctx.moveTo(head.x * CELL + e2x - 2.1, head.y * CELL + e2y);
          ctx.lineTo(head.x * CELL + e2x + 2.1, head.y * CELL + e2y);
          ctx.stroke();
        } else {
          // 常态明眸微放大雕琢：眼白 2.2 -> 2.6px，瞳孔 1.2 -> 1.45px，附带灵秀高光
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(head.x * CELL + e1x, head.y * CELL + e1y, 2.6, 0, Math.PI * 2);
          ctx.arc(head.x * CELL + e2x, head.y * CELL + e2y, 2.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(head.x * CELL + e1x + px, head.y * CELL + e1y + py, 1.45, 0, Math.PI * 2);
          ctx.arc(head.x * CELL + e2x + px, head.y * CELL + e2y + py, 1.45, 0, Math.PI * 2);
          ctx.fill();

          // 瞳孔灵动微高光点 (黑白分明更添萌动感)
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(head.x * CELL + e1x + px - 0.45, head.y * CELL + e1y + py - 0.45, 0.45, 0, Math.PI * 2);
          ctx.arc(head.x * CELL + e2x + px - 0.45, head.y * CELL + e2y + py - 0.45, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 8. 更新并绘制粒子微特效 (零 GC 对象池单循环复用，支持多形态与高阶阻尼物理)
    const pool = particlesRef.current;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;

      if (!isPaused) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.drag;
        p.vy *= p.drag;
        if (p.gravity) p.vy += p.gravity;
        if (p.vRot) p.rot = (p.rot || 0) + p.vRot;
        p.life += 1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }

      if (p.life >= p.maxLife || p.alpha <= 0.01) {
        p.active = false;
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      if (p.rot) ctx.rotate(p.rot);

      // 为中大粒子注入多巴胺微晶发光光晕 (Glow Halo)
      if (p.size >= 2.4) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = Math.min(5, p.size * 0.9);
      }

      if (p.shape === 'star') {
        // 南大家园经典圆润四芒微星
        const r = p.size;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();
        if (p.coreColor) {
          ctx.fillStyle = p.coreColor;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.shape === 'voxel') {
        // 栅栏瓦解崩碎体素小石块
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else if (p.shape === 'leaf') {
        // 翡翠多巴胺嫩叶碎屑
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.35, p.size * 0.7, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        // 连击流光微星轨
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 基础多巴胺微光圆粒
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.coreColor) {
          ctx.fillStyle = p.coreColor;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.6, p.size * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // 10. 更新并绘制四色彩纸欢庆礼花 (重力加速度与空气阻力，暂停时物理冻结)
    const activeConfetti: Confetti[] = [];
    confettiRef.current.forEach((c) => {
      if (!isPaused) {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.16; // 柔和重力加速度
        c.vx *= 0.98; // 空气阻力
        c.rot += c.vRot;
        c.life += 1;
        c.alpha = Math.max(0, 1 - c.life / c.maxLife);
      }
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

    // 11. 更新并绘制连击飘字特效 (带果冻弹性缩放回弹，暂停时冻结)
    const activeTexts: FloatingText[] = [];
    floatingTextsRef.current.forEach((ft) => {
      if (!isPaused) {
        ft.y -= 0.65;
        ft.life += 1;
        ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      }
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
  }, [fenceRef, foodRef, bonusRef, snakeRef, speedMs, isPlaying, isPaused, isGameOver, queueRef, comboCount, lastEatTimestamp, totalElapsedMs, lastEatElapsedMs, bonusRemainSec, isWaitingStart, spawnSpeedTrailParticle, bonusType, frostActive, phaseActive, ghostSnakeRef, isCompetitiveMode, isGhostAlive]);

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

      // 执行转向 (触感完全由 useSnake 物理状态机裁决，避免双重震动与反向掉头误震)
      onDirection(targetDir);

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

        // 物理走步时序安全积分：单帧内最多消费 1 个物理周期，杜绝掉帧时瞬发多步导致死墙刷新时差或穿墙
        if (accumulator >= effectiveSpeed) {
          onTick();
          accumulator = Math.min(accumulator - effectiveSpeed, effectiveSpeed * 0.5);
        }
      }

      // 无论游戏是否暂停，统一按屏幕刷新率 (60Hz/120Hz) 平滑渲染 Canvas 与粒子光效
      render();
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isPaused, isGameOver, speedMs, isReplay, replaySpeedRate, onTick, render]);

  // 顶部四段式复合胶囊数据配置 (自适应明亮态与深空墨蓝暗态)
  const statCapsules = [
    {
      label: '得分',
      val: <AnimatedNumber value={score} />,
      bg: 'bg-rose-50/75 backdrop-blur-xs border border-rose-100/60',
      text: 'text-rose-500',
      valColor: 'text-rose-600',
    },
    {
      label: '长度',
      val: <AnimatedNumber value={length} />,
      bg: 'bg-emerald-50/75 backdrop-blur-xs border border-emerald-100/60',
      text: 'text-emerald-600',
      valColor: 'text-emerald-700',
    },
    {
      label: '用时',
      val: (
        <>
          <AnimatedNumber value={duration} />s
        </>
      ),
      bg: 'bg-purple-50/75 backdrop-blur-xs border border-purple-100/60',
      text: 'text-purple-600',
      valColor: 'text-purple-700',
    },
    {
      label: '速度',
      val: `${((BASE_SPEED_MS / speedMs) * (isReplay ? replaySpeedRate : 1)).toFixed(1)}x`,
      bg: 'bg-[#EBF8FF]/75 backdrop-blur-xs border border-sky-100/60',
      text: 'text-[#0099FF]',
      valColor: 'text-[#0099FF]',
    },
  ];

  const handleDirBtn = (d: Direction) => {
    sound.unlockAudio();
    onDirection(d);
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-1 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col items-center select-none border border-white/70 shadow-xs w-full">
      {/* 观摩回放模式专属横幅 */}
      {isReplay && (
        <div className="w-full mb-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EBF8FF] to-[#E0F2FE] border border-[#66CCFF]/40 text-[#0099FF] flex flex-col gap-2 text-xs font-bold animate-in fade-in shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#0099FF] shrink-0 animate-pulse" />
              <span className="truncate">观摩走位中：<strong className="text-slate-900">{replayUser}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-[#66CCFF]/30 shadow-2xs">
                {([1, 1.5, 2] as const).map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onSetReplaySpeed?.(rate)}
                    className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded cursor-pointer transition-all ${
                      replaySpeedRate === rate
                        ? 'bg-[#0099FF] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0099FF]'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <button
                onClick={onExitReplay}
                className="text-[11px] px-2 py-1 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer rounded-lg hover:bg-white/60"
              >
                退出
              </button>
            </div>
          </div>

          {/* 极简电竞走位时间轴 (点击任意位置瞬态快进/后退复盘) */}
          {replayTotalTicks > 0 && (
            <div className="w-full flex flex-col gap-1 pt-0.5">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeekReplay?.(Math.floor(ratio * replayTotalTicks));
                }}
                className="relative w-full h-1.5 hover:h-2.5 bg-white/80 rounded-full overflow-hidden cursor-pointer transition-all shadow-inner group"
                title="点击快速跳转走位进度"
              >
                <div
                  className="h-full bg-[#0099FF] rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (replayCurrentTick / replayTotalTicks) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9.5px] font-mono font-medium text-slate-500 tabular-nums px-0.5">
                <span>步数: {replayCurrentTick}</span>
                <span>总步数: {replayTotalTicks}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 顶部四段式状态胶囊栏 */}
      <div className="w-full grid grid-cols-4 gap-2 sm:gap-2.5 mb-2 text-center text-xs">
        {statCapsules.map((st) => (
          <div
            key={st.label}
            className={`${st.bg} py-2 px-1 rounded-2xl relative overflow-hidden transition-all duration-150`}
          >
            <span className={`${st.text} text-[11px] font-medium`}>{st.label} </span>
            <strong className={`${st.valColor} text-sm font-mono font-black tabular-nums tracking-tight`}>{st.val}</strong>
            {st.label === '得分' && highScore > 0 && isPlaying && !isGameOver && !isReplay && (
              <span
                className={`ml-1 text-[9.5px] font-mono font-bold tabular-nums transition-colors duration-200 ${
                  score > highScore
                    ? 'text-[#0099FF] animate-pulse'
                    : highScore - score <= 50
                    ? 'text-[#D97706]'
                    : 'text-slate-400/80'
                }`}
                title={
                  score > highScore
                    ? `已超越历史最佳 (+${score - highScore}分)`
                    : `距个人最佳还差 ${highScore - score} 分`
                }
              >
                {score > highScore ? `+${score - highScore}` : `-${highScore - score}`}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 电竞级 Delta 领先指示器与双轨竞速槽 (仅在竞技对决模式下激活) */}
      {isCompetitiveMode && (
        <div className="w-full mb-1.5 px-3 py-1.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-2xs flex flex-col gap-1 text-xs select-none">
          <div className="flex items-center justify-between">
            {/* 左侧：当前挑战玩家实况 */}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0099FF] animate-pulse" />
              <span className="font-bold text-slate-800 text-[11px]">当前挑战</span>
              <span className="font-mono font-black text-[#0099FF] text-[11px] tabular-nums">{score}分</span>
            </div>

            {/* 中间：Delta 动态差值指示胶囊 */}
            <div className="flex items-center">
              {deltaScore > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-mono font-black text-[10.5px] tabular-nums flex items-center gap-1 shadow-2xs">
                  <span>▲ 领先</span>
                  <span>+{deltaScore}</span>
                </span>
              ) : deltaScore < 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-200/60 font-mono font-black text-[10.5px] tabular-nums flex items-center gap-1 shadow-2xs">
                  <span>▼ 落后</span>
                  <span>{deltaScore}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono font-bold text-[10px] tabular-nums">
                  ● 并驾齐驱
                </span>
              )}
            </div>

            {/* 右侧：幽灵目标对手 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">对手:</span>
              <strong className="text-slate-700 text-[11px] truncate max-w-[70px]">{ghostUser || '幽灵'}</strong>
              <span className="font-mono text-purple-600 font-bold text-[11px] tabular-nums">{ghostScore}/{ghostTargetScore}</span>
              {!isGhostAlive && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-600 font-bold border border-amber-200/60">
                  已超越
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 极简特殊果实流光微导轨与专属形态指示 (绝对零物理位移：高度恒定，绝不推挤棋盘) */}
      <div className="w-full my-1 flex flex-col gap-0.5 transition-all">
        {/* 微型专属形态与倒计时标签栏 (固定高度 15px，hasBonus 时淡入) */}
        <div
          className={`w-full h-[15px] px-1 flex items-center justify-between text-[11px] font-semibold transition-opacity duration-200 ${
            hasBonus ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {bonusType === 'FROST' ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image/fruit_bonus_frost.webp"
                  alt="冰霜寒果"
                  className="w-4 h-4 object-contain shrink-0 animate-pulse"
                />
                <span className="text-[#0284C7] font-bold text-[11px]">冰霜寒果</span>
                <span className="text-[10px] text-sky-500/80 font-normal">减速 3s</span>
              </>
            ) : bonusType === 'PHASE' ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image/fruit_bonus_phase.webp"
                  alt="极光虚化果"
                  className="w-4 h-4 object-contain shrink-0 animate-pulse"
                />
                <span className="text-[#7E22CE] font-bold text-[11px]">极光虚化果</span>
                <span className="text-[10px] text-purple-500/80 font-normal">穿墙 2s</span>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image/fruit_bonus_gold.webp"
                  alt="幸运金果"
                  className="w-4 h-4 object-contain shrink-0 animate-pulse"
                />
                <span className="text-[#D97706] font-bold text-[11px]">幸运金果</span>
                <span className="text-[10px] text-amber-600/80 font-normal">+30分</span>
              </>
            )}
          </div>
          <div
            className={`font-mono font-bold text-[10px] tabular-nums ${
              bonusType === 'FROST'
                ? 'text-[#0284C7]'
                : bonusType === 'PHASE'
                ? 'text-[#7E22CE]'
                : 'text-[#D97706]'
            }`}
          >
            {Math.max(0, bonusRemainSec).toFixed(1)}s / {bonusType === 'FROST' ? '6.0s' : bonusType === 'PHASE' ? '5.0s' : '8.0s'}
          </div>
        </div>

        {/* 专属形态微导轨槽体与流光进度条 (高度 4.5px，三色独享材质、光晕与微晶高光核) */}
        <div
          className={`w-full h-[4.5px] rounded-full overflow-hidden transition-all duration-200 ${
            !hasBonus
              ? 'bg-slate-100/70 border border-transparent'
              : bonusType === 'FROST'
              ? 'bg-sky-100/80 border border-sky-200/60'
              : bonusType === 'PHASE'
              ? 'bg-purple-100/80 border border-purple-200/60'
              : 'bg-amber-100/80 border border-amber-200/60'
          }`}
        >
          <div
            className={`h-full rounded-full relative transition-all duration-100 ease-linear ${
              bonusType === 'FROST'
                ? 'bg-gradient-to-r from-[#0284C7] via-[#38BDF8] to-[#93C5FD] shadow-[0_0_10px_#38BDF8]'
                : bonusType === 'PHASE'
                ? 'bg-gradient-to-r from-[#7E22CE] via-[#A855F7] to-[#F472B6] shadow-[0_0_10px_#A855F7]'
                : 'bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FEF3C7] shadow-[0_0_10px_#F59E0B]'
            } ${hasBonus ? 'opacity-100' : 'opacity-0'}`}
            style={{ width: `${Math.max(0, Math.min(100, bonusProgressPercent))}%` }}
          >
            {/* 导轨顶端自发光微晶高光核 */}
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
          </div>
        </div>
      </div>

      {/* Canvas 画布与全屏滑屏手势感应层 (100% 纯净视界，无内贴进度条干扰) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative rounded-2xl overflow-hidden bg-white border border-slate-200/70 touch-none w-full max-w-full select-none"
      >
        <canvas ref={canvasRef} className="block w-full max-w-full h-auto aspect-square bg-white" />

        {/* 方案 A: 极简电竞赛场机能转角切线 (Corner Accents: 4角 9px 极细 L 型微切角，零占屏) */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-1.5 border-l-1.5 border-[#66CCFF]/40 rounded-tl-sm pointer-events-none z-10" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-1.5 border-r-1.5 border-[#66CCFF]/40 rounded-tr-sm pointer-events-none z-10" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-1.5 border-l-1.5 border-[#66CCFF]/40 rounded-bl-sm pointer-events-none z-10" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-1.5 border-r-1.5 border-[#66CCFF]/40 rounded-br-sm pointer-events-none z-10" />

        {/* 右上角掌机微型实时运行指示灯 (60FPS 极简翠绿呼吸灯) */}
        <div className="absolute top-2.5 right-4 z-10 flex items-center gap-1 opacity-70 pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
          <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider">60FPS</span>
        </div>

        {/* 街机连击狂潮专属手绘大字报弹出动效 (Combo Splash Art Overlay) */}
        {comboSplash && isPlaying && !isGameOver && (
          <div
            key={`${comboSplash}_${comboCount}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none select-none flex flex-col items-center justify-center animate-in zoom-in-50 fade-in duration-150 ease-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                comboSplash === 'max'
                  ? '/image/combo_max.webp'
                  : comboSplash === '5x'
                  ? '/image/combo_5x.webp'
                  : '/image/combo_3x.webp'
              }
              alt={comboSplash}
              className="w-36 sm:w-52 h-auto object-contain drop-shadow-xl filter -rotate-6 animate-pulse"
            />
          </div>
        )}

        {/* 专属技能生效浮空指示微徽标 */}
        {frostActive && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-sky-500/90 text-white text-[11px] font-bold rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/fruit_bonus_frost.webp" alt="冰霜" className="w-4 h-4 object-contain animate-pulse shrink-0" />
            <span>寒霜减速 (3s)</span>
          </div>
        )}
        {phaseActive && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-purple-600/90 text-white text-[11px] font-bold rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/fruit_bonus_phase.webp" alt="虚空" className="w-4 h-4 object-contain animate-pulse shrink-0" />
            <span>极光穿墙 (2s)</span>
          </div>
        )}

        {/* 开始游戏遮罩 (非回放模式：专属手绘故事大图封面 + 模式切换 + 一键启程) */}
        {!isPlaying && !isGameOver && !isReplay && (
          <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 select-none text-[#0F172A] animate-in fade-in duration-200">
            {/* 模式手绘水彩大图封面展示 */}
            <div
              onClick={onStart}
              className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm cursor-pointer group mb-3 bg-slate-100 transition-all hover:shadow-md active:scale-[0.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isCompetitiveMode ? '/image/mode_versus_duel.webp' : '/image/mode_classic_start.webp'}
                alt={isCompetitiveMode ? '竞技对决' : '经典冒险'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                <div className="flex items-center justify-between w-full text-white">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isCompetitiveMode ? 'bg-[#0099FF]' : 'bg-emerald-400'} animate-pulse`}
                    />
                    <span className="text-xs font-bold tracking-wide drop-shadow-sm">
                      {isCompetitiveMode ? '⚡ 竞技影子对决' : '经典冒险启程'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-85 drop-shadow-sm">
                    {isCompetitiveMode ? `VS ${ghostUser || '影子'}` : '无尽吃果清屏'}
                  </span>
                </div>
              </div>
            </div>

            {/* 极简模式切换：经典模式 VS ⚡ 竞技对决 */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100/90 text-xs font-bold font-mono border border-slate-200/50 mb-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCompetitiveMode) onToggleCompetitiveMode?.();
                }}
                className={`px-3.5 py-1 rounded-lg transition-all cursor-pointer ${
                  !isCompetitiveMode
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                经典模式
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCompetitiveMode) onToggleCompetitiveMode?.();
                }}
                className={`px-3.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isCompetitiveMode
                    ? 'bg-[#0099FF] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-[#0099FF]'
                }`}
              >
                <span>⚡ 竞技对决</span>
                {ghostTargetScore > 0 && (
                  <span className="text-[10px] opacity-90 font-normal">({ghostTargetScore}分)</span>
                )}
              </button>
            </div>

            <button
              onClick={onStart}
              className="px-8 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Play size={16} />
              <span>开始{isCompetitiveMode ? '对决' : '游戏'}</span>
              <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-1">
              <span className="w-1 h-1 rounded-full bg-[#66CCFF]" />
              <span>
                {isCompetitiveMode
                  ? `同种子对局挑战：${ghostUser || '高手'} (${ghostTargetScore}分)`
                  : '按空格/方向键 或 滑屏启程'}
              </span>
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
            className="absolute inset-0 z-30 bg-white/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-[#0F172A] cursor-pointer"
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

        {/* 暂停恢复快速 3 拍微倒数 (每拍 360ms，充裕就位缓冲，支持预输入过弯) */}
        {resumeCountdown !== null && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-black/[0.04]">
            <div
              key={resumeCountdown}
              className="w-16 h-16 rounded-[22px] bg-white/95 border border-[#0099FF]/35 shadow-md flex flex-col items-center justify-center animate-in zoom-in-75 fade-in duration-150 select-none"
            >
              <span className="font-mono text-3xl font-black text-[#0099FF] tabular-nums leading-none">
                {resumeCountdown}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-1">发车预备</span>
            </div>
          </div>
        )}

        {/* 游戏结束/观摩播放结束结算面板 */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 text-[#0F172A] animate-in fade-in zoom-in-95 duration-200">
            {isReplay ? (
              /* 电竞录像专属复盘结算卡片 (消除主客观混淆与玩家授勋割裂感) */
              <div className="w-full flex flex-col items-center my-auto">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EBF8FF] text-[#0099FF] font-bold text-xs mb-3 shadow-2xs">
                  <span>对局录像播放完毕</span>
                </div>

                <div className="text-xs text-slate-400 font-medium mb-1">
                  被观摩高手：<strong className="text-slate-800">{replayUser || '榜单高手'}</strong>
                </div>

                <div className="text-3xl sm:text-4xl font-black text-[#0F172A] font-mono tracking-tight mb-3 tabular-nums">
                  {score} <span className="text-xs font-normal text-slate-400">分</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 mb-4 bg-[#F8FAFC] border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400">蛇身长度</span>
                    <strong className="text-[#0099FF] font-mono font-bold text-sm tabular-nums">{length} 节</strong>
                  </div>
                  <span className="w-px h-6 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400">通关步数</span>
                    <strong className="text-[#8B5CF6] font-mono font-bold text-sm tabular-nums">{replayTotalTicks || replayCurrentTick} 步</strong>
                  </div>
                  <span className="w-px h-6 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400">极限连击</span>
                    <strong className="text-[#10B981] font-mono font-bold text-sm tabular-nums">{maxCombo} 连击</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenArtModal}
                    className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-95 text-slate-700 rounded-full text-xs font-bold cursor-pointer shadow-xs transition-all border border-slate-200/60"
                  >
                    走位卡片
                  </button>
                  <button
                    onClick={onRestartReplay || onStart}
                    className="px-4 py-2 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw size={13} />
                    <span>重新观摩</span>
                  </button>
                  <button
                    onClick={onExitReplay}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 rounded-full text-xs font-bold cursor-pointer shadow-xs"
                  >
                    <span>退出</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 玩家本人生死结算面板 (专属手绘叙事卡片：加冕凯旋 VS 挂彩阵亡) */
              <div className="w-full flex flex-col items-center my-auto">
                {/* 专属定制手绘水彩大图卡片 */}
                <div className="relative w-full max-w-[240px] sm:max-w-[280px] aspect-[16/9] rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs mb-2 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={score >= 500 ? '/image/triumph_crown.webp' : '/image/defeat_crash.webp'}
                    alt={score >= 500 ? '加冕登顶' : '挂彩阵亡'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-slate-700 shadow-2xs border border-white/70">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${score >= 500 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    />
                    <span>{score >= 500 ? '高分登顶 · 荣耀凯旋' : '战局终了 · 虽败犹荣'}</span>
                  </div>
                </div>

                {/* 战绩核心分值与个人纪录指示 */}
                <div className="flex flex-col items-center my-1.5">
                  <div className="text-3xl sm:text-4xl font-black text-[#0F172A] font-mono tracking-tight tabular-nums">
                    {score} <span className="text-xs font-normal text-slate-400">分</span>
                  </div>
                  {highScore > 0 && (
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {score > highScore ? (
                        <span className="text-[#0099FF] font-bold">🎉 创下个人最佳新纪录！</span>
                      ) : (
                        <span>个人历史最佳: <strong className="text-slate-600 font-mono">{highScore}</strong> 分</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 真实死因精准复盘 */}
                {deathReason && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-600 text-[11px] font-medium border border-slate-200/60 mb-2.5">
                    <span className="text-slate-400 text-[10px]">死因</span>
                    <span className="font-bold">{deathReason}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-600 mb-4 bg-[#F8FAFC]/80 backdrop-blur-xs border border-slate-200/60 px-4 py-2.5 rounded-2xl shadow-xs">
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

                <div className="flex items-center gap-2.5 flex-wrap justify-center">
                  <button
                    onClick={handleOpenArtModal}
                    className="px-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] active:scale-95 text-slate-700 border border-slate-200/80 rounded-full text-xs sm:text-sm font-bold cursor-pointer shadow-xs transition-all"
                  >
                    走位卡片
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
            <div className="text-[11px] text-slate-400">确定性物理重放 · 逐帧还原真实走位</div>
          </div>
        ) : showDpad ? (
          /* 移动端智能触控按键控制台 (零误触·紧凑一体化) */
          <div className="flex flex-col items-center gap-1.5 touch-manipulation select-none">
            {/* 顶部辅助操作栏：暂停键独立置顶，放大至 44px+ 黄金触控区 */}
            <div className="w-full max-w-[280px] flex items-center justify-between px-1 mb-1">
              <button
                onClick={() => {
                  sound.unlockAudio();
                  onTogglePause?.();
                }}
                disabled={!isPlaying || isGameOver}
                className={`h-10 px-4 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs touch-manipulation ${
                  isPaused
                    ? 'bg-[#0099FF] text-white shadow-sm ring-2 ring-[#66CCFF]/40'
                    : 'bg-white/75 backdrop-blur-sm hover:bg-[#EBF8FF] text-slate-700 hover:text-[#0099FF] border border-white/60'
                } ${!isPlaying || isGameOver ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              >
                {isPaused ? <Play size={15} /> : <Pause size={15} />}
                <span>{isPaused ? '继续游戏' : '暂停'}</span>
              </button>

              <button
                onClick={toggleDpadLayout}
                title="切换经典十字盘或电脑倒T型布局"
                className="h-10 px-3 rounded-full text-[11px] font-bold bg-white/75 backdrop-blur-sm hover:bg-white/90 text-slate-600 transition-all cursor-pointer shadow-2xs flex items-center gap-1 font-mono border border-white/60"
              >
                <span>{dpadLayout === 'cross' ? '十字键' : '倒T键'}</span>
              </button>
            </div>

            {/* 核心方向键区：根据 dpadLayout 渲染紧凑十字盘或倒T键盘 */}
            {dpadLayout === 'cross' ? (
              /* 经典一体化超椭圆十字盘 (任天堂/街机黄金比例：中心等距盲操，零误触) */
              <div className="relative w-[190px] h-[142px] flex items-center justify-center my-0.5">
                {/* 上 */}
                <button
                  onClick={() => handleDirBtn('UP')}
                  aria-label="向上"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[62px] h-[46px] bg-slate-100/95 active:bg-[#0099FF] text-slate-700 active:text-white rounded-t-2xl rounded-b-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronUp size={26} />
                </button>

                {/* 左 */}
                <button
                  onClick={() => handleDirBtn('LEFT')}
                  aria-label="向左"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[48px] h-[58px] bg-slate-100/95 active:bg-[#0099FF] text-slate-700 active:text-white rounded-l-2xl rounded-r-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronLeft size={26} />
                </button>

                {/* 中心静息盲操凹核 (NCU HOME 四色微核心) */}
                <div className="w-9 h-9 rounded-full bg-slate-200/70 border border-white flex items-center justify-center shadow-inner pointer-events-none">
                  <div className="grid grid-cols-2 gap-1 opacity-70">
                    <span className="w-1 h-1 rounded-full bg-[#66CCFF]" />
                    <span className="w-1 h-1 rounded-full bg-[#F59E0B]" />
                    <span className="w-1 h-1 rounded-full bg-[#10B981]" />
                    <span className="w-1 h-1 rounded-full bg-[#EC4899]" />
                  </div>
                </div>

                {/* 右 */}
                <button
                  onClick={() => handleDirBtn('RIGHT')}
                  aria-label="向右"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[48px] h-[58px] bg-slate-100/95 active:bg-[#0099FF] text-slate-700 active:text-white rounded-r-2xl rounded-l-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronRight size={26} />
                </button>

                {/* 下 */}
                <button
                  onClick={() => handleDirBtn('DOWN')}
                  aria-label="向下"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[62px] h-[46px] bg-slate-100/95 active:bg-[#0099FF] text-slate-700 active:text-white rounded-b-2xl rounded-t-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronDown size={26} />
                </button>
              </div>
            ) : (
              /* 电脑键盘倒 T 型紧凑布局 (习惯物理键盘手感专属) */
              <div className="flex flex-col items-center gap-1.5 w-[210px] my-0.5">
                <button
                  onClick={() => handleDirBtn('UP')}
                  aria-label="向上"
                  className="w-[64px] h-[44px] bg-slate-100/95 active:bg-[#0099FF] text-slate-700 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronUp size={26} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDirBtn('LEFT')}
                    aria-label="向左"
                    className="w-[64px] h-[44px] bg-slate-100 active:bg-[#0099FF] text-slate-700 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                  >
                    <ChevronLeft size={26} />
                  </button>
                  <button
                    onClick={() => handleDirBtn('DOWN')}
                    aria-label="向下"
                    className="w-[64px] h-[44px] bg-slate-100 active:bg-[#0099FF] text-slate-700 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                  >
                    <ChevronDown size={26} />
                  </button>
                  <button
                    onClick={() => handleDirBtn('RIGHT')}
                    aria-label="向右"
                    className="w-[64px] h-[44px] bg-slate-100 active:bg-[#0099FF] text-slate-700 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                  >
                    <ChevronRight size={26} />
                  </button>
                </div>
              </div>
            )}
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

        {/* 底部微型模式切换胶囊 (回放模式隐藏) */}
        {!isReplay && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#94A3B8] pt-1 select-none">
            <button
              onClick={toggleDpad}
              title="切换全屏滑屏或虚拟按键模式"
              className="text-[11px] font-semibold text-[#0099FF] hover:text-[#0284C7] bg-[#EBF8FF] hover:bg-[#E0F2FE] px-3 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs"
            >
              {showDpad ? '切为全屏沉浸滑屏' : '展开方向按键'}
            </button>
          </div>
        )}
      </div>

      {/* 走位几何抽象艺术卡片海报模态弹窗 */}
      <TrajectoryCardModal
        isOpen={showArtModal}
        onClose={() => setShowArtModal(false)}
        trajectory={artData?.trajectory || []}
        events={artData?.events || []}
        score={score}
        duration={duration}
        maxCombo={maxCombo}
        steps={artData?.steps || 0}
        username={replayUser || '极客玩家'}
      />
    </div>
  );
}
