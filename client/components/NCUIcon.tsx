'use client';

import React from 'react';
import { Achievement, AchievementCategory, AchievementTier } from '@/utils/achievements';

interface GlyphProps {
  unlocked?: boolean;
  size?: number;
  className?: string;
  level?: number;
}

// ----------------------------------------------------------------------
// 通用样式工具
// ----------------------------------------------------------------------
function getShadow(unlocked: boolean, glowColor: string) {
  return unlocked
    ? `drop-shadow-[0_0_9px_${glowColor}]`
    : 'opacity-75 dark:opacity-65 hover:opacity-100 transition-opacity';
}

// ======================================================================
// 1. 得分突破系列 (Score) —— 5 枚完全不同造型
// ======================================================================

// SC-01 崭露锋芒 (200分) —— 四芒灵晶微星
export function Score200Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#34D399', '#059669', '#A7F3D0'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(52,211,153,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`sc1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 灵动四芒微星 */}
      <path d="M22 6 C23 16, 28 21, 38 22 C28 23, 23 28, 22 38 C21 28, 16 23, 6 22 C16 21, 21 16, 22 6 Z" fill={`url(#sc1_${uid})`} />
      <circle cx="22" cy="22" r="3.2" fill="#FFFFFF" />
      <circle cx="30" cy="14" r="1.5" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

// SC-02 得分好手 (500分) —— 八面几何切面钻石
export function Score500Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#38BDF8', '#0284C7', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(56,189,248,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`sc2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 钻石上切面台面与外框 */}
      <polygon points="14,14 30,14 37,22 22,36 7,22" fill={`url(#sc2_${uid})`} />
      {/* 钻石顶部上三角切面 */}
      <polygon points="18,14 26,14 22,22" fill="#FFFFFF" opacity="0.45" />
      <polygon points="14,14 18,14 22,22 7,22" fill={colors[2]} opacity="0.3" />
      <polygon points="26,14 30,14 37,22 22,22" fill={colors[1]} opacity="0.5" />
      {/* 钻石下棱边线 */}
      <polygon points="7,22 22,22 22,36" fill="#FFFFFF" opacity="0.25" />
      <polygon points="37,22 22,22 22,36" fill={colors[1]} opacity="0.4" />
      {/* 左上高光闪光 */}
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// SC-03 得分大师 (800分) —— 尊贵三联王冠
export function Score800Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#FBBF24', '#D97706', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(251,191,36,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`sc3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 王冠底座厚重条带 */}
      <rect x="9" y="30" width="26" height="4" rx="1.5" fill={colors[1]} />
      {/* 王冠五峰/三峰主体 */}
      <path d="M9 30 L8 18 L15 24 L22 13 L29 24 L36 18 L35 30 Z" fill={`url(#sc3_${uid})`} />
      {/* 三峰顶端璀璨珍珠微球 */}
      <circle cx="8" cy="17" r="2.2" fill="#FFFFFF" />
      <circle cx="22" cy="12" r="2.8" fill="#FFFFFF" />
      <circle cx="36" cy="17" r="2.2" fill="#FFFFFF" />
      {/* 王冠正中菱形红/纯白宝石 */}
      <polygon points="22,22 25,26 22,30 19,26" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

// SC-04 登峰造极 (1400分) —— 双棱雪山峰顶与旭日星曜
export function Score1400Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#A855F7', '#7E22CE', '#E9D5FF'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(168,85,247,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`sc4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 旭日晨光圆球 */}
      <circle cx="32" cy="14" r="5" fill={colors[2]} opacity="0.85" />
      {/* 峰顶山体左阳面 */}
      <polygon points="22,8 22,35 7,35" fill={`url(#sc4_${uid})`} />
      {/* 峰顶山体右阴面 */}
      <polygon points="22,8 37,35 22,35" fill={colors[1]} />
      {/* 峰顶终年积雪雪线 */}
      <polygon points="22,8 22,19 16,16" fill="#FFFFFF" opacity="0.95" />
      <polygon points="22,8 28,17 22,19" fill="#FFFFFF" opacity="0.75" />
      {/* 巅峰之星 */}
      <circle cx="22" cy="7" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}

