// 轻量、无感、高可靠客户端事件埋点服务 (Analytics Beacon)
const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_URL || '';

export type AnalyticsEvent =
  | 'game_start'
  | 'game_over'
  | 'achievement_unlocked'
  | 'replay_watch'
  | 'replay_finish'
  | 'art_card_export';

interface EventPayload {
  event: AnalyticsEvent;
  timestamp: number;
  properties?: Record<string, unknown>;
  userAgent?: string;
}

export const analytics = {
  track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
    if (typeof window === 'undefined') return;

    const payload: EventPayload = {
      event,
      timestamp: Date.now(),
      properties,
      userAgent: navigator.userAgent,
    };

    // 优先使用浏览器标准异步信标 sendBeacon (切后台与页面关闭不丢点)
    if (ANALYTICS_ENDPOINT && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
        return;
      } catch {}
    }

    // 开发环境与回退降级
    if (process.env.NODE_ENV === 'development') {
      // 本地控制台低频调试跟踪
      // console.debug(`[Analytics] ${event}`, properties);
    }
  },
};
