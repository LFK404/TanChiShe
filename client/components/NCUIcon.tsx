'use client';

import React from 'react';

interface CrestProps {
  unlocked?: boolean;
  size?: number;
  className?: string;
}

// 1. 青铜段位·双生嫩芽勋章 (自然初生 · 翠绿底座 + 柠黄双生芽 + 纯白露珠)
export function BronzeCrestIcon({ unlocked = false, size = 40, className = '' }: CrestProps) {
  const uid = React.useId().replace(/:/g, '');
  const baseGrad = unlocked ? ['#34D399', '#10B981'] : ['#F1F5F9', '#E2E8F0'];
  const sproutColor = unlocked ? '#FACC15' : '#CBD5E1';
  const leafColor = unlocked ? '#FFFFFF' : '#94A3B8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_4px_10px_rgba(16,185,129,0.28)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`b_grad_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={baseGrad[0]} />
          <stop offset="100%" stopColor={baseGrad[1]} />
        </linearGradient>
      </defs>
      {/* 28% 超椭圆柔和底座 */}
      <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#b_grad_${uid})`} />

      {/* 不对称倾斜双生嫩芽 (辅色柠黄) */}
      <path
        d="M22 31 C22 25, 17 21, 13 22 C12 28, 17 31, 22 31 Z"
        fill={sproutColor}
        opacity={unlocked ? 0.95 : 0.6}
      />
      {/* 主芽微卷曲线 (纯白负空间) */}
      <path
        d="M21 31 C21 21, 27 13, 33 14 C34 22, 28 29, 21 31 Z"
        fill={leafColor}
      />
      {/* 灵动晨露水滴 */}
      <circle cx="27" cy="18" r="1.5" fill={unlocked ? '#FACC15' : '#CBD5E1'} />
    </svg>
  );
}

// 2. 白银段位·冰浪流水勋章 (行云流水 · 银蓝底座 + 冰晶流体浪纹 + 纯白风痕)
export function SilverCrestIcon({ unlocked = false, size = 40, className = '' }: CrestProps) {
  const uid = React.useId().replace(/:/g, '');
  const baseGrad = unlocked ? ['#94A3B8', '#64748B'] : ['#F1F5F9', '#E2E8F0'];
  const waveColor = unlocked ? '#38BDF8' : '#CBD5E1';
  const crestColor = unlocked ? '#FFFFFF' : '#94A3B8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_4px_10px_rgba(100,116,139,0.28)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`s_grad_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={baseGrad[0]} />
          <stop offset="100%" stopColor={baseGrad[1]} />
        </linearGradient>
      </defs>
      {/* 28% 超椭圆柔和底座 */}
      <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#s_grad_${uid})`} />

      {/* 不对称冰晶微浪 (辅色冰蓝) */}
      <path
        d="M10 27 C14 21, 20 20, 24 23 C28 26, 32 24, 34 20 C32 28, 24 30, 18 28 C14 27, 12 28, 10 27 Z"
        fill={waveColor}
        opacity={unlocked ? 0.95 : 0.6}
      />
      {/* 上层纯白浪峰曲面 */}
      <path
        d="M12 22 C16 16, 22 15, 26 18 C30 21, 33 19, 34 16 C33 23, 26 25, 20 23 C16 22, 14 23, 12 22 Z"
        fill={crestColor}
      />
      {/* 纯白流风气旋 */}
      <circle cx="28" cy="14" r="1.5" fill="#FFFFFF" opacity={unlocked ? 0.95 : 0.6} />
    </svg>
  );
}