// SC-05 贪吃神话 (2500分) —— 超新星烈焰神圣圣杯
export function Score2500Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#F43F5E', '#BE123C', '#FECDD3'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(244,63,94,0.5)')} ${className}`}>
      <defs>
        <linearGradient id={`sc5_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 背后神圣光环 */}
      <circle cx="22" cy="19" r="15" stroke={colors[2]} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
      {/* 圣杯杯体 */}
      <path d="M14 9 C14 20, 18 24, 22 25 C26 24, 30 20, 30 9 Z" fill={`url(#sc5_${uid})`} />
      {/* 圣杯双耳把手 */}
      <path d="M14 12 C9 12, 9 19, 15 20" stroke={colors[0]} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M30 12 C35 12, 35 19, 29 20" stroke={colors[0]} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* 圣杯底座与立柱 */}
      <path d="M20 25 L20 31 L14 35 L30 35 L24 31 L24 25 Z" fill={colors[1]} />
      {/* 杯中溢出的神圣灵火 */}
      <circle cx="22" cy="15" r="4.5" fill="#FFFFFF" />
      <circle cx="22" cy="15" r="2.2" fill={colors[0]} />
    </svg>
  );
}

// ======================================================================
// 2. 蛇身长度系列 (Length) —— 4 枚完全不同造型
// ======================================================================

// LN-01 见风渐长 (20节) —— 蜷曲大眼萌蛇 (告别单纯的S)
export function Length20Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#047857', '#A7F3D0'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`ln1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 环形蜷曲身躯 */}
      <path d="M22 10 A 12 12 0 1 1 12 26" stroke={`url(#ln1_${uid})`} strokeWidth="6" strokeLinecap="round" />
      {/* 萌动大蛇头 */}
      <circle cx="24" cy="10" r="6" fill={colors[0]} />
      {/* 灵动大双眼 */}
      <circle cx="25.5" cy="8.5" r="2.2" fill="#FFFFFF" />
      <circle cx="26" cy="8.5" r="1.1" fill="#0F172A" />
      <circle cx="26.3" cy="8.2" r="0.4" fill="#FFFFFF" />
      {/* 可爱小信子 */}
      <path d="M30 10 L33 9 M30 10 L33 11" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// LN-02 蜿蜒游龙 (40节) —— 水平起伏波浪蛇 + 锐利背鳍
export function Length40Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#38BDF8', '#0284C7', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(56,189,248,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`ln2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 背部三道三角尖鳍 */}
      <polygon points="12,19 14,14 16,19" fill={colors[2]} />
      <polygon points="21,17 23,12 25,17" fill={colors[2]} />
      <polygon points="30,19 32,14 34,19" fill={colors[2]} />
      {/* 横向波浪蜿蜒游动身躯 */}
      <path d="M7 26 C12 18, 17 18, 22 22 C27 26, 32 26, 37 18" stroke={`url(#ln2_${uid})`} strokeWidth="5.5" strokeLinecap="round" />
      {/* 龙头眼睛 */}
      <circle cx="36" cy="18" r="4" fill={colors[0]} />
      <circle cx="37" cy="17.5" r="1.5" fill="#FFFFFF" />
      <circle cx="37.3" cy="17.5" r="0.7" fill="#0284C7" />
    </svg>
  );
}

// LN-03 巨蟒盘踞 (60节) —— 双同心紧凑螺旋重装盘蟒 + 龙珠
export function Length60Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#FBBF24', '#D97706', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(251,191,36,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`ln3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 外圈紧实盘身 */}
      <circle cx="22" cy="22" r="15" stroke={`url(#ln3_${uid})`} strokeWidth="4.5" strokeDasharray="80 12" />
      {/* 内圈盘旋 */}
      <path d="M16 26 A 7 7 0 1 1 27 18" stroke={colors[0]} strokeWidth="4" strokeLinecap="round" />
      {/* 核心守护的纯白璀璨龙珠 */}
      <circle cx="22" cy="22" r="4.2" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2" fill={colors[1]} />
      <circle cx="23" cy="21" r="0.8" fill="#FFFFFF" />
    </svg>
  );
}

// LN-04 吞天巨蟒 (100节) —— 威严神龙首尊 (昂扬双龙角与龙须)
export function Length100Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#0099FF', '#1D4ED8', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(0,153,255,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`ln4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 威严双龙角 */}
      <path d="M22 17 C23 11, 28 8, 33 6 C29 11, 27 15, 25 18" fill={colors[2]} />
      <path d="M17 19 C16 13, 11 10, 6 8 C10 13, 12 17, 14 20" fill={colors[2]} />
      {/* 龙头主轮廓 */}
      <path d="M14 20 L26 19 L32 25 L35 30 L28 34 L21 31 L14 33 L11 26 Z" fill={`url(#ln4_${uid})`} />
      {/* 飘逸龙须 */}
      <path d="M28 32 C34 35, 38 33, 40 30" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M14 31 C8 34, 4 32, 2 29" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* 龙眼明珠 */}
      <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
      <circle cx="24.5" cy="24" r="1.1" fill={colors[1]} />
    </svg>
  );
}

// ======================================================================
// 3. 生存时间系列 (Time) —— 4 枚完全不同造型
// ======================================================================

