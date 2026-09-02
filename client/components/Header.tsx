'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { User } from '@/types';
import { sound } from '@/utils/audio';
import { haptics, HapticMode } from '@/utils/haptics';
import { Trophy, HelpCircle, Volume2, VolumeX, LogOut } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  onOpenTutorial: () => void;
  onOpenAchievements?: () => void;
}

// 页面顶部导航栏：南大家园极简排版与纯净微拟态控制中心
export default function Header({ user, onLogout, onOpenTutorial, onOpenAchievements }: Props) {
  const [isMuted, setIsMuted] = useState(sound.muted);
  const [bgmVol, setBgmVol] = useState(Math.round(sound.bgmVolume * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(sound.sfxVolume * 100));
  const [hapticMode, setHapticMode] = useState<HapticMode>(() => haptics.mode);
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
    haptics.trigger('ui');
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setBgmVol(val);
    sound.setBgmVolume(val / 100);
    if (isMuted && val > 0) {
      setIsMuted(sound.toggleMute());
    }
    if (val === 0 || val === 100) {
      haptics.trigger('ui');
    }
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSfxVol(val);
    sound.setSfxVolume(val / 100);
    if (isMuted && val > 0) {
      setIsMuted(sound.toggleMute());
    }
    if (val === 0 || val === 100) {
      haptics.trigger('ui');
    }
  };

  const handleHapticChange = (mode: HapticMode) => {
    setHapticMode(mode);
    haptics.setMode(mode);
    haptics.trigger('ui');
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 px-3.5 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs sticky top-0 z-40 select-none">
      {/* 左侧：品牌 Logo 与玩家战绩 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Image
            src="/icon.svg"
            alt="贪吃蛇"
            width={24}
            height={24}
            className="w-6 h-6 rounded-lg shrink-0"
            priority
          />
          <span className="font-bold text-[#0F172A] text-xs sm:text-sm tracking-tight">贪吃蛇</span>
        </div>

        {/* 玩家用户名与最高分等宽字符胶囊 */}
        <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-100 text-slate-500 min-w-0">
          <span className="truncate text-[11px] sm:text-xs">
            玩家: <strong className="text-[#0F172A]">{user.username}</strong>
          </span>
          {user.highScore > 0 && (
            <span className="inline-flex items-center text-[#D97706] font-bold bg-[#FEF3C7] px-2 py-0.2 rounded-full text-[10.5px] shrink-0 font-mono tracking-wide shadow-2xs">
              {user.highScore} PTS
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
            <Trophy size={16} strokeWidth={2} />
          </button>
        )}

        <button
          onClick={onOpenTutorial}
          title="游戏规则与新手指南"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF] transition-all cursor-pointer"
        >
          <HelpCircle size={16} strokeWidth={2} />
        </button>

        {/* 音频设置微浮层触发器 */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setShowAudioPopover(!showAudioPopover)}
            title={isMuted ? '音频已静音 (点击展开分轨调节)' : '音频设置 (点击展开分轨调节)'}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative z-50 ${
              showAudioPopover
                ? 'bg-[#0099FF] text-white shadow-xs'
                : isMuted
                ? 'text-[#94A3B8] hover:text-[#0099FF] hover:bg-[#EBF8FF]'
                : 'text-[#64748B] hover:text-[#0099FF] hover:bg-[#EBF8FF]'
            }`}
          >
            {isMuted ? <VolumeX size={16} strokeWidth={2} /> : <Volume2 size={16} strokeWidth={2} />}
          </button>

          {/* 全屏无感透明遮罩 */}
          {showAudioPopover && (
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowAudioPopover(false)}
            />
          )}

          {/* 南大家园极简风音频分轨调节浮层卡片 */}
          {showAudioPopover && (
            <div className="absolute right-0 top-full mt-2 w-56 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-[#0F172A] text-xs">声音与触感</span>
                <button
                  onClick={handleToggleMute}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                      : 'bg-[#EBF8FF] text-[#0099FF] hover:bg-sky-100'
                  }`}
                >
                  {isMuted ? '已静音' : '开启'}
                </button>
              </div>

              {/* BGM 音乐音量 */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#475569] mb-1">
                  <span className="font-medium">背景音乐</span>
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
                  <span className="font-medium">游戏音效</span>
                  <span className="font-mono text-slate-400">{isMuted ? '0%' : `${sfxVol}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : sfxVol}
                  onChange={handleSfxChange}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0099FF]"
                />
              </div>

              {/* 触觉反馈 (Haptics) 三档模式切换 */}
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-[#475569] mb-1.5">
                  <span className="font-medium">振动触感</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {hapticMode === 'STRONG' ? '强力' : hapticMode === 'SOFT' ? '轻柔' : '关闭'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-0.5 rounded-lg text-[10.5px]">
                  <button
                    onClick={() => handleHapticChange('STRONG')}
                    className={`py-1 rounded-md font-medium transition-all cursor-pointer ${
                      hapticMode === 'STRONG'
                        ? 'bg-white text-[#0099FF] shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    强力
                  </button>
                  <button
                    onClick={() => handleHapticChange('SOFT')}
                    className={`py-1 rounded-md font-medium transition-all cursor-pointer ${
                      hapticMode === 'SOFT'
                        ? 'bg-white text-[#10B981] shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    轻柔
                  </button>
                  <button
                    onClick={() => handleHapticChange('OFF')}
                    className={`py-1 rounded-md font-medium transition-all cursor-pointer ${
                      hapticMode === 'OFF'
                        ? 'bg-white text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 规范化矢量退出登录按钮 (与前3个圆形按钮规制完全对称一致) */}
        <button
          onClick={onLogout}
          title="退出登录"
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
