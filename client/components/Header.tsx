import React, { useState } from 'react';
import { User } from '@/types';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { sound } from '@/utils/audio';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: Props) {
  const [isMuted, setIsMuted] = useState(sound.muted);

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  return (
    <header className="w-full bg-white border border-slate-200 rounded-xl px-4 sm:px-5 py-3 flex items-center justify-between shadow-sm text-xs select-none">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="font-bold text-slate-900 text-sm">贪吃蛇</span>
        <span className="text-slate-500">玩家: <strong className="text-slate-800">{user.username}</strong></span>
        <span className="text-amber-600 font-medium hidden xs:inline">最高: {user.highScore}分 ({user.bestDuration}s)</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSound}
          title={isMuted ? '开启音效' : '静音'}
          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <button onClick={onLogout} className="text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
          <LogOut size={13} /> 退出
        </button>
      </div>
    </header>
  );
}
