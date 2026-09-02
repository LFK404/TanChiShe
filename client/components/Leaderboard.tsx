import React from 'react';
import { User } from '@/types';
import { Trophy, RefreshCw, Film } from 'lucide-react';

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

// 全服 Top 10 竞技风云榜组件
export default function Leaderboard({ items, currentUser, onRefresh, onWatchReplay }: Props) {
  // 计算当前登录玩家排名与战胜全服玩家百分比
  let beatPercent = 0;
  if (currentUser && currentUser.highScore > 0 && items.length > 0) {
    const myRank = items.findIndex((it) => it.username === currentUser.username) + 1;
    if (myRank === 1) {
      // 榜首第一名锁定 99%
      beatPercent = 99;
    } else if (myRank > 1) {
      // 榜内 2~10 名：在 95% ~ 55% 之间平滑梯度递减
      beatPercent = Math.max(50, Math.round(98 - (myRank - 1) * (45 / Math.max(items.length - 1, 1))));
    } else {
      // 未进 Top 10：按当前分数与榜尾分数的比值估算 10% ~ 49%
      const lastScore = items[items.length - 1].highScore;
      const ratio = lastScore > 0 ? currentUser.highScore / lastScore : 0.5;
      beatPercent = Math.min(49, Math.max(10, Math.round(ratio * 45)));
    }
  }

  const getBadgeStyle = (rank: number) => BADGE_STYLES[rank] || 'bg-[#F1F5F9] text-[#64748B]';

  return (
    <div className="bg-white p-5 rounded-3xl flex flex-col select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* 榜单标题与手动刷新 */}
      <div className="flex justify-between items-center pb-2.5">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-[#D97706]" />
          <h2 className="text-sm font-extrabold text-[#0F172A]">Top 10 风云榜</h2>
        </div>
        <button
          onClick={onRefresh}
          className="text-[11px] text-[#94A3B8] hover:text-[#0099FF] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RefreshCw size={11} /> 刷新
        </button>
      </div>

      {/* 排行榜名次流水列表 */}
      <div className="flex flex-col mt-1 max-h-[380px] overflow-y-auto gap-0.5">
        {items.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#94A3B8]">暂无挑战记录，快来占领榜首！</div>
        ) : (
          items.map((item, idx) => {
            const rank = idx + 1;
            const isMe = currentUser && item.username === currentUser.username;

            return (
              <div
                key={item.username}
                className={`flex items-center justify-between py-2 px-2 transition-colors rounded-xl ${
                  isMe ? 'bg-[#EBF8FF] text-[#0099FF]' : 'hover:bg-slate-50/80'
                }`}
              >
                {/* 排名徽标 + 用户名 + 本人标志 */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center font-extrabold text-[12px] shrink-0 font-mono ${getBadgeStyle(
                      rank
                    )}`}
                  >
                    {rank}
                  </span>
                  <span className={`truncate text-xs ${isMe ? 'font-bold text-[#0F172A]' : 'font-medium text-[#334155]'}`}>
                    {item.username}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/80 text-[#0099FF] shrink-0">
                      我
                    </span>
                  )}
                </div>

                {/* 最高得分、通关最短用时与观摩录像按钮 */}
                <div className="flex items-center gap-2 text-right shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="font-extrabold text-xs text-[#0F172A] font-mono">{item.highScore}分</span>
                    <span className="text-[10px] text-[#94A3B8] font-mono">{item.bestDuration}s</span>
                  </div>

                  {item.replayInputs && onWatchReplay && (
                    <button
                      onClick={() => onWatchReplay(item)}
                      title={`观摩 ${item.username} 的神级走位录像`}
                      className="px-2 py-1 bg-[#EBF8FF] hover:bg-[#0099FF] text-[#0099FF] hover:text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Film size={11} />
                      <span>观摩</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部个人战绩超越评语 */}
      {currentUser && currentUser.highScore > 0 && (
        <div className="mt-3 text-[11.5px] text-[#0369A1] bg-[#EBF8FF] px-3 py-2.5 rounded-xl flex items-center justify-between">
          <span>个人最高纪录：<strong className="text-[#0099FF]">{currentUser.highScore}分</strong></span>
          <span className="font-bold text-[#0099FF] bg-white/90 px-2 py-0.5 rounded-md">
            超越 {beatPercent}% 玩家
          </span>
        </div>
      )}
    </div>
  );
}
