import React from 'react';
import { X, Sparkles, Zap, Apple, Compass, Gamepad2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function TutorialModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] animate-fade-in select-none">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-7 flex flex-col text-[#0F172A] relative">
        {/* 顶部标题与关闭 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0F172A]">游戏新手指南</h2>
              <p className="text-[11px] text-[#94A3B8]">30 秒快速掌握核心规则与高分技巧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 教程条目 (纯净浅底，仅左侧图标着色，100% 纯矢量) */}
        <div className="flex flex-col gap-3 py-4 text-xs text-[#334155]">
          {/* 1. 操控方式 (天青蓝图标) */}
          <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-[#EBF8FF] flex items-center justify-center text-[#0099FF] shrink-0 mt-0.5">
              <Gamepad2 size={15} />
            </div>
            <div>
              <strong className="text-[#0F172A] block font-bold mb-0.5">基础操作与转向</strong>
              <p className="text-[#64748B] text-[11.5px] leading-relaxed">
                电脑端支持 <strong className="text-[#0F172A]">方向键 / WASD</strong> 转向，手机端支持 <strong className="text-[#0F172A]">全屏滑动屏幕</strong> 或下方虚拟十字键。按 <strong className="text-[#0F172A]">空格键 / P 键 / 下方暂停按钮</strong> 可随时暂停。
              </p>
            </div>
          </div>

          {/* 2. 普通红果 (珊瑚红图标) */}
          <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
              <Apple size={15} />
            </div>
            <div>
              <strong className="text-[#0F172A] block font-bold mb-0.5">普通红苹果 (+10分 · 清空栅栏)</strong>
              <p className="text-[#64748B] text-[11.5px] leading-relaxed">
                吃掉红苹果后蛇身增长 1 节，并 <strong className="text-[#0F172A]">瞬间清除所有身后残留的栅栏死路</strong>，重置战场！
              </p>
            </div>
          </div>

          {/* 3. 金色幸运果 (暖琥珀金图标) */}
          <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0 mt-0.5">
              <Sparkles size={15} />
            </div>
            <div>
              <strong className="text-[#0F172A] block font-bold mb-0.5">金色幸运果 (+30分 · 保留栅栏)</strong>
              <p className="text-[#64748B] text-[11.5px] leading-relaxed">
                每局概率出现，限时 <strong className="text-[#0F172A]">8 秒</strong> 倒计时！吃掉斩获 +30 高额积分，但 <strong className="text-[#0F172A]">残留栅栏会继续保留</strong>，考验走位极限！
              </p>
            </div>
          </div>

          {/* 4. 速度进阶 (罗兰紫图标) */}
          <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
              <Zap size={15} />
            </div>
            <div>
              <strong className="text-[#0F172A] block font-bold mb-0.5">动态速度与冲榜</strong>
              <p className="text-[#64748B] text-[11.5px] leading-relaxed">
                得分越高，蛇速自动平滑递增（最高 2.0x 速度）。打破纪录后自动同步全服 Top 10 排行榜！
              </p>
            </div>
          </div>
        </div>

        {/* 底部确认按钮 */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all cursor-pointer mt-1"
        >
          我知道了，开始游戏
        </button>
      </div>
    </div>
  );
}