// TM-01 初出茅庐 (60秒) —— 经典竞技按键秒表
export function Time60Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#059669', '#A7F3D0'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`tm1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 顶部挂环与启动按钮 */}
      <path d="M17 6 C17 3, 27 3, 27 6" stroke={colors[1]} strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="20" y="5" width="4" height="4" rx="1" fill={colors[1]} />
      {/* 秒表大圆表盘 */}
      <circle cx="22" cy="24" r="14" fill={`url(#tm1_${uid})`} />
      <circle cx="22" cy="24" r="10.5" fill="#FFFFFF" opacity="0.9" />
      {/* 秒表指针 (精准指向 60秒/12点方向) */}
      <line x1="22" y1="24" x2="22" y2="16" stroke={colors[1]} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22" cy="24" r="2" fill={colors[1]} />
    </svg>
  );
}

// TM-02 沉着冷静 (120秒) —— 古典流光细颈沙漏
export function Time120Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#38BDF8', '#0284C7', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(56,189,248,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`tm2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 沙漏上下底座木梁 */}
      <rect x="11" y="8" width="22" height="3" rx="1.5" fill={colors[1]} />
      <rect x="11" y="33" width="22" height="3" rx="1.5" fill={colors[1]} />
      {/* 双锥形玻璃体 */}
      <path d="M13 11 L31 11 L24 22 L31 33 L13 33 L20 22 Z" fill={`url(#tm2_${uid})`} opacity="0.4" />
      <path d="M13 11 L31 11 L24 22 L31 33 L13 33 L20 22 Z" stroke={colors[1]} strokeWidth="2" strokeLinejoin="round" fill="none" />
      {/* 下方积聚的纯金细沙 */}
      <polygon points="17,33 27,33 22,27" fill={colors[2]} />
      {/* 正在下落的金色流沙线 */}
      <line x1="22" y1="18" x2="22" y2="28" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

// TM-03 坚韧不拔 (200秒) —— 螺旋年轮时光守护盾
export function Time200Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#F59E0B', '#B45309', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(245,158,11,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`tm3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 坚毅盾牌轮廓 */}
      <path d="M22 6 L35 11 L35 24 C35 32, 22 38, 22 38 C22 38, 9 32, 9 24 L9 11 Z" fill={`url(#tm3_${uid})`} />
      {/* 盾面内嵌三层年轮纹 */}
      <path d="M22 12 C28 12, 30 17, 30 23 C30 29, 22 33, 22 33" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M22 17 C26 17, 26 21, 26 25" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
      {/* 盾心核心坚韧恒星 */}
      <circle cx="22" cy="23" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

// TM-04 岁月不朽 (300秒) —— 莫比乌斯无限之环 ∞
export function Time300Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#6366F1', '#4338CA', '#EEF2FF'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(99,102,241,0.5)')} ${className}`}>
      <defs>
        <linearGradient id={`tm4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 无限莫比乌斯大环 ∞ */}
      <path d="M22 22 C17 12, 6 12, 6 22 C6 32, 17 32, 22 22 C27 12, 38 12, 38 22 C38 32, 27 32, 22 22 Z" stroke={`url(#tm4_${uid})`} strokeWidth="5.5" strokeLinejoin="round" fill="none" />
      {/* 左环纯白核心光珠 */}
      <circle cx="12" cy="22" r="3" fill="#FFFFFF" />
      {/* 右环纯白核心光珠 */}
      <circle cx="32" cy="22" r="3" fill="#FFFFFF" />
      {/* 交叉中心超光速极光核 */}
      <circle cx="22" cy="22" r="1.8" fill={colors[2]} />
    </svg>
  );
}

// ======================================================================
// 4. 极限移速系列 (Speed) —— 4 枚完全不同造型
// ======================================================================

// SP-01 小试破风 (1.3x) —— 轻盈展翅破风飞羽 (告别单调纸飞机)
export function Speed13Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#059669', '#A7F3D0'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`sp1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 飞掠长羽三层展翅 */}
      <path d="M8 32 C12 28, 22 18, 36 9 C30 18, 26 23, 22 26" fill={`url(#sp1_${uid})`} />
      <path d="M12 34 C16 31, 23 25, 31 18 C26 25, 23 28, 19 30" fill={colors[0]} opacity="0.8" />
      <path d="M16 36 C20 34, 25 30, 27 26 C24 30, 21 33, 18 34" fill={colors[2]} />
      {/* 羽根高光锐芒 */}
      <circle cx="36" cy="9" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// SP-02 疾步如飞 (1.6x) —— 锐利高能劈空闪电
