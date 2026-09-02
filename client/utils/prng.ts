/**
 * Mulberry32 32位确定性伪随机数生成器 (PRNG)
 * 保证在相同 seed 下与 Go 后端计算出的浮点数序列 100% 字节级对齐
 */
export class Mulberry32 {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  /**
   * 生成 [0, 1) 之间的确定性伪随机浮点数
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
