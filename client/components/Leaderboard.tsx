import React, { useState } from 'react';
import { User, LocalMatchRecord } from '@/types';

interface Props {
  items: User[];
  currentUser?: User | null;
  isLoading?: boolean;
  recentScores?: number[];
  localHistory?: LocalMatchRecord[];
  onRefresh: () => void;
  onWatchReplay?: (user: User) => void;
  onViewHistoryArt?: (record: LocalMatchRecord) => void;
}

// 纯 SVG 矢量战绩走势微折线 (无任何第三方库，极度轻盈极客)
function ScoreSparkline({ scores }: { scores: number[] }) {
  if (!scores || scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const w = 54;
  const h = 14;
  const points = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * w;
      const y = h - ((s - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastY = (h - ((scores[scores.length - 1] - min) / range) * (h - 4) - 2).toFixed(1);

  return (
    <div className="flex items-center gap-1 cursor-default" title={`近 ${scores.length} 局得分走势: ${scores.join(' → ')}`}>
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          fill="none"
          stroke="#0099FF"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle cx={w} cy={lastY} r="2" fill="#0099FF" />
      </svg>
    </div>
  );
}

// 格式化耗时（支持秒与分秒自适应，0容错）
function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s > 0 ? ` ${s}s` : ''}`;
}

// 1~6 名专属多巴胺多色几何徽标配置 (金·红·绿·紫·天青·活力青)
const BADGE_STYLES: Record<number, string> = {
  1: 'bg-[#FEF3C7] dark:bg-[#FEF3C7]/20 text-[#D97706] dark:text-[#FBBF24]',
  2: 'bg-[#FEE2E2] dark:bg-[#FEE2E2]/20 text-[#EF4444] dark:text-[#F87171]',
  3: 'bg-[#DCFCE7] dark:bg-[#DCFCE7]/20 text-[#16A34A] dark:text-[#4ADE80]',
  4: 'bg-[#EDE9FE] dark:bg-[#EDE9FE]/20 text-[#7C3AED] dark:text-[#A78BFA]',
  5: 'bg-[#E0F2FE] dark:bg-[#E0F2FE]/20 text-[#0284C7] dark:text-[#38BDF8]',
  6: 'bg-[#CFFAFE] dark:bg-[#CFFAFE]/20 text-[#0891B2] dark:text-[#22D3EE]',
};

// 全服 Top 10 竞技风云榜组件 (极简现代排版，零 AI 模板感)
export default function Leaderboard({
  items,
  currentUser,
  isLoading = false,
  recentScores = [],
  localHistory = [],
  onRefresh,
  onWatchReplay,
  onViewHistoryArt,
}: Props) {
  const [tab, setTab] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');

  // 计算当前登录玩家排名与战胜全服玩家百分比
  let beatPercent = 0;
  let myRank = 0;
  if (currentUser && currentUser.highScore > 0 && items.length > 0) {
    const idx = items.findIndex((it) => it.username === currentUser.username);
    myRank = idx >= 0 ? idx + 1 : 0;
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

  const getBadgeStyle = (rank: number) =>
    BADGE_STYLES[rank] || 'bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400';

  return (
    <div className="bg-white dark:bg-[#0F172A] p-5 rounded-3xl flex flex-col select-none border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      {/* 榜单标题与分类切换胶囊 */}
      <div className="flex justify-between items-center pb-2.5">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 text-xs font-bold font-mono">
          <button
            onClick={() => setTab('GLOBAL')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              tab === 'GLOBAL'
                ? 'bg-white dark:bg-slate-700 text-[#0099FF] shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            风云榜
          </button>
          <button
            onClick={() => setTab('LOCAL')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              tab === 'LOCAL'
                ? 'bg-white dark:bg-slate-700 text-[#0099FF] shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            个人档案
          </button>
        </div>
        {tab === 'GLOBAL' ? (
          <button
            onClick={onRefresh}
            className="text-[11px] text-[#94A3B8] hover:text-[#0099FF] dark:text-slate-400 dark:hover:text-[#0099FF] transition-colors cursor-pointer font-medium"
          >
            刷新
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">近 10 局</span>
        )}
      </div>

      {/* 主数据区：全服风云榜 VS 本地个人档案 */}
      <div className="space-y-1 my-1">
        {tab === 'GLOBAL' ? (
          isLoading ? (
            <div className="space-y-1.5 py-1">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="h-8.5 rounded-xl bg-slate-100/75 dark:bg-slate-800/50 animate-pulse flex items-center px-3 justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-200/80 dark:bg-slate-700/60" />
                    <div className="w-16 h-3 rounded bg-slate-200/80 dark:bg-slate-700/60" />
                  </div>
                  <div className="w-12 h-3 rounded bg-slate-200/80 dark:bg-slate-700/60" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-normal">
              暂无上榜记录
            </div>
          ) : (
            items.slice(0, 10).map((u, i) => {
              const rank = i + 1;
              const isMe = currentUser?.username === u.username;
              const hasReplay = !!(u.replayInputs && u.replaySeed);

              return (
                <div
                  key={u.username}
                  className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                    isMe
                      ? 'bg-[#EBF8FF] dark:bg-[#0099FF]/10 text-[#0099FF] font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
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
                      <span className="text-[10px] text-[#0099FF] font-semibold bg-white/80 dark:bg-slate-800 px-1 rounded-sm shrink-0 border border-[#0099FF]/20">
                        我
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* 一键观摩高手通关走位 */}
                    {hasReplay && onWatchReplay && (
                      <button
                        onClick={() => onWatchReplay(u)}
                        title={`观摩 ${u.username} 的通关走位`}
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EBF8FF] dark:bg-[#0099FF]/15 text-[#0099FF] hover:bg-[#0099FF] hover:text-white transition-all cursor-pointer shadow-2xs"
                      >
                        回放
                      </button>
                    )}
                    {/* 得分与最佳耗时结构化呈现 */}
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-xs font-bold text-[#0F172A] dark:text-white tabular-nums leading-tight">
                        {u.highScore}
                      </span>
                      <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-mono tabular-nums leading-tight">
                        {formatDuration(u.bestDuration)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* 本地个人档案流水列表 (最近 10 局对局档案，支持调起海报复盘) */
          localHistory.length === 0 ? (
            <div className="text-center py-7 text-xs text-slate-400 dark:text-slate-500 font-medium">
              尚无本地对局记录，完成一局后自动归档
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5">
              {localHistory.map((rec, i) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/40 hover:bg-[#F1F5F9] dark:hover:bg-slate-800/70 border border-slate-100 dark:border-slate-800/60 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-slate-400 dark:text-slate-500 text-[11px] w-5 shrink-0">
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-100 tabular-nums">
                          {rec.score}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {rec.duration}s · {rec.length}节
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                        {rec.deathReason ? `[${rec.deathReason}]` : '[常规完赛]'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewHistoryArt?.(rec)}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-[#EBF8FF] dark:hover:bg-[#0099FF]/20 text-[#0099FF] rounded-lg border border-slate-200/80 dark:border-slate-700 text-[10.5px] font-bold font-mono transition-all shrink-0 cursor-pointer shadow-2xs"
                    title="回看此局走位艺术卡片"
                  >
                    走位海报
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 底部当前玩家排位评语与个人最佳名次展示 */}
      {currentUser && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#94A3B8] dark:text-slate-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>我的最佳:</span>
            <strong className="font-mono font-bold text-[#0F172A] dark:text-white tabular-nums">
              {currentUser.highScore} 分
            </strong>
            {currentUser.bestDuration > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                ({formatDuration(currentUser.bestDuration)})
              </span>
            )}
            {myRank > 0 ? (
              <span className="text-[10.5px] text-[#0099FF] font-medium">(第 {myRank} 名)</span>
            ) : currentUser.highScore > 0 ? (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">(未进前10)</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            {recentScores && recentScores.length >= 2 && (
              <div className="hidden sm:flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                <span>近态</span>
                <ScoreSparkline scores={recentScores} />
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>超越</span>
              <span className="font-mono font-bold text-[#0099FF] tabular-nums">{beatPercent}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
