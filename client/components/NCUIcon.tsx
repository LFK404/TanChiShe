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
// 1. 得分突破系列 (Score) —— 南大家园星曜晶核系统 (纯悬浮无框矢量设计)
// ----------------------------------------------------------------------
export function ScoreGlyph({ level = 1, unlocked = false, size = 40, className = '' }: GlyphProps) {
  const uid = React.useId().replace(/:/g, '');
  const colors = unlocked
    ? level === 1
      ? ['#34D399', '#10B981', '#A7F3D0'] // 翡翠绿
      : level === 2
      ? ['#38BDF8', '#0284C7', '#BAE6FD'] // 冰川天蓝
      : level === 3
      ? ['#FBBF24', '#D97706', '#FEF3C7'] // 晨曦暖金
      : level === 4
      ? ['#A855F7', '#7E22CE', '#E9D5FF'] // 极光紫
      : ['#F43F5E', '#BE123C', '#FECDD3'] // 炽焰烈红
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
    : 'opacity-35 grayscale contrast-75';

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

      {/* Lv.1 崭露锋芒 (200分) —— 单颗饱满实心四芒微星 (南大家园萌动微星) */}
      {level === 1 && (
        <g>
          <path
            d="M22 6 C23 16, 28 21, 38 22 C28 23, 23 28, 22 38 C21 28, 16 23, 6 22 C16 21, 21 16, 22 6 Z"
            fill={`url(#sc_g_${uid})`}
          />
          {/* 中心纯白微光核 */}
          <circle cx="22" cy="22" r="3.2" fill="#FFFFFF" />
          {/* 右上角纯白灵动微高光 */}
          <circle cx="30" cy="14" r="1.5" fill="#FFFFFF" opacity="0.9" />
        </g>
      )}

      {/* Lv.2 得分好手 (500分) —— 三星聚曜 (主星居中，双侧微星拱卫，星座连辉) */}
      {level === 2 && (
        <g>
          {/* 主四芒星 */}
          <path
            d="M22 8 C23 16, 27 21, 35 22 C27 23, 23 28, 22 36 C21 28, 17 23, 9 22 C17 21, 21 16, 22 8 Z"
            fill={`url(#sc_g_${uid})`}
          />
          <circle cx="22" cy="22" r="2.8" fill="#FFFFFF" />
          {/* 左下副星 */}
          <path
            d="M10 26 C10.5 29, 11.5 30, 14.5 30.5 C11.5 31, 10.5 32, 10 35 C9.5 32, 8.5 31, 5.5 30.5 C8.5 30, 9.5 29, 10 26 Z"
            fill={colors[0]}
          />
          <circle cx="10" cy="30.5" r="1.3" fill="#FFFFFF" />
          {/* 右上副星 */}
          <path
            d="M34 9 C34.5 12, 35.5 13, 38.5 13.5 C35.5 14, 34.5 15, 34 18 C33.5 15, 32.5 14, 29.5 13.5 C32.5 13, 33.5 12, 34 9 Z"
            fill={colors[0]}
          />
          <circle cx="34" cy="13.5" r="1.3" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 得分大师 (800分) —— 南大家园原生双色星曜土星 (实心金色天体 + 倾斜星轨) */}
      {level === 3 && (
        <g>
          {/* 倾斜星环后段 */}
          <path
            d="M6 25 C9 17, 34 13, 39 19 C36 23, 16 28, 6 25 Z"
            fill={colors[2]}
            opacity="0.85"
          />
          {/* 实心土星核心球体 */}
          <circle cx="22" cy="22" r="9.5" fill={`url(#sc_g_${uid})`} />
          {/* 球体月牙高光 */}
          <path
            d="M17 16 C21 14, 27 16, 29 20 C27 18, 21 17, 17 16 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          {/* 倾斜星环前段 (横跨球体形成立体纵深感) */}
          <path
            d="M8 24 C13 27, 29 25, 38 18 C36 21, 27 26, 8 26 Z"
            fill={colors[2]}
          />
          {/* 北极纯白明珠星 */}
          <circle cx="20" cy="18" r="1.8" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 登峰造极 (1400分) —— 登峰造极多面体晶曜 (八芒实心晶核 + 双层星环) */}
      {level === 4 && (
        <g>
          {/* 外围微星环 */}
          <circle cx="22" cy="22" r="16.5" stroke={colors[0]} strokeWidth="2" opacity="0.6" strokeDasharray="4 3" />
          {/* 八芒晶芒主体 */}
          <path
            d="M22 5 L24.5 16 L35 13.5 L27 22 L35 30.5 L24.5 28 L22 39 L19.5 28 L9 30.5 L17 22 L9 13.5 L19.5 16 Z"
            fill={`url(#sc_g_${uid})`}
          />
          {/* 核心纯白菱形晶核 */}
          <polygon points="22,14 30,22 22,30 14,22" fill="#FFFFFF" opacity="0.95" />
          <circle cx="22" cy="22" r="2.8" fill={colors[1]} />
          <circle cx="22" cy="22" r="1.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.5 贪吃神话 (2500分) —— 超新星神圣日冕 (烈日神核 + 8道日珥光冕 + 6颗脉冲微星) */}
      {level >= 5 && (
        <g>
          {/* 环绕 6 颗脉冲微星 */}
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
          {/* 内层烈焰光冠 */}
          <polygon points="22,12 25,18 31,16 28,22 31,28 25,26 22,32 19,26 13,28 16,22 13,16 19,18" fill={colors[2]} opacity="0.85" />
          {/* 纯白天尊核心 */}
          <circle cx="22" cy="22" r="4.5" fill="#FFFFFF" />
          <circle cx="22" cy="22" r="2" fill={colors[0]} />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 2. 蛇身长度系列 (Length) —— 南大家园圆润灵蛇与神龙演变
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_9px_rgba(0,153,255,0.35)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`ln_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 初露头角 (20节) —— 灵动幼蛇 (圆润粗壮S型身姿 + 纯萌大明眸与微笑弧) */}
      {level === 1 && (
        <g>
          <path
            d="M29 14 C25 8, 16 8, 15 16 C14 23, 29 23, 28 30 C27 36, 17 37, 12 33"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          {/* 饱满蛇头 */}
          <circle cx="29" cy="14" r="5.5" fill={colors[0]} />
          {/* 纯萌大明眸与瞳孔高光 */}
          <circle cx="30.5" cy="13" r="2.4" fill="#FFFFFF" />
          <circle cx="31" cy="13" r="1.2" fill={colors[1]} />
          <circle cx="31.5" cy="12.5" r="0.45" fill="#FFFFFF" />
          {/* 嘴角萌趣笑意弧 */}
          <path d="M26.5 16.5 Q28.5 18 30.5 16.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.9" />
        </g>
      )}

      {/* Lv.2 势不可挡 (40节) —— 蜿蜒游龙 (蛇身修长波浪 + 纯白流线腹鳞) */}
      {level === 2 && (
        <g>
          <path
            d="M34 12 C26 5, 12 9, 15 19 C17 26, 31 22, 31 30 C31 38, 18 39, 10 34"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* 纯白流线腹鳞切线 */}
          <path
            d="M19 16 C24 21, 26 25, 26 31"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="34" cy="12" r="5.2" fill={colors[0]} />
          <circle cx="35.5" cy="11" r="2.2" fill="#FFFFFF" />
          <circle cx="36" cy="11" r="1.1" fill={colors[1]} />
        </g>
      )}

      {/* Lv.3 盘龙卧虎 (60节) —— 巨蟒盘踞 (双同心螺旋盘旋 + 护佑纯白灵珠) */}
      {level === 3 && (
        <g>
          {/* 外层强韧巨蟒环身 */}
          <path
            d="M22 6 C32 6, 38 13, 38 22 C38 31, 31 38, 22 38 C13 38, 6 31, 6 22 C6 15, 11 9, 16 7"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* 内环蜷曲龙身 */}
          <path
            d="M16 19 C16 14, 28 14, 28 20 C28 26, 21 27, 21 32"
            stroke={colors[0]}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          {/* 蟒头与中心纯白灵珠 */}
          <circle cx="22" cy="20" r="4.8" fill={colors[2]} />
          <circle cx="22" cy="20" r="2.4" fill="#FFFFFF" />
          <circle cx="28" cy="15" r="1.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.4 吞天巨蟒 (100节) —— 吞天神龙 (衔尾无穷大 ∞ 龙身 + 尊贵金角与龙鳞) */}
      {level >= 4 && (
        <g>
          {/* 无穷大神龙首尾相衔 */}
          <path
            d="M22 22 C17 12, 6 12, 6 22 C6 32, 17 32, 22 22 C27 12, 38 12, 38 22 C38 32, 27 32, 22 22 Z"
            stroke={`url(#ln_g_${uid})`}
            strokeWidth="5.8"
            strokeLinejoin="round"
          />
          {/* 龙身纯白灵鳞微晶 */}
          <circle cx="6" cy="22" r="2.2" fill="#FFFFFF" />
          <circle cx="38" cy="22" r="2.2" fill="#FFFFFF" />
          <circle cx="22" cy="22" r="3.2" fill="#FFFFFF" />
          {/* 龙头眼睛与威严双龙角 */}
          <circle cx="36" cy="17" r="2" fill="#FFFFFF" />
          <circle cx="36.5" cy="17" r="1" fill={colors[1]} />
          <path d="M35 15 C37 11, 40 10, 41 8" stroke={colors[2]} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 3. 生存时间系列 (Time) —— 南大家园“今日”原生实心时钟与永恒沙漏
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_9px_rgba(251,191,36,0.35)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`tm_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 耐心猎手 (60s) —— 南大家园原生实心圆盘时钟 (饱满实心圆盘 + 粗圆角纯白时分针) */}
      {level === 1 && (
        <g>
          {/* 实心正圆表盘 */}
          <circle cx="22" cy="22" r="16" fill={`url(#tm_g_${uid})`} />
          {/* 纯白圆角粗短时针 (指向10点) */}
          <line x1="22" y1="22" x2="15.5" y2="15.5" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" />
          {/* 纯白圆角粗长分针 (指向1点) */}
          <line x1="22" y1="22" x2="26" y2="12" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" />
          {/* 中心纯白轴心 */}
          <circle cx="22" cy="22" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 沉着冷静 (120s) —— 双轨四象限刻度时钟 (实心表盘 + 纯白刻度点矩阵) */}
      {level === 2 && (
        <g>
          <circle cx="22" cy="22" r="16" fill={`url(#tm_g_${uid})`} />
          {/* 四象限纯白微刻度方块 */}
          <rect x="21" y="8" width="2" height="3.2" rx="1" fill="#FFFFFF" />
          <rect x="32.8" y="21" width="3.2" height="2" rx="1" fill="#FFFFFF" />
          <rect x="21" y="32.8" width="2" height="3.2" rx="1" fill="#FFFFFF" />
          <rect x="8" y="21" width="3.2" height="2" rx="1" fill="#FFFFFF" />
          {/* 指针 */}
          <line x1="22" y1="22" x2="22" y2="13" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="22" y1="22" x2="29" y2="25" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="22" cy="22" r="2.5" fill={colors[1]} />
        </g>
      )}

      {/* Lv.3 坚如磐石 (200s) —— 时空罗盘日晷 (实心日晷环 + 十字经纬 + 双色实心菱形指针) */}
      {level === 3 && (
        <g>
          <circle cx="22" cy="22" r="16.5" fill={`url(#tm_g_${uid})`} />
          {/* 十字经纬纤细切线 */}
          <line x1="22" y1="9" x2="22" y2="35" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.8" />
          <line x1="9" y1="22" x2="35" y2="22" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.8" />
          {/* 菱形双色指针 */}
          <polygon points="22,10 25.5,22 22,25 18.5,22" fill="#FFFFFF" />
          <polygon points="22,34 25.5,22 22,25 18.5,22" fill={colors[2]} />
          <circle cx="22" cy="22" r="2.4" fill={colors[1]} />
        </g>
      )}

      {/* Lv.4 历久弥坚 (300s) —— 岁月不朽流体沙漏 (双水滴实心容器 + 纯白流沙光柱) */}
      {level >= 4 && (
        <g>
          {/* 沙漏实心立体轮廓 */}
          <path
            d="M11 9 C11 9, 33 9, 33 9 C33 9, 25 21, 25 22 C25 23, 33 35, 33 35 C33 35, 11 35, 11 35 C11 35, 19 23, 19 22 C19 21, 11 9, 11 9 Z"
            fill={`url(#tm_g_${uid})`}
          />
          {/* 下部积聚的流光金沙 */}
          <path d="M15 33 C18 27, 26 27, 29 33 Z" fill="#FFFFFF" />
          {/* 中央垂直流沙光柱 */}
          <line x1="22" y1="16" x2="22" y2="30" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          {/* 顶部与底部光泽圆角微环 */}
          <rect x="12" y="7" width="20" height="2.5" rx="1.2" fill={colors[2]} />
          <rect x="12" y="34.5" width="20" height="2.5" rx="1.2" fill={colors[2]} />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 4. 极限移速系列 (Speed) —— 南大家园“地图”原生纸飞机与光速穿梭
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.38)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`sp_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 步履如飞 (1.3x) —— 南大家园原生折纸飞机 (破风掠影 + 纯白折痕) */}
      {level === 1 && (
        <g>
          {/* 机翼主身 */}
          <path
            d="M8 22 L36 9 L24 36 L19 24 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 纯白折纸脊线面 */}
          <path
            d="M36 9 L19 24 L14 31 L14 24 L8 22 Z"
            fill="#FFFFFF"
            opacity="0.88"
          />
          {/* 机尾轻盈气流微粒 */}
          <circle cx="11" cy="30" r="1.6" fill={colors[0]} />
          <circle cx="8" cy="35" r="1.2" fill={colors[2]} />
        </g>
      )}

      {/* Lv.2 驰骋风云 (1.6x) —— 双展破风羽翼 (大鹏展翅 + 纯白流线脊梁) */}
      {level === 2 && (
        <g>
          {/* 左翼实心 */}
          <path
            d="M22 29 C15 27, 7 21, 5 12 C12 18, 18 22, 22 29 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 右翼实心 */}
          <path
            d="M22 29 C29 27, 37 21, 39 12 C32 18, 26 22, 22 29 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 纯白中心破风脊梁与翼尖流光 */}
          <line x1="22" y1="10" x2="22" y2="34" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <circle cx="5" cy="12" r="1.8" fill={colors[2]} />
          <circle cx="39" cy="12" r="1.8" fill={colors[2]} />
        </g>
      )}

      {/* Lv.3 电光石火 (2.0x) —— 三叶破风涡轮 (实心叶片高速旋转 + 纯白双圆同心轴) */}
      {level === 3 && (
        <g>
          {/* 涡轮外围风环 */}
          <circle cx="22" cy="22" r="16.5" stroke={colors[2]} strokeWidth="2.2" strokeDasharray="6 4" />
          {/* 三叶实心动力叶片 */}
          <path d="M22 22 C22 13, 31 10, 34 13 C33 21, 26 22, 22 22 Z" fill={`url(#sp_g_${uid})`} />
          <path d="M22 22 C14 26, 11 35, 14 37 C21 35, 23 28, 22 22 Z" fill={`url(#sp_g_${uid})`} />
          <path d="M22 22 C20 14, 11 13, 10 17 C13 24, 19 23, 22 22 Z" fill={colors[2]} />
          {/* 纯白中心涡轮轴 */}
          <circle cx="22" cy="22" r="4.5" fill="#FFFFFF" />
          <circle cx="22" cy="22" r="2" fill={colors[1]} />
        </g>
      )}

      {/* Lv.4 极速狂飙 (2.5x) —— 超光速光子穿梭机 (尖锐鼻锥 + 双后掠翼 + 炽烈离子焰) */}
      {level >= 4 && (
        <g>
          {/* 穿梭机身实心剪影 */}
          <path
            d="M22 5 C25 11, 28 20, 28 29 L16 29 C16 20, 19 11, 22 5 Z"
            fill={`url(#sp_g_${uid})`}
          />
          {/* 左右三角后掠翼 */}
          <polygon points="16,23 7,30 16,29" fill={colors[1]} />
          <polygon points="28,23 37,30 28,29" fill={colors[1]} />
          {/* 纯白流线舷窗与导流脊线 */}
          <circle cx="22" cy="17" r="2.8" fill="#FFFFFF" />
          <line x1="22" y1="21" x2="22" y2="28" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          {/* 尾部双重炽焰等离子喷射束 */}
          <path
            d="M19 30 C20 37, 22 41, 22 41 C22 41, 24 37, 25 30 Z"
            fill="#FFFFFF"
          />
          <circle cx="22" cy="38" r="1.5" fill={colors[0]} />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 5. 探索步数系列 (Steps) —— 南大家园“生活”原生田字格与航海飞靴
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_9px_rgba(0,153,255,0.35)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`st_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 漫步前行 (300步) —— 萌动交错双足迹 (圆润可爱大掌 + 纯白小脚趾) */}
      {level === 1 && (
        <g>
          {/* 左脚掌实心 */}
          <ellipse cx="16" cy="26" rx="4.6" ry="6.6" fill={`url(#st_g_${uid})`} transform="rotate(-15 16 26)" />
          <circle cx="13" cy="16.5" r="1.6" fill="#FFFFFF" />
          <circle cx="16.5" cy="16" r="1.5" fill="#FFFFFF" />
          <circle cx="20" cy="17.5" r="1.3" fill="#FFFFFF" />
          {/* 右脚掌实心 (靠前) */}
          <ellipse cx="28" cy="18" rx="4.6" ry="6.6" fill={colors[0]} transform="rotate(15 28 18)" />
          <circle cx="25" cy="8.5" r="1.3" fill="#FFFFFF" />
          <circle cx="28.5" cy="8" r="1.5" fill="#FFFFFF" />
          <circle cx="32" cy="9.5" r="1.6" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 巡回探索 (600步) —— 南大家园“生活”原生田字格 (4个圆角矩形，右上角灵动旋转45°) */}
      {level === 2 && (
        <g>
          {/* 左上圆角方格 */}
          <rect x="10" y="10" width="10" height="10" rx="3.2" fill={`url(#st_g_${uid})`} />
          {/* 右上旋转45°菱形方格 (南大家园生活原生精髓！) */}
          <rect x="25" y="10" width="9.5" height="9.5" rx="3" fill={colors[0]} transform="rotate(45 29.75 14.75)" />
          {/* 左下圆角方格 */}
          <rect x="10" y="24" width="10" height="10" rx="3.2" fill={colors[0]} />
          {/* 右下圆角方格 */}
          <rect x="24" y="24" width="10" height="10" rx="3.2" fill={`url(#st_g_${uid})`} />
          {/* 纯白点睛微核 */}
          <circle cx="15" cy="15" r="1.6" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 纵横驰骋 (1000步) —— 远航舵轮 (实心舵轮外环 + 6向舵把 + 纯白轮毂) */}
      {level === 3 && (
        <g>
          {/* 舵轮内圈与外环 */}
          <circle cx="22" cy="22" r="12" stroke={`url(#st_g_${uid})`} strokeWidth="4" />
          {/* 6向舵柄实心条 */}
          <line x1="22" y1="4" x2="22" y2="40" stroke={colors[0]} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="6.5" y1="13" x2="37.5" y2="31" stroke={colors[0]} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="6.5" y1="31" x2="37.5" y2="13" stroke={colors[0]} strokeWidth="3.5" strokeLinecap="round" />
          {/* 纯白中心轮毂与轴承 */}
          <circle cx="22" cy="22" r="5.5" fill="#FFFFFF" />
          <circle cx="22" cy="22" r="2.5" fill={colors[1]} />
        </g>
      )}

      {/* Lv.4 千里单骑 (2000步) —— 赫尔墨斯神行飞靴 (实心战靴剪影 + 舒展双神圣羽翼) */}
      {level >= 4 && (
        <g>
          {/* 战靴饱满轮廓 */}
          <path
            d="M13 11 L13 26 C13 30, 16 33, 22 33 L33 33 C34.5 33, 35 31, 34 29 L28 26 L22 26 L22 11 Z"
            fill={`url(#st_g_${uid})`}
          />
          {/* 靴面纯白绑带系绳 */}
          <line x1="16" y1="17" x2="20" y2="17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="21" x2="20" y2="21" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          {/* 展翅翱翔纯白大羽翼 */}
          <path
            d="M19 19 C25 17, 36 13, 39 6 C33 13, 26 16, 19 19 Z"
            fill="#FFFFFF"
          />
          <path
            d="M18 23 C24 22, 33 18, 35 13 C29 18, 23 20, 18 23 Z"
            fill={colors[2]}
          />
          <circle cx="23" cy="29" r="1.8" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 6. 极速连击系列 (Combo) —— 南大家园“圈子”原生井号与雷霆圣火
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`cb_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 连环突进 (3连击) —— 南大家园“圈子”经典圆角井号 (粗圆柱线条 + 连击纯白微星火) */}
      {level === 1 && (
        <g>
          {/* 倾斜圆角井号 (100% 南大家园圈子风格) */}
          <line x1="17" y1="8" x2="13" y2="36" stroke={`url(#cb_g_${uid})`} strokeWidth="4.8" strokeLinecap="round" />
          <line x1="31" y1="8" x2="27" y2="36" stroke={`url(#cb_g_${uid})`} strokeWidth="4.8" strokeLinecap="round" />
          <line x1="8" y1="18" x2="36" y2="18" stroke={`url(#cb_g_${uid})`} strokeWidth="4.8" strokeLinecap="round" />
          <line x1="8" y1="28" x2="36" y2="28" stroke={`url(#cb_g_${uid})`} strokeWidth="4.8" strokeLinecap="round" />
          {/* 纯白交织微光核与右上迸发火花 */}
          <circle cx="22" cy="23" r="2.2" fill="#FFFFFF" />
          <polygon points="35,8 36,11 39,12 36,13 35,16 34,13 31,12 34,11" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 乘胜追击 (4连击) —— 双道交织实心折线闪电 (X型爆发能量星芒) */}
      {level === 2 && (
        <g>
          {/* 主闪电 */}
          <polygon
            points="23,6 12,22 20,22 15,38 30,19 23,19"
            fill={`url(#cb_g_${uid})`}
          />
          {/* 反向副闪电 */}
          <polygon
            points="27,10 34,22 27,22 31,34 21,24 27,24"
            fill={colors[2]}
            opacity="0.9"
          />
          {/* 纯白能量迸发核心 */}
          <circle cx="22" cy="22" r="2.8" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 势如破竹 (5连击) —— 三叉戟雷霆权杖 (三路怒放雷鸣 + 底部聚能柄) */}
      {level === 3 && (
        <g>
          {/* 中央主雷 */}
          <polygon points="22,4 17,20 22,20 18,40 26,20 22,20" fill={`url(#cb_g_${uid})`} />
          {/* 左侧分支雷 */}
          <polygon points="14,10 10,21 16,21 13,30 20,22 16,22" fill={colors[2]} />
          {/* 右侧分支雷 */}
          <polygon points="30,10 26,21 32,21 29,30 35,22 30,22" fill={colors[2]} />
          {/* 纯白圣雷微核 */}
          <circle cx="22" cy="20" r="3.2" fill="#FFFFFF" />
          <circle cx="22" cy="20" r="1.5" fill={colors[1]} />
        </g>
      )}

      {/* Lv.4 天命连珠 (6连击) —— 天命连珠雷暴星环 (六向雷芒神域 + 纯白能量圆环) */}
      {level >= 4 && (
        <g>
          {/* 旋转雷暴电圈 */}
          <circle cx="22" cy="22" r="16.5" stroke={colors[0]} strokeWidth="2.5" strokeDasharray="5 3" />
          {/* 六星放射电芒 */}
          <polygon
            points="22,5 24.5,17 34,11 26.5,21 38,22 26.5,24 34,33 24.5,27 22,39 19.5,27 10,33 17.5,24 6,22 17.5,21 10,11 19.5,17"
            fill={`url(#cb_g_${uid})`}
          />
          {/* 核心纯白天命晶曜 */}
          <circle cx="22" cy="22" r="5" fill="#FFFFFF" />
          <circle cx="22" cy="22" r="2.5" fill={colors[0]} />
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`bn_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 尝到甜头 (2颗) —— 单颗饱满实心金果 (圆滚饱满 + 纯白反光月牙 + 嫩叶) */}
      {level === 1 && (
        <g>
          {/* 果体 */}
          <circle cx="22" cy="24" r="13" fill={`url(#bn_g_${uid})`} />
          {/* 纯白高光月牙弧 */}
          <path
            d="M16 18 C19 15, 25 15, 27 18 C25 17, 19 17, 16 18 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          {/* 果蒂与小嫩叶 */}
          <path d="M22 13 C22 7, 26 6, 28 6" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 11 C26 9, 30 13, 27 15 C24 15, 23 13, 22 11 Z" fill="#34D399" />
          <circle cx="17" cy="22" r="2.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 硕果累累 (5颗) —— 双生并蒂金果 (一前一后两颗交叠 + 连理双叶) */}
      {level === 2 && (
        <g>
          {/* 后侧副果 */}
          <circle cx="16" cy="21" r="10" fill={colors[1]} opacity="0.8" />
          {/* 前侧主金果 */}
          <circle cx="26" cy="25" r="11.5" fill={`url(#bn_g_${uid})`} />
          {/* 并蒂双枝 */}
          <path d="M16 12 C20 6, 25 6, 26 14" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="23" cy="22" r="2.8" fill="#FFFFFF" opacity="0.9" />
          <circle cx="14" cy="19" r="1.8" fill="#FFFFFF" opacity="0.8" />
        </g>
      )}

      {/* Lv.3 黄金大盗 (9颗) —— 三果聚顶金枝簇拥 (三颗金果 + 纯白流光光环) */}
      {level === 3 && (
        <g>
          {/* 外环金光 */}
          <circle cx="22" cy="23" r="16.5" stroke={colors[2]} strokeWidth="2" strokeDasharray="4 3" />
          {/* 左果、右果、底主果 */}
          <circle cx="15" cy="19" r="8.5" fill={colors[1]} />
          <circle cx="29" cy="19" r="8.5" fill={colors[1]} />
          <circle cx="22" cy="28" r="10" fill={`url(#bn_g_${uid})`} />
          {/* 纯白高光 */}
          <circle cx="20" cy="25" r="2.5" fill="#FFFFFF" />
          <circle cx="14" cy="17" r="1.6" fill="#FFFFFF" />
          <circle cx="28" cy="17" r="1.6" fill="#FFFFFF" />
          <circle cx="22" cy="10" r="1.8" fill={colors[2]} />
        </g>
      )}

      {/* Lv.4 点石成金 (15颗) —— 加冕金果 (金果顶戴纯白三峰王冠 + 四向光芒) */}
      {level >= 4 && (
        <g>
          {/* 金果本体 */}
          <circle cx="22" cy="26" r="12" fill={`url(#bn_g_${uid})`} />
          {/* 纯白高光 */}
          <circle cx="18" cy="24" r="3" fill="#FFFFFF" />
          {/* 三峰金冠 */}
          <polygon
            points="13,16 16.5,21 22,14 27.5,21 31,16 29,23 15,23"
            fill="#FFFFFF"
          />
          <circle cx="13" cy="15" r="1.6" fill={colors[0]} />
          <circle cx="22" cy="13" r="1.8" fill={colors[0]} />
          <circle cx="31" cy="15" r="1.6" fill={colors[0]} />
          {/* 四散纯白四芒微星 */}
          <circle cx="7" cy="22" r="1.8" fill="#FFFFFF" />
          <circle cx="37" cy="22" r="1.8" fill="#FFFFFF" />
          <circle cx="22" cy="40" r="1.5" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 8. 竞技风云系列 (Rank) —— 南大家园至尊图腾与神圣圣杯
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

  const shadowClass = unlocked
    ? 'drop-shadow-[0_0_11px_rgba(0,153,255,0.4)]'
    : 'opacity-35 grayscale contrast-75';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={`shrink-0 select-none transition-all duration-300 ${shadowClass} ${className}`}
    >
      <defs>
        <linearGradient id={`rk_g_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>

      {/* Lv.1 名扬四海 (Top 20) —— 南大家园“我的”原生纯正至尊土星 */}
      {level === 1 && (
        <g>
          {/* 倾斜星环后段 */}
          <path
            d="M5 26 C8 17, 34 12, 40 18 C36 23, 14 29, 5 26 Z"
            fill={colors[2]}
            opacity="0.9"
          />
          {/* 土星实心球体 */}
          <circle cx="22" cy="22" r="10" fill={`url(#rk_g_${uid})`} />
          {/* 纯白月牙光斑 */}
          <path
            d="M17 16 C21 14, 27 16, 29 20 C27 18, 21 17, 17 16 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          {/* 倾斜星环前段 (横跨球体形成立体纵深感) */}
          <path
            d="M7 24 C13 28, 30 26, 39 18 C37 22, 28 27, 7 27 Z"
            fill={colors[2]}
          />
          <circle cx="18" cy="18" r="2" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.2 三甲加冕 (Top 3) —— 三峰至尊王冠 + 纯白明珠宝石 */}
      {level === 2 && (
        <g>
          {/* 王冠三峰立体实心剪影 */}
          <polygon
            points="8,16 14,24 22,13 30,24 36,16 34,32 10,32"
            fill={`url(#rk_g_${uid})`}
          />
          {/* 王冠底部柔和超椭圆拱弧 */}
          <path d="M9 32 C18 35, 26 35, 35 32 L35 35 C26 38, 18 38, 9 35 Z" fill={colors[1]} />
          {/* 三颗珍珠宝石尖顶 */}
          <circle cx="8" cy="15" r="2.5" fill="#FFFFFF" />
          <circle cx="22" cy="12" r="3" fill="#FFFFFF" />
          <circle cx="36" cy="15" r="2.5" fill="#FFFFFF" />
          {/* 王冠中心镶嵌纯白菱形大宝石 */}
          <polygon points="22,21 25,25 22,29 19,25" fill="#FFFFFF" />
        </g>
      )}

      {/* Lv.3 榜首霸主 (Top 1) —— 天下第一神圣双耳圣杯 + 王者八芒星曜 */}
      {level >= 3 && (
        <g>
          {/* 圣杯杯身实心 */}
          <path
            d="M13 13 C13 24, 18 27, 22 27 C26 27, 31 24, 31 13 Z"
            fill={`url(#rk_g_${uid})`}
          />
          {/* 左右双耳强韧流线 */}
          <path d="M13 15 C8 15, 8 23, 13 23" stroke={colors[0]} strokeWidth="3" strokeLinecap="round" />
          <path d="M31 15 C36 15, 36 23, 31 23" stroke={colors[0]} strokeWidth="3" strokeLinecap="round" />
          {/* 杯座底柱与基座 */}
          <path d="M19 27 L19 33 L14 36 L30 36 L25 33 L25 27 Z" fill={colors[1]} />
          {/* 杯身纯白胜利浮雕圆核 */}
          <circle cx="22" cy="19" r="2.5" fill="#FFFFFF" />
          {/* 杯顶悬浮神圣八芒王者星曜 */}
          <polygon points="22,4 23.5,7.5 27,6 25.5,9.5 29,11 25.5,12.5 27,16 23.5,14.5 22,18 20.5,14.5 17,16 18.5,12.5 15,11 18.5,9.5 17,6 20.5,7.5" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------
// 9. 统一 NCUAchievementIcon 入口
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
// 10. NCUNumberBadge 与 NCUCrestBadge 兼容导出
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
