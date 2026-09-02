import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

// 页面全局 SEO 元数据与 PWA 应用配置
export const metadata: Metadata = {
  metadataBase: new URL('https://zhixu.online'),
  title: '贪吃蛇',
  description: '方寸之间，重温经典。极简现代主义风格的贪吃蛇网页游戏与竞技排行榜。',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '贪吃蛇' },
  applicationName: '贪吃蛇',
  openGraph: {
    title: '极简贪吃蛇 · 方寸之间 重温经典',
    description: '方寸之间，重温经典。极简现代主义、全屏连续滑屏手势、Level 3 物理重放防作弊竞技排行榜。',
    url: 'https://zhixu.online',
    siteName: '极简贪吃蛇',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: '极简贪吃蛇微拟态图标',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '极简贪吃蛇 · 方寸之间 重温经典',
    description: '极简现代主义、移动优先的全栈贪吃蛇竞技游戏。',
    images: ['/icon.svg'],
  },
};

// 移动端视口设置：锁定 1.0 比例防误触缩放
export const viewport: Viewport = {
  themeColor: '#66CCFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        {/* PWA Service Worker 离线缓存自动注册 */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('PWA ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
