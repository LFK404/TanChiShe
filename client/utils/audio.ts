// Web Audio API 原生 8-bit 复古音效与背景音乐管理器
class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private isBgmPlaying = false;
  public muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('tanchishe_muted') === 'true';
      this.initBgm();
      // 页面切到后台自动暂停 BGM，切回前台自动恢复
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.bgmAudio && !this.bgmAudio.paused) this.bgmAudio.pause();
        } else if (this.isBgmPlaying && !this.muted && this.bgmAudio) {
          this.bgmAudio.play().catch(() => {});
        }
      });
    }
  }

  // 初始化 BGM 实例
  private initBgm() {
    if (typeof window === 'undefined' || this.bgmAudio) return;
    try {
      this.bgmAudio = new Audio('/audio/bgm.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.28;
      this.bgmAudio.preload = 'auto';
    } catch {}
  }

  // 用户手势交互时跨端解锁音频上下文 (解决 iOS/Chrome 自动播放策略限制)
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.initBgm();
  }

  // 切换全局静音
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') localStorage.setItem('tanchishe_muted', String(this.muted));
    if (this.bgmAudio) {
      if (this.muted) this.bgmAudio.pause();
      else if (this.isBgmPlaying) this.bgmAudio.play().catch(() => {});
    }
    return this.muted;
  }

  // 开始播放 BGM
  startBgm() {
    this.isBgmPlaying = true;
    if (this.muted) return;
    this.initBgm();
    if (this.bgmAudio) {
      this.bgmAudio.currentTime = 0;
      this.bgmAudio.volume = 0.28;
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

  // 底层通用音效合成器 (支持多音阶序列、谐波穿透与线性衰减)
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
        gain.gain.linearRampToValueAtTime(0.01, start + noteDur);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + noteDur);
      });
    } catch {}
  }

  // 吃普通红苹果音效 (E5 -> B5 清脆快速上扬双音阶)
  playEat() { this.playNotes('triangle', [659.25, 987.77], 0.08, 0.035, 0.28); }

  // 吃金色幸运果音效 (C5 -> E5 -> G5 -> C6 闪耀四段晶体琶音)
  playBonus() { this.playNotes('triangle', [523.25, 659.25, 783.99, 1046.5], 0.1, 0.05, 0.30); }

  // 方向键/按键转向点击反馈音 (清脆 8-bit 方波点击音，A5 -> D6 穿透力强)
  playMove() { this.playNotes('square', [880, 1174.66], 0.045, 0.02, 0.22); }

  // 游戏开始音效 (G4 -> C5 -> E5 明亮三和弦)
  playStart() { this.playNotes('triangle', [392.00, 523.25, 659.25], 0.09, 0.06, 0.25); }

  // 游戏结束音效 (G4 -> E4 -> C4 -> G3 街机复古降调四和弦)
  playGameOver() { this.playNotes('sawtooth', [392.00, 329.63, 261.63, 196.00], 0.12, 0.07, 0.28); }

  // 暂停/继续交互气泡音 (A4 -> E5 双音)
  playToggle() { this.playNotes('triangle', [440, 659.25], 0.05, 0.03, 0.20); }
}

export const sound = new SoundManager();