export function Speed16Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#38BDF8', '#0284C7', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(56,189,248,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`sp2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 强力 Z 闪电符文 */}
      <polygon points="26,6 12,22 21,22 17,38 32,20 23,20" fill={`url(#sp2_${uid})`} />
      {/* 闪电中心高压白核 */}
      <polygon points="24,10 16,21 21,21 19,30 27,21 22,21" fill="#FFFFFF" opacity="0.8" />
      {/* 两侧散逸火花 */}
      <circle cx="10" cy="18" r="1.2" fill="#FFFFFF" />
      <circle cx="34" cy="26" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

// SP-03 追风掣电 (2.0x) —— 多叶片强力涡轮喷气引擎
export function Speed20Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#F59E0B', '#D97706', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(245,158,11,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`sp3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 涡轮外机匣整流罩 */}
      <circle cx="22" cy="22" r="15" stroke={`url(#sp3_${uid})`} strokeWidth="3" fill="none" />
      {/* 旋转涡轮风扇叶片 */}
      <path d="M22 22 C22 14, 25 10, 28 8" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 22 C29 18, 34 20, 36 23" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 22 C26 29, 27 34, 24 36" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 22 C15 26, 10 27, 8 24" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 22 C18 15, 14 11, 10 13" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" />
      {/* 涡轮圆锥核心 */}
      <circle cx="22" cy="22" r="4.5" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2.2" fill={colors[0]} />
    </svg>
  );
}

// SP-04 超光越影 (2.5x) —— 曲率穿梭流星 + 3 道超音速激波尾迹
export function Speed25Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#EC4899', '#BE185D', '#FCE7F3'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(236,72,153,0.5)')} ${className}`}>
      <defs>
        <linearGradient id={`sp4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 三道离子激波尾流 */}
      <line x1="8" y1="36" x2="25" y2="19" stroke={colors[2]} strokeWidth="2.8" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="40" x2="28" y2="24" stroke={colors[0]} strokeWidth="3.2" strokeLinecap="round" />
      <line x1="18" y1="42" x2="30" y2="30" stroke={colors[1]} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      {/* 穿梭流星核 */}
      <circle cx="31" cy="13" r="6" fill={`url(#sp4_${uid})`} />
      {/* 极速冲压白热光斑 */}
      <circle cx="32.5" cy="11.5" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

// ======================================================================
// 5. 探索步数系列 (Steps) —— 4 枚完全不同造型
// ======================================================================

// ST-01 迈步向前 (200步) —— 萌动前后足印
export function Steps200Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#047857', '#A7F3D0'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`st1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 后脚 (左侧) */}
      <ellipse cx="14" cy="27" rx="5" ry="7" fill={`url(#st1_${uid})`} transform="rotate(-15 14 27)" />
      <circle cx="10" cy="18" r="1.5" fill={colors[0]} />
      <circle cx="13" cy="17" r="1.6" fill={colors[0]} />
      <circle cx="16" cy="18" r="1.5" fill={colors[0]} />
      {/* 前脚 (右侧先行) */}
      <ellipse cx="28" cy="17" rx="5" ry="7" fill={`url(#st1_${uid})`} transform="rotate(15 28 17)" />
      <circle cx="25" cy="8" r="1.5" fill="#FFFFFF" />
      <circle cx="28" cy="7" r="1.6" fill="#FFFFFF" />
      <circle cx="31" cy="8" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// ST-02 步履不停 (600步) —— 探险家四向罗盘指南针
export function Steps600Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#38BDF8', '#0284C7', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(56,189,248,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`st2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 罗盘外圈 */}
      <circle cx="22" cy="22" r="15" stroke={`url(#st2_${uid})`} strokeWidth="2.5" fill="none" />
      {/* 四向刻度点 */}
      <circle cx="22" cy="9" r="1.2" fill={colors[1]} />
      <circle cx="35" cy="22" r="1.2" fill={colors[1]} />
      <circle cx="22" cy="35" r="1.2" fill={colors[1]} />
      <circle cx="9" cy="22" r="1.2" fill={colors[1]} />
      {/* 指针北红南白 */}
      <polygon points="22,10 25,22 19,22" fill="#EF4444" />
      <polygon points="22,34 25,22 19,22" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2.2" fill={colors[1]} />
    </svg>
  );
}

// ST-03 漫漫长路 (1200步) —— 蜿蜒曲折长征大道 + 远方山峦
export function Steps1200Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#FBBF24', '#D97706', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(251,191,36,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`st3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 远方起伏山峦背景 */}
      <path d="M8 20 L16 13 L23 18 L31 11 L37 20 Z" fill={colors[2]} opacity="0.6" />
      {/* 由近及远蜿蜒公路 (近宽远窄透视) */}
      <path d="M10 36 C16 28, 28 27, 21 21 C16 17, 24 15, 23 12" stroke={`url(#st3_${uid})`} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      {/* 公路中线斑马虚线 */}
      <path d="M10 36 C16 28, 28 27, 21 21 C16 17, 24 15, 23 12" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
      {/* 地平线终点星辰 */}
      <circle cx="23" cy="11" r="2" fill="#FFFFFF" />
    </svg>
  );
}

