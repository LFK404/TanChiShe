'use client';

import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { ACHIEVEMENTS, getUnlockedAchievements, AchievementTier } from '@/utils/achievements';
import { NCUCrestBadge } from './NCUIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

const TIER_CONFIG: Record<
  AchievementTier,
  { name: string; subtitle: string; color: string; bgLight: string }
> = {
  BRONZE: {
    name: '青铜·方寸探索',
    subtitle: '自然初生',
    color: '#10B981',
    bgLight: '#ECFDF5',
  },
  SILVER: {
    name: '白银·技巧渐熟',
    subtitle: '行云流水',
    color: '#64748B',
    bgLight: '#F1F5F9',
  },
  GOLD: {
    name: '黄金·登峰造极',
    subtitle: '星曜土星',
    color: '#F59E0B',
    bgLight: '#FEF3C7',
  },
  DIAMOND: {
    name: '钻石·超凡殿堂',
    subtitle: '极光晶星',
    color: '#0099FF',
    bgLight: '#EBF8FF',
  },
};



export default function Achievements({ isOpen, onClose, username }: Props) {
  const [activeTier, setActiveTier] = useState<AchievementTier | 'ALL'>('ALL');

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

  const unlockedSet = getUnlockedAchievements(username);
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const tiers: AchievementTier[] = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];

  const displayedAchievements =
    activeTier === 'ALL'
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter((a) => a.tier === activeTier);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#0A0F1D] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 select-none"
      >
        {/* 顶部荣耀仪表盘 */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-[#F8FAFC] to-white dark:from-slate-900/60 dark:to-[#0A0F1D] relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EBF8FF] dark:bg-[#0099FF]/20 text-[#0099FF] dark:text-sky-300 flex items-center justify-center">
                <Trophy size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                    成就殿堂
                  </h3>
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF8FF] dark:bg-[#0099FF]/20 text-[#0099FF] dark:text-sky-300">
                    24 勋章
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  已点亮 <strong className="text-[#0099FF] font-mono">{unlockedCount}</strong> / {totalCount} 枚荣耀勋章 ({progressPercent}%)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* 晶体平滑进度条 */}
          <div className="mt-3.5 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-[#66CCFF] to-[#0099FF] h-full rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 段位快速筛选 Tabs */}
          <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-bold">
            <button
              onClick={() => setActiveTier('ALL')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTier === 'ALL'
                  ? 'bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              全部 ({unlockedCount}/{totalCount})
            </button>

            {tiers.map((tier) => {
              const cfg = TIER_CONFIG[tier];
              const list = ACHIEVEMENTS.filter((a) => a.tier === tier);
              const unCount = list.filter((a) => unlockedSet.has(a.id)).length;
              const isSelected = activeTier === tier;

              return (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cfg.color : undefined,
                  }}
                >
                  <span>{cfg.name.split('·')[0]}</span>
                  <span className="opacity-80 font-mono text-[10px]">
                    ({unCount}/{list.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 成就列表卡片区域 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {displayedAchievements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">暂无成就</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedAchievements.map((ach) => {
                const isUnlocked = unlockedSet.has(ach.id);

                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-2xl border transition-all flex items-start gap-3 relative overflow-hidden group ${
                      isUnlocked
                        ? 'bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-[#0099FF]/50'
                        : 'bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    {/* 左侧：NCU HOME 微拟态专属勋章 */}
                    <div className="shrink-0 pt-0.5">
                      <NCUCrestBadge tier={ach.tier} unlocked={isUnlocked} size={42} />
                    </div>

                    {/* 右侧：成就名称、说明、段位代号 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            isUnlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500'
                          }`}
                        >
                          {ach.name}
                        </h4>
                        <span
                          className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                            isUnlocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {ach.code}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                        {ach.description}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/80 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-[130px]">
                          {ach.flavor}
                        </span>
                        <span
                          className={`text-[10px] font-bold shrink-0 ${
                            isUnlocked ? 'text-[#10B981]' : 'text-slate-400'
                          }`}
                        >
                          {isUnlocked ? '已点亮' : '未解锁'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
