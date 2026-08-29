import React from 'react';
import { UserProfile } from '@/types';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <span className="font-bold text-slate-900 text-base">贪吃蛇</span>
        <span className="text-xs text-slate-500">
          玩家: <strong className="text-slate-800">{user.username}</strong>
        </span>
        <span className="text-xs text-amber-600 font-medium">
          最高分: {user.highScore} ({user.bestDuration}s)
        </span>
      </div>

      <button
        onClick={onLogout}
        className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
      >
        <LogOut size={13} /> 退出
      </button>
    </header>
  );
}
