import React from 'react';
import { User } from '@/types';
import { LogOut } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: Props) {
  return (
    <header className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between shadow-sm text-xs">
      <div className="flex items-center gap-4">
        <span className="font-bold text-slate-900 text-sm">贪吃蛇</span>
        <span className="text-slate-500">玩家: <strong className="text-slate-800">{user.username}</strong></span>
        <span className="text-amber-600 font-medium">最高: {user.highScore}分 ({user.bestDuration}s)</span>
      </div>
      <button onClick={onLogout} className="text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
        <LogOut size={13} /> 退出
      </button>
    </header>
  );
}
