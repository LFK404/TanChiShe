import React from 'react';

interface NcuCubeIconProps {
  className?: string;
  size?: number;
}

/**
 * 南大家园官方等轴测 3D 魔方品牌纯矢量徽标 (1:1 像素级原版复刻)
 * 严格按照官方原版构造：
 * 1. 顶面 (冰蓝底 #E8F4FC)：天蓝厚色带 (#0099FF) 沿外边缘环绕，右上边向内开出 U 型光滑圆底槽
 * 2. 左面 (米黄底 #FCF8E8)：橙黄厚色带 (#F59E0B) 沿外边缘环绕，垂直中棱向内开出 C 型半圆槽
 * 3. 右面 (淡粉底 #FCECEB)：珊瑚红厚色带 (#FF5A5F) 沿外边缘环绕，底边向上开出小写 n 型圆拱门
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
      {/* 1. 三面等轴测浅色实体底板 */}
      <path d="M 50 10 L 85 30 L 50 50 L 15 30 Z" fill="#E8F4FC" />
      <path d="M 15 30 L 50 50 L 50 90 L 15 70 Z" fill="#FCF8E8" />
      <path d="M 50 50 L 85 30 L 85 70 L 50 90 Z" fill="#FCECEB" />

      {/* 2. 顶面 U (天蓝 #0099FF)：外围包覆，右上开口 U 型槽 */}
      <path
        d="M 64 18
           L 50 10 
           L 15 30 
           L 50 50 
           L 85 30 
           L 74 24
           L 57 34
           C 47 40 37 32 44 25
           L 64 18 Z"
        fill="#0099FF"
      />

      {/* 3. 左面 C (橙黄 #F59E0B)：外围包覆，垂直中棱开口 C 型槽 */}
      <path
        d="M 50 58
           L 50 50 
           L 15 30 
           L 15 70 
           L 50 90 
           L 50 82
           L 34 73
           C 25 68 25 52 34 47
           L 50 58 Z"
        fill="#F59E0B"
      />

      {/* 4. 右面 n (珊瑚粉红 #FF5A5F)：外围包覆，底边向上开圆拱门 */}
      <path
        d="M 62 83
           L 50 90 
           L 50 50 
           L 85 30 
           L 85 70 
           L 73 77
           L 73 63
           C 73 54 62 58 62 67
           L 62 83 Z"
        fill="#FF5A5F"
      />
    </svg>
  );
}
