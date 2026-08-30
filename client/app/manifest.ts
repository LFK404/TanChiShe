import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '贪吃蛇 · 经典竞技版',
    short_name: '贪吃蛇',
    description: '方寸之间，重温经典。极简现代主义全栈贪吃蛇网页游戏与竞技排行榜。',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#66CCFF',
    categories: ['games', 'entertainment'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
