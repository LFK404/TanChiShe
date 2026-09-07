import React, { useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { NCUNumberBadge } from './NCUIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 游戏新手规则教学模态弹窗组件 (极简一体化卡片，层次生动饱满)
export default function Tutorial({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] bg-white rounded-3xl flex flex-col text-[#0F172A] relative border border-slate-200/80 shadow-sm overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* 顶部标题栏 (固定吸顶) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
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

        {/* 核心规则列表区 (自适应平滑滚动) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col divide-y divide-slate-200/60">
            {/* 01 死路固化机制 */}
            <div className="flex items-start gap-3 pb-2.5">
              <NCUNumberBadge num="01" color="#D97706" bg="#FEF3C7" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-800 mb-0.5">走过的路变成死路</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  蛇身前进会在身后留下固化灰色死墙，碰撞即死，不可折返掉头，考验大局走位规划。
                </p>
              </div>
            </div>

            {/* 02 普通红苹果 */}
            <div className="flex items-start gap-3 py-2.5">
              <NCUNumberBadge num="02" color="#EF4444" bg="#FEE2E2" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-800 mb-0.5">
                  普通红苹果 <span className="text-[10px] font-normal text-slate-400">(常驻 · +10分 · 波次清屏)</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  场上常驻 1 颗，吃掉身长 +1 并<strong className="text-emerald-600 font-semibold">瞬间清除全场死路</strong>，重置战场开阔空间。
                </p>
              </div>
            </div>

            {/* 03 单池三大特殊果实 */}
            <div className="flex items-start gap-3 py-2.5">
              <NCUNumberBadge num="03" color="#F59E0B" bg="#FEF3C7" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-800 mb-0.5">
                  特殊果实池 <span className="text-[10px] font-normal text-slate-400">(同一池子 · 至多1颗 · 统一限时8秒)</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  同一池子随机抽选，场上至多存在 1 颗，外置导轨统一 8 秒倒计时，吃掉均清空死路：
                  <br />• <strong className="text-amber-600 font-semibold">幸运金果</strong>：高额大奖，吃掉 <strong className="text-amber-700">+30分</strong>；
                  <br />• <strong className="text-sky-600 font-semibold">冰霜寒果</strong>：控场神器，吃掉 +10分，激活 <strong className="text-sky-700">3秒减速</strong>（从容规避死角）；
                  <br />• <strong className="text-purple-600 font-semibold">极光虚化果</strong>：穿透神技，吃掉 +10分，激活 <strong className="text-purple-700">2秒虚化</strong>（穿透边界死路，豁免碰撞）。
                </p>
              </div>
            </div>

            {/* 04 3秒极速连击时钟 */}
            <div className="flex items-start gap-3 py-2.5">
              <NCUNumberBadge num="04" color="#8B5CF6" bg="#F3E8FF" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-800 mb-0.5">
                  3秒极速连击 <span className="text-[10px] font-normal text-slate-400">(阶梯加成 · 流金奔腾 · 濒危预警)</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  吃任意果实均刷新 3 秒连击时钟：3 连击起激活<strong className="text-amber-600 font-semibold">全蛇身流金奔腾光梭与光晕</strong>；从第 3 次起阶梯奖励每次递增（+5、+10...）；剩余 1 秒急促橙红频闪预警。
                </p>
              </div>
            </div>

            {/* 05 电竞回放与全端操控 */}
            <div className="flex items-start gap-3 pt-2.5">
              <NCUNumberBadge num="05" color="#0099FF" bg="#EBF8FF" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-800 mb-0.5">电竞回放与全端操控</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  风云榜支持一键观摩与 1.0x~2.0x 录像回放，赛后可生成走位几何艺术海报；电脑支持 WASD / 方向键，手机支持全屏手势滑屏与虚拟十字键，空格 / P 键暂停。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部确认按钮栏 (固定吸底) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-[#F8FAFC]/60 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.98] text-white font-bold py-2.5 rounded-2xl transition-all cursor-pointer text-xs shadow-xs"
          >
            我已了解
          </button>
        </div>
      </div>
    </div>
  );
}
