// 24 枚成就系统核心定义与达成检测引擎 (NCU HOME 极简微拟态设计)

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface GameStats {
  score: number;
  length: number;
  duration: number;
  maxCombo: number;
  bonusCount: number;
  speedMs: number;
  steps: number;
  rank?: number;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  flavor: string;
  tier: AchievementTier;
  color: string;
  check: (stats: GameStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // [BRONZE] 青铜·方寸探索 (6枚: B-01 ~ B-06)
  {
    id: 'score_100',
    code: 'B-01',
    name: '初出茅庐',
    description: '单局得分突破 100 分',
    flavor: '方寸之间，迈出坚实第一步',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.score >= 100,
  },
  {
    id: 'score_200',
    code: 'B-02',
    name: '小试身手',
    description: '单局得分突破 200 分',
    flavor: '走位与节奏初步融会',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.score >= 200,
  },
  {
    id: 'first_bonus',
    code: 'B-03',
    name: '初尝甜头',
    description: '单局首次吃到金色幸运果',
    flavor: '邂逅 8 秒稍纵即逝的金色机缘',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.bonusCount >= 1,
  },
  {
    id: 'length_15',
    code: 'B-04',
    name: '渐入佳境',
    description: '蛇身长度达到 15 节',
    flavor: '身姿渐展，空间更显紧凑',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.length >= 15,
  },
  {
    id: 'time_60',
    code: 'B-05',
    name: '一分钟客',
    description: '单局坚持存活超过 60 秒 (1分钟)',
    flavor: '心平气和，从容不迫',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.duration >= 60,
  },
  {
    id: 'combo_3',
    code: 'B-06',
    name: '连击起步',
    description: '达成 3 次连击 Combo',
    flavor: '短时间内行云流水两连吃',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.maxCombo >= 3,
  },

  // [SILVER] 白银·技巧渐熟 (6枚: S-01 ~ S-06)
  {
    id: 'score_400',
    code: 'S-01',
    name: '百炼成钢',
    description: '单局得分突破 400 分',
    flavor: '每一次转向都是深思熟虑',
    tier: 'SILVER',
    color: '#64748B',
    check: (s) => s.score >= 400,
  },
  {
    id: 'length_25',
    code: 'S-02',
    name: '巨蟒初现',
    description: '蛇身长度达到 25 节',
    flavor: '游弋如龙，自成障碍',
    tier: 'SILVER',
    color: '#64748B',
    check: (s) => s.length >= 25,
  },
  {
    id: 'bonus_3',
    code: 'S-03',
    name: '金果猎手',
    description: '单局吃掉 3 颗金色幸运果',
    flavor: '绝不错失每一次机遇',
    tier: 'SILVER',
    color: '#64748B',
    check: (s) => s.bonusCount >= 3,
  },
  {
    id: 'speed_tier_1',
    code: 'S-04',
    name: '狂飙进阶',
    description: '单局速度提升至 1.3x 档位 (108ms以内)',
    flavor: '神经紧绷，指尖飞跃',
    tier: 'SILVER',
    color: '#64748B',
    check: (s) => s.speedMs <= 108,
  },
  {
    id: 'time_120',
    code: 'S-05',
    name: '长情陪伴',
    description: '单局坚持存活超过 120 秒 (2分钟)',
    flavor: '百转千回，屹立不倒',
    tier: 'SILVER',
    color: '#64748B',
    check: (s) => s.duration >= 120,
  },
  {
    id: 'combo_5',
    code: 'S-06',
    name: '五连绝世',
    description: '达成 5 次连击 Combo',
    flavor: '五杀气魄，节奏大师',
    tier: 'SILVER',
    color: '#64748B',
    check: (s) => s.maxCombo >= 5,
  },

  // [GOLD] 黄金·登峰造极 (6枚: G-01 ~ G-06)
  {
    id: 'score_600',
    code: 'G-01',
    name: '绝顶高手',
    description: '单局得分突破 600 分',
    flavor: '会当凌绝顶，一览众山小',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.score >= 600,
  },
  {
    id: 'length_30',
    code: 'G-02',
    name: '游龙入海',
    description: '蛇身长度达到 30 节',
    flavor: '身若游龙，穿梭自如',
    tier: 'GOLD',
    color: '#10B981',
    check: (s) => s.length >= 30,
  },
  {
    id: 'survive_90s',
    code: 'G-03',
    name: '持久王者',
    description: '单局存活时长达到 90 秒',
    flavor: '定力如山，沉着冷静',
    tier: 'GOLD',
    color: '#8B5CF6',
    check: (s) => s.duration >= 90,
  },
  {
    id: 'bonus_5',
    code: 'G-04',
    name: '探囊取物',
    description: '单局捕获 5 颗双倍金果',
    flavor: '目光如炬，金果尽入囊中',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.bonusCount >= 5,
  },
  {
    id: 'combo_7',
    code: 'G-05',
    name: '连击宗师',
    description: '达成 7 次连击 Combo',
    flavor: '七星连珠，行云流水',
    tier: 'GOLD',
    color: '#EF4444',
    check: (s) => s.maxCombo >= 7,
  },
  {
    id: 'rank_top10',
    code: 'G-06',
    name: '名扬四海',
    description: '成功荣登全服风云榜 Top 10',
    flavor: '榜上有名，实力毋庸置疑',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.rank !== undefined && s.rank > 0 && s.rank <= 10,
  },

  // [DIAMOND] 钻石·超凡殿堂 (6枚: D-01 ~ D-06)
  {
    id: 'score_1000',
    code: 'D-01',
    name: '千分传奇',
    description: '单局得分突破 1000 分大关',
    flavor: '载入史册的千分传奇神话',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.score >= 1000,
  },
  {
    id: 'length_60',
    code: 'D-02',
    name: '吞天巨蟒',
    description: '蛇身长度达到惊人的 60 节',
    flavor: '整个棋盘已是你的领域',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.length >= 60,
  },
  {
    id: 'top_3',
    code: 'D-03',
    name: '三甲加冕',
    description: '挺进全服风云榜前三甲 (冠亚季军)',
    flavor: '领奖台上，傲视群雄',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.rank !== undefined && s.rank > 0 && s.rank <= 3,
  },
  {
    id: 'top_1',
    code: 'D-04',
    name: '榜首霸主',
    description: '夺得全服第 1 名荣登王座',
    flavor: '独孤求败，天下无双',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.rank === 1,
  },
  {
    id: 'time_300',
    code: 'D-05',
    name: '不朽长生',
    description: '单局坚持存活超过 300 秒 (5分钟)',
    flavor: '定力如磐石，缔造不朽',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.duration >= 300,
  },
  {
    id: 'steps_1200',
    code: 'D-06',
    name: '千里单骑',
    description: '单局总行进步数突破 1200 步',
    flavor: '千步征程，王者独行',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.steps >= 1200,
  },
];

const getStorageKey = (username?: string) =>
  username ? `tanchishe_achievements_v1_${username.trim()}` : 'tanchishe_achievements_v1_guest';

// 读取指定玩家本地已解锁成就 ID 集合 (按用户名严格命名空间隔离)
export function getUnlockedAchievements(username?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(username));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

// 检查并记录指定玩家新解锁的成就，返回本次新点亮的成就列表
export function checkAndUnlockAchievements(stats: GameStats, username?: string): Achievement[] {
  const currentUnlocked = getUnlockedAchievements(username);
  const newlyUnlocked: Achievement[] = [];

  ACHIEVEMENTS.forEach((ach) => {
    if (!currentUnlocked.has(ach.id) && ach.check(stats)) {
      currentUnlocked.add(ach.id);
      newlyUnlocked.push(ach);
    }
  });

  if (newlyUnlocked.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(username), JSON.stringify(Array.from(currentUnlocked)));
    } catch {}
  }

  return newlyUnlocked;
}
