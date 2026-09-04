'use client';

import React, { useEffect, useState } from 'react';
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

export default function InGameToast({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none select-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 弹性滑入
    const inTimer = setTimeout(() => setVisible(true), 20);
    // 1.5s 后平滑滑出
    const outTimer = setTimeout(() => setVisible(false), 1500);
    // 1.8s 彻底从 DOM 移除
    const removeTimer = setTimeout(() => onRemove(toast.id), 1800);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 dark:text-slate-100 bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      {/* NCU HOME 纯悬浮专属微拟态成就勋章 */}
      {toast.achievement ? (
        <NCUAchievementIcon achievement={toast.achievement} unlocked size={26} />
      ) : (
        <NCUCrestBadge tier={toast.tier} unlocked size={22} />
      )}

      {/* 成就解锁文字 */}
      <div className="flex items-center gap-1.5 tracking-tight text-[11.5px] sm:text-xs">
        <span className="font-bold text-slate-900 dark:text-white">{toast.text}</span>
        <span className="text-[10px] font-bold text-[#10B981] bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded-full">
          成就达成
        </span>
      </div>
    </div>
  );
}
