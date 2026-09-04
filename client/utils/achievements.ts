// 32 枚成就系统核心定义与达成检测引擎 (NCU HOME 极简微拟态设计，纯悬浮无框生长徽章系统)

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export type AchievementCategory =
  | 'score'
  | 'length'
  | 'time'
  | 'speed'
  | 'steps'
  | 'combo'
  | 'bonus'
  | 'rank';

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
  category: AchievementCategory;
  level: number; // 1~5，形状与微动效随等级阶梯生长演进
  description: string;
  flavor: string;
  tier: AchievementTier;
  color: string;
  check: (stats: GameStats) => boolean;
}

export const CATEGORY_INFO: Record<AchievementCategory, { name: string; iconSymbol: string }> = {
  score: { name: '得分突破', iconSymbol: '★' },
  length: { name: '蛇身长度', iconSymbol: '🐍' },
  time: { name: '生存时间', iconSymbol: '⏱' },
  speed: { name: '极限移速', iconSymbol: '⚡' },
  steps: { name: '探索步数', iconSymbol: '👣' },
  combo: { name: '极速连击', iconSymbol: '🔥' },
  bonus: { name: '金果捕获', iconSymbol: '🍎' },
  rank: { name: '竞技风云', iconSymbol: '👑' },
};

export const ACHIEVEMENTS: Achievement[] = [
  // -------------------------------------------------------------
  // 1. 得分突破系列 (Score) —— 5枚，从易到难全面增难 (200 ➔ 500 ➔ 800 ➔ 1400 ➔ 2500)
  // -------------------------------------------------------------
  {
    id: 'score_200',
    code: 'SC-01',
    name: '崭露锋芒',
    category: 'score',
    level: 1,
    description: '单局得分突破 200 分',
    flavor: '方寸之间，锋芒初露',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.score >= 200,
  },
  {
    id: 'score_500',
    code: 'SC-02',
    name: '得分好手',
    category: 'score',
    level: 2,
    description: '单局得分突破 500 分',
    flavor: '走位行云流水，手感渐入佳境',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.score >= 500,
  },
  {
    id: 'score_800',
    code: 'SC-03',
    name: '得分大师',
    category: 'score',
    level: 3,
    description: '单局得分突破 800 分',
    flavor: '气贯长虹，节奏尽在掌握',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.score >= 800,
  },
  {
    id: 'score_1400',
    code: 'SC-04',
    name: '登峰造极',
    category: 'score',
    level: 4,
    description: '单局得分突破 1400 分',
    flavor: '会当凌绝顶，傲视群雄',
    tier: 'DIAMOND',
    color: '#8B5CF6',
    check: (s) => s.score >= 1400,
  },
  {
    id: 'score_2500',
    code: 'SC-05',
    name: '贪吃神话',
    category: 'score',
    level: 5,
    description: '单局得分突破 2500 分大关',
    flavor: '逼近速度封顶，缔造载入史册的不朽传奇',
    tier: 'DIAMOND',
    color: '#EF4444',
    check: (s) => s.score >= 2500,
  },

  // -------------------------------------------------------------
  // 2. 蛇身长度系列 (Length) —— 4枚，微调难度 (20 ➔ 40 ➔ 60 ➔ 100 节)
  // -------------------------------------------------------------
  {
    id: 'length_20',
    code: 'LN-01',
    name: '见风渐长',
    category: 'length',
    level: 1,
    description: '蛇身长度达到 20 节',
    flavor: '灵蛇展躯，棋盘初现拥挤',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.length >= 20,
  },
  {
    id: 'length_40',
    code: 'LN-02',
    name: '蜿蜒游龙',
    category: 'length',
    level: 2,
    description: '蛇身长度达到 40 节',
    flavor: '穿行于身躯狭隙，优雅如丝',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.length >= 40,
  },
  {
    id: 'length_60',
    code: 'LN-03',
    name: '巨蟒盘踞',
    category: 'length',
    level: 3,
    description: '蛇身长度达到 60 节',
    flavor: '半壁江山已在腹中，游刃有余',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.length >= 60,
  },
  {
    id: 'length_100',
    code: 'LN-04',
    name: '吞天巨蟒',
    category: 'length',
    level: 4,
    description: '蛇身长度达到 100 节惊人篇章',
    flavor: '百节盘龙，近乎填满整个方寸世界',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.length >= 100,
  },

  // -------------------------------------------------------------
  // 3. 生存时间系列 (Time) —— 4枚，微调难度 (60s ➔ 120s ➔ 200s ➔ 300s)
  // -------------------------------------------------------------
  {
    id: 'time_60',
    code: 'TM-01',
    name: '初出茅庐',
    category: 'time',
    level: 1,
    description: '单局坚持存活超过 60 秒 (1分钟)',
    flavor: '心平气和，从容不迫的开端',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.duration >= 60,
  },
  {
    id: 'time_120',
    code: 'TM-02',
    name: '沉着冷静',
    category: 'time',
    level: 2,
    description: '单局坚持存活超过 120 秒 (2分钟)',
    flavor: '百转千回，波澜不惊的心性',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.duration >= 120,
  },
  {
    id: 'time_200',
    code: 'TM-03',
    name: '坚韧不拔',
    category: 'time',
    level: 3,
    description: '单局坚持存活超过 200 秒 (3分20秒)',
    flavor: '定力如磐，战胜不断升温的狂澜',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.duration >= 200,
  },
  {
    id: 'time_300',
    code: 'TM-04',
    name: '岁月不朽',
    category: 'time',
    level: 4,
    description: '单局坚持存活超过 300 秒 (5分钟)',
    flavor: '在极致移速中静水流深，与光阴同寿',
    tier: 'DIAMOND',
    color: '#8B5CF6',
    check: (s) => s.duration >= 300,
  },

  // -------------------------------------------------------------
  // 4. 极限移速系列 (Speed) —— 4枚，微调难度 (1.3x ➔ 1.6x ➔ 2.0x ➔ 2.5x 极限)
  // -------------------------------------------------------------
  {
    id: 'speed_1_3',
    code: 'SP-01',
    name: '小试破风',
    category: 'speed',
    level: 1,
    description: '单局移速突破 1.3x 档位 (115ms以内)',
    flavor: '初尝加速，微风拂面',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.speedMs <= 115,
  },
  {
    id: 'speed_1_6',
    code: 'SP-02',
    name: '疾步如飞',
    category: 'speed',
    level: 2,
    description: '单局移速突破 1.6x 档位 (94ms以内)',
    flavor: '身轻如燕，转向如风',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.speedMs <= 94,
  },
  {
    id: 'speed_2_0',
    code: 'SP-03',
    name: '追风掣电',
    category: 'speed',
    level: 3,
    description: '单局移速突破 2.0x 档位 (75ms以内)',
    flavor: '心跳脉冲与残影交织，指尖破空',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.speedMs <= 75,
  },
  {
    id: 'speed_2_5',
    code: 'SP-04',
    name: '超光越影',
    category: 'speed',
    level: 4,
    description: '单局移速突破 2.5x 极限巅峰 (60ms以内)',
    flavor: '超越物理极限的踏光电竞神之反应',
    tier: 'DIAMOND',
    color: '#EF4444',
    check: (s) => s.speedMs <= 60,
  },

  // -------------------------------------------------------------
  // 5. 探索步数系列 (Steps) —— 4枚，增加2个下位，千里单骑2000步
  // -------------------------------------------------------------
  {
    id: 'steps_200',
    code: 'ST-01',
    name: '迈步向前',
    category: 'steps',
    level: 1,
    description: '单局行进步数达到 200 步',
    flavor: '不积跬步，无以至千里',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.steps >= 200,
  },
  {
    id: 'steps_600',
    code: 'ST-02',
    name: '步履不停',
    category: 'steps',
    level: 2,
    description: '单局行进步数达到 600 步',
    flavor: '踏遍方寸格，走位自成章法',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.steps >= 600,
  },
  {
    id: 'steps_1200',
    code: 'ST-03',
    name: '漫漫长路',
    category: 'steps',
    level: 3,
    description: '单局行进步数达到 1200 步',
    flavor: '长路漫漫，步步生辉',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.steps >= 1200,
  },
  {
    id: 'steps_2000',
    code: 'ST-04',
    name: '千里单骑',
    category: 'steps',
    level: 4,
    description: '单局行进步数突破 2000 步大关',
    flavor: '两千步孤胆征途，一人一蛇傲立天地',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.steps >= 2000,
  },

  // -------------------------------------------------------------
  // 6. 极速连击系列 (Combo) —— 4枚，连击起步3连击，五连绝世5连击，扩至4枚
  // -------------------------------------------------------------
  {
    id: 'combo_3',
    code: 'CB-01',
    name: '连击起步',
    category: 'combo',
    level: 1,
    description: '达成 3 次连击 Combo',
    flavor: '短时间内行云流水两连吃',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.maxCombo >= 3,
  },
  {
    id: 'combo_5',
    code: 'CB-02',
    name: '五连绝世',
    category: 'combo',
    level: 2,
    description: '达成 5 次连击 Combo',
    flavor: '五杀破阵气魄，节奏大师的凌厉刀锋',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.maxCombo >= 5,
  },
  {
    id: 'combo_8',
    code: 'CB-03',
    name: '连击宗师',
    category: 'combo',
    level: 3,
    description: '达成 8 次连击 Combo',
    flavor: '八星连珠，全蛇身流光璀璨',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.maxCombo >= 8,
  },
  {
    id: 'combo_12',
    code: 'CB-04',
    name: '天命连珠',
    category: 'combo',
    level: 4,
    description: '达成 12 次超神连击 Combo',
    flavor: '十二连珠神迹，凡人莫及的连击交响曲',
    tier: 'DIAMOND',
    color: '#EF4444',
    check: (s) => s.maxCombo >= 12,
  },

  // -------------------------------------------------------------
  // 7. 金果捕获系列 (Bonus) —— 4枚，增加至4个，末尾大跨度
  // -------------------------------------------------------------
  {
    id: 'bonus_2',
    code: 'BN-01',
    name: '黄金机遇',
    category: 'bonus',
    level: 1,
    description: '单局吃掉 2 颗金色幸运果',
    flavor: '邂逅稍纵即逝的流金机缘',
    tier: 'BRONZE',
    color: '#10B981',
    check: (s) => s.bonusCount >= 2,
  },
  {
    id: 'bonus_5',
    code: 'BN-02',
    name: '淘金达人',
    category: 'bonus',
    level: 2,
    description: '单局吃掉 5 颗金色幸运果',
    flavor: '绝不错失每一次机遇，金果尽入囊中',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.bonusCount >= 5,
  },
  {
    id: 'bonus_9',
    code: 'BN-03',
    name: '黄金大盗',
    category: 'bonus',
    level: 3,
    description: '单局吃掉 9 颗金色幸运果',
    flavor: '目光如炬，金光闪耀全场',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.bonusCount >= 9,
  },
  {
    id: 'bonus_15',
    code: 'BN-04',
    name: '点石成金',
    category: 'bonus',
    level: 4,
    description: '单局吃掉 15 颗金色幸运果',
    flavor: '神圣金芒环绕，化方寸棋盘为黄金国度',
    tier: 'DIAMOND',
    color: '#F59E0B',
    check: (s) => s.bonusCount >= 15,
  },

  // -------------------------------------------------------------
  // 8. 竞技风云系列 (Rank) —— 3枚
  // -------------------------------------------------------------
  {
    id: 'rank_top10',
    code: 'RK-01',
    name: '名扬四海',
    category: 'rank',
    level: 1,
    description: '成功荣登全服风云榜 Top 10',
    flavor: '榜上有名，实力毋庸置疑',
    tier: 'SILVER',
    color: '#38BDF8',
    check: (s) => s.rank !== undefined && s.rank > 0 && s.rank <= 10,
  },
  {
    id: 'rank_top3',
    code: 'RK-02',
    name: '三甲加冕',
    category: 'rank',
    level: 2,
    description: '挺进全服风云榜前三甲 (冠亚季军)',
    flavor: '领奖台上，傲视群雄',
    tier: 'GOLD',
    color: '#F59E0B',
    check: (s) => s.rank !== undefined && s.rank > 0 && s.rank <= 3,
  },
  {
    id: 'rank_top1',
    code: 'RK-03',
    name: '榜首霸主',
    category: 'rank',
    level: 3,
    description: '夺得全服第 1 名荣登王座',
    flavor: '独孤求败，天下无双',
    tier: 'DIAMOND',
    color: '#0099FF',
    check: (s) => s.rank === 1,
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
