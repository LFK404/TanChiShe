import React, { useState } from 'react';
import Image from 'next/image';
import { User } from '@/types';
import { LogOut, Volume2, VolumeX, Trophy, HelpCircle } from 'lucide-react';
import { sound } from '@/utils/audio';

interface Props {
  user: User;
  onLogout: () => void;
  onOpenTutorial: () => void;
}

// 页面顶部导航栏：承载品牌标识、当前玩家身份高分徽标、规则指南、8-bit 音效开关与注销退出
export default function Header({ user, onLogout, onOpenTutorial }: Props) {
  const [isMuted, setIsMuted] = useState(sound.muted);

  const toggleSound = () => {
    setIsMuted(sound.toggleMute());
  };

  return (
    <header className="w-full bg-white rounded-2xl px-3.5 sm:px-4 py-2.5 flex items-center justify-between text-xs select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* 左侧：品牌图标与玩家高分徽标 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Image
            src="/icon.svg"
            alt="贪吃蛇"
            width={22}
            height={22}
            className="w-[22px] h-[22px] rounded-md shrink-0"
            priority
          />
          <span className="font-black text-[#0F172A] text-xs tracking-tight">贪吃蛇</span>
          <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#EBF8FF] text-[#0099FF]">
            经典版
          </span>
        </div>

        {/* 玩家用户名与最高分徽标 */}
        <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-100 text-slate-500 min-w-0">
          <span className="truncate text-[11px] sm:text-xs">
            玩家: <strong className="text-[#0F172A]">{user.username}</strong>
          </span>
          {user.highScore > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[#D97706] font-bold bg-[#FEF3C7] px-1.5 py-0.2 rounded-full text-[10.5px] shrink-0 font-mono">
              <Trophy size={10} /> {user.highScore}分
            </span>
          )}
        </div>
      </div>

      {/* 右侧：指南弹窗、音效切换与退出按钮 */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1">
        <button
          onClick={onOpenTutorial}
          title="游戏规则与新手指南"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#8B5CF6] hover:bg-[#EDE9FE] transition-all cursor-pointer"
        >
          <HelpCircle size={15} />
        </button>

        <button
          onClick={toggleSound}
          title={isMuted ? '开启 8-bit 音效' : '静音'}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF] transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <button
          onClick={onLogout}
          className="px-2 py-0.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-all cursor-pointer text-xs"
        >
          <LogOut size={12} /> 退出
        </button>
      </div>
    </header>
  );
}
