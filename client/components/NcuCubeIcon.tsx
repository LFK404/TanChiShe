import React from 'react';

interface NcuCubeIconProps {
  className?: string;
  size?: number;
}

/**
 * 南大家园官方等轴测 3D 魔方品牌纯矢量徽标 (纯线条 Line Art 官方原版复刻)
 * 特性：大面积浅色通透留白 + 纯单粗线条 (fill="none" + stroke) 勾勒 U-C-n 几何开槽
 */
export default function NcuCubeIcon({ className = 'w-6 h-6', size }: NcuCubeIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. 三面等轴测纯净浅色微透底板 (大面积留白，轻盈通透) */}
      <path d="M 50 12 L 83 31 L 50 50 L 17 31 Z" fill="#F0F9FF" />
      <path d="M 17 31 L 50 50 L 50 88 L 17 69 Z" fill="#FFFBEB" />
      <path d="M 50 50 L 83 31 L 83 69 L 50 88 Z" fill="#FFF1F2" />

      {/* 2. 顶面：天蓝纯单粗线 U 形几何开槽 (fill="none") */}
      {/* 顶面外棱线 */}
      <path
        d="M 50 12 L 17 31 L 50 50"
        stroke="#0099FF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 顶面右上开口 U 型槽线条 */}
      <path
        d="M 74 26 L 58 35 Q 46 41 46 31 Q 46 22 62 19"
        stroke="#0099FF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. 左面：橙黄纯单粗线 C 形几何开槽 (fill="none") */}
      {/* 左面外棱线 */}
      <path
        d="M 50 50 L 17 31 L 17 69 L 50 88"
        stroke="#F59E0B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 左面右侧中棱开口 C 型槽线条 */}
      <path
        d="M 50 57 L 35 60 Q 25 66 35 72 L 50 78"
        stroke="#F59E0B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. 右面：珊瑚红纯单粗线 n 形圆拱门几何开槽 (fill="none") */}
      {/* 右面外棱线 */}
      <path
        d="M 50 88 L 50 50 L 83 31 L 83 69"
        stroke="#FF5A5F"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 右面底边开口 n 型圆拱门线条 */}
      <path
        d="M 62 81 L 62 68 Q 67.5 59 73 64 L 73 75"
        stroke="#FF5A5F"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
