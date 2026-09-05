'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NCUCrestBadge, NCUAchievementIcon } from './NCUIcon';
import { Achievement, AchievementTier } from '@/utils/achievements';

export interface ToastItem {
  id: string;
  text: string;
  color?: string;
  tier?: AchievementTier;
  achievement?: Achievement;
  extraCount?: number; // 额外同时达成的成就数量
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

// ======================================================================
// 36 颗全动态微晶粒子发射器配置
// ======================================================================

// 1. 12 颗四芒灵晶星曜 (360° 均匀辐射扩散)
const STAR_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180;
  const dist = 38 + (i % 3) * 12; // 38px ~ 62px
  return {
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist)}px`,
    size: 8 + (i % 3) * 2.5, // 8px ~ 13px
    delay: `${(i % 4) * 25}ms`,
  };
});

// 2. 16 颗多巴胺发光微晶光珠
const ORB_PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = ((i * 22.5 + 11.25) * Math.PI) / 180;
  const dist = 26 + (i % 4) * 11; // 26px ~ 59px
  return {
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist)}px`,
    size: 4.5 + (i % 3) * 2, // 4.5px ~ 8.5px
    delay: `${(i % 5) * 20}ms`,
  };
});

// 3. 8 道超音速光梭微射线 (营造锐利破空感)
const STREAK_PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const deg = i * 45 + 22.5;
  const angle = (deg * Math.PI) / 180;
  const dist = 48 + (i % 2) * 16; // 48px ~ 64px
  return {
    angle: `${deg}deg`,
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist)}px`,
    delay: `${(i % 3) * 30}ms`,
  };
});

// ======================================================================
// 纯彩色多巴胺流光主题方案 (100% 纯彩渐变，彻底告别白底灰底)
// ======================================================================
interface ThemeConfig {
  gradient: string;
  glowShadow: string;
  colors: string[];
  badgeClass: string;
}

const THEME_MAP: Record<AchievementTier, ThemeConfig> = {
  DIAMOND: {
    gradient: 'from-[#0052D4] via-[#0099FF] to-[#38BDF8]',
    glowShadow: '0 8px 32px rgba(0,153,255,0.7), 0 2px 10px rgba(0,82,212,0.4)',
    colors: ['#38BDF8', '#60A5FA', '#93C5FD', '#FFFFFF', '#00E5FF'],
    badgeClass: 'bg-black/35 border-sky-300/40 text-sky-100',
  },
  GOLD: {
    gradient: 'from-[#B45309] via-[#F59E0B] to-[#FBBF24]',
    glowShadow: '0 8px 32px rgba(245,158,11,0.75), 0 2px 10px rgba(180,83,9,0.45)',
    colors: ['#FDE047', '#FBBF24', '#F59E0B', '#FFFFFF', '#FEF08A'],
    badgeClass: 'bg-black/35 border-amber-300/40 text-amber-100',
  },
  SILVER: {
    gradient: 'from-[#4338CA] via-[#0284C7] to-[#38BDF8]',
    glowShadow: '0 8px 32px rgba(2,132,199,0.7), 0 2px 10px rgba(67,56,202,0.4)',
    colors: ['#818CF8', '#38BDF8', '#BAE6FD', '#FFFFFF', '#67E8F9'],
    badgeClass: 'bg-black/35 border-indigo-300/40 text-indigo-100',
  },
  BRONZE: {
    gradient: 'from-[#065F46] via-[#10B981] to-[#34D399]',
    glowShadow: '0 8px 32px rgba(16,185,129,0.7), 0 2px 10px rgba(6,95,70,0.4)',
    colors: ['#34D399', '#10B981', '#6EE7B7', '#FFFFFF', '#A7F3D0'],
    badgeClass: 'bg-black/35 border-emerald-300/40 text-emerald-100',
  },
};

/**
 * 单个受控自驱高光弹窗实体 (独立时钟闭环 + 看门狗安全强杀)
 * - 彻底与外部 re-render 解耦，内部计时器绝对不会被外部数组变动误杀
 * - 2200ms 硬件看门狗绝对兜底，彻底杜绝在屏幕上永久停留
 */
function ActiveToastCard({
  item,
  onDone,
}: {
  item: ToastItem;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const hasFinishedRef = useRef(false);

  const safeFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    // 正常生命周期：1.35s 高光保持 ➔ 350ms Q 弹退场
    const holdTimer = setTimeout(() => {
      setPhase('out');
    }, 1350);

    const finishTimer = setTimeout(() => {
      safeFinish();
    }, 1700);

    // 硬件级看门狗绝对超时保障：2200ms 到达无条件强杀离场，彻底防死锁
    const watchdogTimer = setTimeout(() => {
      safeFinish();
    }, 2200);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
      clearTimeout(watchdogTimer);
    };
  }, [safeFinish]);

  const tier = item.tier || item.achievement?.tier || 'BRONZE';
  const theme = THEME_MAP[tier] || THEME_MAP.BRONZE;

  return (
    <div className="fixed top-12 sm:top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none flex items-center justify-center">
      {/* 弹窗迸发 36 颗全动态微晶粒子爆炸系统 */}
      {phase === 'in' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* 1. 多巴胺环形冲击波光环 (自勋章中心快速扩散淡出) */}
          <div
            className="absolute w-20 h-20 rounded-full border-2 border-white/70 animate-toast-shockwave pointer-events-none"
            style={{ boxShadow: `0 0 20px ${theme.colors[0]}` }}
          />

          {/* 2. 12 颗四芒灵晶星曜 */}
          {STAR_PARTICLES.map((sp, idx) => {
            const color = theme.colors[idx % theme.colors.length];
            return (
              <div
                key={`star_${idx}`}
                className="absolute animate-toast-sparkle"
                style={
                  {
                    '--dx': sp.dx,
                    '--dy': sp.dy,
                    animationDelay: sp.delay,
                  } as React.CSSProperties
                }
              >
                <svg width={sp.size} height={sp.size} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2 C13 7, 17 11, 22 12 C17 13, 13 17, 12 22 C11 17, 7 13, 2 12 C7 11, 11 7, 12 2 Z"
                    fill={color}
                  />
                  <circle cx="12" cy="12" r="2.8" fill="#FFFFFF" />
                </svg>
              </div>
            );
          })}

          {/* 3. 16 颗多巴胺发光微晶光珠 */}
          {ORB_PARTICLES.map((op, idx) => {
            const color = theme.colors[(idx + 2) % theme.colors.length];
            return (
              <div
                key={`orb_${idx}`}
                className="absolute animate-toast-sparkle"
                style={
                  {
                    '--dx': op.dx,
                    '--dy': op.dy,
                    animationDelay: op.delay,
                  } as React.CSSProperties
                }
              >
                <div
                  className="rounded-full shadow-xs"
                  style={{
                    width: op.size,
                    height: op.size,
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
              </div>
            );
          })}

          {/* 4. 8 道超音速光梭微射线 */}
          {STREAK_PARTICLES.map((stp, idx) => {
            const color = theme.colors[idx % theme.colors.length];
            return (
              <div
                key={`streak_${idx}`}
                className="absolute animate-toast-streak"
                style={
                  {
                    '--dx': stp.dx,
                    '--dy': stp.dy,
                    '--angle': stp.angle,
                    animationDelay: stp.delay,
                  } as React.CSSProperties
                }
              >
                <div
                  className="w-3.5 h-0.5 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 纯彩色多巴胺流光胶囊本体 (彻底告别白底灰底) */}
      <div
        className={`relative z-10 h-11 px-3.5 rounded-full flex items-center gap-2.5 bg-gradient-to-r ${theme.gradient} border border-white/35 ${
          phase === 'in' ? 'animate-jelly-in' : 'animate-jelly-out'
        }`}
        style={{
          boxShadow: theme.glowShadow,
        }}
      >
        {/* 左侧：36px 高清纯悬浮专属矢量勋章 (结合重构的32枚勋章) */}
        <div className="shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          {item.achievement ? (
            <NCUAchievementIcon achievement={item.achievement} unlocked size={36} />
          ) : (
            <NCUCrestBadge tier={item.tier} unlocked size={30} />
          )}
        </div>

        {/* 中间：荣誉抬头与超粗反白成就名称 */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-[9.5px] font-black tracking-widest uppercase text-white/90 drop-shadow-xs">
              ✦ 荣耀点亮
            </span>
          </div>
          <span className="text-sm font-black text-white tracking-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {item.achievement?.name || item.text}
          </span>
        </div>

        {/* 右侧：专属编号微胶囊 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border shadow-xs tracking-wider uppercase ${theme.badgeClass}`}
          >
            {item.achievement?.code || item.tier || 'PASS'}
          </span>

          {/* 额外同时解锁数量合并角标 (+N 勋章) */}
          {item.extraCount && item.extraCount > 0 ? (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white text-slate-900 shadow-sm animate-pulse">
              +{item.extraCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * 局内高光弹窗系统
 * - 纯单项受控队列消费，直接以 toasts[0] 为活跃项
 * - 借助 React key 机制确保每个勋章弹窗拥有绝对隔离自足的生命周期
 * - 0 冗余内部 state，彻底杜绝 react-hooks/set-state-in-effect 与死锁隐患
 */
export default function InGameToast({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  const current = toasts[0];

  return (
    <ActiveToastCard
      key={current.id}
      item={current}
      onDone={() => onRemove(current.id)}
    />
  );
}
