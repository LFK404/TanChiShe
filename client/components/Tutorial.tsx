import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Sparkles, Shield, Zap, Flame } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialPage {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  image: string;
  accentColor: string;
  badgeBg: string;
  icon: React.ReactNode;
  summary: string;
  points: { title: string; desc: string }[];
  proTip: string;
}

const PAGES: TutorialPage[] = [
  {
    id: 'dead_wall',
    tag: '01 核心博弈',
    title: '身化死路 · 寸土必争',
    subtitle: '每走一步都会在身后留下石化死墙，碰撞即落幕',
    image: '/image/guide_dead_wall.webp',
    accentColor: '#0099FF',
    badgeBg: '#EBF8FF',
    icon: <Shield size={14} className="text-[#0099FF]" />,
    summary: '小蛇身后的轨迹会随时间迅速石化为坚硬的死墙。游戏严禁掉头反向行驶与碰撞死墙，考验对棋盘空间的宏观走位与转弯预判。',
    points: [
      { title: '绝不可逆向掉头', desc: '向左行驶时按右键无效，必须经过上下拐弯完成折返。' },
      { title: '死角与贴边走位', desc: '优先沿着边缘与现有死墙绕圈布局，将宽阔中场留给未来。' },
    ],
    proTip: '小蛇濒临死角前会触发惊慌微表情，注意观察前额留白从容规避！',
  },
  {
    id: 'red_apple',
    tag: '02 生机再现',
    title: '幸运红果 · 波次清屏',
    subtitle: '常驻 1 颗，一口吞咽化解绝境，全场死路重置',
    image: '/image/guide_red_apple.webp',
    accentColor: '#EF4444',
    badgeBg: '#FEE2E2',
    icon: <Sparkles size={14} className="text-[#EF4444]" />,
    summary: '场上永远常驻 1 颗鲜嫩红苹果。当它被小蛇吞下的瞬间，全场所有固化死墙将瓦解为璀璨星尘瓦解波，瞬间还原空旷竞技场！',
    points: [
      { title: '吞下 +10 分 & 长度 +1', desc: '伴随果冻微弹跳动画与柔和清脆的治愈进食音阶。' },
      { title: '生死关头的解围神器', desc: '陷入死路包围时，果断冲向红苹果即可触发波次清屏绝地求生。' },
    ],
    proTip: '进食时蛇体会自发产生从头至尾的正弦吞咽传导波，视觉极具解压感。',
  },
  {
    id: 'special_fruits',
    tag: '03 奇迹果实',
    title: '三大幻果 · 异能图谱',
    subtitle: '同一果池随机降临，限时倒计时，各赋神通',
    image: '/image/guide_special_fruits.webp',
    accentColor: '#F59E0B',
    badgeBg: '#FEF3C7',
    icon: <Zap size={14} className="text-[#F59E0B]" />,
    summary: '棋盘流光导轨会不定期孕育稀有幻果（至多共存1颗）。不仅提供高额积分与清屏，更解锁专属限时超能异能：',
    points: [
      { title: '幸运金果 (限时 8s)', desc: '璀璨纯正流金苹果，吃掉独享 +30 分巨额积分，点燃连击狂潮。' },
      { title: '冰霜寒果 (限时 6s)', desc: '冰晶微雕寒雾苹果，吃掉激活 3 秒时空减速，从容穿插复杂迷宫。' },
      { title: '虚幻星石 (限时 5s)', desc: '梦幻星轨半透明晶球，吃掉激活 2 秒极光虚化，免疫碰撞无视边界！' },
    ],
    proTip: '外置 4px 纤细流光微槽实时指示剩余秒数，临期时会有柔和频闪警示。',
  },
  {
    id: 'combo_rush',
    tag: '04 电竞疾驰',
    title: '连击狂潮 · 流金飞驰',
    subtitle: '3秒极限时钟，全蛇身金光环绕与阶梯爆发加成',
    image: '/image/guide_combo_rush.webp',
    accentColor: '#8B5CF6',
    badgeBg: '#F3E8FF',
    icon: <Flame size={14} className="text-[#8B5CF6]" />,
    summary: '吃下任意果实都会激活或刷新 3 秒连击时钟。在倒计时结束前再次进食，即可叠加 Combo，享受电竞飞驰般的爽快感：',
    points: [
      { title: '3 连击起激活全蛇金光', desc: '全蛇身点亮流金外发光光晕与 5~6 节流金光梭顺传流光。' },
      { title: '阶梯暴击积分递增', desc: '连击越高得分递增越多（+5、+10...），剩余 1 秒急促频闪警示。' },
    ],
    proTip: '暂停游戏时连击时钟物理冻结，完全无需担心因接电话或思考而断连！',
  },
];

