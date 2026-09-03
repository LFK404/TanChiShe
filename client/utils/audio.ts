// Web Audio API 原生 8-bit 复古音效与双轨沉浸式音乐系统 (大厅温馨 BGM + 局内元气 BGM + 专属高光 Jingle)
import { haptics } from './haptics';

type BgmMode = 'MENU' | 'INGAME' | 'NONE';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private menuBgmAudio: HTMLAudioElement | null = null;
  private inGameBgmAudio: HTMLAudioElement | null = null;
  private currentMode: BgmMode = 'NONE';
  private activeJingleAudio: HTMLAudioElement | null = null;
  public muted = false;
  public bgmVolume = 0.8; // 0.0 ~ 1.0
  public sfxVolume = 0.8; // 0.0 ~ 1.0

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('tanchishe_muted') === 'true';
      const savedBgm = localStorage.getItem('tanchishe_bgm_vol');
      if (savedBgm !== null) this.bgmVolume = Math.max(0, Math.min(1, parseFloat(savedBgm) || 0));
      const savedSfx = localStorage.getItem('tanchishe_sfx_vol');
      if (savedSfx !== null) this.sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSfx) || 0));

      this.initAudios();

      // 页面切到后台自动暂停音频与心跳脉冲，切回前台自动恢复当前模式 BGM
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopHeartbeat();
          if (this.menuBgmAudio && !this.menuBgmAudio.paused) this.menuBgmAudio.pause();
          if (this.inGameBgmAudio && !this.inGameBgmAudio.paused) this.inGameBgmAudio.pause();
          if (this.activeJingleAudio && !this.activeJingleAudio.paused) this.activeJingleAudio.pause();
        } else if (!this.muted) {
          if (this.currentMode === 'MENU') {
            this.menuBgmAudio?.play().catch(() => {});
          } else if (this.currentMode === 'INGAME') {
            this.inGameBgmAudio?.play().catch(() => {});
          }
        }
      });
    }
  }

  // 初始化双轨 BGM 音频实例
  private initAudios() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.menuBgmAudio) {
        this.menuBgmAudio = new Audio('/audio/menu_bgm.mp3');
        this.menuBgmAudio.loop = true;
        this.menuBgmAudio.volume = 0.24 * this.bgmVolume;
        this.menuBgmAudio.preload = 'auto';
      }
      if (!this.inGameBgmAudio) {
        this.inGameBgmAudio = new Audio('/audio/bgm.mp3');
        this.inGameBgmAudio.loop = true;
        this.inGameBgmAudio.volume = 0.28 * this.bgmVolume;
        this.inGameBgmAudio.preload = 'auto';
      }
    } catch {}
  }

  // 用户首次交互时跨端解锁音频上下文 (解决 iOS / Chrome 自动播放限制)
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // 创建温润低通滤波总线 (削去 2600Hz 以上刺耳方波毛刺，赋予木质与水滴温润听感)
        try {
          this.masterFilter = this.ctx.createBiquadFilter();
          this.masterFilter.type = 'lowpass';
          this.masterFilter.frequency.value = 2600;
          this.masterFilter.Q.value = 1.0;
          this.masterFilter.connect(this.ctx.destination);
        } catch {}
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.initAudios();
  }

  // 独立调节 BGM 音乐音量 (0.0 ~ 1.0)
  setBgmVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.bgmVolume = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanchishe_bgm_vol', String(clamped));
    }
    if (this.menuBgmAudio) {
      this.menuBgmAudio.volume = 0.24 * clamped;
    }
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.volume = 0.28 * clamped;
    }
  }

  // 独立调节 SFX 音效音量 (0.0 ~ 1.0)
  setSfxVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.sfxVolume = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanchishe_sfx_vol', String(clamped));
    }
  }

  // 切换全局静音
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanchishe_muted', String(this.muted));
    }
    if (this.muted) {
      if (this.menuBgmAudio) this.menuBgmAudio.pause();
      if (this.inGameBgmAudio) this.inGameBgmAudio.pause();
      if (this.activeJingleAudio) this.activeJingleAudio.pause();
    } else {
      if (this.currentMode === 'MENU') {
        this.menuBgmAudio?.play().catch(() => {});
      } else if (this.currentMode === 'INGAME') {
        this.inGameBgmAudio?.play().catch(() => {});
      }
    }
    return this.muted;
  }

  private heartbeatTimer: NodeJS.Timeout | null = null;

  // 根据当前移速动态加速 BGM 并联动低频心跳脉冲
  updateGameSpeed(speedMs: number) {
    if (!this.inGameBgmAudio) return;
    if (speedMs > 108) {
      this.inGameBgmAudio.playbackRate = 1.0;
      this.stopHeartbeat();
    } else if (speedMs > 82) {
      // 1.3x ~ 1.6x 紧凑节奏微加速
      this.inGameBgmAudio.playbackRate = 1.06;
      this.stopHeartbeat();
    } else {
      // <= 82ms (1.7x+) 破风狂飙并激活 55Hz 心跳脉冲
      this.inGameBgmAudio.playbackRate = 1.12;
      this.startHeartbeat();
    }
  }

  // 启动深沉 55Hz 低频心跳脉冲 (模拟收缩-舒张 ba-dum 律动)
  private startHeartbeat() {
    if (this.heartbeatTimer || this.muted || this.sfxVolume <= 0) return;
    const playBeat = () => {
      if (this.currentMode !== 'INGAME' || this.muted || this.sfxVolume <= 0) {
        this.stopHeartbeat();
        return;
      }
      // 收缩音 (55Hz) + 生理级微触感
      this.playNotes('sine', [55], 0.08, 0, 0.12);
      haptics.trigger('heartbeat');
      // 舒张音 (45Hz, 延后 120ms)
      setTimeout(() => {
        if (this.currentMode === 'INGAME' && !this.muted) {
          this.playNotes('sine', [45], 0.09, 0, 0.09);
        }
      }, 120);
    };
    playBeat();
    this.heartbeatTimer = setInterval(playBeat, 750);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 播放大厅/登录待机温馨吉他田园 BGM
  startMenuBgm() {
    this.currentMode = 'MENU';
    this.stopHeartbeat();
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.playbackRate = 1.0;
    }
    if (this.muted) return;
    this.initAudios();
    if (this.inGameBgmAudio && !this.inGameBgmAudio.paused) {
      this.inGameBgmAudio.pause();
      this.inGameBgmAudio.currentTime = 0;
    }
    if (this.menuBgmAudio) {
      this.menuBgmAudio.volume = 0.24 * this.bgmVolume;
      this.menuBgmAudio.play().catch(() => {});
    }
  }

  // 播放局内对局元气 Future Chiptune BGM
  startInGameBgm() {
    this.currentMode = 'INGAME';
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.playbackRate = 1.0;
    }
    if (this.muted) return;
    this.initAudios();
    if (this.menuBgmAudio && !this.menuBgmAudio.paused) {
      this.menuBgmAudio.pause();
    }
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.currentTime = 0;
      this.inGameBgmAudio.volume = 0.28 * this.bgmVolume;
      this.inGameBgmAudio.play().catch(() => {});
    }
  }

  // 兼容别名
  startBgm() {
    this.startInGameBgm();
  }

  pauseBgm() {
    this.stopHeartbeat();
    // 沉水透传声学微雕：暂停时将滤波截止频率瞬间压低至 360Hz (如隔磨砂玻璃在室外低吟)
    if (this.ctx && this.masterFilter) {
      try {
        this.masterFilter.frequency.setTargetAtTime(360, this.ctx.currentTime, 0.08);
      } catch {}
    }
    if (this.inGameBgmAudio && !this.inGameBgmAudio.paused) {
      this.inGameBgmAudio.volume = 0.08 * this.bgmVolume;
    }
    if (this.menuBgmAudio && !this.menuBgmAudio.paused) this.menuBgmAudio.pause();
  }

  resumeBgm() {
    if (this.muted) return;
    // 恢复游戏：低通滤波平滑浮回 2600Hz 清澈暖调
    if (this.ctx && this.masterFilter) {
      try {
        this.masterFilter.frequency.setTargetAtTime(2600, this.ctx.currentTime, 0.1);
      } catch {}
    }
    if (this.currentMode === 'INGAME' && this.inGameBgmAudio) {
      this.inGameBgmAudio.volume = 0.28 * this.bgmVolume;
      if (this.inGameBgmAudio.paused) this.inGameBgmAudio.play().catch(() => {});
    } else if (this.currentMode === 'MENU' && this.menuBgmAudio) {
      this.menuBgmAudio.play().catch(() => {});
    }
  }

  stopBgm() {
    this.currentMode = 'NONE';
    this.stopHeartbeat();
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.playbackRate = 1.0;
      this.inGameBgmAudio.pause();
      this.inGameBgmAudio.currentTime = 0;
    }
    if (this.menuBgmAudio) {
      this.menuBgmAudio.pause();
      this.menuBgmAudio.currentTime = 0;
    }
  }

  // 磁带停机下行滑音停机 (Tape-Stop Pitch Drop 220ms，赋予落幕电影级仪式感)
  stopBgmWithTapeDrop(onComplete?: () => void) {
    this.currentMode = 'NONE';
    this.stopHeartbeat();
    const bgm = this.inGameBgmAudio;

    // 同时用 Web Audio 合成器产生 220ms 温暖下行微滑音 (360Hz -> 55Hz)
    if (this.ctx && !this.muted) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
        gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        if (this.masterFilter) {
          gain.connect(this.masterFilter);
        } else {
          gain.connect(this.ctx.destination);
        }
        osc.start(now);
        osc.stop(now + 0.23);
      } catch {}
    }

    if (bgm && !bgm.paused) {
      const startRate = bgm.playbackRate || 1.0;
      const startTime = performance.now();
      const dropDuration = 220;
      const step = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / dropDuration);
        try {
          bgm.playbackRate = Math.max(0.08, startRate * (1 - progress * 0.9));
          bgm.volume = Math.max(0, 0.28 * (1 - progress) * this.bgmVolume);
        } catch {}
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          bgm.pause();
          bgm.currentTime = 0;
          bgm.playbackRate = 1.0;
          onComplete?.();
        }
      };
      requestAnimationFrame(step);
    } else {
      this.stopBgm();
      onComplete?.();
    }
  }

  // 精准高光短音频播放器 (支持指定最大时长、平滑淡出与智能 BGM 避让 Ducking)
  private playJingleFile(url: string, durationSec: number, volume = 0.35) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      if (this.activeJingleAudio) {
        this.activeJingleAudio.pause();
        this.activeJingleAudio = null;
      }

      // 智能音频避让 (Audio Ducking)：将当前正在播放的 BGM 音量临时压低，让高光 Jingle 更加清晰突出
      const curBgm = this.currentMode === 'INGAME' ? this.inGameBgmAudio : this.menuBgmAudio;
      const originalBgmVol = this.currentMode === 'INGAME' ? 0.28 : 0.24;
      if (curBgm && !curBgm.paused) {
        curBgm.volume = 0.06;
      }

      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume * this.sfxVolume));
      this.activeJingleAudio = audio;
      audio.play().catch(() => {});

      const restoreBgm = () => {
        if (curBgm && !curBgm.paused) {
          curBgm.volume = originalBgmVol;
        }
      };

      // 到达截止时间前 0.4s 开始音量渐弱淡出
      const fadeTimer = setTimeout(() => {
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.08);
          } else {
            clearInterval(fadeInterval);
            audio.pause();
            restoreBgm();
          }
        }, 50);
      }, Math.max(100, (durationSec - 0.4) * 1000));

      audio.onended = () => {
        clearTimeout(fadeTimer);
        restoreBgm();
      };
    } catch {}
  }

  // 1. 破纪录 / 杀入全服前三专属凯旋乐 (Gold_Coin_Anthem 前 8.5 秒黄金段)
  playVictory() {
    this.playJingleFile('/audio/victory.mp3', 8.5, 0.38);
  }

  // 2. 点亮钻石巅峰成就专属大和弦 (Victory_Loop 前 6 秒)
  playGrandAchievement() {
    this.playJingleFile('/audio/achievement_grand.mp3', 6.0, 0.35);
  }

  // 3. 电竞对局录像观摩片头音 (Gold_Coin_Parade 前 4.5 秒)
  playReplayIntro() {
    this.playJingleFile('/audio/replay_intro.mp3', 4.5, 0.35);
  }

  // 4. 开局倒计时 Ready Go! (Golden_Token_Finish 前 3 秒)
  playReadyGo() {
    this.playJingleFile('/audio/ready_go.mp3', 3.0, 0.36);
  }

  // 底层 Web Audio API 原生声卡实时合成器 (0ms 零延迟、不卡顿、动态升调)
  private playNotes(type: OscillatorType, freqs: number[], noteDur: number, gap: number, vol: number) {
    if (this.muted) return;
    const effectiveVol = vol * this.sfxVolume;
    if (effectiveVol <= 0.001) return;
    this.unlockAudio();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    try {
      const now = this.ctx.currentTime;
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = now + idx * gap;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(effectiveVol, start);
        gain.gain.linearRampToValueAtTime(0.001, start + noteDur);
        osc.connect(gain);
        gain.connect(this.masterFilter || this.ctx!.destination);
        osc.start(start);
        osc.stop(start + noteDur);
      });
    } catch {}
  }

  // 吃普通红苹果音效 (E5 -> B5 清脆快速上扬双音阶)
  playEat() {
    this.playNotes('triangle', [659.25, 987.77], 0.08, 0.035, 0.28);
  }

  // 吃金色幸运果音效 (C5 -> E5 -> G5 -> C6 闪耀四段晶体琶音)
  playBonus() {
    this.playNotes('triangle', [523.25, 659.25, 783.99, 1046.5], 0.1, 0.05, 0.3);
  }

  // 转向与十字键按键反馈音 (8-bit 方波点击音，A5 -> D6)
  playMove() {
    this.playNotes('square', [880, 1174.66], 0.045, 0.02, 0.22);
  }

  // 游戏开始音效
  playStart() {
    this.playNotes('triangle', [392.0, 523.25, 659.25], 0.09, 0.06, 0.25);
  }

  // 游戏结束音效 (G4 -> E4 -> C4 -> G3 街机降调四和弦)
  playGameOver() {
    this.playNotes('sawtooth', [392.0, 329.63, 261.63, 196.0], 0.12, 0.07, 0.28);
  }

  // 暂停/继续交互音
  playToggle() {
    this.playNotes('triangle', [440, 659.25], 0.05, 0.03, 0.2);
  }

  // 连击动态五声音阶和弦攀升 (Pentatonic Chime Climb: 宫-商-角-徵-羽，清脆悦耳的风铃听感)
  playCombo(count: number) {
    const pentatonicScales = [
      [523.25, 587.33], // Combo 1: C5 -> D5 (宫 -> 商，初吻水滴)
      [587.33, 659.25], // Combo 2: D5 -> E5 (商 -> 角，清澈和鸣)
      [659.25, 783.99], // Combo 3: E5 -> G5 (角 -> 徵，欢畅扬起)
      [783.99, 880.00], // Combo 4: G5 -> A5 (徵 -> 羽，华彩奔涌)
      [783.99, 880.00, 1046.5], // Combo 5+: 羽 -> 高音宫，通透水晶琶音
    ];
    const idx = Math.min(Math.max(count - 1, 0), pentatonicScales.length - 1);
    this.playNotes('sine', pentatonicScales[idx], 0.085, 0.036, 0.3);
  }

  // 普通成就达成庆祝音阶
  playAchievement() {
    this.playNotes('triangle', [523.25, 659.25, 783.99, 1046.5], 0.12, 0.06, 0.32);
  }

  // 暂停恢复倒计时滴答声
  playCountdownTick() {
    this.playNotes('square', [880, 1174.66], 0.04, 0.02, 0.18);
  }

  // 暂停恢复倒计时归零发车音
  playResumeGo() {
    this.playNotes('triangle', [587.33, 880, 1174.66], 0.08, 0.03, 0.26);
  }
}

export const sound = new SoundManager();
