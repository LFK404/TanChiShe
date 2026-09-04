'use client';

import React from 'react';
import { Achievement, AchievementCategory, AchievementTier } from '@/utils/achievements';

interface GlyphProps {
  level?: number;
  unlocked?: boolean;
  size?: number;
  className?: string;
}

// ----------------------------------------------------------------------
// 1. 得分突破系列 (Score) —— 星曜晶核系统 (纯悬浮无框矢量设计)
// ----------------------------------------------------------------------
export function ScoreGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#10B981', '#6EE7B7']
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : level === 4
      ? ['#A855F7', '#7E22CE', '#E9D5FF']
      : ['#F43F5E', '#BE123C', '#FECDD3']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  const shadowClass = unlocked
    ? level === 5
      ? 'drop-shadow-[0_0_12px_rgba(244,63,94,0.45)]'
      : level === 4
      ? 'drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]'
      : level === 3
      ? 'drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]'
      : level === 2
      ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]'
      : 'drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]'
    : 'opacity-40 grayscale';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`sc_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 单颗灵动四芒微星 */}
      {level === 1 && (
        <g>
          <path
            d="M22 6 C23 16, 26 19, 36 20 C26 21, 23 24, 22 34 C21 24, 18 21, 8 20 C18 19, 21 16, 22 6 Z"
            fill={`url(#sc_g_${uid})`}
          />
          <circle cx="22" cy="20" r="2.8" fill={colors[2]} />
          <circle cx="28" cy="14" r="1.4" fill={colors[0]} />
        </g>
      )}

      {/* Lv.2 三星聚芒 (主星居中，双侧微星拱卫) */}
      {level === 2 && (
        <g>
          <path
            d="M22 8 C23 16, 26 19, 34 20 C26 21, 23 24, 22 32 C21 24, 18 21, 10 20 C18 19, 21 16, 22 8 Z"
            fill={`url(#sc_g_${uid})`}
          />
          <circle cx="22" cy="20" r="2.4" fill={colors[2]} />
          {/* 左副星 */}
          <path
            d="M9 13 C9.6 16.5, 10.5 17.5, 14 18 C10.5 18.5, 9.6 19.5, 9 23 C8.4 19.5, 7.5 18.5, 4 18 C7.5 17.5, 8.4 16.5, 9 13 Z"
            fill={colors[0]}
          />
          {/* 右副星 */}
          <path
            d="M35 25 C35.5 27.5, 36.5 28.5, 39 29 C36.5 29.5, 35.5 30.5, 35 33 C34.5 30.5, 33.5 29.5, 31 29 C33.5 28.5, 34.5 27.5, 35 25 Z"
            fill={colors[2]}
          />
        </g>
      )}

      {/* Lv.3 星曜光环 (八芒璀璨星 + 28°倾斜流光星轨) */}
      {level === 3 && (
        <g>
          {/* 倾斜星轨 */}
          <ellipse
            cx="22"
            cy="22"
            rx="18"
            ry="6"
            transform="rotate(-26 22 22)"
            stroke={colors[0]}
            strokeWidth="2.5"
            strokeDasharray="4 2"
            opacity="0.8"
          />
          {/* 八芒星 */}
          <path
            d="M22 6 L24 16 L34 14 L26 22 L34 30 L24 28 L22 38 L20 28 L10 30 L18 22 L10 14 L20 16 Z"
            fill={`url(#sc_g_${uid})`}
          />
          <circle cx="22" cy="22" r="3.2" fill={colors[2]} />
          <circle cx="34" cy="11" r="1.5" fill={colors[2]} />
        </g>
      )}

      {/* Lv.4 登峰造极多面体晶星 (四方晶芒多面体 + 双层立体星环) */}
      {level === 4 && (
        <g>
          {/* 外围微星轨 */}
          <circle cx="22" cy="22" r="16" stroke={colors[0]} strokeWidth="1.8" opacity="0.6" strokeDasharray="3 3" />
          {/* 四方锐利晶芒 */}
          <path
            d="M22 4 L25 17 L38 22 L25 27 L22 40 L19 27 L6 22 L19 17 Z"
            fill={`url(#sc_g_${uid})`}
          />
          {/* 菱形副晶核 */}
          <polygon points="22,12 32,22 22,32 12,22" fill={colors[2]} opacity="0.8" />
          <circle cx="22" cy="22" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.5 贪吃神话超新星 (神圣烈星 + 6颗脉冲微核 + 至尊光晕) */}
      {level >= 5 && (
        <g>
          {/* 脉冲外环星群 */}
          <circle cx="22" cy="5" r="2" fill={colors[0]} />
          <circle cx="37" cy="13" r="2.2" fill={colors[2]} />
          <circle cx="37" cy="31" r="2" fill={colors[0]} />
          <circle cx="22" cy="39" r="2.2" fill={colors[2]} />
          <circle cx="7" cy="31" r="2" fill={colors[0]} />
          <circle cx="7" cy="13" r="2.2" fill={colors[2]} />
          {/* 超新星主体 */}
          <path
            d="M22 5 C23 15, 27 19, 39 22 C27 25, 23 29, 22 39 C21 29, 17 25, 5 22 C17 19, 21 15, 22 5 Z"
            fill={`url(#sc_g_${uid})`}
          />
          {/* 核心高光星冠 */}
          <circle cx="22" cy="22" r="4.5" fill={colors[2]} />
          <circle cx="22" cy="22" r="2.2" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 2. 蛇身长度系列 (Length) —— 灵蛇蜕变与神龙盘踞
// ----------------------------------------------------------------------
export function LengthGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#059669', '#A7F3D0']
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#0099FF', '#1D4ED8', '#E0F2FE']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_9px_rgba(0,153,255,0.35)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`ln_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 灵动小蛇 (温润S型身躯) */}
      {level === 1 && (
        <g>
          <path
            d="M30 14 C27 8, 17 9, 16 16 C15 22, 29 22, 28 29 C27 35, 18 36, 13 32"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* 蛇头与灵眸 */}
          <circle cx="30" cy="14" r="4.2" fill={colors[0]} />
          <circle cx="31.5" cy="13" r="1.3" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 蜿蜒游龙 (双重S型回环流体) */}
      {level === 2 && (
        <g>
          <path
            d="M33 11 C26 6, 14 10, 16 19 C18 26, 31 21, 31 29 C31 37, 19 38, 11 34"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* 游龙腹部副高光线 */}
          <path
            d="M20 16 C25 21, 26 25, 26 30"
            stroke={colors[2]}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="33" cy="11" r="4.5" fill={colors[0]} />
          <circle cx="34.5" cy="10" r="1.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 巨蟒盘踞 (双同心螺旋盘旋抱团) */}
      {level === 3 && (
        <g>
          {/* 外圈蟒身 */}
          <path
            d="M22 6 C31 6, 38 13, 38 22 C38 31, 31 38, 22 38 C13 38, 6 31, 6 22 C6 16, 10 11, 15 8"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* 内环蜷曲身段 */}
          <path
            d="M17 19 C17 15, 27 15, 27 20 C27 25, 21 27, 20 30"
            stroke={colors[0]}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="18" r="4" fill={colors[2]} />
          <circle cx="23" cy="17" r="1.3" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 吞天巨蟒 (衔尾衔环神龙 Ouroboros 无穷符号) */}
      {level >= 4 && (
        <g>
          {/* 无穷大双环衔尾龙 */}
          <path
            d="M22 22 C17 13, 7 13, 7 22 C7 31, 17 31, 22 22 C27 13, 37 13, 37 22 C37 31, 27 31, 22 22 Z"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          {/* 鳞纹与神圣龙角点缀 */}
          <circle cx="7" cy="22" r="1.8" fill={colors[2]} />
          <circle cx="37" cy="22" r="1.8" fill={colors[2]} />
          <circle cx="22" cy="22" r="3" fill="#FFFFFF" />
          {/* 龙头眼睛 */}
          <circle cx="35" cy="17" r="1.5" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 3. 生存时间系列 (Time) —— 时空罗盘与永恒沙漏
// ----------------------------------------------------------------------
export function TimeGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#059669', '#A7F3D0']
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#A855F7', '#7E22CE', '#E9D5FF']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_9px_rgba(251,191,36,0.35)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`tm_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 极简时钟 (轻灵圆表盘 + 10:10双针) */}
      {level === 1 && (
        <g>
          <circle cx="22" cy="22" r="15" stroke={`url(#tm_g_${uid})`} strokeWidth="3.5" />
          <line x1="22" y1="22" x2="22" y2="13" stroke={colors[0]} strokeWidth="3" strokeLinecap="round" />
          <line x1="22" y1="22" x2="29" y2="19" stroke={colors[2]} strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="22" r="2.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 双轨刻度时钟 (同心时轨 + 四向象限微刻度) */}
      {level === 2 && (
        <g>
          <circle cx="22" cy="22" r="16" stroke={`url(#tm_g_${uid})`} strokeWidth="2.5" />
          <circle cx="22" cy="22" r="11" stroke={colors[2]} strokeWidth="1.8" strokeDasharray="3 2" />
          {/* 四象限刻度点 */}
          <circle cx="22" cy="8" r="1.5" fill={colors[0]} />
          <circle cx="36" cy="22" r="1.5" fill={colors[0]} />
          <circle cx="22" cy="36" r="1.5" fill={colors[0]} />
          <circle cx="8" cy="22" r="1.5" fill={colors[0]} />
          <line x1="22" y1="22" x2="22" y2="14" stroke={colors[0]} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="22" y1="22" x2="28" y2="25" stroke={colors[2]} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="22" cy="22" r="2.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 时空罗盘 (十字准星 + 倾斜时轨 + 星辰指针) */}
      {level === 3 && (
        <g>
          <circle cx="22" cy="22" r="16" stroke={`url(#tm_g_${uid})`} strokeWidth="3" />
          {/* 十字轻盈刻度 */}
          <line x1="22" y1="9" x2="22" y2="35" stroke={colors[2]} strokeWidth="1.5" strokeDasharray="2 3" />
          <line x1="9" y1="22" x2="35" y2="22" stroke={colors[2]} strokeWidth="1.5" strokeDasharray="2 3" />
          {/* 菱形罗盘主针 */}
          <polygon points="22,10 25,22 22,25 19,22" fill={colors[0]} />
          <polygon points="22,34 25,22 22,25 19,22" fill={colors[2]} />
          <circle cx="22" cy="22" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 岁月不朽沙漏 (流体晶莹双漏斗 + 永恒光柱) */}
      {level >= 4 && (
        <g>
          {/* 沙漏外框轮廓 */}
          <path
            d="M12 8 L32 8 L24 21 L32 36 L12 36 L20 21 Z"
            stroke={`url(#tm_g_${uid})`}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* 下部积聚的流金沙堆 */}
          <path d="M15 34 C18 29, 26 29, 29 34 Z" fill={colors[2]} />
          {/* 中央流沙晶芒光线 */}
          <line x1="22" y1="16" x2="22" y2="31" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="22" r="1.5" fill={colors[0]} />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 4. 极限移速系列 (Speed) —— 破风羽翼与光速引擎
// ----------------------------------------------------------------------
export function SpeedGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#059669', '#A7F3D0']
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#EF4444', '#B91C1C', '#FECACA']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.38)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`sp_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 单侧疾风羽翼 (两道轻灵羽片) */}
      {level === 1 && (
        <g>
          <path
            d="M10 26 C16 26, 26 23, 34 14 C27 20, 19 22, 10 26 Z"
            fill={`url(#sp_g_${uid})`}
          />
          <path
            d="M12 30 C18 30, 26 28, 30 22 C24 26, 17 28, 12 30 Z"
            fill={colors[2]}
          />
          <circle cx="34" cy="14" r="2" fill={colors[0]} />
        </g>
      )}

      {/* Lv.2 双展对称破风羽翼 (左右双翼舒展 + 破风后掠) */}
      {level === 2 && (
        <g>
          {/* 左翼 */}
          <path
            d="M22 28 C16 26, 8 20, 6 12 C12 18, 18 22, 22 28 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 右翼 */}
          <path
            d="M22 28 C28 26, 36 20, 38 12 C32 18, 26 22, 22 28 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 中央破风流线 */}
          <line x1="22" y1="12" x2="22" y2="34" stroke={colors[2]} strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="12" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 三叶破风涡轮 (高速旋转动感飞轮) */}
      {level === 3 && (
        <g>
          {/* 涡轮外风环 */}
          <circle cx="22" cy="22" r="16" stroke={colors[2]} strokeWidth="2" strokeDasharray="6 4" />
          {/* 三叶旋转叶片 */}
          <path d="M22 22 C22 14, 30 11, 33 13 C32 20, 26 22, 22 22 Z" fill={`url(#sp_g_${uid})`} />
          <path d="M22 22 C15 26, 12 34, 15 36 C21 34, 22 28, 22 22 Z" fill={`url(#sp_g_${uid})`} />
          <path d="M22 22 C20 15, 12 14, 11 17 C14 23, 19 23, 22 22 Z" fill={colors[2]} />
          <circle cx="22" cy="22" r="3.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 超光速穿梭火箭 (尖锐鼻锥 + 烈焰光子喷射) */}
      {level >= 4 && (
        <g>
          {/* 火箭箭体 */}
          <path
            d="M22 6 C25 12, 28 20, 28 28 L16 28 C16 20, 19 12, 22 6 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 左右后掠翼 */}
          <polygon points="16,22 8,29 16,28" fill={colors[1]} />
          <polygon points="28,22 36,29 28,28" fill={colors[1]} />
          {/* 舷窗明亮高光 */}
          <circle cx="22" cy="18" r="2.8" fill="#FFFFFF" />
          {/* 尾部炽热喷射光焰 */}
          <path
            d="M19 29 C20 37, 22 40, 22 40 C22 40, 24 37, 25 29 Z"
            fill={colors[2]}
          />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 5. 探索步数系列 (Steps) —— 足迹探险与万里航舵
// ----------------------------------------------------------------------
export function StepsGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#059669', '#A7F3D0']
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#0099FF', '#1D4ED8', '#E0F2FE']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_9px_rgba(0,153,255,0.35)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`st_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 灵动交错双足迹 */}
      {level === 1 && (
        <g>
          {/* 左脚印 */}
          <ellipse cx="16" cy="24" rx="4" ry="6" fill={`url(#st_g_${uid})`} transform="rotate(-15 16 24)" />
          <circle cx="14" cy="15" r="1.5" fill={colors[2]} />
          <circle cx="17.5" cy="15.5" r="1.3" fill={colors[2]} />
          {/* 右脚印 (靠前) */}
          <ellipse cx="27" cy="17" rx="4" ry="6" fill={colors[0]} transform="rotate(15 27 17)" />
          <circle cx="28" cy="8.5" r="1.5" fill={colors[2]} />
          <circle cx="25" cy="9" r="1.3" fill={colors[2]} />
        </g>
      )}

      {/* Lv.2 四向探索罗盘箭头 (巡游四方) */}
      {level === 2 && (
        <g>
          <circle cx="22" cy="22" r="15" stroke={colors[2]} strokeWidth="2" strokeDasharray="4 2" />
          {/* 四向箭头十字 */}
          <polygon points="22,8 26,19 22,17 18,19" fill={`url(#st_g_${uid})`} />
          <polygon points="22,36 26,25 22,27 18,25" fill={colors[0]} />
          <polygon points="36,22 25,26 27,22 25,18" fill={colors[1]} />
          <polygon points="8,22 19,26 17,22 19,18" fill={colors[1]} />
          <circle cx="22" cy="22" r="3" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 远航舵轮 (6辐条航海舵轮) */}
      {level === 3 && (
        <g>
          {/* 舵轮内圈与外环 */}
          <circle cx="22" cy="22" r="12" stroke={`url(#st_g_${uid})`} strokeWidth="3.5" />
          {/* 6向舵柄 */}
          <line x1="22" y1="5" x2="22" y2="39" stroke={colors[0]} strokeWidth="3" strokeLinecap="round" />
          <line x1="7" y1="13.5" x2="37" y2="30.5" stroke={colors[0]} strokeWidth="3" strokeLinecap="round" />
          <line x1="7" y1="30.5" x2="37" y2="13.5" stroke={colors[0]} strokeWidth="3" strokeLinecap="round" />
          {/* 中心轮毂 */}
          <circle cx="22" cy="22" r="5" fill={colors[2]} />
          <circle cx="22" cy="22" r="2.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 千里单骑赫尔墨斯飞靴 (战靴生神圣羽翼) */}
      {level >= 4 && (
        <g>
          {/* 战靴轮廓 */}
          <path
            d="M14 12 L14 26 C14 29, 17 32, 23 32 L32 32 C33 32, 34 30, 33 28 L28 26 L23 26 L23 12 Z"
            fill={`url(#st_g_${uid})`}
          />
          {/* 展翅高飞羽翼 */}
          <path
            d="M20 18 C26 16, 36 12, 38 6 C32 12, 26 15, 20 18 Z"
            fill={colors[2]}
          />
          <path
            d="M19 22 C24 21, 32 17, 34 12 C29 17, 23 19, 19 22 Z"
            fill="#FFFFFF"
          />
          <circle cx="23" cy="29" r="1.5" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 6. 极速连击系列 (Combo) —— 霹雳雷霆与连珠圣火
// ----------------------------------------------------------------------
export function ComboGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#059669', '#A7F3D0']
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#EF4444', '#B91C1C', '#FECACA']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`cb_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 单道凌厉闪电 */}
      {level === 1 && (
        <g>
          <polygon
            points="24,6 12,22 21,22 17,38 31,18 23,18"
            fill={`url(#cb_g_${uid})`}
          />
          <circle cx="31" cy="14" r="1.8" fill={colors[2]} />
        </g>
      )}

      {/* Lv.2 双雷交叉霹雳 (X型交织火花) */}
      {level === 2 && (
        <g>
          {/* 主闪电 */}
          <polygon
            points="22,7 13,22 20,22 16,37 29,19 22,19"
            fill={`url(#cb_g_${uid})`}
          />
          {/* 反向副闪电 */}
          <polygon
            points="26,11 33,22 27,22 30,33 21,24 26,24"
            fill={colors[2]}
            opacity="0.85"
          />
          <circle cx="14" cy="14" r="1.6" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 三叉戟雷霆权杖 (三路怒放雷鸣) */}
      {level === 3 && (
        <g>
          {/* 中央主雷 */}
          <polygon points="22,5 18,19 22,19 19,39 26,19 22,19" fill={`url(#cb_g_${uid})`} />
          {/* 左侧分支雷 */}
          <polygon points="15,11 11,20 16,20 14,29 20,21 16,21" fill={colors[2]} />
          {/* 右侧分支雷 */}
          <polygon points="29,11 25,21 30,21 28,29 33,20 28,20" fill={colors[2]} />
          <circle cx="22" cy="19" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 天命连珠全域雷暴星环 (六向雷芒神域) */}
      {level >= 4 && (
        <g>
          {/* 旋转雷暴电圈 */}
          <circle cx="22" cy="22" r="16" stroke={colors[0]} strokeWidth="2" strokeDasharray="5 3" />
          {/* 六星放射电芒 */}
          <polygon points="22,6 24,17 33,12 26,21 37,22 26,24 33,32 24,27 22,38 20,27 11,32 18,24 7,22 18,21 11,12 20,17" fill={`url(#cb_g_${uid})`} />
          <circle cx="22" cy="22" r="4.2" fill={colors[2]} />
          <circle cx="22" cy="22" r="2" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 7. 金果捕获系列 (Bonus) —— 黄金圣果与丰饶之冠
// ----------------------------------------------------------------------
export function BonusGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#10B981', '#FBBF24']
      : level === 2
      ? ['#38BDF8', '#0099FF', '#FBBF24']
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#F59E0B', '#B45309', '#FFFFFF']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`bn_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 黄金初现 (单颗饱满金果 + 嫩绿小叶) */}
      {level === 1 && (
        <g>
          {/* 果身 */}
          <circle cx="22" cy="24" r="12" fill={`url(#bn_g_${uid})`} />
          {/* 果蒂与小叶 */}
          <path d="M22 13 C22 8, 25 7, 27 7" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 11 C26 10, 29 13, 27 15 C24 15, 23 13, 22 11 Z" fill="#34D399" />
          {/* 金果高光弧线 */}
          <circle cx="18" cy="20" r="2.5" fill="#FFFFFF" opacity="0.85" />
        </g>
      )}

      {/* Lv.2 双生金果 (一前一后两颗并蒂金果) */}
      {level === 2 && (
        <g>
          {/* 后侧副果 */}
          <circle cx="17" cy="21" r="9" fill={colors[1]} opacity="0.75" />
          {/* 前侧主果 */}
          <circle cx="25" cy="25" r="10.5" fill={`url(#bn_g_${uid})`} />
          {/* 并蒂双枝 */}
          <path d="M17 12 C20 7, 24 7, 25 14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="22" cy="22" r="2.5" fill="#FFFFFF" opacity="0.9" />
        </g>
      )}

      {/* Lv.3 黄金大盗 (三果聚顶金枝团 + 璀璨光圈) */}
      {level === 3 && (
        <g>
          {/* 外环金光 */}
          <circle cx="22" cy="23" r="16" stroke={colors[2]} strokeWidth="1.8" strokeDasharray="4 3" />
          {/* 左果、右果、下果 */}
          <circle cx="16" cy="19" r="8" fill={colors[1]} />
          <circle cx="28" cy="19" r="8" fill={colors[1]} />
          <circle cx="22" cy="28" r="9.5" fill={`url(#bn_g_${uid})`} />
          <circle cx="20" cy="25" r="2.2" fill="#FFFFFF" />
          <circle cx="22" cy="11" r="1.8" fill={colors[2]} />
        </g>
      )}

      {/* Lv.4 点石成金 (金果顶戴三峰王冠 + 星芒四溢) */}
      {level >= 4 && (
        <g>
          {/* 金果本体 */}
          <circle cx="22" cy="26" r="11" fill={`url(#bn_g_${uid})`} />
          {/* 王冠 */}
          <polygon
            points="14,16 17,21 22,15 27,21 30,16 28,23 16,23"
            fill={colors[2]}
          />
          <circle cx="14" cy="15" r="1.4" fill="#FFFFFF" />
          <circle cx="22" cy="13.5" r="1.6" fill="#FFFFFF" />
          <circle cx="30" cy="15" r="1.4" fill="#FFFFFF" />
          {/* 金果核心微光 */}
          <circle cx="19" cy="26" r="2.5" fill="#FFFFFF" />
          {/* 四散光辉 */}
          <circle cx="8" cy="22" r="1.5" fill={colors[0]} />
          <circle cx="36" cy="22" r="1.5" fill={colors[0]} />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 8. 竞技风云系列 (Rank) —— 南大家园天体与荣耀王座 (纯悬浮南大家园原生风格)
// ----------------------------------------------------------------------
export function RankGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#38BDF8', '#0284C7', '#BAE6FD']
      : level === 2
      ? ['#FBBF24', '#D97706', '#FEF3C7']
      : ['#0099FF', '#1D4ED8', '#E0F2FE']
    : ['#94A3B8', '#64748B', '#CBD5E1'];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${
        unlocked ? 'drop-shadow-[0_0_11px_rgba(0,153,255,0.4)]' : 'opacity-40 grayscale'
      } ${className}`}
    >
      <defs>
        <linearGradient id={`rk_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 名扬四海 (南大家园同款纯悬浮星曜土星) */}
      {level === 1 && (
        <g>
          {/* 后半倾斜双色星环 */}
          <path
            d="M6 26 C9 18, 33 13, 39 19 C35 24, 15 29, 6 26 Z"
            fill={colors[2]}
            opacity="0.9"
          />
          {/* 土星核心星球 */}
          <circle cx="22" cy="22" r="9" fill={`url(#rk_g_${uid})`} />
          {/* 前半切线星环覆盖 */}
          <path
            d="M8 24 C13 27, 29 25, 38 18 C36 21, 28 26, 8 26 Z"
            fill={colors[2]}
          />
          <circle cx="19" cy="18" r="1.8" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 三甲加冕 (三峰荣耀王冠) */}
      {level === 2 && (
        <g>
          {/* 王冠三峰立体剪影 */}
          <polygon
            points="9,17 14,24 22,14 30,24 35,17 33,31 11,31"
            fill={`url(#rk_g_${uid})`}
          />
          {/* 底座拱弧 */}
          <path d="M10 32 C18 35, 26 35, 34 32 L34 35 C26 38, 18 38, 10 35 Z" fill={colors[1]} />
          {/* 三颗珍珠宝石尖顶 */}
          <circle cx="9" cy="16" r="2.2" fill={colors[2]} />
          <circle cx="22" cy="13" r="2.6" fill="#FFFFFF" />
          <circle cx="35" cy="16" r="2.2" fill={colors[2]} />
          <circle cx="22" cy="24" r="2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 榜首霸主 (至尊神圣圣杯 + 王者星曜) */}
      {level >= 3 && (
        <g>
          {/* 圣杯杯身与双耳 */}
          <path
            d="M14 14 C14 24, 19 27, 22 27 C25 27, 30 24, 30 14 Z"
            fill={`url(#rk_g_${uid})`}
          />
          {/* 左右双耳 */}
          <path d="M14 16 C9 16, 9 24, 14 24" stroke={colors[0]} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 16 C35 16, 35 24, 30 24" stroke={colors[0]} strokeWidth="2.5" strokeLinecap="round" />
          {/* 杯座底柱 */}
          <path d="M20 27 L20 33 L15 36 L29 36 L24 33 L24 27 Z" fill={colors[1]} />
          {/* 杯顶悬浮至尊星芒 */}
          <circle cx="22" cy="9" r="3.2" fill={colors[2]} />
          <circle cx="22" cy="9" r="1.5" fill="#FFFFFF" />
          <circle cx="22" cy="19" r="2" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 9. 统一 NCUAchievementIcon 入口 (根据分类与等级无缝分发纯悬浮徽章)
// ----------------------------------------------------------------------
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
  const cat = category || achievement?.category || 'score';
  const lvl = level || achievement?.level || 1;

  switch (cat) {
    case 'score':
      return <ScoreGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'length':
      return <LengthGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'time':
      return <TimeGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'speed':
      return <SpeedGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'steps':
      return <StepsGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'combo':
      return <ComboGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'bonus':
      return <BonusGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    case 'rank':
      return <RankGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
    default:
      return <ScoreGlyph level={lvl} unlocked={unlocked} size={size} className={className} />;
  }
}

// ----------------------------------------------------------------------
// 10. 保留 NCUNumberBadge 与 NCUCrestBadge 供系统其它模块调用
// ----------------------------------------------------------------------
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
      return <ScoreGlyph level={1} unlocked={unlocked} size={size} className={className} />;
    case 'SILVER':
      return <ScoreGlyph level={2} unlocked={unlocked} size={size} className={className} />;
    case 'GOLD':
      return <RankGlyph level={2} unlocked={unlocked} size={size} className={className} />;
    case 'DIAMOND':
      return <RankGlyph level={3} unlocked={unlocked} size={size} className={className} />;
    default:
      return <ScoreGlyph level={1} unlocked={unlocked} size={size} className={className} />;
  }
}
