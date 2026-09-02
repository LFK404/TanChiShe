// 24 枚成就系统核心定义与达成检测引擎

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
  name: string;
  description: string;
  flavor: string;
  tier: AchievementTier;
  color: string;
  check: (stats: GameStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // 🌱 青铜·初出茅庐 (6枚)
  {
    id: 'score_100',
    name: '初出茅庐',
    description: '单局得分突破 100 分',
    flavor: '方寸之间，迈出坚实第一步',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.score >= 100,
  },
  {
    id: 'score_200',
    name: '小试身手',
    description: '单局得分突破 200 分',
    flavor: '走位与节奏初步融会',
    tier: 'BRONZE',
    color: '#66CCFF',
    check: (s) => s.score >= 200,
  },
  {
    id: 'first_bonus',
    name: '初尝甜头',
    description: '单局首次吃到金色幸运果',
    flavor: '邂逅 8 秒稍纵即逝的金色机缘',
    tier: 'BRONZE',
    color: '#F59E0B',
    check: (s) => s.bonusCount >= 1,
  },
  {
    id: 'length_15',
    name: '灵动巨蟒',
    description: '蛇身长度突破 15 节',
    flavor: '初具规模，盘桓有度',
    tier: 'BRONZE',
    color: '#0D9488',
    check: (s) => s.length >= 15,
  },
  {
    id: 'combo_2',
    name: '双星连击',
    description: '达成 2 连击 (3秒内连吃2果)',
    flavor: '连续吃果，初露锋芒',
    tier: 'BRONZE',
    color: '#FB923C',
    check: (s) => s.maxCombo >= 2,
  },
  {
    id: 'time_60',
    name: '方寸小试',
    description: '单局存活时长突破 60 秒',
    flavor: '沉着冷静，稳步向前',
    tier: 'BRONZE',
    color: '#8B5CF6',
    check: (s) => s.duration >= 60,
  },

  // ⚡ 白银·进阶掌控 (6枚)
  {
    id: 'score_300',
    name: '渐入佳境',
    description: '单局得分突破 300 分',
    flavor: '节奏渐入佳境，游刃有余',
    tier: 'SILVER',
    color: '#0099FF',
    check: (s) => s.score >= 300,
  },
  {
    id: 'length_25',
    name: '深海潜龙',
    description: '蛇身长度突破 25 节',
    flavor: '巨龙初醒，盘踞方寸',
    tier: 'SILVER',
    color: '#0284C7',
    check: (s) => s.length >= 25,
  },
  {
    id: 'time_120',
    name: '沉着坚守',
    description: '单局存活时长突破 120 秒',
    flavor: '心如止水，坚守两分钟',
    tier: 'SILVER',
    color: '#7C3AED',
    check: (s) => s.duration >= 120,
  },
  {
    id: 'combo_3',
    name: '连击大师',
    description: '达成 3 连击 (3秒内连吃3果)',
    flavor: '连续吃果，手速爆发',
    tier: 'SILVER',
    color: '#EF4444',
    check: (s) => s.maxCombo >= 3,
  },
  {
    id: 'bonus_5',
    name: '金果饕餮',
    description: '单局累计吃到 5 颗金色幸运果',
    flavor: '敏锐嗅觉，财源滚滚',
    tier: 'SILVER',
    color: '#D97706',
    check: (s) => s.bonusCount >= 5,
  },
  {
    id: 'speed_15',
    name: '极速掌控',
    description: '在 1.5x 速度下存活并吃到果实',
    flavor: '风驰电掣中的从容掌控',
    tier: 'SILVER',
    color: '#F97316',
    check: (s) => s.speedMs <= 85 && s.score >= 250,
  },

  // 🐍 黄金·登峰造极 (6枚)
  {
    id: 'score_500',
    name: '方寸宗师',
    description: '单局得分突破 500 分',
    flavor: '登峰造极的微操艺术',
    tier: 'GOLD',
    color: '#EC4899',
    check: (s) => s.score >= 500,
  },
  {
    id: 'length_35',
    name: '万象苍龙',
    description: '蛇身长度突破 35 节',
    flavor: '身长如龙，满屏游走',
    tier: 'GOLD',
    color: '#1D4ED8',
    check: (s) => s.length >= 35,
  },
  {
    id: 'time_180',
    name: '长青传奇',
    description: '单局存活时长突破 180 秒 (3分钟)',
    flavor: '超强耐力，历经风雨考验',
    tier: 'GOLD',
    color: '#334155',
    check: (s) => s.duration >= 180,
  },
  {
    id: 'combo_5',
    name: '神乎其技',
    description: '达成 5 连击 (3秒内连吃5果)',
    flavor: '极限手速，超凡节奏',
    tier: 'GOLD',
    color: '#DC2626',
    check: (s) => s.maxCombo >= 5,
  },
  {
    id: 'bonus_8',
    name: '金玉满堂',
    description: '单局累计吃到 8 颗金色幸运果',
    flavor: '金光璀璨，福星高照',
    tier: 'GOLD',
    color: '#CA8A04',
    check: (s) => s.bonusCount >= 8,
  },
  {
    id: 'speed_20',
    name: '极限狂飙',
    description: '在 2.0x 满速状态下存活并吃果',
    flavor: '突破物理极速的巅峰掌控',
    tier: 'GOLD',
    color: '#6D28D9',
    check: (s) => s.speedMs <= 65 && s.score >= 600,
  },

  // 👑 钻石·荣耀巅峰 (6枚)
  {
    id: 'score_800',
    name: '旷世奇才',
    description: '单局得分突破 800 分',
    flavor: '超越凡俗的神级表现',
    tier: 'DIAMOND',
    color: '#9333EA',
    check: (s) => s.score >= 800,
  },
  {
    id: 'top_10',
    name: '风云新星',
    description: '首次杀入全服 Top 10',
    flavor: '名扬风云榜，跻身全服前列',
    tier: 'DIAMOND',
    color: '#B45309',
    check: (s) => s.rank !== undefined && s.rank > 0 && s.rank <= 10,
  },
  {
    id: 'top_3',
    name: '三甲荣耀',
    description: '杀入全服 Top 3 前三甲',
    flavor: '傲立群雄之巅，俯瞰全服',
    tier: 'DIAMOND',
    color: '#A16207',
    check: (s) => s.rank !== undefined && s.rank > 0 && s.rank <= 3,
  },
  {
    id: 'top_1',
    name: '榜首霸主',
    description: '夺得全服第 1 名荣登王座',
    flavor: '独孤求败，天下无双',
    tier: 'DIAMOND',
    color: '#EAB308',
    check: (s) => s.rank === 1,
  },
  {
    id: 'time_300',
    name: '不朽长生',
    description: '单局坚持存活超过 300 秒 (5分钟)',
    flavor: '定力如磐石，缔造不朽',
    tier: 'DIAMOND',
    color: '#0F172A',
    check: (s) => s.duration >= 300,
  },
  {
    id: 'steps_1200',
    name: '千里单骑',
    description: '单局总行进步数突破 1200 步',
    flavor: '千步征程，王者独行',
    tier: 'DIAMOND',
    color: '#0891B2',
    check: (s) => s.steps >= 1200,
  },
];

const STORAGE_KEY = 'tanchishe_achievements_v1';

// 读取本地已解锁成就 ID 集合
export function getUnlockedAchievements(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

// 检查并记录新解锁的成就，返回本次新点亮的成就列表
export function checkAndUnlockAchievements(stats: GameStats): Achievement[] {
  const currentUnlocked = getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];

  ACHIEVEMENTS.forEach((ach) => {
    if (!currentUnlocked.has(ach.id) && ach.check(stats)) {
      currentUnlocked.add(ach.id);
      newlyUnlocked.push(ach);
    }
  });

  if (newlyUnlocked.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(currentUnlocked)));
    } catch {}
  }

  return newlyUnlocked;
}
