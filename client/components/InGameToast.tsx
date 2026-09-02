'use client';

import React, { useEffect, useState } from 'react';
import { NCUCrestBadge } from './NCUIcon';
import { AchievementTier } from '@/utils/achievements';

export interface ToastItem {
  id: string;
  text: string;
  color?: string;
  tier?: AchievementTier;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export default function InGameToast({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none select-none">
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
      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-2.5 ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      {/* 南大家园多巴胺微拟态勋章微缩版 */}
      <NCUCrestBadge tier={toast.tier} unlocked size={22} />

      {/* 成就解锁文字 */}
      <div className="flex items-center gap-1.5 tracking-tight text-[11.5px] sm:text-xs">
        <span className="font-bold text-slate-900">{toast.text}</span>
        <span className="text-[10px] font-bold text-[#10B981] bg-emerald-50 px-1.5 py-0.2 rounded-full">
          成就达成
        </span>
      </div>
    </div>
  );
}