// 游戏新手规则教学画卷式模态弹窗组件 (专属手绘水彩绘本风格，彻底告别 AI 模板感)
export default function Tutorial({ isOpen, onClose }: Props) {
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentPage((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setCurrentPage((p) => Math.min(PAGES.length - 1, p + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const page = PAGES[currentPage];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] bg-white/95 backdrop-blur-md rounded-3xl flex flex-col text-[#0F172A] relative border border-white/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* 顶部标题与关闭栏 */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100/90 shrink-0 bg-white/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center shadow-2xs">
              <BookOpen size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A] leading-tight">
                冒险启程指南
              </h2>
              <p className="text-[10px] text-slate-400">水彩绘本 · 核心机制图谱</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400 mr-1">
              <strong className="text-[#0099FF]">{currentPage + 1}</strong> / {PAGES.length}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 机制页签切换指示器 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-50/80 border-b border-slate-100/60 shrink-0 gap-1 overflow-x-auto no-scrollbar">
          {PAGES.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setCurrentPage(idx)}
              className={`flex-1 min-w-[72px] py-1 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                idx === currentPage
                  ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: idx === currentPage ? p.accentColor : '#CBD5E1' }}
              />
              <span className="text-[11px] truncate">
                {idx === 0 ? '死路' : idx === 1 ? '红苹果' : idx === 2 ? '特殊果' : '连击'}
              </span>
            </button>
          ))}
        </div>

        {/* 绘本画卷核心展示区 (手绘大图 + 机制拆解) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {/* 专属定制手绘水彩大图卡片 */}
          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200/70 shadow-sm bg-slate-100 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.image}
              alt={page.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* 多巴胺微光光晕与标签浮层 */}
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white/80 shadow-xs text-xs font-bold text-slate-700">
              {page.icon}
              <span className="text-[10px] font-mono tracking-wider">{page.tag}</span>
            </div>
          </div>

          {/* 标题与故事概述 */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>{page.title}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{page.summary}</p>
          </div>

          {/* 机制细节卡片列表 */}
          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2">
            {page.points.map((pt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0099FF] mt-1.5 shrink-0" />
                <div className="flex-1">
                  <strong className="text-slate-800 font-bold mr-1">{pt.title}:</strong>
                  <span className="text-slate-600 leading-normal">{pt.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 专家技巧小贴士 */}
          <div className="px-3 py-2 rounded-xl bg-[#EBF8FF]/70 border border-[#66CCFF]/30 flex items-center gap-2 text-[11px] text-slate-600">
            <span className="text-[#0099FF] font-bold shrink-0">💡 技巧:</span>
            <span className="leading-tight">{page.proTip}</span>
          </div>

          {/* 全端操控速记栏 */}
          <div className="px-3 py-2 rounded-xl bg-slate-50 text-[11px] text-slate-400 border border-slate-100 flex items-center justify-between">
            <span>🎮 操控：电脑 WASD/方向键/空格，手机滑屏/虚拟键</span>
            <span className="font-mono text-[10px]">双指令排队防掉头误判</span>
          </div>
        </div>

        {/* 底部翻页控制器与确认栏 */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-[#F8FAFC]/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              currentPage === 0
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 shadow-2xs border border-slate-200/60'
            }`}
          >
            <ChevronLeft size={14} />
            <span>上一页</span>
          </button>

          <div className="flex items-center gap-1.5">
            {PAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  i === currentPage ? 'w-4 bg-[#0099FF]' : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {currentPage < PAGES.length - 1 ? (
            <button
              onClick={() => setCurrentPage((p) => Math.min(PAGES.length - 1, p + 1))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-[#0099FF] hover:bg-[#0088EE] text-white shadow-xs transition-all cursor-pointer"
            >
              <span>下一页</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-white shadow-xs transition-all cursor-pointer"
            >
              启程冒险
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
