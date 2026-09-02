import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { User } from '@/types';
import { LogOut, Volume2, VolumeX, Trophy, HelpCircle, Award, Music, Sparkles } from 'lucide-react';
import { sound } from '@/utils/audio';

interface Props {
  user: User;
  onLogout: () => void;
  onOpenTutorial: () => void;
  onOpenAchievements?: () => void;
}

// 页面顶部导航栏：承载品牌标识、当前玩家身份高分徽标、规则指南、分轨音量调节微浮层与注销退出
export default function Header({ user, onLogout, onOpenTutorial, onOpenAchievements }: Props) {
  const [isMuted, setIsMuted] = useState(sound.muted);
  const [bgmVol, setBgmVol] = useState(Math.round(sound.bgmVolume * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(sound.sfxVolume * 100));
  const [showAudioPopover, setShowAudioPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 点击浮层外部自动收起
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAudioPopover(false);
      }
    };
    if (showAudioPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAudioPopover]);

  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setBgmVol(val);
    sound.setBgmVolume(val / 100);
    if (isMuted && val > 0) {
      setIsMuted(sound.toggleMute());
    }
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSfxVol(val);
    sound.setSfxVolume(val / 100);
    if (isMuted && val > 0) {
      setIsMuted(sound.toggleMute());
    }
    // 试听音效反馈
    sound.playEat();
  };

  return (
    <header className="w-full bg-white rounded-2xl px-3.5 sm:px-4 py-2.5 flex items-center justify-between text-xs select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative z-30">
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

      {/* 右侧：成就殿堂、指南弹窗、分轨音频设置与退出按钮 */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1 relative">
        {onOpenAchievements && (
          <button
            onClick={onOpenAchievements}
            title="成就殿堂"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF] transition-all cursor-pointer"
          >
            <Award size={16} />
          </button>
        )}

        <button
          onClick={onOpenTutorial}
          title="游戏规则与新手指南"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#8B5CF6] hover:bg-[#EDE9FE] transition-all cursor-pointer"
        >
          <HelpCircle size={15} />
        </button>

        {/* 音频设置微浮层触发器 */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setShowAudioPopover(!showAudioPopover)}
            title={isMuted ? '音频已静音 (点击展开分轨调节)' : '音频设置 (点击展开分轨调节)'}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative z-50 ${
              showAudioPopover
                ? 'bg-[#0099FF] text-white shadow-sm'
                : isMuted
                ? 'text-[#94A3B8] hover:text-[#0099FF] hover:bg-[#EBF8FF]'
                : 'text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF]'
            }`}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* 全屏无感透明遮罩 (移动端与PC端点击任意空白处无感秒关) */}
          {showAudioPopover && (
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowAudioPopover(false)}
            />
          )}

          {/* 南大家园极简风音频分轨调节浮层卡片 */}
          {showAudioPopover && (
            <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-[#0F172A] text-xs">音频分轨设置</span>
                <button
                  onClick={handleToggleMute}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                    isMuted
                      ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                      : 'bg-[#EBF8FF] text-[#0099FF] hover:bg-sky-100'
                  }`}
                >
                  {isMuted ? '已静音' : '正常'}
                </button>
              </div>

              {/* BGM 音乐音量 */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#475569] mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Music size={12} className="text-[#0099FF]" /> 背景音乐
                  </span>
                  <span className="font-mono text-slate-400">{isMuted ? '0%' : `${bgmVol}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : bgmVol}
                  onChange={handleBgmChange}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0099FF]"
                />
              </div>

              {/* SFX 游戏音效 */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#475569] mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Sparkles size={12} className="text-[#8B5CF6]" /> 游戏音效
                  </span>
                  <span className="font-mono text-slate-400">{isMuted ? '0%' : `${sfxVol}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : sfxVol}
                  onChange={handleSfxChange}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                />
              </div>
            </div>
          )}
        </div>

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
