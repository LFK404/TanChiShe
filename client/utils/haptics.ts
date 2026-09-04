// 工业级 Web 端多层级触觉振动反馈管理器 (支持三档调节、多模式波形与静音自适应)

export type HapticMode = 'STRONG' | 'SOFT' | 'OFF';

export type HapticType =
  | 'eat'
  | 'combo'
  | 'bonus'
  | 'countdown'
  | 'heartbeat'
  | 'gameover'
  | 'move'
  | 'snap'
  | 'danger'
  | 'ui';

class HapticManager {
  public mode: HapticMode = 'STRONG';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tanchishe_haptics') as HapticMode | null;
        if (saved === 'STRONG' || saved === 'SOFT' || saved === 'OFF') {
          this.mode = saved;
        } else {
          this.mode = 'STRONG';
        }
      } catch {
        this.mode = 'STRONG';
      }
    }
  }

  // 切换触觉强度模式 (持久化存储)
  setMode(mode: HapticMode) {
    this.mode = mode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tanchishe_haptics', mode);
      } catch {}
    }
    // 切换模式时给予测试震感反馈
    if (mode === 'STRONG') {
      this.vibrateDirect([15, 30, 15]);
    } else if (mode === 'SOFT') {
      this.vibrateDirect(8);
    }
  }

  // 底层安全物理马达驱动器 (支持手机马达与物理游戏手柄双重驱动)
  private vibrateDirect(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }

    // 同步驱动物理游戏手柄马达 (Xbox / PS5 / Switch 等 dual-rumble 振动器)
    if (typeof window !== 'undefined' && typeof navigator.getGamepads === 'function') {
      try {
        const gamepads = navigator.getGamepads();
        const duration = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
        for (let i = 0; i < gamepads.length; i++) {
          const gp = gamepads[i];
          if (
            gp &&
            'vibrationActuator' in gp &&
            gp.vibrationActuator &&
            typeof (gp.vibrationActuator as { playEffect?: (...args: unknown[]) => Promise<unknown> }).playEffect === 'function'
          ) {
            (gp.vibrationActuator as { playEffect: (...args: unknown[]) => Promise<unknown> }).playEffect('dual-rumble', {
              startDelay: 0,
              duration: Math.min(350, duration * 3),
              weakMagnitude: this.mode === 'STRONG' ? 0.6 : 0.3,
              strongMagnitude: this.mode === 'STRONG' ? 0.4 : 0.2,
            }).catch(() => {});
          }
        }
      } catch {}
    }
  }

  // 触发特定场景的触觉反馈
  trigger(type: HapticType, comboCount = 1) {
    if (this.mode === 'OFF') return;

    const isStrong = this.mode === 'STRONG';

    switch (type) {
      case 'eat':
        this.vibrateDirect(isStrong ? 12 : 6);
        break;

      case 'combo':
        if (comboCount <= 1) {
          this.vibrateDirect(isStrong ? 12 : 6);
        } else if (comboCount === 2) {
          this.vibrateDirect(isStrong ? [15, 20, 15] : [8, 15, 8]);
        } else if (comboCount === 3) {
          this.vibrateDirect(isStrong ? [18, 20, 18, 20, 18] : [10, 15, 10]);
        } else if (comboCount === 4) {
          this.vibrateDirect(isStrong ? [20, 25, 20, 25, 20] : [12, 15, 12]);
        } else {
          // 5+ MAX Combo
          this.vibrateDirect(isStrong ? [25, 30, 25, 30, 35] : [15, 20, 15, 20, 20]);
        }
        break;

      case 'bonus':
        this.vibrateDirect(isStrong ? [15, 30, 20, 30, 25] : [10, 20, 15]);
        break;

      case 'countdown':
        this.vibrateDirect(isStrong ? 8 : 4);
        break;

      case 'heartbeat':
        this.vibrateDirect(isStrong ? 6 : 3);
        break;

      case 'gameover':
        this.vibrateDirect(isStrong ? [45, 50, 60] : [25, 30, 35]);
        break;

      case 'move':
        this.vibrateDirect(isStrong ? 6 : 3);
        break;

      case 'snap':
        this.vibrateDirect(isStrong ? 8 : 4);
        break;

      case 'danger':
        this.vibrateDirect(isStrong ? [10, 20, 10] : 6);
        break;

      case 'ui':
        this.vibrateDirect(isStrong ? 8 : 4);
        break;
    }
  }
}

export const haptics = new HapticManager();
