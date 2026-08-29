import React from 'react';
import { User } from '@/types';
import { Trophy } from 'lucide-react';

interface Props {
  items: User[];
  currentUser?: User | null;
  onRefresh: () => void;
}

export default function Leaderboard({ items, currentUser, onRefresh }: Props) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col select-none">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Trophy size={15} className="text-amber-500" /> 排行榜 Top 10
        </h2>
        <button onClick={onRefresh} className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer">
          刷新
        </button>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">暂无记录</div>
        ) : (
          items.map((item, idx) => {
            const isMe = currentUser && item.username === currentUser.username;
            return (
              <div
                key={item.username}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  isMe
                    ? 'bg-emerald-50 border border-emerald-200 ring-1 ring-emerald-300'
                    : 'bg-slate-50 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-4 font-bold text-center ${
                      idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : idx === 2 ? 'text-amber-700' : 'text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className={`truncate max-w-[80px] ${isMe ? 'font-bold text-emerald-800' : 'font-medium text-slate-800'}`}>
                    {item.username} {isMe && <span className="text-[10px] text-emerald-600 font-normal">(我)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold text-slate-900">{item.highScore}分</span>
                  <span className="text-[10px] text-slate-400">{item.bestDuration}s</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
