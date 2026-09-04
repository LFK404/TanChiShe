// Web Audio API 原生声学系统与双轨极简无缝音乐引擎 (大厅待机 BGM + 局内竞技 BGM + 纯代码级高光和弦)
import { haptics } from './haptics';

type BgmMode = 'MENU' | 'INGAME' | 'NONE';

// 严格对应 client/public/audio 下由 Gemini 生成的两首现代极简纯音乐
const MENU_BGM_URL = '/audio/Afternoon_Geometry.mp3';
const INGAME_BGM_URL = '/audio/Victory_at_the_Arcade.mp3';

interface ActiveTrackSource {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private bgmMasterGain: GainNode | null = null;
  private sfxMasterGain: GainNode | null = null;

  private bufferCache = new Map<string, AudioBuffer>();
  private activeSources: ActiveTrackSource[] = [];
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  private currentMode: BgmMode = 'NONE';
  private currentTrackUrl: string | null = null;
  private isBgmPaused = false;
  private currentPlaybackRate = 1.0;
  private currentTargetFilterFreq = 2600;

  public muted = false;
  public bgmVolume = 0.8; // 0.0 ~ 1.0
  public sfxVolume = 0.8; // 0.0 ~ 1.0

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = localStorage.getItem('tanchishe_muted') === 'true';
        const savedBgm = localStorage.getItem('tanchishe_bgm_vol');
        if (savedBgm !== null) this.bgmVolume = Math.max(0, Math.min(1, parseFloat(savedBgm) || 0));
        const savedSfx = localStorage.getItem('tanchishe_sfx_vol');
        if (savedSfx !== null) this.sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSfx) || 0));
      } catch {}

      // 预先静默预加载音频二进制数据至内存，实现开局 0ms 瞬间发声
      this.preloadTracks();

      // 页面切到后台挂起 AudioContext 释放硬件，切回前台优雅唤醒
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopHeartbeat();
          if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
          }
        } else {
          if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }
  }

  // 跨端解锁与初始化 Web Audio API 上下文拓扑
  public unlockAudio() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // 1. 创建温润低通滤波总线 (2600Hz 削去刺耳毛刺，保留木质与水滴温润听感)
        this.masterFilter = this.ctx.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.value = 2600;
        this.masterFilter.Q.value = 0.85;
        this.masterFilter.connect(this.ctx.destination);

        // 2. 创建独立 BGM 音量增益总线
        this.bgmMasterGain = this.ctx.createGain();
        const effectiveBgm = this.muted ? 0 : 0.32 * this.bgmVolume;
        this.bgmMasterGain.gain.setValueAtTime(effectiveBgm, this.ctx.currentTime);
        this.bgmMasterGain.connect(this.masterFilter);

        // 3. 创建独立 SFX 音效音量增益总线
        this.sfxMasterGain = this.ctx.createGain();
        const effectiveSfx = this.muted ? 0 : this.sfxVolume;
        this.sfxMasterGain.gain.setValueAtTime(effectiveSfx, this.ctx.currentTime);
        this.sfxMasterGain.connect(this.masterFilter);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // 异步预拉取音频并解码为 PCM 缓存
  private async preloadTracks() {
    [MENU_BGM_URL, INGAME_BGM_URL].forEach((url) => {
      this.fetchAndDecode(url).catch(() => {});
    });
  }

  private async fetchAndDecode(url: string): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url)!;
    }
    this.unlockAudio();
    if (!this.ctx) return null;

    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arrayBuffer = await resp.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    }
  }

  // 核心无缝交叉淡化播放调度器 (消灭 MP3 首尾静音帧与卡顿)
  private async playTrackSeamless(url: string) {
    this.unlockAudio();
    if (!this.ctx) return;

    // 停止并清理当前正在播放的旧音轨
    this.stopActiveSources(0.2);

    this.currentTrackUrl = url;
    this.isBgmPaused = false;

    let buffer = this.bufferCache.get(url);
    if (!buffer) {
      buffer = (await this.fetchAndDecode(url)) || undefined;
      // 若异步解码完成时模式已变更，则放弃当前播放
      if (!buffer || this.currentTrackUrl !== url) return;
    }

    const duration = buffer.duration;
    // 动态计算首尾交叉淡化时长：短版 30s 约 2.2s，长版标准曲约 2.5s
    const crossfade = Math.min(2.5, Math.max(0.8, duration * 0.08));
    const stepInterval = Math.max(1, duration - crossfade);

    const spawnSource = (isFirst: boolean) => {
      if (!this.ctx || !this.bgmMasterGain || this.currentTrackUrl !== url) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer!;
      source.playbackRate.value = this.currentPlaybackRate;

      const gain = this.ctx.createGain();
      source.connect(gain);
      gain.connect(this.bgmMasterGain);

      const now = this.ctx.currentTime;
      const fadeInDur = isFirst ? 0.35 : crossfade;

      // 1. 首端平滑淡入
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(1.0, now + fadeInDur);

      // 2. 尾端首尾等功率淡出
      const fadeOutStart = Math.max(now + fadeInDur, now + duration - crossfade);
      gain.gain.setValueAtTime(1.0, fadeOutStart);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      source.start(now);
      source.stop(now + duration + 0.1);

      const trackItem: ActiveTrackSource = { source, gain };
      this.activeSources.push(trackItem);

      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== trackItem);
        try {
          source.disconnect();
          gain.disconnect();
        } catch {}
      };
    };

    let lastSpawnTime = Date.now();

    // 立即启动第一个声轨
    spawnSource(true);

    // 在到达 crossfade 临界前自动启动下一个声轨重叠交织 (支持暂停态低频探活与平滑自愈)
    const scheduleNext = () => {
      if (this.loopTimer) {
        clearTimeout(this.loopTimer);
        this.loopTimer = null;
      }
      this.loopTimer = setTimeout(() => {
        if (this.currentTrackUrl !== url) return;

        // 若当前处于暂停状态，保持低频心跳轮询 (300ms)，杜绝调度链彻底断裂
        if (this.isBgmPaused) {
          scheduleNext();
          return;
        }

        const elapsed = Date.now() - lastSpawnTime;
        if (elapsed >= (stepInterval - 0.2) * 1000) {
          spawnSource(false);
          lastSpawnTime = Date.now();
          scheduleNext();
        } else {
          // 补偿剩余等待时间
          const remaining = Math.max(100, stepInterval * 1000 - elapsed);
          this.loopTimer = setTimeout(scheduleNext, remaining);
        }
      }, 300);
    };

    // 首次调度定时器
    this.loopTimer = setTimeout(scheduleNext, Math.max(100, stepInterval * 1000));
  }

  // 平滑淡出并终止当前所有活动的 BGM 节点 (同步清空引用，彻底消除异步定时器清理新音轨的致命竞态)
  private stopActiveSources(fadeSec = 0.15) {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const oldSources = [...this.activeSources];
    this.activeSources = []; // 立即同步置空当前活动声源，绝不延时覆盖新音轨
    oldSources.forEach(({ source, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.001, now + fadeSec);
        source.stop(now + fadeSec + 0.05);
      } catch {}
    });
  }

  // 播放大厅/待机界面温馨几何 BGM
  startMenuBgm() {
    this.currentMode = 'MENU';
    this.isBgmPaused = false;
    this.stopHeartbeat();
    this.restoreFilterFreq();
    if (this.muted) return;
    this.playTrackSeamless(MENU_BGM_URL);
  }

  // 播放局内对局元气街机 BGM
  startInGameBgm() {
    this.currentMode = 'INGAME';
    this.isBgmPaused = false;
    this.restoreFilterFreq();
    if (this.muted) return;
    this.playTrackSeamless(INGAME_BGM_URL);
  }

  // 恢复滤波器频率到标准工作频率 (2600Hz)
  private restoreFilterFreq() {
    if (this.ctx && this.masterFilter) {
      try {
        const now = this.ctx.currentTime;
        const targetFreq = this.currentTargetFilterFreq || 2600;
        this.masterFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
      } catch {}
    }
  }

  // 兼容别名
  startBgm() {
    this.startInGameBgm();
  }

  // 游戏暂停：低通滤波压低至 360Hz (沉水磨砂声场) + 音量缓降
  pauseBgm() {
    this.isBgmPaused = true;
    this.stopHeartbeat();
    if (this.ctx && this.masterFilter && this.bgmMasterGain) {
      const now = this.ctx.currentTime;
      try {
        this.masterFilter.frequency.setTargetAtTime(360, now, 0.08);
        const lowVol = this.muted ? 0 : 0.08 * this.bgmVolume;
        this.bgmMasterGain.gain.setTargetAtTime(lowVol, now, 0.08);
      } catch {}
    }
  }

  // 游戏继续：低通滤波清澈浮回 (2600Hz 或狂飙 3200Hz) + 音量平滑恢复
  resumeBgm() {
    this.isBgmPaused = false;
    if (this.muted) return;
    if (this.ctx && this.masterFilter && this.bgmMasterGain) {
      const now = this.ctx.currentTime;
      try {
        const targetFreq = this.currentTargetFilterFreq || 2600;
        this.masterFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
        const fullVol = 0.32 * this.bgmVolume;
        this.bgmMasterGain.gain.setTargetAtTime(fullVol, now, 0.1);
      } catch {}
    }
    // 若当前没有任何音轨在播放，则重新启动当前模式音乐
    if (this.activeSources.length === 0) {
      if (this.currentMode === 'INGAME') this.startInGameBgm();
      else if (this.currentMode === 'MENU') this.startMenuBgm();
    }
  }

  // 停止背景音乐
  stopBgm() {
    this.currentMode = 'NONE';
    this.currentTrackUrl = null;
    this.currentPlaybackRate = 1.0;
    this.currentTargetFilterFreq = 2600;
    this.stopHeartbeat();
    this.stopActiveSources(0.2);
  }

  // 磁带停机下行滑音停机 (Tape-Stop Pitch Drop 220ms，落幕电影级仪式感)
  stopBgmWithTapeDrop(onComplete?: () => void) {
    this.currentMode = 'NONE';
    this.currentTrackUrl = null;
    this.stopHeartbeat();

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
        gain.connect(this.masterFilter || this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
      } catch {}
    }

    this.stopActiveSources(0.22);
    setTimeout(() => {
      onComplete?.();
    }, 220);
  }

  // 独立调节 BGM 音量 (0.0 ~ 1.0)
  setBgmVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.bgmVolume = clamped;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanchishe_bgm_vol', String(clamped));
      } catch {}
    }
    if (this.ctx && this.bgmMasterGain) {
      const effective = this.muted ? 0 : 0.32 * clamped;
      this.bgmMasterGain.gain.setTargetAtTime(effective, this.ctx.currentTime, 0.05);
    }
  }

  // 独立调节 SFX 音效音量 (0.0 ~ 1.0)
  setSfxVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.sfxVolume = clamped;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanchishe_sfx_vol', String(clamped));
      } catch {}
    }
    if (this.ctx && this.sfxMasterGain) {
      const effective = this.muted ? 0 : clamped;
      this.sfxMasterGain.gain.setTargetAtTime(effective, this.ctx.currentTime, 0.05);
    }
  }

  // 切换全局静音
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanchishe_muted', String(this.muted));
      } catch {}
    }
    if (this.ctx && this.bgmMasterGain && this.sfxMasterGain) {
      const now = this.ctx.currentTime;
      this.bgmMasterGain.gain.setTargetAtTime(this.muted ? 0 : 0.32 * this.bgmVolume, now, 0.05);
      this.sfxMasterGain.gain.setTargetAtTime(this.muted ? 0 : this.sfxVolume, now, 0.05);
    }
    if (!this.muted && this.currentMode !== 'NONE' && this.activeSources.length === 0) {
      if (this.currentMode === 'MENU') this.startMenuBgm();
      else if (this.currentMode === 'INGAME') this.startInGameBgm();
    }
    return this.muted;
  }

  // 移速动态心跳脉冲与高光声场开扬联动 (<= 88ms 激活 3200Hz 明亮声场与 1.05x 微加速)
  private heartbeatTimer: NodeJS.Timeout | null = null;

  updateGameSpeed(speedMs: number) {
    if (this.currentMode !== 'INGAME') return;

    let targetRate = 1.0;
    let targetFreq = 2600;

    if (speedMs <= 88) {
      // 破风狂飙 (1.7x+): 升速至 1.05x，滤波放开至 3200Hz 亮调开扬，启动 55Hz 脉冲
      targetRate = 1.05;
      targetFreq = 3200;
      this.startHeartbeat();
    } else if (speedMs <= 115) {
      // 紧凑节奏 (1.3x+): 1.02x 微加速，2850Hz 清亮声场
      targetRate = 1.02;
      targetFreq = 2850;
      this.stopHeartbeat();
    } else {
      // 基准巡航
      targetRate = 1.0;
      targetFreq = 2600;
      this.stopHeartbeat();
    }

    this.currentPlaybackRate = targetRate;
    this.currentTargetFilterFreq = targetFreq;

    if (this.ctx && !this.isBgmPaused) {
      const now = this.ctx.currentTime;
      if (this.masterFilter) {
        try {
          this.masterFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
        } catch {}
      }
      this.activeSources.forEach(({ source }) => {
        try {
          source.playbackRate.setTargetAtTime(targetRate, now, 0.25);
        } catch {}
      });
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer || this.muted || this.sfxVolume <= 0) return;
    const playBeat = () => {
      if (this.currentMode !== 'INGAME' || this.muted || this.sfxVolume <= 0) {
        this.stopHeartbeat();
        return;
      }
      this.playNotes('sine', [55], 0.08, 0, 0.12);
      haptics.trigger('heartbeat');
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

  // ==========================================
  // 高光提示音：全量代码级程序化和弦 (0 外部依赖，自然衰减)
  // ==========================================

  // 1. 刷新个人最佳历史战绩：纯净大三和弦上升华彩琶音 (C5 -> E5 -> G5 -> C6 -> E6)
  playVictory() {
    this.playNotes('sine', [523.25, 659.25, 783.99, 1046.5, 1318.51], 0.16, 0.055, 0.32);
  }

  // 2. 点亮巅峰成就：清澈金鸣四度泛音 (G5 -> C6 -> D6 -> G6)
  playGrandAchievement() {
    this.playNotes('sine', [783.99, 1046.5, 1174.66, 1567.98], 0.18, 0.06, 0.3);
  }

  // 3. 电竞录像片头：温润微波滑音 (E5 -> B5)
  playReplayIntro() {
    this.playNotes('triangle', [659.25, 987.77], 0.12, 0.06, 0.26);
  }

  // 4. 开局 Ready Go：清脆弹跳双音阶 (A5 -> D6)
  playReadyGo() {
    this.playNotes('triangle', [880.0, 1174.66], 0.08, 0.04, 0.28);
  }

  // ==========================================
  // Web Audio API 原生声卡实时合成器 (0ms 延迟、动态泛音)
  // ==========================================
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
        gain.connect(this.sfxMasterGain || this.masterFilter || this.ctx!.destination);
        osc.start(start);
        osc.stop(start + noteDur);

        // 播放结束主动断开音频节点连接，杜绝 Web Audio 声卡拓扑泄漏
        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      });
    } catch {}
  }

  // 吃普通红苹果音效 (E5 -> B5 清脆双音阶)
  playEat() {
    this.playNotes('triangle', [659.25, 987.77], 0.08, 0.035, 0.28);
  }

  // 吃金色幸运果音效 (C5 -> E5 -> G5 -> C6 闪耀四段晶体琶音)
  playBonus() {
    this.playNotes('triangle', [523.25, 659.25, 783.99, 1046.5], 0.1, 0.05, 0.3);
  }

  // 转向与按键反馈音 (8-bit 方波点击音，A5 -> D6)
  playMove() {
    this.playNotes('square', [880, 1174.66], 0.045, 0.02, 0.22);
  }

  // 游戏开始音效
  playStart() {
    this.playNotes('triangle', [392.0, 523.25, 659.25], 0.09, 0.06, 0.25);
  }

  // 游戏落幕音效 (G4 -> E4 -> C4 -> G3 降调四和弦)
  playGameOver() {
    this.playNotes('sawtooth', [392.0, 329.63, 261.63, 196.0], 0.12, 0.07, 0.28);
  }

  // 暂停/继续交互音
  playToggle() {
    this.playNotes('triangle', [440, 659.25], 0.05, 0.03, 0.2);
  }

  // 连击动态五声音阶和弦攀升 (宫-商-角-徵-羽 清脆风铃听感)
  playCombo(count: number) {
    const pentatonicScales = [
      [523.25, 587.33], // Combo 1: C5 -> D5
      [587.33, 659.25], // Combo 2: D5 -> E5
      [659.25, 783.99], // Combo 3: E5 -> G5
      [783.99, 880.0], // Combo 4: G5 -> A5
      [783.99, 880.0, 1046.5], // Combo 5+: 羽 -> 高音宫
    ];
    const idx = Math.min(Math.max(count - 1, 0), pentatonicScales.length - 1);
    this.playNotes('sine', pentatonicScales[idx], 0.085, 0.036, 0.3);
  }

  // 普通成就达成音阶
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

