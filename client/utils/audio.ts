class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private isBgmPlaying: boolean = false;
  public muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('tanchishe_muted') === 'true';
      this.initBgm();
      // 页面切到后台自动静音 BGM，切回时恢复
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.bgmAudio && !this.bgmAudio.paused) {
            this.bgmAudio.pause();
          }
        } else {
          if (this.isBgmPlaying && !this.muted && this.bgmAudio) {
            this.bgmAudio.play().catch(() => {});
          }
        }
      });
    }
  }

  private initBgm() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio('/audio/bgm.mp3');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.32;
        this.bgmAudio.preload = 'auto';
      }
    } catch {}
  }

  // 跨端浏览器安全音频解锁 (在任何用户点击/触控事件发生时调用)
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.bgmAudio) {
      this.initBgm();
    }
  }

  private initCtx() {
    this.unlockAudio();
  }

  // 切换全局静音
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanchishe_muted', String(this.muted));
    }
    if (this.muted) {
      if (this.bgmAudio) this.bgmAudio.pause();
    } else {
      if (this.isBgmPlaying && this.bgmAudio) {
        this.bgmAudio.play().catch(() => {});
      }
    }
    return this.muted;
  }

  // 开始播放游戏 BGM
  startBgm() {
    this.isBgmPlaying = true;
    if (this.muted) return;
    this.initBgm();
    if (this.bgmAudio) {
      this.bgmAudio.currentTime = 0;
      this.bgmAudio.volume = 0.32;
      this.bgmAudio.play().catch(() => {});
    }
  }

  // 暂停 BGM (游戏暂停时)
  pauseBgm() {
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
  }

  // 恢复 BGM (游戏继续时)
  resumeBgm() {
    if (this.isBgmPlaying && !this.muted && this.bgmAudio) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  // 停止 BGM (游戏结束结算时)
  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  // 吃普通红苹果音效 (清脆双音跳跃)
  playEat() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.07); // B5
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // 吃金色幸运果音效 (4段晶体琶音)
  playBonus() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = now + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {}
  }

  // 游戏开始音效 (上扬三和弦)
  playStart() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [392.00, 523.25, 659.25]; // G4 -> C5 -> E5
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = now + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.1);
      });
    } catch {}
  }

  // 游戏结束音效 (复古降调 8-bit)
  playGameOver() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(261.63, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.32);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  // 按键交互气泡音效
  playToggle() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }
}

export const sound = new SoundManager();

