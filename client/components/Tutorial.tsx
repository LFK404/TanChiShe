import React from 'react';
import { X, Sparkles, Zap, Apple, Compass, Gamepad2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_ITEMS = [
  {
    icon: <Gamepad2 size={15} />, bg: 'bg-[#EBF8FF]', color: 'text-[#0099FF]',
    title: '基础操作与转向',
    desc: '电脑端支持 方向键 / WASD 转向，手机端支持 全屏滑动屏幕 或虚拟按键。按 空格键 / P 键 随时暂停。',
  },
  {
    icon: <Apple size={15} />, bg: 'bg-rose-50', color: 'text-rose-500',
    title: '普通红苹果 (+10分 · 清空栅栏)',
    desc: '吃掉红苹果后蛇身增长 1 节，并瞬间清除身后所有残留栅栏死路，重置战场！',
  },
  {
    icon: <Sparkles size={15} />, bg: 'bg-[#FEF3C7]', color: 'text-[#D97706]',
    title: '金色幸运果 (+30分 · 保留栅栏)',
    desc: '25% 概率出现，限时 8 秒倒计时！吃掉斩获 +30 高分，但残留栅栏继续保留，考验极限走位！',
  },
  {
    icon: <Zap size={15} />, bg: 'bg-purple-50', color: 'text-purple-600',
    title: '动态速度与冲榜',
    desc: '得分越高，蛇速平滑递增（最高 2.0x 极速）。创下新纪录自动同步全服 Top 10 竞技榜！',
  },
];

export default function Tutorial({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 flex flex-col text-[#0F172A] relative shadow-2xl">
        <div className="flex items-center justify-between pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0F172A]">游戏新手指南</h2>
              <p className="text-[11px] text-[#94A3B8]">30 秒快速掌握核心规则与高分技巧</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 py-3 text-xs text-[#334155]">
          {TUTORIAL_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 bg-slate-50/90 rounded-2xl">
              <div className={`w-7 h-7 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                {item.icon}
              </div>
              <div>
                <strong className="text-[#0F172A] block font-bold mb-0.5">{item.title}</strong>
                <p className="text-[#64748B] text-[11.5px] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all cursor-pointer mt-1 shadow-xs"
        >
          我知道了，开始游戏
        </button>
      </div>
    </div>
  );
}
