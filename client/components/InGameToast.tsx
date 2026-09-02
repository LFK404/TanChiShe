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

// 局中即时高光微弹窗容器 (占位符样式：顶部安全区非侵入式悬浮，事件穿透)
export default function InGameToast({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none select-none max-w-[90vw]">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 渐入
    const inTimer = setTimeout(() => setVisible(true), 20);
    // 1.5s 后渐出
    const outTimer = setTimeout(() => setVisible(false), 1500);
    // 1.8s 彻底移除
    const removeTimer = setTimeout(() => onRemove(toast.id), 1800);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`transition-all duration-300 transform px-3.5 py-1 rounded-full text-xs font-bold shadow-sm border border-slate-200/80 bg-white/95 text-slate-800 backdrop-blur-xs flex items-center gap-1.5 ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
      }`}
      style={{
        borderLeft: toast.color ? `3.5px solid ${toast.color}` : undefined,
      }}
    >
      {toast.icon && <span>{toast.icon}</span>}
      <span>{toast.text}</span>
    </div>
  );
}
