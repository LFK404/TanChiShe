'use client';

import React, { useState } from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements, AchievementTier } from '@/utils/achievements';
import { X, Trophy, Award, Lock, CheckCircle2, Sparkles, Shield, Flame, Crown, Gem } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_CONFIG: Record<
  AchievementTier,
  { name: string; subtitle: string; color: string; bgLight: string; icon: React.ReactNode }
> = {
  BRONZE: {
    name: '青铜·初出茅庐',
    subtitle: '方寸探索',
    color: '#10B981',
    bgLight: '#ECFDF5',
    icon: <Shield size={14} />,
  },
  SILVER: {
    name: '白银·进阶掌控',
    subtitle: '技巧渐熟',
    color: '#0099FF',
    bgLight: '#EBF8FF',
    icon: <Flame size={14} />,
  },
  GOLD: {
    name: '黄金·登峰造极',
    subtitle: '宗师微操',
    color: '#F59E0B',
    bgLight: '#FEF3C7',
    icon: <Crown size={14} />,
  },
  DIAMOND: {
    name: '钻石·荣耀巅峰',
    subtitle: '巅峰王座',
    color: '#9333EA',
    bgLight: '#FAF5FF',
    icon: <Gem size={14} />,
  },
};

// 成就殿堂弹窗 (精细打磨：极简南大家园美学、24枚四字专属多巴胺勋章与达成进度仪表盘)
export default function Achievements({ isOpen, onClose }: Props) {
  const [activeTier, setActiveTier] = useState<AchievementTier | 'ALL'>('ALL');

  if (!isOpen) return null;

  const unlockedSet = getUnlockedAchievements();
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
        className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
      >
        {/* 顶部荣耀仪表盘 */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-b from-[#F8FAFC] to-white relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EBF8FF] to-[#E0F2FE] text-[#0099FF] flex items-center justify-center shadow-xs">
                <Trophy size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    成就殿堂
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF8FF] text-[#0099FF]">
                    <Sparkles size={10} /> 24 勋章
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  已点亮 <strong className="text-[#0099FF] font-mono">{unlockedCount}</strong> / {totalCount} 枚荣耀勋章 ({progressPercent}%)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* 晶体平滑进度条 */}
          <div className="mt-3.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5">
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
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cfg.color : undefined,
                  }}
                >
                  <span>{cfg.icon}</span>
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
                const tierCfg = TIER_CONFIG[ach.tier];

                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 relative overflow-hidden group ${
                      isUnlocked
                        ? 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-[#66CCFF]/60 hover:shadow-md'
                        : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'
                    }`}
                  >
                    {/* 左侧多巴胺徽章图标底座 */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: isUnlocked ? `${ach.color}15` : '#F1F5F9',
                        color: isUnlocked ? ach.color : '#94A3B8',
                      }}
                    >
                      {isUnlocked ? <Award size={22} /> : <Lock size={18} />}
                    </div>

                    {/* 中间文字排版 */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <h4
                          className={`text-xs font-black tracking-tight ${
                            isUnlocked ? 'text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          {ach.name}
                        </h4>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0"
                          style={{
                            backgroundColor: tierCfg.bgLight,
                            color: tierCfg.color,
                          }}
                        >
                          {tierCfg.subtitle}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {ach.description}
                      </p>

                      <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                        &ldquo;{ach.flavor}&rdquo;
                      </p>
                    </div>

                    {/* 右上角达成状态微章 */}
                    <div className="absolute top-3 right-3">
                      {isUnlocked ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300 block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部极简寄语 */}
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/60 text-center text-[11px] text-slate-400 select-none">
          方寸之间，重温经典 · 达成成就自动记录至本地
        </div>
      </div>
    </div>
  );
}
