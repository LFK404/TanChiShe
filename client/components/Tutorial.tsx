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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#0A0F1D] rounded-3xl p-6 sm:p-7 flex flex-col text-[#0F172A] dark:text-white relative border border-slate-200/80 dark:border-slate-800 shadow-sm"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] dark:bg-[#0099FF]/20 text-[#0099FF] dark:text-sky-300 flex items-center justify-center">
              <HelpCircle size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">游戏新手指南</h2>
              <p className="text-[11px] text-[#94A3B8] dark:text-slate-400">快速了解核心机制与操控技巧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* 单一规则卡片底座 (内部5个条目层次饱满，浑然一体) */}
        <div className="my-3.5 p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col divide-y divide-slate-200/60 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
          {/* 01 死路机制 */}
          <div className="flex items-start gap-3 pb-2.5">
            <NCUNumberBadge num="01" color="#D97706" bg="#FEF3C7" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-0.5">走过的路变成死路</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                蛇身移动会在身后留下灰色障碍死路，不可折返碰撞，考验大局规划。
              </p>
            </div>
          </div>

          {/* 02 普通红苹果 */}
          <div className="flex items-start gap-3 py-2.5">
            <NCUNumberBadge num="02" color="#EF4444" bg="#FEE2E2" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-0.5">
                普通红苹果 <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(+10分 · 清空身后死路)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                吃掉后蛇身增长 1 节，并瞬间清除身后所有死路，战场重回开阔。
              </p>
            </div>
          </div>

          {/* 03 金色幸运果 */}
          <div className="flex items-start gap-3 py-2.5">
            <NCUNumberBadge num="03" color="#F59E0B" bg="#FEF3C7" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-0.5">
                金色幸运果 <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(+30分 · 保留死路)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                概率现身并开启 8 秒倒计时！吃掉狂揽 +30 分，保留死路考验极限走位。
              </p>
            </div>
          </div>

          {/* 04 3秒连击与阶梯奖励 */}
          <div className="flex items-start gap-3 py-2.5">
            <NCUNumberBadge num="04" color="#8B5CF6" bg="#F3E8FF" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-0.5">
                3秒极速连击 <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(阶梯加成 · 濒危预警)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                3 秒内连续吃果激活连击（红果与金果均计入）：3 连击起激活蛇身黄金能量波；第 3 次起每次额外加 5 分（+5/+10...累加）；剩余 1 秒蛇身急促橙红频闪，蛇头显示倒计时微弧！
              </p>
            </div>
          </div>

          {/* 05 操控模式 */}
          <div className="flex items-start gap-3 pt-2.5">
            <NCUNumberBadge num="05" color="#0099FF" bg="#EBF8FF" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-0.5">全端操控与多层触感</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                电脑支持方向键与 WASD；移动端支持全屏手势滑屏与虚拟十字键；空格或 P 键一键暂停。
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
