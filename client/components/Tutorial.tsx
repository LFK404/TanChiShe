import React from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 游戏新手规则教学模态弹窗组件 (南大家园极简一体化卡片，零割裂感)
export default function Tutorial({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 flex flex-col text-[#0F172A] relative border border-slate-200/80 shadow-sm">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <HelpCircle size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">游戏新手指南</h2>
              <p className="text-[11px] text-[#94A3B8]">快速了解核心机制与操控技巧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-all cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* 单一规则整合卡片 (消除4块碎片化卡片，层次浑然一体) */}
        <div className="my-4 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <strong className="text-slate-800 font-bold mr-1">死路机制:</strong>
              <span className="text-slate-600">蛇移动会留下灰色残留死路，不可再次折返碰撞。</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <strong className="text-slate-800 font-bold mr-1">红苹果 (+10分):</strong>
              <span className="text-slate-600">蛇身增长 1 节，并立即清空身后所有死路，重获开阔空间。</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <strong className="text-slate-800 font-bold mr-1">金苹果 (+30分):</strong>
              <span className="text-slate-600">限时 8 秒倒计时，高额得分但死路保留，考验极限走位。</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0099FF] mt-1.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <strong className="text-slate-800 font-bold mr-1">操控方式:</strong>
              <span className="text-slate-600">支持方向键 / WASD 与全屏滑屏/十字键，按空格或 P 键随时暂停。</span>
            </div>
          </div>
        </div>

        {/* 底部确认按钮 */}
        <button
          onClick={onClose}
          className="w-full bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.98] text-white font-bold py-2.5 rounded-2xl transition-all cursor-pointer text-xs shadow-xs"
        >
          我已了解
        </button>
      </div>
    </div>
  );
}
