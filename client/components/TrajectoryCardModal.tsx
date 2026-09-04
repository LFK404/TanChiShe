'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point } from '@/types';
import { TrajectoryEvent } from '@/hooks/useSnake';
import { Download, Copy, Check, Sparkles } from 'lucide-react';
import { sound } from '@/utils/audio';
import { haptics } from '@/utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trajectory: Point[];
  events: TrajectoryEvent[];
  score: number;
  duration: number;
  maxCombo: number;
  steps: number;
  username?: string;
  seed?: number;
}

// 格式化耗时 MM:SS
const formatDur = (sec: number) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// 格式化日期 YYYY.MM.DD
const formatDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}.${m}.${day}`;
};

// Chaikin 算法 2 阶拐角倒角平滑 (将 90° 机械折角化为流体现代样条曲线)
function chaikinSmooth(points: { x: number; y: number }[], iterations = 2): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  let current = points;
  for (let it = 0; it < iterations; it++) {
    const next: { x: number; y: number }[] = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];
      next.push({
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      });
      next.push({
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      });
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

export default function TrajectoryCardModal({
  isOpen,
  onClose,
  trajectory,
  events,
  score,
  duration,
  maxCombo,
  steps,
  username = '极客玩家',
  seed = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  // 离屏 Canvas 生成 900x1200 像素瑞士国际主义生成艺术海报
  const generatePoster = useCallback(() => {
    setIsGenerating(true);
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 底板：温润微米纸质灰白背景
    ctx.fillStyle = '#FAFAF9';
    ctx.fillRect(0, 0, 900, 1200);

    // 2. 四周极简微边框与角标十字准星 (Swiss Style Grid Crosses)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, 820, 1120);

    const drawCross = (cx: number, cy: number) => {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
    };
    drawCross(40, 40);
    drawCross(860, 40);
    drawCross(40, 1160);
    drawCross(860, 1160);

    // 3. 顶部信息头排版
    ctx.fillStyle = '#0099FF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('NCU HOME SNAKE LABORATORY // ARCHIVE NO. ' + (seed ? Math.abs(seed).toString(16).toUpperCase() : '8F3A2B'), 65, 80);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px "Outfit", "Inter", -apple-system, sans-serif';
    ctx.fillText('TRAJECTORY // 走位轨迹生成艺术', 65, 115);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('A generative kinetic topology of decisions, rhythm & fluid space.', 65, 138);

    // 4. 中央艺术展示网格核心区 (24x24 网格映射到 730x730 像素空间)
    const ox = 85;
    const oy = 175;
    const boxSize = 730;
    const cellSize = boxSize / 24;

    // 极淡点阵坐标矩阵 (Dot Matrix Background)
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    for (let r = 0; r <= 24; r++) {
      for (let c = 0; c <= 24; c++) {
        ctx.beginPath();
        ctx.arc(ox + c * cellSize, oy + r * cellSize, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. 轨迹转换与 Chaikin 平滑
    const validPoints: { x: number; y: number }[] = [];
    trajectory.forEach((pt, idx) => {
      if (idx === 0 || pt.x !== trajectory[idx - 1].x || pt.y !== trajectory[idx - 1].y) {
        validPoints.push({
          x: ox + pt.x * cellSize + cellSize / 2,
          y: oy + pt.y * cellSize + cellSize / 2,
        });
      }
    });

    if (validPoints.length >= 2) {
      const smoothed = chaikinSmooth(validPoints, 2);
      const totalSegs = smoothed.length - 1;

      // 分段渲染并应用时序多巴胺流光渐变与半透明热力叠加
      for (let i = 0; i < totalSegs; i++) {
        const p0 = smoothed[i];
        const p1 = smoothed[i + 1];
        const prog = i / totalSegs;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let strokeColor = 'rgba(102, 204, 255, 0.45)';
        let lineWidth = 3.2;

        if (prog < 0.3) {
          // 开局：天青微澜
          strokeColor = 'rgba(102, 204, 255, 0.4)';
          lineWidth = 2.8;
        } else if (prog < 0.65) {
          // 中盘：NCU HOME 深天蓝
          strokeColor = 'rgba(0, 153, 255, 0.55)';
          lineWidth = 3.6;
        } else if (prog < 0.88) {
          // 连击高潮：流金溢彩
          strokeColor = 'rgba(245, 158, 11, 0.7)';
          lineWidth = 4.2;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.35)';
          ctx.shadowBlur = 6;
        } else {
          // 终局绝境：紫罗兰暮光
          strokeColor = 'rgba(139, 92, 246, 0.6)';
          lineWidth = 3.8;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. 进食与事件高光印记
    events.forEach((ev) => {
      const ex = ox + ev.x * cellSize + cellSize / 2;
      const ey = oy + ev.y * cellSize + cellSize / 2;

      if (ev.type === 'BONUS') {
        // 金果印记：璀璨四芒菱形星标 (Golden Diamond Star)
        ctx.save();
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 7);
        ctx.lineTo(ex + 4, ey);
        ctx.lineTo(ex, ey + 7);
        ctx.lineTo(ex - 4, ey);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // 红苹果印记：多巴胺翡翠微标
        ctx.save();
        ctx.fillStyle = '#0099FF';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // 7. 终局落幕点微印 (红色同心圆微标)
    if (validPoints.length > 0) {
      const last = validPoints[validPoints.length - 1];
      ctx.save();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. 底部精工数据看板 (等宽数字排列)
    const cardBy = 945;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(65, cardBy);
    ctx.lineTo(835, cardBy);
    ctx.stroke();

    const drawStat = (x: number, label: string, val: string, color = '#0F172A') => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(label, x, cardBy + 35);
      ctx.fillStyle = color;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(val, x, cardBy + 70);
    };

    drawStat(65, 'SCORE // 最终得分', `${score} PTS`, '#0099FF');
    drawStat(250, 'TIME // 存活耗时', `${formatDur(duration)}`, '#0F172A');
    drawStat(430, 'COMBO // 极速连击', `×${maxCombo}`, maxCombo >= 3 ? '#D97706' : '#0F172A');
    drawStat(610, 'STEPS // 运筹步数', `${steps} TICKS`, '#8B5CF6');

    // 9. 底部签名与 28% 超椭圆 NCU HOME 拟物朱文印章
    const footerY = 1070;
    ctx.fillStyle = '#64748B';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText(`PILOT: ${username}`, 65, footerY);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px monospace';
    ctx.fillText(`DATE: ${formatDate()} // DETERMINISTIC RUNTIME`, 65, footerY + 22);

    // 绘制 NCU HOME 朱红印章 (28% 超椭圆微拟态篆印)
    const sealX = 730;
    const sealY = 1035;
    const sealW = 105;
    const sealH = 48;
    ctx.save();
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(sealX, sealY, sealW, sealH, 12);
    } else {
      ctx.strokeRect(sealX, sealY, sealW, sealH);
    }
    ctx.stroke();

    ctx.fillStyle = '#E11D48';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NCU HOME', sealX + sealW / 2, sealY + 20);
    ctx.font = '9px monospace';
    ctx.fillText('走位珍藏 · VERIFIED', sealX + sealW / 2, sealY + 36);
    ctx.restore();

    canvasRef.current = canvas;
    setImageSrc(canvas.toDataURL('image/png'));
    setIsGenerating(false);
  }, [trajectory, events, score, duration, maxCombo, steps, username, seed]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      generatePoster();
    }, 16);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose, generatePoster]);

  const [fallbackNotice, setFallbackNotice] = useState(false);

  // 一键复制图片到剪贴板 (具备移动端/微信/QQ等受限环境的优雅降级)
  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('ClipboardItem not supported');
      }
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          sound.playToggle();
          haptics.trigger('ui');
          setTimeout(() => setCopied(false), 2000);
        } catch {
          handleDownload();
          setFallbackNotice(true);
          setTimeout(() => setFallbackNotice(false), 2500);
        }
      });
    } catch {
      // 若浏览器限制 ClipboardItem，降级为下载保存
      handleDownload();
      setFallbackNotice(true);
      setTimeout(() => setFallbackNotice(false), 2500);
    }
  };

  // 一键下载高清长图海报
  const handleDownload = () => {
    if (!imageSrc) return;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `ncu_snake_art_${Date.now()}.png`;
    a.click();
    sound.playToggle();
    haptics.trigger('ui');
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 flex flex-col items-center border border-slate-200/80 shadow-2xl relative max-h-[92vh] overflow-y-auto"
      >
        {/* 顶部标题与关闭 */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#EBF8FF] text-[#0099FF] flex items-center justify-center">
              <Sparkles size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">对局走位艺术卡片</h3>
              <p className="text-[10px] text-slate-400">基于您本局真实微操轨迹演算生成</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer font-bold text-xs"
          >
            ✕
          </button>
        </div>

        {/* 核心海报展示区 */}
        <div className="my-4 w-full flex justify-center bg-[#F8FAFC] rounded-2xl p-2.5 border border-slate-200/70 shadow-inner">
          {isGenerating ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-400 gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#0099FF] border-t-transparent rounded-full animate-spin" />
              正在将本局走位拓扑渲染为抽象艺术...
            </div>
          ) : (
            imageSrc && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageSrc}
                alt="对局走位艺术卡片"
                className="w-full max-h-[58vh] object-contain rounded-xl shadow-xs"
              />
            )
          )}
        </div>

        {/* 底部操作按钮栏 */}
        <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] active:scale-[0.98] text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200/60"
          >
            {fallbackNotice ? (
              <Check size={14} className="text-[#0099FF]" />
            ) : copied ? (
              <Check size={14} className="text-[#10B981]" />
            ) : (
              <Copy size={14} />
            )}
            <span>
              {fallbackNotice ? '已为您直接下载' : copied ? '已复制图片' : '复制卡片'}
            </span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.98] text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span>保存高清海报</span>
          </button>
        </div>
      </div>
    </div>
  );
}
