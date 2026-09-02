import React from 'react';
import { User } from '@/types';

interface Props {
  items: User[];
  currentUser?: User | null;
  onRefresh: () => void;
  onWatchReplay?: (user: User) => void;
}

// 1~6 名专属多巴胺多色几何徽标配置 (金·红·绿·紫·天青·活力青)
const BADGE_STYLES: Record<number, string> = {
  1: 'bg-[#FEF3C7] text-[#D97706]',
  2: 'bg-[#FEE2E2] text-[#EF4444]',
  3: 'bg-[#DCFCE7] text-[#16A34A]',
  4: 'bg-[#EDE9FE] text-[#7C3AED]',
  5: 'bg-[#E0F2FE] text-[#0284C7]',
  6: 'bg-[#CFFAFE] text-[#0891B2]',
};

// 全服 Top 10 竞技风云榜组件 (极简现代排版，零 AI 模板感)
export default function Leaderboard({ items, currentUser, onRefresh, onWatchReplay }: Props) {
  // 计算当前登录玩家排名与战胜全服玩家百分比
  let beatPercent = 0;
  if (currentUser && currentUser.highScore > 0 && items.length > 0) {
    const myRank = items.findIndex((it) => it.username === currentUser.username) + 1;
    if (myRank === 1) {
      beatPercent = 99;
    } else if (myRank > 1) {
      beatPercent = Math.max(50, Math.round(98 - (myRank - 1) * (45 / Math.max(items.length - 1, 1))));
    } else {
      const lastScore = items[items.length - 1].highScore;
      const ratio = lastScore > 0 ? currentUser.highScore / lastScore : 0.5;
      beatPercent = Math.min(49, Math.max(10, Math.round(ratio * 45)));
    }
  }

  const getBadgeStyle = (rank: number) => BADGE_STYLES[rank] || 'bg-[#F1F5F9] text-[#64748B]';

  return (
    <div className="bg-white p-5 rounded-3xl flex flex-col select-none border border-slate-200/80 shadow-xs">
      {/* 榜单标题与手动刷新 */}
      <div className="flex justify-between items-center pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-[#0099FF] rounded-full" />
          <h2 className="text-sm font-extrabold text-[#0F172A] tracking-tight">Top 10 风云榜</h2>
        </div>
        <button
          onClick={onRefresh}
          className="text-[11px] text-[#94A3B8] hover:text-[#0099FF] transition-colors cursor-pointer font-medium"
        >
          刷新
        </button>
      </div>

      {/* 排行榜名次流水列表 */}
      <div className="space-y-1 my-1">
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 font-normal">暂无上榜记录</div>
        ) : (
          items.slice(0, 10).map((u, i) => {
            const rank = i + 1;
            const isMe = currentUser?.username === u.username;
            const hasReplay = !!(u.replayInputs && u.replaySeed);

            return (
              <div
                key={u.username}
                className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                  isMe ? 'bg-[#EBF8FF] text-[#0099FF] font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-lg text-xs font-black font-mono shrink-0 shadow-2xs ${getBadgeStyle(
                      rank
                    )}`}
                  >
                    {rank}
                  </span>
                  <span className="truncate text-xs">{u.username}</span>
                  {isMe && (
                    <span className="text-[10px] text-[#0099FF] font-semibold bg-white/80 px-1 rounded-sm shrink-0 border border-[#0099FF]/20">
                      我
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* 一键观摩高手通关走位 */}
                  {hasReplay && onWatchReplay && (
                    <button
                      onClick={() => onWatchReplay(u)}
                      title={`观摩 ${u.username} 的通关走位`}
                      className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EBF8FF] text-[#0099FF] hover:bg-[#0099FF] hover:text-white transition-all cursor-pointer shadow-2xs"
                    >
                      回放
                    </button>
                  )}
                  <span className="font-mono text-xs font-bold text-[#0F172A]">{u.highScore}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部当前玩家排位评语 */}
      {currentUser && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#94A3B8]">
          <span>超越全服玩家</span>
          <span className="font-mono font-bold text-[#0099FF]">{beatPercent}%</span>
        </div>
      )}
    </div>
  );
}
