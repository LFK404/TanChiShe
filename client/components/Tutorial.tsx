import React from 'react';
import { NCUNumberBadge, NCUTutorialIcon } from './NCUIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 核心规则分段条目配置 (南大家园多巴胺微标体系)
const TUTORIAL_SECTIONS = [
  {
    num: '01',
    color: '#D97706',
    bg: '#FEF3C7',
    title: '走过的路不能再踩！',
    desc: '蛇在移动时尾部会留下灰色残留方格轨迹，走过的路会变成障碍死路，不可再次碰撞折返！',
  },
  {
    num: '02',
    color: '#EF4444',
    bg: '#FEE2E2',
    title: '普通红苹果 (+10分 · 清空身后死路)',
    desc: '吃掉红苹果后蛇身增长 1 节，并瞬间清除身后所有残留的死路轨迹，让战场重新恢复开阔！',
  },
  {
    num: '03',
    color: '#F59E0B',
    bg: '#FEF3C7',
    title: '金色幸运果 (+30分 · 保留死路考验走位)',
    desc: '25% 概率出现并开启 8 秒蓝色倒计时消失进度条！吃掉斩获 +30 高分，但残留死路继续保留，极度考验极限走位！',
  },
  {
    num: '04',
    color: '#0099FF',
    bg: '#EBF8FF',
    title: '操控模式与手势反馈',
    desc: '电脑端支持 方向键 / WASD 转向；手机端支持 全屏连续滑屏（带流光与吸附触感），可一键切换「沉浸滑屏视野」或「经典十字键」。空格 / P 键随时暂停。',
  },
];

// 游戏新手规则教学模态弹窗组件 (极简现代排版，零 AI 模板感)
export default function Tutorial({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 flex flex-col text-[#0F172A] relative shadow-2xl border border-slate-100">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <NCUTutorialIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0F172A]">游戏新手指南</h2>
              <p className="text-[11px] text-[#94A3B8]">30 秒掌握核心生存法则与高分技巧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-all cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* 规则条目卡片流 */}
        <div className="flex flex-col gap-3 py-4">
          {TUTORIAL_SECTIONS.map((sec, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100"
            >
              <NCUNumberBadge num={sec.num} color={sec.color} bg={sec.bg} />
              <div className="flex-1">
                <h3 className="text-xs font-bold text-[#0F172A] mb-0.5">{sec.title}</h3>
                <p className="text-[11px] text-[#64748B] leading-relaxed">{sec.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 底部确认按钮 */}
        <button
          onClick={onClose}
          className="w-full bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.99] text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_2px_10px_rgba(0,153,255,0.25)] cursor-pointer text-xs"
        >
          我已掌握，开始狂飙！
        </button>
      </div>
    </div>
  );
}
