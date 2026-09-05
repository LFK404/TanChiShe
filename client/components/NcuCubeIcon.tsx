import React from 'react';

interface NcuCubeIconProps {
  className?: string;
  size?: number;
}

/**
 * 南大家园官方等轴测 3D 魔方品牌纯矢量徽标 (1:1 官方原版几何像素级复刻)
 * 结构特性：
 * - 顶面：天蓝纯线条与浅蓝底色构成的 U 形开槽 (#31A0FE / #E5F3FF)
 * - 左面：橙黄纯线条与浅黄底色构成的 C 形开槽 (#FFBB00 / #FFF4D5)，槽内透显背壁珊瑚粉红 (#FFEEEC)
 * - 右面：珊瑚粉红纯线条与底色构成的 n 形拱门开槽 (#FD675A / #FFEEEC)，门洞通透留白
 */
export default function NcuCubeIcon({ className = 'w-6 h-6', size }: NcuCubeIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 68 70"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. 三面等轴测底板与开槽底色 */}
      {/* 左面浅黄底板 */}
      <polygon points="38,33.5 16,21 16,46 38,59" fill="#FFF4D5" />

      {/* 左面 C 内部透显的背壁浅粉珊瑚色 */}
      <path
        d="M 38,38 L 29,33.5 C 25,32.5 23.5,35 23.5,39.5 C 23.5,43 25,44.5 28,46 L 38,51.5 Z"
        fill="#FFEEEC"
      />

      {/* 右面浅粉珊瑚色底板 (采用复合路径 evenodd 实现纯矢量通透拱门门洞，零遮罩开销) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 38,33.5 L 59.5,21 L 59.5,46 L 38,59 Z M 44.5,56 L 44.5,40 A 4 4 0 0 1 52.5,40 L 52.5,49 Z"
        fill="#FFEEEC"
      />

      {/* 顶面浅蓝底色 U 形实体带 */}
      <path
        d="M 38,9.5 L 16,21 L 38,33.5 L 44,29 C 39,26.5 33,25 33,22.5 C 33,19 38,17 40,15 C 41.5,13 41,11 38,9.5 Z M 44,29 L 59.5,21 L 53,17.5 C 47.5,20 44,24 44,29 Z"
        fill="#E5F3FF"
      />

      {/* 2. 纯线条线框 (Line Art) */}
      {/* 左面橙黄色线条 */}
      <g stroke="#FFBB00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16,21 16,46 38,59" />
        <line x1="38" y1="33.5" x2="38" y2="51.5" />
        <path
          d="M 38,38 L 29,33.5 C 25,32.5 23.5,35 23.5,39.5 C 23.5,43 25,44.5 28,46 L 38,51.5"
          fill="none"
        />
      </g>

      {/* 右面珊瑚红线条 */}
      <g stroke="#FD675A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="38,33.5 59.5,21 59.5,46 38,59" />
        <line x1="38" y1="51.5" x2="38" y2="59" />
        <path d="M 38,59 L 44.5,54 L 44.5,40 A 4 4 0 0 1 52.5,40 L 52.5,49" fill="none" />
      </g>

      {/* 顶面天青蓝线条 */}
      <g stroke="#31A0FE" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="38,9.5 16,21 38,33.5" />
        <path
          d="M 38,9.5 C 40.5,11.5 42,13.5 39.5,15.5 C 36.5,18 32,19.5 32,22.5 C 32,25.5 38,26.5 43,23.5 C 48,20.5 53.5,18.5 59.5,21"
          fill="none"
        />
      </g>
    </svg>
  );
}
