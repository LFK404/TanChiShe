class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private isBgmPlaying = false;
  public muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('tanchishe_muted') === 'true';
      this.initBgm();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.bgmAudio && !this.bgmAudio.paused) this.bgmAudio.pause();
        } else if (this.isBgmPlaying && !this.muted && this.bgmAudio) {
          this.bgmAudio.play().catch(() => {});
        }
      });
    }
  }

  private initBgm() {
    if (typeof window === 'undefined' || this.bgmAudio) return;
    try {
      this.bgmAudio = new Audio('/audio/bgm.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.32;
      this.bgmAudio.preload = 'auto';
    } catch {}
  }

  public unlockAudio() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.initBgm();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') localStorage.setItem('tanchishe_muted', String(this.muted));
    if (this.bgmAudio) {
      if (this.muted) this.bgmAudio.pause();
      else if (this.isBgmPlaying) this.bgmAudio.play().catch(() => {});
    }
    return this.muted;
  }

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

  pauseBgm() {
    if (this.bgmAudio && !this.bgmAudio.paused) this.bgmAudio.pause();
  }

  resumeBgm() {
    if (this.isBgmPlaying && !this.muted && this.bgmAudio) this.bgmAudio.play().catch(() => {});
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  // 底层通用单音合成器 (支持频率平滑过渡与指数衰减)
  private playTone(type: OscillatorType, startFreq: number, endFreq: number, dur: number, vol: number) {
    if (this.muted) return;
    this.unlockAudio();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      if (endFreq !== startFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch {}
  }

  // 底层通用琶音/和弦合成器
  private playNotes(type: OscillatorType, freqs: number[], noteDur: number, gap: number, vol: number) {
    if (this.muted) return;
    this.unlockAudio();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = now + idx * gap;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + noteDur);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + noteDur);
      });
    } catch {}
  }

  playEat() { this.playTone('sine', 659.25, 987.77, 0.07, 0.16); }
  playBonus() { this.playNotes('triangle', [523.25, 659.25, 783.99, 1046.5], 0.12, 0.05, 0.18); }
  playStart() { this.playNotes('sine', [392.00, 523.25, 659.25], 0.1, 0.06, 0.14); }
  playGameOver() { this.playTone('sawtooth', 261.63, 45, 0.32, 0.2); }
  playToggle() { this.playTone('sine', 440, 440, 0.04, 0.1); }
}

export const sound = new SoundManager();