// 3. 黄金段位·星曜土星勋章 (登峰造极 · 暖金底座 + 晨曦橙倾斜双色环 + 纯白耀星)
export function GoldCrestIcon({ unlocked = false, size = 40, className = '' }: CrestProps) {
  const uid = React.useId().replace(/:/g, '');
  const baseGrad = unlocked ? ['#FBBF24', '#F59E0B'] : ['#F1F5F9', '#E2E8F0'];
  const ringColor = unlocked ? '#FB923C' : '#CBD5E1';
  const starColor = unlocked ? '#FFFFFF' : '#94A3B8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_4px_10px_rgba(245,158,11,0.32)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`g_grad_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={baseGrad[0]} />
          <stop offset="100%" stopColor={baseGrad[1]} />
        </linearGradient>
      </defs>
      {/* 28% 超椭圆柔和底座 */}
      <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#g_grad_${uid})`} />

      {/* 不对称倾斜 28° 土星轨道双色环 (辅色橙金) */}
      <path
        d="M9 25 C13 18, 30 14, 35 19 C32 23, 16 27, 9 25 Z"
        fill={ringColor}
        opacity={unlocked ? 0.95 : 0.6}
      />
      {/* 核心纯白球体 */}
      <circle cx="22" cy="22" r="7" fill={starColor} />
      {/* 环前切线覆盖层 */}
      <path
        d="M10 24 C14 26, 27 24, 34 18 C33 20, 26 24, 10 26 Z"
        fill={unlocked ? '#FEF3C7' : '#94A3B8'}
      />
      {/* 纯白天顶星芒点睛 */}
      <circle cx="20" cy="18" r="1.4" fill={unlocked ? '#FEF3C7' : '#FFFFFF'} />
    </svg>
  );
}

// 4. 钻石段位·极光晶星勋章 (超凡殿堂 · 天青底座 + 极光紫不规则晶核 + 纯白晶芒)
export function DiamondCrestIcon({ unlocked = false, size = 40, className = '' }: CrestProps) {
  const uid = React.useId().replace(/:/g, '');
  const baseGrad = unlocked ? ['#38BDF8', '#0099FF'] : ['#F1F5F9', '#E2E8F0'];
  const crystalColor = unlocked ? '#818CF8' : '#CBD5E1';
  const coreColor = unlocked ? '#FFFFFF' : '#94A3B8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_4px_12px_rgba(0,153,255,0.36)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`d_grad_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={baseGrad[0]} />
          <stop offset="100%" stopColor={baseGrad[1]} />
        </linearGradient>
      </defs>
      {/* 28% 超椭圆柔和底座 */}
      <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#d_grad_${uid})`} />

      {/* 不对称极光紫晶晶带 (辅色极光紫) */}
      <path
        d="M12 28 C15 18, 30 15, 34 20 C32 25, 17 29, 12 28 Z"
        fill={crystalColor}
        opacity={unlocked ? 0.95 : 0.6}
      />
      {/* 纯白四方极光晶芒多面体 (主核) */}
      <path
        d="M22 10 C23 16, 26 19, 32 20 C26 21, 23 24, 22 30 C21 24, 18 21, 12 20 C18 19, 21 16, 22 10 Z"
        fill={coreColor}
      />
      {/* 晶芒内芯微光 */}
      <circle cx="22" cy="20" r="1.8" fill={unlocked ? '#E0F2FE' : '#CBD5E1'} />
    </svg>
  );
}

// 5. NCU HOME 规则步骤双色微标 (01, 02, 03, 04)
export function NCUNumberBadge({ num, color = '#0099FF', bg = '#EBF8FF' }: { num: string; color?: string; bg?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black shrink-0 font-mono shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      style={{ backgroundColor: bg, color }}
    >
      {num}
    </span>
  );
}

// 6. 统一 NCU HOME 段位勋章解析与呈现组件 (消灭各业务组件中的重复 switch-case 冗余)
export function NCUCrestBadge({
  tier = 'BRONZE',
  unlocked = false,
  size = 40,
  className = '',
}: {
  tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  unlocked?: boolean;
  size?: number;
  className?: string;
}) {
  switch (tier) {
    case 'BRONZE':
      return <BronzeCrestIcon unlocked={unlocked} size={size} className={className} />;
    case 'SILVER':
      return <SilverCrestIcon unlocked={unlocked} size={size} className={className} />;
    case 'GOLD':
      return <GoldCrestIcon unlocked={unlocked} size={size} className={className} />;
    case 'DIAMOND':
      return <DiamondCrestIcon unlocked={unlocked} size={size} className={className} />;
    default:
      return <BronzeCrestIcon unlocked={unlocked} size={size} className={className} />;
  }
}
