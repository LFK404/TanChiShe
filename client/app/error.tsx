'use client';

import { useEffect } from 'react';
import { RotateCcw, AlertTriangle, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 捕获客户端运行时未捕获异常
    console.error('【贪吃蛇客户端异常捕获】', error);
  }, [error]);

  const handleClearAndReload = () => {
    try {
      localStorage.removeItem('tanchishe_token');
      localStorage.removeItem('tanchishe_user');
    } catch {}
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-[#0F172A] select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
        {/* 南大家园天青蓝超椭圆微标 */}
        <div className="w-14 h-14 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center mb-4">
          <AlertTriangle size={28} />
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-1.5">画面加载稍有迟疑</h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          浏览器环境或绘图引擎遇到了暂时的波动。别担心，你的战绩数据已安全保存在云端。
        </p>

        {/* 核心操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-[#0099FF] hover:bg-[#0284C7] active:scale-95 transition-all text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw size={14} />
            <span>重新载入对局</span>
          </button>
          <button
            onClick={handleClearAndReload}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home size={14} />
            <span>重置缓存并回大厅</span>
          </button>
        </div>

        {/* 错误堆栈信息 (仅开发调试展示) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-5 p-3 rounded-xl bg-rose-50 text-rose-700 text-[10px] font-mono text-left w-full overflow-x-auto max-h-24">
            {error.message || String(error)}
          </div>
        )}
      </div>

      <div className="mt-6 text-[11px] text-slate-400 font-mono">
        NCU HOME · 方寸之间 重温经典
      </div>
    </div>
  );
}
