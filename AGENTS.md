# 🐍 贪吃蛇：项目开发宪法与技术规范

本项目是一款极简现代主义、移动优先（Mobile-First）的全栈贪吃蛇 Web 游戏与竞技排行榜系统。

---

## 🎯 1. 核心架构与技术栈

- **前端平台**：Next.js 15 (App Router, 静态导出 SSG) + Canvas 2D 游戏引擎 + Tailwind CSS + Web Audio API 8-bit 原生音效
- **前端托管**：腾讯云 EdgeOne Pages (`https://zhixu.online`)
- **后端服务**：Go 1.22 + Gin 高性能 API 服务，运行于 Azure App Service Linux 容器
- **数据库**：Supabase Cloud PostgreSQL (GORM 自动迁移，`users` 与 `game_records` 双表架构)

---

## 🎨 2. 视觉与交互设计契约

1. **核心色彩体系**：
   - 主品牌色：天青蓝 **`#66CCFF`**（蛇头主色、主要指示条、进度条、竖线强调）
   - 交互强调色：深天蓝 **`#0099FF`**（主要按钮 CTA、高亮激活态）
   - 浅天蓝底色：**`#EBF8FF`**
   - 页面背景：纯白 **`#FFFFFF`** 与浅灰细边线 **`#E2E8F0`**，保持留白与呼吸感。
2. **排版规范**：
   - 页面标题采用单行大字号人文排版，配左侧 `3px` 天青蓝竖线金句；
   - 排行榜名次统一采用 `22px × 22px` 粗体等宽几何数字徽标（1~6 多色体系）。
3. **操作体验**：
   - 移动端支持全屏滑屏（Swipe）与虚拟十字手势；
   - 游戏引擎支持双指令转向排队缓冲队列，杜绝快速按键自杀误判。

---

## 🛡️ 3. 工程与开发准则

- **环境变量**：根目录不存放任何 `.env`，分别下沉至 `client/.env.example` 与 `server/.env.example`。
- **敏感信息**：`.env.local` 与 `.env.production` 严格被 `.gitignore` 忽略，严禁泄露密码至代码仓库。
- **界面图标**：网页 UI 界面统一使用 Lucide 纯矢量线性图标，保持专业严谨。
