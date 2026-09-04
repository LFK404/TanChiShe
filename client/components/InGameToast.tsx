'use client';

import React, { useEffect, useState, useRef } from 'react';
import { NCUCrestBadge, NCUAchievementIcon } from './NCUIcon';
import { Achievement, AchievementTier } from '@/utils/achievements';

export interface ToastItem {
  id: string;
  text: string;
  color?: string;
  tier?: AchievementTier;
  achievement?: Achievement;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

/**
 * 局内成就即时微弹窗 (NCU HOME 极简微拟态灵动岛胶囊)
 * - 极其 Q 弹的果冻弹性物理动效 (Jelly Spring Pop)
 * - 单视口排队播放队列 (同一时刻仅呈现 1 枚勋章，400ms 接力冷却，杜绝高频刷屏干扰走位)
 * - 内容极简克制，多巴胺专属彩色呼吸微光
 */
export default function InGameToast({ toasts, onRemove }: Props) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const isBusyRef = useRef(false);

  useEffect(() => {
    // 队列为空或当前弹窗正在播报中，暂不提取
    if (toasts.length === 0 || isBusyRef.current) return;

    const next = toasts[0];
    isBusyRef.current = true;
    setCurrent(next);
    setPhase('in');

    // 1.35s 沉浸高光期 ➔ 切换为 Q 弹退场动画
    const holdTimer = setTimeout(() => {
      setPhase('out');
    }, 1350);

    // 1.70s 彻底完成退场 ➔ 移除已播项，并留出 350ms 冷却呼吸空隙
    const finishTimer = setTimeout(() => {
      onRemove(next.id);
      setCurrent(null);
      // 冷却空隙解除占用，允许排队的下一个顺畅涌现
      setTimeout(() => {
        isBusyRef.current = false;
      }, 350);
    }, 1700);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
    };
  }, [toasts, onRemove]);

  if (!current) return null;

  const accentColor = current.color || current.achievement?.color || '#0099FF';

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
      <div
        className={`h-9 px-3 rounded-full flex items-center gap-2 bg-white/92 dark:bg-[#0A0F1D]/92 backdrop-blur-md border border-slate-200/75 dark:border-slate-800/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${
          phase === 'in' ? 'animate-jelly-in' : 'animate-jelly-out'
        }`}
        style={{
          boxShadow: `0 4px 18px ${accentColor}33, 0 1px 3px rgba(0,0,0,0.04)`,
        }}
      >
        {/* 专属纯悬浮微拟态成就勋章 */}
        <div className="shrink-0">
          {current.achievement ? (
            <NCUAchievementIcon achievement={current.achievement} unlocked size={24} />
          ) : (
            <NCUCrestBadge tier={current.tier} unlocked size={20} />
          )}
        </div>

        {/* 极简成就名称 */}
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
          {current.achievement?.name || current.text}
        </span>

        {/* 极简彩色系列/段位微标 */}
        <span
          className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 tracking-wider uppercase"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {current.achievement?.code || current.tier || 'PASS'}
        </span>
      </div>
    </div>
  );
}
