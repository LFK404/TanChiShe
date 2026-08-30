import React from 'react';
import { User } from '@/types';
import { Trophy, RefreshCw } from 'lucide-react';

interface Props {
  items: User[];
  currentUser?: User | null;
  onRefresh: () => void;
}

export default function Leaderboard({ items, currentUser, onRefresh }: Props) {
  // 计算当前玩家超越百分比
  let beatPercent = 0;
  if (currentUser && currentUser.highScore > 0 && items.length > 0) {
    const beaten = items.filter(it => currentUser.highScore > it.highScore).length;
    beatPercent = Math.min(99, Math.max(50, Math.round(((beaten + 1) / (items.length + 1)) * 100)));
  }

  // 1~6 专属南大家园多巴胺几何数字徽标
  const getBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-[#FEF3C7] text-[#D97706]'; // 暖琥珀金 (冠军)
      case 2:
        return 'bg-[#FEE2E2] text-[#EF4444]'; // 珊瑚樱桃红 (亚军)
      case 3:
        return 'bg-[#DCFCE7] text-[#16A34A]'; // 翡翠绿 (季军)
      case 4:
        return 'bg-[#EDE9FE] text-[#7C3AED]'; // 罗兰紫
      case 5:
        return 'bg-[#E0F2FE] text-[#0284C7]'; // 天青蓝
      case 6:
        return 'bg-[#CFFAFE] text-[#0891B2]'; // 活力青
      default:
        return 'bg-[#F1F5F9] text-[#64748B]'; // 极简灰
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl flex flex-col select-none">
      {/* 标题与刷新 */}
      <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
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

      {/* 榜单列表 */}
      <div className="flex flex-col mt-2 max-h-[380px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#94A3B8]">暂无挑战记录，快来占领榜首！</div>
        ) : (
          items.map((item, idx) => {
            const rank = idx + 1;
            const isMe = currentUser && item.username === currentUser.username;
            const isLast = idx === items.length - 1;

            return (
              <div
                key={item.username}
                className={`flex items-center justify-between py-2.5 px-2 transition-colors rounded-xl ${
                  !isLast ? 'border-b border-[#F1F5F9]' : ''
                } ${
                  isMe ? 'bg-[#F6FBFF] border border-[#66CCFF]/40 text-[#0099FF]' : 'hover:bg-[#F8FAFC]'
                }`}
              >
                {/* 排名 + 用户名 */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* 22px 等宽粗体几何数字徽标 */}
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
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#EBF8FF] border border-[#66CCFF]/30 text-[#0099FF] shrink-0">
                      我
                    </span>
                  )}
                </div>

                {/* 分数 + 用时 */}
                <div className="flex items-center gap-2 text-right shrink-0">
                  <span className="font-extrabold text-xs text-[#0F172A] font-mono">{item.highScore}分</span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">{item.bestDuration}s</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 战绩评语卡片 (融入 #66CCFF 天青蓝轻量微框) */}
      {currentUser && currentUser.highScore > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E2E8F0] text-[11.5px] text-[#0369A1] bg-[#EBF8FF] border border-[#66CCFF]/30 px-3 py-2 rounded-xl flex items-center justify-between">
          <span>个人最高纪录：<strong className="text-[#0099FF]">{currentUser.highScore}分</strong></span>
          <span className="font-bold text-[#0099FF] bg-white/80 px-2 py-0.5 rounded-md border border-[#66CCFF]/30">
            超越 {beatPercent}% 玩家
          </span>
        </div>
      )}
    </div>
  );
}