// ST-04 千里单骑 (2000步) —— 礁石之上的孤征灯塔与战旗
export function Steps2000Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#8B5CF6', '#6D28D9', '#EDE9FE'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(139,92,246,0.5)')} ${className}`}>
      <defs>
        <linearGradient id={`st4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 底部基座礁石 */}
      <path d="M10 36 L34 36 L30 32 L14 32 Z" fill={colors[1]} />
      {/* 灯塔塔身 */}
      <polygon points="17,16 27,16 29,32 15,32" fill={`url(#st4_${uid})`} />
      {/* 塔顶发光灯室 */}
      <rect x="18" y="11" width="8" height="5" rx="1" fill="#FFFFFF" />
      {/* 灯塔两侧射出的光束 */}
      <polygon points="18,13 6,8 6,19" fill={colors[2]} opacity="0.4" />
      <polygon points="26,13 38,8 38,19" fill={colors[2]} opacity="0.4" />
      {/* 塔顶猎猎战旗 */}
      <line x1="22" y1="11" x2="22" y2="5" stroke="#FFFFFF" strokeWidth="1.5" />
      <polygon points="22,5 28,7.5 22,10" fill="#EF4444" />
    </svg>
  );
}

// ======================================================================
// 6. 极速连击系列 (Combo) —— 4 枚完全不同造型
// ======================================================================

// CB-01 连击起步 (3连击) —— 三刃旋转手里剑飞镖 (告别单调两根条)
export function Combo3Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#047857', '#D1FAE5'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`cb1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 三刃旋转手里剑 */}
      <path d="M22 22 L22 7 C27 12, 30 16, 27 21 Z" fill={`url(#cb1_${uid})`} />
      <path d="M22 22 L35 30 C30 32, 25 32, 20 26 Z" fill={`url(#cb1_${uid})`} />
      <path d="M22 22 L9 30 C11 24, 13 20, 19 21 Z" fill={`url(#cb1_${uid})`} />
      {/* 手里剑中心圆形通气孔 */}
      <circle cx="22" cy="22" r="3.2" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="1.5" fill={colors[1]} />
    </svg>
  );
}

// CB-02 五连绝世 (5连击) —— 狂暴五重升腾烈焰
export function Combo5Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#06B6D4', '#0891B2', '#CFFAFE'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(6,182,212,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`cb2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 烈火外层大火苗 */}
      <path d="M22 6 C24 13, 31 16, 31 24 C31 31, 25 36, 22 36 C19 36, 13 31, 13 24 C13 18, 17 14, 18 10 C20 15, 23 15, 22 6 Z" fill={`url(#cb2_${uid})`} />
      {/* 内层青火明核 */}
      <path d="M22 17 C24 21, 27 23, 27 27 C27 31, 24 33, 22 33 C20 33, 17 31, 17 27 C17 23, 20 20, 22 17 Z" fill="#FFFFFF" opacity="0.9" />
      {/* 火焰中心核心 */}
      <circle cx="22" cy="27" r="2.2" fill={colors[0]} />
    </svg>
  );
}

// CB-03 连击宗师 (8连击) —— 八向交错连击风暴晶轮
export function Combo8Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#F59E0B', '#B45309', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(245,158,11,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`cb3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 八向利刃外轮 */}
      <polygon points="22,6 25,17 36,11 30,22 41,25 30,28 36,39 25,33 22,44 19,33 8,39 14,28 3,25 14,22 8,11 19,17" fill={`url(#cb3_${uid})`} />
      {/* 内嵌风暴眼正方形 */}
      <rect x="17" y="17" width="10" height="10" rx="2" fill="#FFFFFF" transform="rotate(45 22 22)" />
      <circle cx="22" cy="22" r="2.5" fill={colors[1]} />
    </svg>
  );
}

// CB-04 天命连珠 (12连击) —— 十二连珠天命神圣星环
export function Combo12Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#EF4444', '#B91C1C', '#FEE2E2'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(239,68,68,0.5)')} ${className}`}>
      <defs>
        <linearGradient id={`cb4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 十二连珠光轨 */}
      <circle cx="22" cy="22" r="14" stroke={`url(#cb4_${uid})`} strokeWidth="1.8" fill="none" opacity="0.6" />
      {/* 12 颗外圈连珠点 */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 22 + 14 * Math.cos(rad);
        const cy = 22 + 14 * Math.sin(rad);
        return <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 2.5 : 1.8} fill={i % 3 === 0 ? '#FFFFFF' : colors[0]} />;
      })}
      {/* 中心天命十二连珠四芒晶核 */}
      <polygon points="22,12 24,19 31,22 24,25 22,32 20,25 13,22 20,19" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2" fill={colors[1]} />
    </svg>
  );
}

