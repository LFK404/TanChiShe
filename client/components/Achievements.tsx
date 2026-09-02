'use client';

import React from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements, AchievementTier } from '@/utils/achievements';
import { X, Trophy, Award, Lock, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_LABELS: Record<AchievementTier, { name: string; color: string }> = {
  BRONZE: { name: '青铜·初出茅庐', color: '#10B981' },
  SILVER: { name: '白银·进阶掌控', color: '#0099FF' },
  GOLD: { name: '黄金·登峰造极', color: '#F59E0B' },
  DIAMOND: { name: '钻石·荣耀巅峰', color: '#9333EA' },
};

// 成就墙组件 (占位符样式：提供完整的 24 枚成就分类、达成进度与解锁状态)
export default function Achievements({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const unlockedSet = getUnlockedAchievements();
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const tiers: AchievementTier[] = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 顶部标题栏与进度 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">成就殿堂</h3>
              <div className="text-xs text-slate-500">
                已解锁 {unlockedCount} / {totalCount} ({progressPercent}%)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-[#0099FF] h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 成就列表区域 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {tiers.map((tier) => {
            const tierList = ACHIEVEMENTS.filter((a) => a.tier === tier);
            const tierInfo = TIER_LABELS[tier];
            const tierUnlocked = tierList.filter((a) => unlockedSet.has(a.id)).length;

            return (
              <div key={tier} className="space-y-2.5">
                {/* 梯度小标题 */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tierInfo.color }}
                    />
                    <span>{tierInfo.name}</span>
                  </div>
                  <span className="text-slate-400 font-normal">
                    {tierUnlocked} / {tierList.length}
                  </span>
                </div>

                {/* 成就卡片网格 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tierList.map((ach) => {
                    const isUnlocked = unlockedSet.has(ach.id);

                    return (
                      <div
                        key={ach.id}
                        className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                          isUnlocked
                            ? 'bg-slate-50/80 border-slate-200'
                            : 'bg-slate-50/30 border-dashed border-slate-200 opacity-60'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isUnlocked ? `${ach.color}15` : '#F1F5F9',
                            color: isUnlocked ? ach.color : '#94A3B8',
                          }}
                        >
                          {isUnlocked ? <Award size={20} /> : <Lock size={18} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isUnlocked ? 'text-slate-800' : 'text-slate-500'
                              }`}
                            >
                              {ach.name}
                            </h4>
                            {isUnlocked && (
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {ach.description}
                          </p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                            {ach.flavor}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
