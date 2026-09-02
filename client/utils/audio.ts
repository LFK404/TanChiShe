// Web Audio API 原生 8-bit 复古音效与双轨沉浸式音乐系统 (大厅温馨 BGM + 局内元气 BGM + 专属高光 Jingle)

type BgmMode = 'MENU' | 'INGAME' | 'NONE';

class SoundManager {
  private ctx: AudioContext | null = null;
  private menuBgmAudio: HTMLAudioElement | null = null;
  private inGameBgmAudio: HTMLAudioElement | null = null;
  private currentMode: BgmMode = 'NONE';
  private activeJingleAudio: HTMLAudioElement | null = null;
  public muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('tanchishe_muted') === 'true';
      this.initAudios();

      // 页面切到后台自动暂停音频，切回前台自动恢复当前模式 BGM
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
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
        this.menuBgmAudio.volume = 0.24;
        this.menuBgmAudio.preload = 'auto';
      }
      if (!this.inGameBgmAudio) {
        this.inGameBgmAudio = new Audio('/audio/bgm.mp3');
        this.inGameBgmAudio.loop = true;
        this.inGameBgmAudio.volume = 0.28;
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
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.initAudios();
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

  // 播放大厅/登录待机温馨吉他田园 BGM
  startMenuBgm() {
    this.currentMode = 'MENU';
    if (this.muted) return;
    this.initAudios();
    if (this.inGameBgmAudio && !this.inGameBgmAudio.paused) {
      this.inGameBgmAudio.pause();
      this.inGameBgmAudio.currentTime = 0;
    }
    if (this.menuBgmAudio) {
      this.menuBgmAudio.volume = 0.24;
      this.menuBgmAudio.play().catch(() => {});
    }
  }

  // 播放局内对局元气 Future Chiptune BGM
  startInGameBgm() {
    this.currentMode = 'INGAME';
    if (this.muted) return;
    this.initAudios();
    if (this.menuBgmAudio && !this.menuBgmAudio.paused) {
      this.menuBgmAudio.pause();
    }
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.currentTime = 0;
      this.inGameBgmAudio.volume = 0.28;
      this.inGameBgmAudio.play().catch(() => {});
    }
  }

  // 兼容别名
  startBgm() {
    this.startInGameBgm();
  }

  pauseBgm() {
    if (this.inGameBgmAudio && !this.inGameBgmAudio.paused) this.inGameBgmAudio.pause();
    if (this.menuBgmAudio && !this.menuBgmAudio.paused) this.menuBgmAudio.pause();
  }

  resumeBgm() {
    if (this.muted) return;
    if (this.currentMode === 'INGAME' && this.inGameBgmAudio) {
      this.inGameBgmAudio.play().catch(() => {});
    } else if (this.currentMode === 'MENU' && this.menuBgmAudio) {
      this.menuBgmAudio.play().catch(() => {});
    }
  }

  stopBgm() {
    this.currentMode = 'NONE';
    if (this.inGameBgmAudio) {
      this.inGameBgmAudio.pause();
      this.inGameBgmAudio.currentTime = 0;
    }
    if (this.menuBgmAudio) {
      this.menuBgmAudio.pause();
      this.menuBgmAudio.currentTime = 0;
    }
  }

  // 精准高光短音频播放器 (支持指定最大时长与平滑淡出)
  private playJingleFile(url: string, durationSec: number, volume = 0.35) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      if (this.activeJingleAudio) {
        this.activeJingleAudio.pause();
        this.activeJingleAudio = null;
      }
      const audio = new Audio(url);
      audio.volume = volume;
      this.activeJingleAudio = audio;
      audio.play().catch(() => {});

      // 到达截止时间前 0.4s 开始音量渐弱淡出
      const fadeTimer = setTimeout(() => {
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.08);
          } else {
            clearInterval(fadeInterval);
            audio.pause();
          }
        }, 50);
      }, Math.max(100, (durationSec - 0.4) * 1000));

      audio.onended = () => {
        clearTimeout(fadeTimer);
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
        gain.gain.setValueAtTime(vol, start);
        gain.gain.linearRampToValueAtTime(0.001, start + noteDur);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
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

  // 连击动态升调音阶 (Combo 1x ~ 5x+)
  playCombo(count: number) {
    const scales = [
      [261.63, 329.63], // Combo 1: C4 -> E4
      [329.63, 392.0], // Combo 2: E4 -> G4
      [392.0, 523.25], // Combo 3: G4 -> C5
      [523.25, 659.25], // Combo 4: C5 -> E5
      [659.25, 783.99, 1046.5], // Combo 5+: E5 -> G5 -> C6
    ];
    const idx = Math.min(Math.max(count - 1, 0), scales.length - 1);
    this.playNotes('triangle', scales[idx], 0.08, 0.035, 0.3);
  }

  // 普通成就达成庆祝音阶
  playAchievement() {
    this.playNotes('triangle', [523.25, 659.25, 783.99, 1046.5], 0.12, 0.06, 0.32);
  }

  // 8秒金果最后 3 秒倒计时紧急提示音
  playCountdownTick() {
    this.playNotes('square', [880, 1174.66], 0.04, 0.02, 0.18);
  }
}

export const sound = new SoundManager();
