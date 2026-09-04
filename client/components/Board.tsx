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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NCUCrestBadge } from './NCUIcon';

// 战局终了段位微拟态勋章加冕组件 (显式点亮高饱和多彩徽标与柔光)
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
      ? { label: '钻石', color: '#0099FF' }
      : tier === 'GOLD'
      ? { label: '黄金', color: '#F59E0B' }
      : tier === 'SILVER'
      ? { label: '白银', color: '#64748B' }
      : tier === 'BRONZE'
      ? { label: '青铜', color: '#10B981' }
      : null;

  if (!tier || !badgeConfig) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-90 duration-300">
      <NCUCrestBadge tier={tier} unlocked={true} size={50} className="drop-shadow-md" />
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

// 蛇身吞咽物理流光传导波
interface DigestionWave {
  startTime: number;
  isBonus: boolean;
  totalSegments: number;
}

export default function Board({
  snakeRef, fenceRef, foodRef, bonusRef, hasBonus, bonusKey = 0,
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
  const particlesRef = useRef<Particle[]>([]);
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
        const isDark = document.documentElement.classList.contains('dark');
        offCtx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
        offCtx.fillRect(0, 0, GRID * CELL, GRID * CELL);
        offCtx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.4)';
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
      // 重新开局：清空上一局残留的视觉特效与时间戳缓存
      fenceSpawnTimeRef.current.clear();
      particlesRef.current = [];
      floatingTextsRef.current = [];
      confettiRef.current = [];
      digestionWavesRef.current = [];
    } else if (score > prevScoreRef.current) {
      const diff = score - prevScoreRef.current;
      const head = snakeRef.current[0] || { x: 10, y: 12 };
      const now = Date.now();

      // 判定是金果还是普通红苹果 (金果基础分 30，红果基础分 10)
      const isBonusFruit = diff >= 30;

      // 触发蛇身物理吞咽传导波 (包含金果属性与当前蛇节长度，用于流光传导)
      digestionWavesRef.current.push({
        startTime: now,
        isBonus: isBonusFruit,
        totalSegments: snakeRef.current.length,
      });

      const currentCombo = comboCount || 1;

      if (isBonusFruit) {
        // 金色幸运果：微阻尼收敛震动 (3帧/1.2px)，多巴胺微光粒子
        triggerShake(3, 1.2);
        spawnParticles(head.x, head.y, '#F59E0B', 18);

        if (currentCombo === 1) {
          spawnFloatingText(head.x, head.y, '+30 幸运金果!', '#D97706');
        } else if (currentCombo === 2) {
          spawnFloatingText(head.x, head.y, '+30 (2连击)', '#D97706');
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
          spawnFloatingText(head.x, head.y, '+10 (2连击)', '#0099FF');
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

  // 初始化 Canvas 视网膜高清分辨率 (DPR 物理像素无损映射)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
    const size = GRID * CELL;
    cvs.width = Math.round(size * dpr);
    cvs.height = Math.round(size * dpr);
  }, []);

  // 主渲染流程 (Canvas 2D 极简现代主义绘制引擎)
  const render = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
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

    // 4. 绘制金色幸运果 (双态光晕：常态呼吸 / 临期<=3s 急速红金频闪，严格由物理步数驱动)
    const bonus = bonusRef.current;
    if (bonus) {
      const bx = bonus.x * CELL + CELL / 2;
      const by = bonus.y * CELL + CELL / 2;
      const isExpiring = bonusRemainSec <= 3.0 && !isWaitingStart;
      const bScale = 1;
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
    digestionWavesRef.current = digestionWavesRef.current.filter(
      (w) => nowTime - w.startTime < Math.max(1200, (w.totalSegments + 2) * 45)
    );

    // 采用物理时钟计算连击剩余时间 (彻底杜绝暂停期间与倍速回放误灭灯)
    const comboElapsed = (totalElapsedMs !== undefined && lastEatElapsedMs !== undefined && lastEatElapsedMs >= 0)
      ? (totalElapsedMs - lastEatElapsedMs)
      : (nowTime - (lastEatTimestamp || 0));
    // 3 连击起激活全蛇身炫彩特效，2 连击保持轻量专注，长时间游戏不眼花
    const inCombo = (comboCount || 0) >= 3 && comboElapsed >= 0 && comboElapsed < 3000;
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
            // 快终止提醒：温和暖橙提示，杜绝刺眼斑马纹高频交替
            color = ratio > 0.5 ? '#F59E0B' : '#FB923C';
          } else {
            // 连击进行中：380ms 黄金能量行波 (Fluid Golden Wave)，流畅顺传恢复飞驰动感
            const wave = Math.sin(nowTime / 380 - i * 0.45);
            if (wave > 0.35) {
              color = '#FBBF24'; // 璀璨亮金波峰
            } else if (wave > -0.15) {
              color = '#38BDF8'; // 天青蓝波腰
            } else {
              color = '#0284C7'; // 深空湛蓝波谷
            }
          }
        }

        // 计算物理吞咽波传导到当前节时的微隆起弹性形变与流光发光核
        let bulge = 0;
        let activeWaveBonus = false;
        digestionWavesRef.current.forEach((w) => {
          const waveElapsed = nowTime - w.startTime;
          // 每节传导约 40ms，波形自然顺畅流动
          const targetIdx = waveElapsed / 40;
          const dist = Math.abs(i - targetIdx);
          if (dist < 1.3) {
            const intensity = 1 - dist / 1.3;
            if (intensity * 0.28 > bulge) {
              bulge = intensity * 0.28;
              activeWaveBonus = w.isBonus;
            }
          }
        });

        // 检测当前节是否处于转弯拐角 (前后节构成 90° 折角，赋予流线型柔性管道圆角)
        const prevSeg = snake[i - 1];
        const nextSeg = snake[i + 1];
        const isCorner = prevSeg && nextSeg && prevSeg.x !== nextSeg.x && prevSeg.y !== nextSeg.y;

        const scaleFactor = 1 + bulge;
        const segSize = (CELL - 2) * scaleFactor;
        const offset = ((CELL - 2) * (scaleFactor - 1)) / 2;
        const cornerRadius = isCorner ? 6 : 4;

        ctx.save();
        // 移除身体节的发虚模糊阴影，保持极简锐利与护眼

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
          const strokeWave = Math.sin(nowTime / 380 - i * 0.45);
          ctx.strokeStyle = strokeWave > 0.2 ? 'rgba(254, 240, 138, 0.9)' : 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = strokeWave > 0.2 ? 1.0 : 0.8;
        } else if (inCombo && endingBlink) {
          ctx.strokeStyle = 'rgba(255, 237, 213, 0.9)';
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();

        // 连击能量行波流光微核 (在能量波峰节内部点亮极微小的高光核，动感十足)
        const wave = Math.sin(nowTime / 380 - i * 0.45);
        if (inCombo && !endingBlink && wave > 0.65 && bulge <= 0.05) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(
            seg.x * CELL + 1 + (CELL - 2) / 2,
            seg.y * CELL + 1 + (CELL - 2) / 2,
            1.8,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // 吞咽流光波经过当前节时：在关节内部叠加绘制晶莹发光核 (普通果晶白，金果流金)
        if (bulge > 0.05) {
          const coreAlpha = Math.min(0.85, bulge * 3.4);
          ctx.fillStyle = activeWaveBonus
            ? `rgba(254, 243, 199, ${coreAlpha})`
            : `rgba(255, 255, 255, ${coreAlpha})`;
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
      if (inCombo) {
        if (endingBlink) {
          headColor = '#F59E0B';
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 4;
        } else {
          const headPulse = Math.sin(nowTime / 380);
          headColor = headPulse > 0.25 ? '#FBBF24' : '#66CCFF';
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 4;
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

    // 8. 更新并绘制粒子微特效 (暂停状态下完全冻结生命周期与位移)
    const activeParticles: Particle[] = [];
    particlesRef.current.forEach((p) => {
      if (!isPaused) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }
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
  }, [fenceRef, foodRef, bonusRef, snakeRef, speedMs, isPlaying, isPaused, isGameOver, queueRef, comboCount, lastEatTimestamp, totalElapsedMs, lastEatElapsedMs, bonusRemainSec, isWaitingStart]);

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

  // 顶部四段式复合胶囊数据配置 (自适应明亮态与深空墨蓝暗态)
  const statCapsules = [
    {
      label: '得分',
      val: score,
      bg: 'bg-rose-50/90 dark:bg-rose-950/30 dark:border dark:border-rose-900/40',
      text: 'text-rose-500 dark:text-rose-400',
      valColor: 'text-rose-600 dark:text-rose-300',
    },
    {
      label: '长度',
      val: length,
      bg: 'bg-emerald-50/90 dark:bg-emerald-950/30 dark:border dark:border-emerald-900/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      valColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: '用时',
      val: `${duration}s`,
      bg: 'bg-purple-50/90 dark:bg-purple-950/30 dark:border dark:border-purple-900/40',
      text: 'text-purple-600 dark:text-purple-400',
      valColor: 'text-purple-700 dark:text-purple-300',
    },
    {
      label: '速度',
      val: `${((BASE_SPEED_MS / speedMs) * (isReplay ? replaySpeedRate : 1)).toFixed(1)}x`,
      bg: 'bg-[#EBF8FF] dark:bg-sky-950/30 dark:border dark:border-sky-900/40',
      text: 'text-[#0099FF] dark:text-sky-400',
      valColor: 'text-[#0099FF] dark:text-sky-300',
    },
  ];

  const handleDirBtn = (d: Direction) => {
    sound.unlockAudio();
    onDirection(d);
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-3xl flex flex-col items-center select-none border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      {/* 观摩回放模式专属横幅 */}
      {isReplay && (
        <div className="w-full mb-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#EBF8FF] to-[#E0F2FE] dark:from-[#0099FF]/10 dark:to-[#0099FF]/5 border border-[#66CCFF]/40 dark:border-[#0099FF]/30 text-[#0099FF] flex flex-col gap-2 text-xs font-bold animate-in fade-in shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#0099FF] shrink-0 animate-pulse" />
              <span className="truncate">观摩走位中：<strong className="text-slate-900 dark:text-white">{replayUser}</strong></span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono text-[#0099FF] shadow-2xs">
                {replaySpeedRate}x 倍速
              </span>
              <button
                onClick={onExitReplay}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
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
                className="relative w-full h-1.5 hover:h-2.5 bg-white/80 dark:bg-slate-800 rounded-full overflow-hidden cursor-pointer transition-all shadow-inner group"
                title="点击快速跳转走位进度"
              >
                <div
                  className="h-full bg-[#0099FF] rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (replayCurrentTick / replayTotalTicks) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9.5px] font-mono font-medium text-slate-500 dark:text-slate-400 tabular-nums px-0.5">
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
            className={`${st.bg} py-2 px-1 rounded-2xl relative overflow-hidden transition-all duration-150 ${
              st.label === '得分' && scorePulse ? 'scale-105' : 'scale-100'
            } ${
              st.label === '速度' && speedPulse ? 'scale-105 ring-2 ring-[#0099FF]/40 shadow-xs' : ''
            }`}
          >
            <span className={`${st.text} text-[11px] font-medium`}>{st.label} </span>
            <strong className={`${st.valColor} text-sm font-mono font-black tabular-nums tracking-tight`}>{st.val}</strong>
            {st.label === '得分' && highScore > 0 && isPlaying && !isGameOver && !isReplay && (
              <span
                className={`ml-1 text-[9.5px] font-mono font-bold tabular-nums transition-colors duration-200 ${
                  score > highScore
                    ? 'text-[#0099FF] animate-pulse'
                    : highScore - score <= 50
                    ? 'text-[#D97706] dark:text-[#FBBF24]'
                    : 'text-slate-400/80 dark:text-slate-500'
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

      {/* 极简金果流光微导轨 (高度恒定 3px，绝对零物理位移，绝不推挤棋盘) */}
      <div className="w-full h-1 my-1 rounded-full overflow-hidden bg-slate-100/80 dark:bg-slate-800/50 transition-all">
        <div
          className={`h-full bg-gradient-to-r from-[#F59E0B] via-[#EF4444] to-[#F59E0B] rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_#F59E0B] ${
            hasBonus ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, bonusProgressPercent))}%` }}
        />
      </div>

      {/* Canvas 画布与全屏滑屏手势感应层 (100% 纯净视界，无内贴进度条干扰) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative rounded-2xl overflow-hidden bg-[#F8FAFC] dark:bg-[#0A0F1D] border border-slate-200/70 dark:border-slate-800 touch-none max-w-full shadow-inner select-none"
      >
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="block max-w-full h-auto aspect-square bg-[#F8FAFC] dark:bg-[#0A0F1D]" />

        {/* 开始游戏遮罩 (非回放模式：带新手直觉操作指引气泡) */}
        {!isPlaying && !isGameOver && !isReplay && (
          <div className="absolute inset-0 z-30 bg-white/85 dark:bg-[#0A0F1D]/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 select-none text-[#0F172A] dark:text-slate-100">
            <button
              onClick={onStart}
              className="px-7 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white rounded-full text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Play size={16} />
              <span>开始游戏</span>
              <span className="hidden sm:inline text-xs font-normal opacity-90">(空格)</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#66CCFF]" />
              <span>按空格/方向键 或 屏幕任意处划动启程</span>
            </div>
          </div>
        )}

        {/* 开局就绪等待唤醒指示器 (消除重开瞬发猝死，按键或触控即走) */}
        {isPlaying && !isGameOver && !isPaused && isWaitingStart && !isReplay && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-black/[0.02] dark:bg-black/20">
            <div className="animate-pulse flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#0099FF]" />
              <span>按方向键 / 滑动屏幕出发</span>
            </div>
          </div>
        )}

        {/* 暂停遮罩 */}
        {isPaused && (
          <div
            onClick={onTogglePause}
            className="absolute inset-0 z-30 bg-white/85 dark:bg-[#0A0F1D]/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-[#0F172A] dark:text-slate-100 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#EBF8FF] dark:bg-[#0099FF]/20 text-[#0099FF] flex items-center justify-center mb-2">
              <Pause size={24} />
            </div>
            <span className="text-sm font-bold">{isReplay ? '回放已暂停' : '游戏已暂停'}</span>
            <span className="text-xs text-[#94A3B8] dark:text-slate-400 mt-1">
              点击任意位置<span className="hidden sm:inline">或按空格/P</span>继续
            </span>
          </div>
        )}

        {/* 暂停恢复快速 3 拍微倒数 (每拍 360ms，充裕就位缓冲，支持预输入过弯) */}
        {resumeCountdown !== null && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-black/[0.04] dark:bg-black/30">
            <div
              key={resumeCountdown}
              className="w-16 h-16 rounded-[22px] bg-white/95 dark:bg-slate-800/95 border border-[#0099FF]/35 shadow-md flex flex-col items-center justify-center animate-in zoom-in-75 fade-in duration-150 select-none"
            >
              <span className="font-mono text-3xl font-black text-[#0099FF] tabular-nums leading-none">
                {resumeCountdown}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1">发车预备</span>
            </div>
          </div>
        )}

        {/* 游戏结束结算面板 (极简 NCU HOME 现代主义几何卡片) */}
        {isGameOver && (
          <div className="absolute inset-0 z-30 bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-[6px] flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-200 text-[#0F172A] dark:text-white">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EBF8FF] dark:bg-[#0099FF]/20 text-[#0099FF] dark:text-sky-300 font-bold text-xs mb-2.5 shadow-2xs">
              <span>{isReplay ? '观摩播放结束' : '游戏结束'}</span>
            </div>

            {/* 荣耀加冕：NCU HOME 微拟态段位勋章 (点亮高饱和多彩微光) */}
            <div className="mb-2">
              <SettleTierCrest score={score} />
            </div>

            <div className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white font-mono tracking-tight mb-1 tabular-nums">
              {score} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">分</span>
            </div>

            {/* 真实死因复盘与玩家战况点评 (人文极简现代主义，杜绝粗糙方括号) */}
            <div className="flex flex-col items-center gap-1 mb-3.5">
              {deathReason && (
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px]">死因</span>
                  <span className="font-bold">{deathReason}</span>
                </div>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {(() => {
                  if (score >= 1000) return '登峰造极 · 破千荣耀时刻';
                  if (score >= 600) return '极速破风 · 走位游刃有余';
                  if (maxCombo >= 5) return '连击大师 · 节拍掌控入微';
                  if (score < 100) return '初试身手 · 循序渐进';
                  return '战局定格 · 距新纪录一步之遥';
                })()}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mb-4 bg-[#F8FAFC] dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-xs">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">蛇身长度</span>
                <strong className="text-[#0099FF] font-mono font-bold text-sm tabular-nums">{length}</strong>
              </div>
              <span className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400">存活用时</span>
                <strong className="text-[#8B5CF6] font-mono font-bold text-sm tabular-nums">{duration}s</strong>
              </div>
              <span className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
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
                  onClick={handleOpenArtModal}
                  className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold cursor-pointer shadow-xs transition-all border border-slate-200/60 dark:border-slate-700"
                  title="生成走位艺术卡片"
                >
                  走位卡片
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
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold cursor-pointer shadow-xs"
                >
                  <span>退出</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <button
                  onClick={handleOpenArtModal}
                  className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-full text-xs sm:text-sm font-bold cursor-pointer shadow-xs transition-all"
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
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : isPaused
                    ? 'bg-[#0099FF] text-white hover:bg-[#0284C7] cursor-pointer active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#EBF8FF] dark:hover:bg-[#0099FF]/20 text-[#334155] dark:text-slate-200 hover:text-[#0099FF] dark:hover:text-[#0099FF] cursor-pointer active:scale-95'
                }`}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                <span>{isPaused ? '继续播放' : '暂停回放'}</span>
              </button>

              {/* 倍速切换 */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                {[1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => onSetReplaySpeed?.(sp)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      replaySpeedRate === sp
                        ? 'bg-white dark:bg-slate-700 text-[#0099FF] dark:text-sky-300 shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>

              {/* 退出观摩 */}
              <button
                onClick={onExitReplay}
                className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <span>退出观摩</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">确定性物理重放 · 逐帧还原真实走位</div>
          </div>
        ) : showDpad ? (
          /* 移动端智能触控按键控制台 (零误触·紧凑一体化) */
          <div className="flex flex-col items-center gap-1.5 touch-manipulation select-none">
            {/* 顶部辅助操作栏：暂停键独立置顶，绝不干扰方向盲操 */}
            <div className="w-full max-w-[260px] flex items-center justify-between px-1 mb-0.5">
              <button
                onClick={() => {
                  sound.unlockAudio();
                  onTogglePause?.();
                }}
                disabled={!isPlaying || isGameOver}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                  isPaused
                    ? 'bg-[#0099FF] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#EBF8FF] dark:hover:bg-[#0099FF]/20 text-slate-600 dark:text-slate-300 hover:text-[#0099FF] dark:hover:text-[#0099FF]'
                } ${!isPlaying || isGameOver ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              >
                {isPaused ? <Play size={12} /> : <Pause size={12} />}
                <span>{isPaused ? '继续' : '暂停'}</span>
              </button>

              <button
                onClick={toggleDpadLayout}
                title="切换经典十字盘或电脑倒T型布局"
                className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs flex items-center gap-1 font-mono"
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
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[62px] h-[46px] bg-slate-100/95 dark:bg-slate-800/95 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-t-2xl rounded-b-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronUp size={26} />
                </button>

                {/* 左 */}
                <button
                  onClick={() => handleDirBtn('LEFT')}
                  aria-label="向左"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[48px] h-[58px] bg-slate-100/95 dark:bg-slate-800/95 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-l-2xl rounded-r-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronLeft size={26} />
                </button>

                {/* 中心静息盲操凹核 (NCU HOME 四色微核心) */}
                <div className="w-9 h-9 rounded-full bg-slate-200/70 dark:bg-slate-700/70 border border-white dark:border-slate-600 flex items-center justify-center shadow-inner pointer-events-none">
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
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[48px] h-[58px] bg-slate-100/95 dark:bg-slate-800/95 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-r-2xl rounded-l-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronRight size={26} />
                </button>

                {/* 下 */}
                <button
                  onClick={() => handleDirBtn('DOWN')}
                  aria-label="向下"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[62px] h-[46px] bg-slate-100/95 dark:bg-slate-800/95 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-b-2xl rounded-t-md flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
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
                  className="w-[64px] h-[44px] bg-slate-100/95 dark:bg-slate-800/95 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                >
                  <ChevronUp size={26} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDirBtn('LEFT')}
                    aria-label="向左"
                    className="w-[64px] h-[44px] bg-slate-100 dark:bg-slate-800 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                  >
                    <ChevronLeft size={26} />
                  </button>
                  <button
                    onClick={() => handleDirBtn('DOWN')}
                    aria-label="向下"
                    className="w-[64px] h-[44px] bg-slate-100 dark:bg-slate-800 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
                  >
                    <ChevronDown size={26} />
                  </button>
                  <button
                    onClick={() => handleDirBtn('RIGHT')}
                    aria-label="向右"
                    className="w-[64px] h-[44px] bg-slate-100 dark:bg-slate-800 active:bg-[#0099FF] dark:active:bg-[#0099FF] text-slate-700 dark:text-slate-200 active:text-white rounded-2xl flex items-center justify-center shadow-xs cursor-pointer dpad-spring-btn"
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
                isPaused ? 'bg-[#0099FF] text-white hover:bg-[#0284C7]' : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#EBF8FF] dark:hover:bg-[#0099FF]/20 text-[#334155] dark:text-slate-200 hover:text-[#0099FF] dark:hover:text-[#0099FF]'
              } ${!isPlaying || isGameOver ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isPaused ? '继续游戏 (P / 空格)' : '暂停游戏 (P / 空格)'}</span>
            </button>
            <div className="text-[11px] text-[#94A3B8] dark:text-slate-500">方向键 / WASD 转向 · 空格键开始 · P 键暂停</div>
          </div>
        )}

        {/* 底部微型模式切换胶囊 (回放模式隐藏) */}
        {!isReplay && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#94A3B8] dark:text-slate-500 pt-1 select-none">
            <button
              onClick={toggleDpad}
              title="切换全屏滑屏或虚拟按键模式"
              className="text-[11px] font-semibold text-[#0099FF] dark:text-[#38BDF8] hover:text-[#0284C7] bg-[#EBF8FF] dark:bg-[#0099FF]/15 hover:bg-[#E0F2FE] dark:hover:bg-[#0099FF]/25 px-3 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs"
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
