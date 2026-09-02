import React from 'react';
import { HelpCircle } from 'lucide-react';
import { NCUNumberBadge } from './NCUIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 游戏新手规则教学模态弹窗组件 (极简一体化卡片，层次生动饱满)
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

        {/* 单一规则卡片底座 (内部4个条目层次饱满，浑然一体) */}
        <div className="my-4 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col divide-y divide-slate-200/60">
          {/* 01 死路机制 */}
          <div className="flex items-start gap-3 pb-3">
            <NCUNumberBadge num="01" color="#D97706" bg="#FEF3C7" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 mb-0.5">走过的路变成死路</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                蛇身移动会在身后留下灰色障碍死路，不可再次折返碰撞，考验规划走位空间。
              </p>
            </div>
          </div>

          {/* 02 普通红苹果 */}
          <div className="flex items-start gap-3 py-3">
            <NCUNumberBadge num="02" color="#EF4444" bg="#FEE2E2" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 mb-0.5">
                普通红苹果 <span className="text-[10px] font-normal text-slate-400">(+10分 · 清空身后死路)</span>
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                吃掉后蛇身增长 1 节，并瞬间清除身后所有残留死路，让战场重新恢复开阔。
              </p>
            </div>
          </div>

          {/* 03 金色幸运果 */}
          <div className="flex items-start gap-3 py-3">
            <NCUNumberBadge num="03" color="#F59E0B" bg="#FEF3C7" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 mb-0.5">
                金色幸运果 <span className="text-[10px] font-normal text-slate-400">(+30分 · 保留死路)</span>
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                概率触发并开启 8 秒倒计时！吃掉斩获 +30 高分，但死路继续保留，极度考验走位。
              </p>
            </div>
          </div>

          {/* 04 操控模式 */}
          <div className="flex items-start gap-3 pt-3">
            <NCUNumberBadge num="04" color="#0099FF" bg="#EBF8FF" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 mb-0.5">双模操控与触感反馈</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                电脑支持方向键与 WASD；手机支持全屏滑屏与十字键；空格或 P 键可随时暂停。
              </p>
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
