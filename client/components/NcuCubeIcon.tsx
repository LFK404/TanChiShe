import React from 'react';
import Image from 'next/image';

interface NcuCubeIconProps {
  className?: string;
  size?: number;
}

/**
 * 南大家园官方等轴测 3D 魔方品牌微标 (100% 官方原图高保真透明底素材)
 */
export default function NcuCubeIcon({ className = 'w-6 h-6', size }: NcuCubeIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <Image
      src="/ncuhome_cube.png"
      alt="南大家园官方魔方徽标"
      width={50}
      height={53}
      className={`inline-block object-contain select-none shrink-0 ${className}`}
      style={style}
      draggable={false}
      priority
    />
  );
}


