import React from 'react';

interface NcuCubeIconProps {
  className?: string;
  size?: number;
}

/**
 * 南大家园官方等轴测 3D 魔方品牌纯矢量徽标 (NCU Isometric Cube)
 * 三面分别由 U (天蓝顶面)、C (橙黄左面)、n (粉红右面) 构成
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
      {/* 1. 顶面浅蓝底座 */}
      <path d="M 50 10 L 85 30 L 50 50 L 15 30 Z" fill="#F0F9FF" />
      {/* 2. 左面浅黄底座 */}
      <path d="M 15 30 L 50 50 L 50 90 L 15 70 Z" fill="#FFFBEB" />
      {/* 3. 右面浅粉底座 */}
      <path d="M 50 50 L 85 30 L 85 70 L 50 90 Z" fill="#FFF1F2" />

      {/* 4. 顶面 U 字母管道 (经典天蓝 #0099FF) */}
      <path
        d="M 33 39 L 23 33 L 50 18 L 77 33 L 67 39"
        stroke="#0099FF"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 5. 左面 C 字母圆角线条 (活力橙黄 #F59E0B) */}
      <path
        d="M 43 56 L 23 44 L 23 64 L 43 76"
        stroke="#F59E0B"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 6. 右面 n 字母拱门 (珊瑚粉红 #FF5A5F) */}
      <path
        d="M 57 82 L 57 63 L 77 52 L 77 71"
        stroke="#FF5A5F"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