// ======================================================================
// 7. 金果捕获系列 (Bonus) —— 4 枚完全不同造型
// ======================================================================

// BN-01 黄金机遇 (2颗) —— 金光红苹果 (单果)
export function Bonus2Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#059669', '#A7F3D0'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`bn1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 苹果果梗与绿叶 */}
      <path d="M22 14 C22 10, 25 8, 26 7" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 11 C28 9, 31 11, 30 14 C26 14, 24 13, 23 11 Z" fill={colors[2]} />
      {/* 饱满苹果身 */}
      <path d="M22 16 C17 13, 11 17, 11 24 C11 31, 16 36, 22 36 C28 36, 33 31, 33 24 C33 17, 27 13, 22 16 Z" fill={`url(#bn1_${uid})`} />
      {/* 月牙光斑 */}
      <path d="M15 20 C14 23, 15 27, 17 29" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

// BN-02 淘金达人 (5颗) —— 并蒂双生幸运金果
export function Bonus5Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#38BDF8', '#0284C7', '#BAE6FD'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(56,189,248,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`bn2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 并蒂树枝倒 V 挂钩 */}
      <path d="M22 8 L15 22 M22 8 L29 22" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22" cy="8" r="2.2" fill={colors[2]} />
      {/* 左果 */}
      <circle cx="15" cy="27" r="7.5" fill={`url(#bn2_${uid})`} />
      <circle cx="13" cy="25" r="2" fill="#FFFFFF" opacity="0.8" />
      {/* 右果 */}
      <circle cx="29" cy="27" r="7.5" fill={colors[1]} />
      <circle cx="27" cy="25" r="2" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
}

// BN-03 黄金大盗 (9颗) —— 宝藏金币溢彩锦囊福袋
export function Bonus9Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#FBBF24', '#D97706', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(251,191,36,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`bn3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 钱袋口花瓣褶皱 */}
      <polygon points="16,13 22,8 28,13 22,15" fill={colors[2]} />
      {/* 束口袋绳结 */}
      <rect x="15" y="14" width="14" height="3" rx="1.5" fill={colors[1]} />
      {/* 饱满圆润钱袋腹部 */}
      <path d="M15 17 C10 20, 8 28, 10 33 C12 37, 32 37, 34 33 C36 28, 34 20, 29 17 Z" fill={`url(#bn3_${uid})`} />
      {/* 钱袋腹部金色大钱币徽标 */}
      <circle cx="22" cy="27" r="4.5" fill="#FFFFFF" />
      <rect x="20.5" y="25.5" width="3" height="3" fill={colors[1]} />
    </svg>
  );
}

// BN-04 点石成金 (15颗) —— 贤者六芒星点金晶石
export function Bonus15Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#A855F7', '#7E22CE', '#F3E8FF'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(168,85,247,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`bn4_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 六芒星正三角 */}
      <polygon points="22,7 35,29 9,29" fill={`url(#bn4_${uid})`} opacity="0.85" />
      {/* 六芒星倒三角 */}
      <polygon points="22,37 35,15 9,15" fill={colors[1]} opacity="0.85" />
      {/* 核心正六边形点金之石 */}
      <polygon points="22,16 27,19 27,25 22,28 17,25 17,19" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2.2" fill={colors[0]} />
    </svg>
  );
}

// ======================================================================
// 8. 竞技风云系列 (Rank) —— 3 枚完全不同造型
// ======================================================================

// RK-01 名扬四海 (前10) —— 先锋双燕尾荣誉绶带勋章 (告别土星)
export function RankTop10Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#10B981', '#047857', '#D1FAE5'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(16,185,129,0.4)')} ${className}`}>
      <defs>
        <linearGradient id={`rk1_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 顶部金属横挂杆 */}
      <rect x="13" y="8" width="18" height="3" rx="1.5" fill={colors[1]} />
      {/* 双下垂燕尾绶带 */}
      <polygon points="15,11 20,24 15,22 13,24" fill={colors[2]} />
      <polygon points="29,11 24,24 29,22 31,24" fill={colors[2]} />
      <rect x="17" y="11" width="10" height="12" fill={`url(#rk1_${uid})`} />
      {/* 勋章圆盘与五角军功星 */}
      <circle cx="22" cy="27" r="8" fill={colors[1]} />
      <circle cx="22" cy="27" r="6.5" fill="#FFFFFF" />
      <polygon points="22,23 23.5,26.5 27,26.5 24,28.5 25.2,32 22,29.8 18.8,32 20,28.5 17,26.5 20.5,26.5" fill={colors[0]} />
    </svg>
  );
}

