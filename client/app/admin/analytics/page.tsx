'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiAnalyticsOverview } from '@/services/api';
import { AnalyticsOverviewResponse, AnalyticsEventRecord } from '@/types';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Users,
  Database,
  Layers,
  Clock,
  Laptop,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AnalyticsEventRecord | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiAnalyticsOverview();
      if (res) {
        setData(res);
        setLastRefreshed(new Date());
      }
    } catch {
      // 错误由 UI 优雅呈现
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    apiAnalyticsOverview()
      .then((res) => {
        if (!ignore && res) {
          setData(res);
          setLastRefreshed(new Date());
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // 格式化时间
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--:--';
    try {
      const d = new Date(timeStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch {
      return timeStr;
    }
  };

  // 极简提取浏览器/平台名称
  const parseUA = (ua?: string) => {
    if (!ua) return '未知设备';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Safari';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Safari/')) return 'Safari';
    return 'Web Client';
  };

  // 事件徽标色彩标签映射
  const getEventBadgeClass = (eventName: string) => {
    switch (eventName) {
      case 'game_start':
        return 'bg-sky-50 text-[#0099FF] border-sky-100';
      case 'game_over':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'user_login':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'replay_watch':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'bonus_eat':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* 顶部导航与操作控制栏 */}
        <header className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-[#EBF8FF] text-slate-600 hover:text-[#0099FF] transition-all cursor-pointer"
              title="返回游戏大厅"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Image
                src="/ncuhome_logo.png"
                alt="NCUHOME"
                width={120}
                height={32}
                className="h-6 w-auto object-contain select-none"
              />
              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#0F172A]">
                埋点数据运营看板
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            {lastRefreshed && (
              <span className="hidden sm:inline font-mono">
                更新于 {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className={`px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
                loading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#0099FF] text-white hover:bg-[#0284C7] active:scale-95 cursor-pointer shadow-xs'
              }`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? '同步中...' : '实时刷新'}</span>
            </button>
          </div>
        </header>

        {/* 核心 KPI 卡片区 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>总埋点事件数</span>
              <Activity size={16} className="text-[#0099FF]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#0F172A] tabular-nums mt-1">
              {loading && !data ? '--' : (data?.totalEvents ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">持续持久化至 PostgreSQL</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>总注册活跃玩家</span>
              <Users size={16} className="text-[#10B981]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#0F172A] tabular-nums mt-1">
              {loading && !data ? '--' : (data?.totalUsers ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">独立认证玩家账号</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>事件类别数</span>
              <Layers size={16} className="text-[#8B5CF6]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-[#0F172A] tabular-nums mt-1">
              {loading && !data ? '--' : (data?.eventBreakdown?.length ?? 0)}
            </div>
            <div className="text-[11px] text-slate-400">涵盖全生命周期链路</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-1 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>数据库表状态</span>
              <Database size={16} className="text-[#F59E0B]" />
            </div>
            <div className="text-sm font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>analytics_events 正常</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">AutoMigrate 自动迁移建表</div>
          </div>
        </div>

        {/* 埋点分布条形图与说明 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Layers size={16} className="text-[#0099FF]" />
              <span>核心行为事件占比分布</span>
            </h2>
            <span className="text-xs text-slate-400">按触发频次降序</span>
          </div>

          {loading && !data ? (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4" />
              <div className="h-4 bg-slate-100 rounded-full animate-pulse w-1/2" />
              <div className="h-4 bg-slate-100 rounded-full animate-pulse w-2/3" />
            </div>
          ) : !data?.eventBreakdown || data.eventBreakdown.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              暂无事件记录，开始一局游戏后即可捕获行为流水。
            </div>
          ) : (
            <div className="space-y-3">
              {data.eventBreakdown.map((item) => {
                const total = data.totalEvents || 1;
                const percent = ((item.count / total) * 100).toFixed(1);
                return (
                  <div key={item.event} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-mono text-[#0F172A]">{item.event}</span>
                      <span className="text-slate-500 font-mono">
                        {item.count.toLocaleString()} 次 ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#66CCFF] to-[#0099FF] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 实时流水明细 (Top 50 最新事件) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Clock size={16} className="text-[#0099FF]" />
              <span>实时流水明细审计 (最新 50 条)</span>
            </h2>
            <span className="text-xs text-slate-400">秒级无感信标回传</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">序号</th>
                  <th className="py-2.5 px-3">事件类型</th>
                  <th className="py-2.5 px-3">关联玩家</th>
                  <th className="py-2.5 px-3">终端平台</th>
                  <th className="py-2.5 px-3">上报时间</th>
                  <th className="py-2.5 px-3 text-right">属性参数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && !data ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      正在从 PostgreSQL 同步流水明细...
                    </td>
                  </tr>
                ) : !data?.recentEvents || data.recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      暂无流水明细数据
                    </td>
                  </tr>
                ) : (
                  data.recentEvents.map((ev, idx) => (
                    <tr key={ev.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{ev.id || idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border ${getEventBadgeClass(
                            ev.event
                          )}`}
                        >
                          {ev.event}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                        {ev.username || <span className="text-slate-300 font-normal">游客</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Laptop size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{parseUA(ev.userAgent)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                        {formatTime(ev.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="text-[#0099FF] hover:text-[#0284C7] font-medium underline underline-offset-2 cursor-pointer"
                        >
                          查看明细
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 参数 JSON 弹窗详情 */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-[#0F172A]">
                事件明细参数 (#{selectedEvent.id} · {selectedEvent.event})
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                关闭
              </button>
            </div>
            <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-3.5 rounded-xl overflow-x-auto max-h-72">
              <pre>{JSON.stringify(JSON.parse(selectedEvent.properties || '{}'), null, 2)}</pre>
            </div>
            <div className="text-[11px] text-slate-400 flex flex-col gap-0.5">
              <div>上报时间: {formatTime(selectedEvent.createdAt)}</div>
              <div className="truncate">User-Agent: {selectedEvent.userAgent}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
