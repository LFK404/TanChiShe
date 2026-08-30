import React, { useState } from 'react';
import { User } from '@/types';
import { LogOut, Volume2, VolumeX, Trophy, Gamepad2, HelpCircle } from 'lucide-react';
import { sound } from '@/utils/audio';

interface Props {
  user: User;
  onLogout: () => void;
  onOpenTutorial: () => void;
}

export default function Header({ user, onLogout, onOpenTutorial }: Props) {
  const [isMuted, setIsMuted] = useState(sound.muted);

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  return (
    <header className="w-full bg-transparent py-1.5 px-1 flex items-center justify-between text-xs select-none">
      {/* 左侧品牌与身份 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-2.5 py-1 rounded-full">
          <div className="w-6 h-6 rounded-full bg-[#EBF8FF] border border-[#66CCFF]/40 flex items-center justify-center text-[#0099FF]">
            <Gamepad2 size={13} />
          </div>
          <span className="font-black text-[#0F172A] text-xs tracking-tight">贪吃蛇</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#EBF8FF] border border-[#66CCFF]/30 text-[#0099FF]">
            经典版
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-slate-500 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1 rounded-full">
          <span>玩家: <strong className="text-[#0F172A]">{user.username}</strong></span>
          {user.highScore > 0 && (
            <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold bg-[#FEF3C7] border border-[#F59E0B]/20 px-2 py-0.5 rounded-full text-[11px]">
              <Trophy size={11} /> {user.highScore}分
            </span>
          )}
        </div>
      </div>

      {/* 右侧教程、音效与退出 */}
      <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-2 py-1 rounded-full">
        {/* 游戏指南教程按钮 (罗兰紫悬浮反馈) */}
        <button
          onClick={onOpenTutorial}
          title="游戏规则与新手指南"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#8B5CF6] hover:bg-[#EDE9FE] transition-all cursor-pointer"
        >
          <HelpCircle size={15} />
        </button>

        {/* 8-bit 音效开关 (天青蓝悬浮反馈) */}
        <button
          onClick={toggleSound}
          title={isMuted ? '开启 8-bit 音效' : '静音'}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF] transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        {/* 退出登录 */}
        <button
          onClick={onLogout}
          className="px-2 py-0.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-full flex items-center gap-1 transition-all cursor-pointer text-xs"
        >
          <LogOut size={12} /> 退出
        </button>
      </div>
    </header>
  );
}
