# 📱 贪吃蛇 · 前端开发指南

本目录为贪吃蛇前端 Next.js 生产应用源码。

## 🎨 1. 核心设计规范
- 页面底色：纯白 `#FFFFFF`，工作区 `#F8FAFC`，边框 `#E2E8F0`。
- 核心品牌色：天青蓝 `#66CCFF`，深天蓝 `#0099FF`，浅蓝 `#EBF8FF`。
- 图标库：界面统一使用 `lucide-react` 线性矢量图标。
- 音效：基于 `utils/audio.ts` 原生 Web Audio API 振荡器合成 8-bit 音效，0 外部资源体积依赖。

## ⚙️ 2. 环境变量
- `NEXT_PUBLIC_API_BASE`：后端 API 基础请求路径（本地开发默认 `http://localhost:8080`）。