// RK-02 三甲加冕 (前3) —— 胜利者双耳荣耀大奖杯
export function RankTop3Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#F59E0B', '#D97706', '#FEF3C7'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(245,158,11,0.45)')} ${className}`}>
      <defs>
        <linearGradient id={`rk2_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 奖杯双侧大耳把手 */}
      <path d="M12 14 C7 14, 7 23, 14 24" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M32 14 C37 14, 37 23, 30 24" stroke={colors[1]} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* 奖杯杯身 */}
      <path d="M12 10 L32 10 L29 23 C27 27, 24 28, 22 28 C20 28, 17 27, 15 23 Z" fill={`url(#rk2_${uid})`} />
      {/* 杯中胜利五角星 */}
      <polygon points="22,14 23,17 26,17 23.5,19 24.5,22 22,20.2 19.5,22 20.5,19 18,17 21,17" fill="#FFFFFF" />
      {/* 奖杯立柱与基座 */}
      <rect x="20" y="28" width="4" height="4" fill={colors[1]} />
      <rect x="14" y="32" width="16" height="4" rx="1.5" fill={colors[1]} />
    </svg>
  );
}

// RK-03 榜首霸主 (第1) —— 至尊帝王皇冠与横跨星辉权杖
export function RankTop1Glyph({ unlocked = false, size = 42, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked ? ['#EF4444', '#DC2626', '#FEF2F2'] : ['#94A3B8', '#64748B', '#CBD5E1'];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className={`shrink-0 select-none transition-all duration-300 ${getShadow(unlocked, 'rgba(239,68,68,0.55)')} ${className}`}>
      <defs>
        <linearGradient id={`rk3_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {/* 横跨王者权杖 */}
      <line x1="6" y1="36" x2="38" y2="8" stroke={colors[2]} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="8" r="3.5" fill="#FBBF24" />
      <circle cx="38" cy="8" r="1.5" fill="#FFFFFF" />
      {/* 帝王尊冠底座 */}
      <rect x="11" y="28" width="22" height="4" rx="1.5" fill={colors[1]} />
      {/* 皇冠金身 */}
      <path d="M11 28 L9 18 L16 23 L22 12 L28 23 L35 18 L33 28 Z" fill={`url(#rk3_${uid})`} />
      {/* 皇冠五联珍珠 */}
      <circle cx="9" cy="17" r="1.8" fill="#FFFFFF" />
      <circle cx="22" cy="11" r="2.5" fill="#FBBF24" />
      <circle cx="35" cy="17" r="1.8" fill="#FFFFFF" />
      {/* 王者中心大钻石 */}
      <polygon points="22,19 25,23 22,27 19,23" fill="#FFFFFF" />
    </svg>
  );
}

// ======================================================================
// 32 枚成就专属徽章映射表 (1 对 1 精准映射，彻底告别共用)
// ======================================================================
const ACHIEVEMENT_GLYPH_MAP: Record<string, React.ComponentType<GlyphProps>> = {
  // 1. 得分突破 (Score)
  score_200: Score200Glyph,
  score_500: Score500Glyph,
  score_800: Score800Glyph,
  score_1400: Score1400Glyph,
  score_2500: Score2500Glyph,

  // 2. 蛇身长度 (Length)
  length_20: Length20Glyph,
  length_40: Length40Glyph,
  length_60: Length60Glyph,
  length_100: Length100Glyph,

  // 3. 生存时间 (Time)
  time_60: Time60Glyph,
  time_120: Time120Glyph,
  time_200: Time200Glyph,
  time_300: Time300Glyph,

  // 4. 极限移速 (Speed)
  speed_1_3: Speed13Glyph,
  speed_1_6: Speed16Glyph,
  speed_2_0: Speed20Glyph,
  speed_2_5: Speed25Glyph,

  // 5. 探索步数 (Steps)
  steps_200: Steps200Glyph,
  steps_600: Steps600Glyph,
  steps_1200: Steps1200Glyph,
  steps_2000: Steps2000Glyph,

  // 6. 极速连击 (Combo)
  combo_3: Combo3Glyph,
  combo_5: Combo5Glyph,
  combo_8: Combo8Glyph,
  combo_12: Combo12Glyph,

  // 7. 金果捕获 (Bonus)
  bonus_2: Bonus2Glyph,
  bonus_5: Bonus5Glyph,
  bonus_9: Bonus9Glyph,
  bonus_15: Bonus15Glyph,

  // 8. 竞技风云 (Rank)
  rank_top10: RankTop10Glyph,
  rank_top3: RankTop3Glyph,
  rank_top1: RankTop1Glyph,
};

// ======================================================================
// 统一 NCUAchievementIcon 入口 (优先以 achievement.id 1对1 查表)
// ======================================================================
export function NCUAchievementIcon({
  achievement,
  category,
  level = 1,
  unlocked = false,
  size = 40,
  className = '',
}: {
  achievement?: Achievement;
  category?: AchievementCategory;
  level?: number;
  unlocked?: boolean;
  size?: number;
  className?: string;
}) {
  if (achievement && ACHIEVEMENT_GLYPH_MAP[achievement.id]) {
    const Component = ACHIEVEMENT_GLYPH_MAP[achievement.id];
    return <Component unlocked={unlocked} size={size} className={className} />;
  }

  // 兼容直接传 category 的回退逻辑
  const cat = category || achievement?.category || 'score';
  const lvl = level || achievement?.level || 1;

  switch (cat) {
    case 'score':
      return lvl === 1 ? <Score200Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Score500Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Score800Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 4 ? <Score1400Glyph unlocked={unlocked} size={size} className={className} />
        : <Score2500Glyph unlocked={unlocked} size={size} className={className} />;
    case 'length':
      return lvl === 1 ? <Length20Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Length40Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Length60Glyph unlocked={unlocked} size={size} className={className} />
        : <Length100Glyph unlocked={unlocked} size={size} className={className} />;
    case 'time':
      return lvl === 1 ? <Time60Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Time120Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Time200Glyph unlocked={unlocked} size={size} className={className} />
        : <Time300Glyph unlocked={unlocked} size={size} className={className} />;
    case 'speed':
      return lvl === 1 ? <Speed13Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Speed16Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Speed20Glyph unlocked={unlocked} size={size} className={className} />
        : <Speed25Glyph unlocked={unlocked} size={size} className={className} />;
    case 'steps':
      return lvl === 1 ? <Steps200Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Steps600Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Steps1200Glyph unlocked={unlocked} size={size} className={className} />
        : <Steps2000Glyph unlocked={unlocked} size={size} className={className} />;
    case 'combo':
      return lvl === 1 ? <Combo3Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Combo5Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Combo8Glyph unlocked={unlocked} size={size} className={className} />
        : <Combo12Glyph unlocked={unlocked} size={size} className={className} />;
    case 'bonus':
      return lvl === 1 ? <Bonus2Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <Bonus5Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 3 ? <Bonus9Glyph unlocked={unlocked} size={size} className={className} />
        : <Bonus15Glyph unlocked={unlocked} size={size} className={className} />;
    case 'rank':
      return lvl === 1 ? <RankTop10Glyph unlocked={unlocked} size={size} className={className} />
        : lvl === 2 ? <RankTop3Glyph unlocked={unlocked} size={size} className={className} />
        : <RankTop1Glyph unlocked={unlocked} size={size} className={className} />;
    default:
      return <Score200Glyph unlocked={unlocked} size={size} className={className} />;
  }
}

// 兼容旧版大类导出别名
export const ScoreGlyph = Score200Glyph;
export const LengthGlyph = Length20Glyph;
export const TimeGlyph = Time60Glyph;
export const SpeedGlyph = Speed13Glyph;
export const StepsGlyph = Steps200Glyph;
export const ComboGlyph = Combo3Glyph;
export const BonusGlyph = Bonus2Glyph;
export const RankGlyph = RankTop3Glyph;

// 战绩结算勋章
export function NCUCrestBadge({
  tier = 'BRONZE',
  unlocked = false,
  size = 40,
  className = '',
}: {
  tier?: AchievementTier;
  unlocked?: boolean;
  size?: number;
  className?: string;
}) {
  switch (tier) {
    case 'BRONZE':
      return <Score200Glyph unlocked={unlocked} size={size} className={className} />;
    case 'SILVER':
      return <Score500Glyph unlocked={unlocked} size={size} className={className} />;
    case 'GOLD':
      return <Score800Glyph unlocked={unlocked} size={size} className={className} />;
    case 'DIAMOND':
      return <RankTop1Glyph unlocked={unlocked} size={size} className={className} />;
    default:
      return <Score200Glyph unlocked={unlocked} size={size} className={className} />;
  }
}

export function NCUNumberBadge({
  num,
  color = '#0099FF',
  bg = '#EBF8FF',
}: {
  num: string;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black shrink-0 font-mono shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      style={{ backgroundColor: bg, color }}
    >
      {num}
    </span>
  );
}
