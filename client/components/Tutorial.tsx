import React from 'react';
import { X, Sparkles, Zap, Apple, Compass, Footprints } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 核心规则分段条目配置
const TUTORIAL_SECTIONS = [
  {
    icon: <Footprints size={15} />,
    color: 'text-amber-600 bg-amber-50',
    title: '走过的路不能再踩！',
    desc: '蛇在移动时尾部会留下灰色残留方格轨迹，走过的路会变成障碍死路，不可再次碰撞折返！',
  },
  {
    icon: <Apple size={15} />,
    color: 'text-rose-500 bg-rose-50',
    title: '普通红苹果 (+10分 · 清空身后死路)',
    desc: '吃掉红苹果后蛇身增长 1 节，并瞬间清除身后所有残留的死路轨迹，让战场重新恢复开阔！',
  },
  {
    icon: <Sparkles size={15} />,
    color: 'text-[#D97706] bg-[#FEF3C7]',
    title: '金色幸运果 (+30分 · 保留死路考验走位)',
    desc: '25% 概率出现并开启 8 秒蓝色倒计时消失进度条！吃掉斩获 +30 高分，但残留死路继续保留，极度考验极限走位！',
  },
  {
    icon: <Zap size={15} />,
    color: 'text-[#0099FF] bg-[#EBF8FF]',
    title: '操作技巧与即时暂停',
    desc: '电脑端支持 方向键 / WASD 转向，手机端支持 全屏滑屏 或虚拟按键。随时按 空格键 / P 键 暂停或继续。',
  },
];

// 游戏新手规则教学模态弹窗组件
export default function Tutorial({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 flex flex-col text-[#0F172A] relative shadow-2xl border border-slate-100">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0F172A]">游戏新手指南</h2>
              <p className="text-[11px] text-[#94A3B8]">30 秒掌握核心生存法则与高分技巧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 统一纯白分段规则列表 */}
        <div className="flex flex-col py-3.5 divide-y divide-slate-100/90 text-xs">
          {TUTORIAL_SECTIONS.map((sec) => (
            <div key={sec.title} className="flex items-start gap-3 py-3 first:pt-0.5 last:pb-1">
              <div className={`w-7 h-7 rounded-xl ${sec.color} flex items-center justify-center shrink-0 mt-0.5`}>
                {sec.icon}
              </div>
              <div className="min-w-0">
                <strong className="text-[#0F172A] block font-bold text-xs mb-1">{sec.title}</strong>
                <p className="text-[#64748B] text-[11.5px] leading-relaxed">{sec.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 底部确认按钮 */}
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
