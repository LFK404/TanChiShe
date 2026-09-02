'use client';

import React, { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  text: string;
  color?: string;
  icon?: string;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

// 局中即时高光微弹窗容器 (精细打磨：顶部安全区非侵入式悬浮胶囊，零遮挡视线，事件完全穿透)
export default function InGameToast({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-2.5 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none select-none max-w-[92vw]">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={onRemove} />
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

  const dotColor = toast.color || '#66CCFF';

  return (
    <div
      className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-2 ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      {/* 多巴胺微呼吸呼吸灯 */}
      <span
        className="w-2 h-2 rounded-full shrink-0 shadow-xs"
        style={{
          backgroundColor: dotColor,
          boxShadow: `0 0 6px ${dotColor}80`,
        }}
      />

      {/* 图标与文案 */}
      <div className="flex items-center gap-1.5 tracking-tight text-[11.5px] sm:text-xs">
        {toast.icon && <span className="text-sm shrink-0">{toast.icon}</span>}
        <span className="font-bold text-slate-800">{toast.text}</span>
      </div>
    </div>
  );
}
