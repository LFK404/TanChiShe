import React, { useState } from 'react';
import { User } from '@/types';
import { LogOut, Volume2, VolumeX, Trophy, Gamepad2 } from 'lucide-react';
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
    <header className="w-full bg-white border border-[#E2E8F0] rounded-2xl px-4 sm:px-5 py-3 flex items-center justify-between shadow-sm text-xs select-none">
      {/* 左侧品牌与身份 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#EBF8FF] flex items-center justify-center text-[#0099FF] shadow-xs">
            <Gamepad2 size={15} />
          </div>
          <span className="font-extrabold text-[#0F172A] text-sm tracking-tight">贪吃蛇</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF8FF] text-[#0099FF]">
            南大家园
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#E2E8F0] text-slate-500">
          <span>玩家: <strong className="text-[#0F172A]">{user.username}</strong></span>
          {user.highScore > 0 && (
            <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold bg-[#FEF3C7] px-2 py-0.5 rounded-full text-[11px]">
              <Trophy size={11} /> {user.highScore}分
            </span>
          )}
        </div>
      </div>

      {/* 右侧音效与退出 */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSound}
          title={isMuted ? '开启 8-bit 音效' : '静音'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF] transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          onClick={onLogout}
          className="px-2.5 py-1 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-all cursor-pointer text-xs"
        >
          <LogOut size={13} /> 退出
        </button>
      </div>
    </header>
  );
}
