# 🐍 贪吃蛇 2026 (TanChiShe) - 极简全栈现代版

[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-blue)](https://nextjs.org/)
[![Go 1.22](https://img.shields.io/badge/Backend-Go%201.22%20Gin-00ADD8)](https://gin-gonic.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🌟 **在线即玩主页**：[https://zhixu.online](https://zhixu.online)  
> 📖 **设计理念**：传承经典街机像素，融入 `better.html`（南大家园极简精修版）的人文留白美学、天青蓝 (`#66CCFF`) 核心主色、等宽几何徽标体系与全栈生产级云原生架构。

---

## 🏛️ 全栈系统拓扑架构

```mermaid
flowchart TD
    subgraph Client["📱 前端 (Next.js 15 + Canvas 2D)"]
        UI["极简纯白舞台 (better.html 人文排版)"]
        Engine["Canvas 2D 游戏引擎 (60 FPS)"]
        Audio["Web Audio API (8-bit 纯数学合成)"]
        Touch["全屏触控滑屏 + 虚拟十字键"]
    end

    subgraph CDN["⚡ 全球边缘加速 (EdgeOne)"]
        EO["腾讯云 EdgeOne Pages (zhixu.online)"]
        SSL["自动 Let's Encrypt SSL + OCSP 证书加速"]
    end

    subgraph Backend["⚙️ 后端服务 (Azure App Service)"]
        Gin["Go 1.22 + Gin API 网关"]
        AntiCheat["物理合理性防刷分校验引擎"]
        GORM["GORM ORM 事务与连接池"]
    end

    subgraph Database["🗄️ 云数据库 (Supabase PostgreSQL)"]
        UsersTable["users (玩家主表 + 降序复合索引)"]
        RecordsTable["game_records (对局流水流水归档表)"]
    end

    Client -->|HTTPS / WSS| EO
    EO --> Client
    Client -->|RESTful API| Gin
    Gin -->|Connection Pooler: 5432| GORM
    GORM --> UsersTable
    GORM --> RecordsTable
```

---

## 🌟 核心特性与设计亮点

1. 🎨 **天青蓝人文美学设计**：
   - 采用天青蓝（**`#66CCFF`**）主品牌色与深天蓝（`#0099FF`）交互色；
   - 纯白（`#FFFFFF`）呼吸底板，搭配单行人文大标题、`3px` 竖线引用金句与双列断开式排行榜。
2. 📱 **移动优先双触控支持**：
   - 支持全屏手指滑动（Swipe 上下左右转向）；
   - 手机端自适应半透明极简虚拟十字键（电脑端自动隐藏）。
3. ⚡ **双指令转向缓冲队列**：
   - 单步物理位移严格消费一个排队方向，彻底杜绝快速连续按键时的原地折返与自杀误判。
4. 🎵 **原生 Web Audio API 8-bit 复古音效**：
   - 纯正弦波数学合成清脆吃果、碰撞与暂停音效，0 外部音频体积依赖；
   - 顶部 Header 配置一键静音切换。
5. 🍎 **动态难度梯度与限时金色幸运果**：
   - 速度随得分平滑递增（`1.0x ~ 2.2x` 实时显示）；
   - 吃果实有几率触发 8 秒限时金色幸运果（+30 分并带顶部天青蓝流光倒计时）。
6. 🏆 **等宽单字几何数字排行榜 (Top 10)**：
   - 22px × 22px 粗体几何徽标（冠军暖琥珀金、亚军天青蓝、季军翡翠绿）；
   - 高亮当前登录玩家 `(我)` 行，并实时计算全服学子超越百分比。
7. 🛡️ **后端物理防刷分防作弊机制**：
   - Go 后端严格校验单局得分/耗时比，拦截恶意脚本瞬发虚假战绩。
8. 🗄️ **Supabase PostgreSQL 生产级持久化**：
   - 引入 GORM 自动迁移（AutoMigrate）与高并发连接池，双表存储玩家账户与每局战绩流水。
9. 📲 **PWA 原生桌面应用支持**：
   - 配置完整 `manifest.json`，手机浏览器可直接“添加到主屏幕”全屏独立沉浸游玩。

---

## 📂 项目模块与目录结构

```text
TanChiShe/
├── client/                     # --- 前端模块 (Next.js 15) ---
│   ├── app/                    # Next.js App Router (layout, page, globals.css, icon.svg)
│   ├── components/             # Header, GameBoard, Leaderboard, LoginCard
│   ├── hooks/                  # useSnakeGame, useAuth
│   ├── services/               # api.ts (后端通信接口)
│   ├── utils/                  # audio.ts (Web Audio API 音效生成器)
│   ├── public/                 # manifest.json (PWA 应用清单)
│   ├── 原型图/                  # better.html, 设计风格与重构设计方案.md
│   ├── .env.example            # 前端环境变量范本
│   └── .gitignore              # 前端专用忽略规则
│
├── server/                     # --- 后端模块 (Go 1.22) ---
│   ├── main.go                 # Gin API 路由、防作弊、GORM 数据库连接
│   ├── go.mod / go.sum         # Go 模块依赖 (Gin, GORM, Postgres)
│   ├── Dockerfile              # 后端多阶段极简容器镜像构建文件
│   ├── .env.example            # 后端环境变量范本
│   └── .gitignore              # 后端专用忽略规则
│
├── supabase/                   # --- 数据库架构迁移 ---
│   └── migrations/             # 20260830000000_create_tables.sql
│
├── .github/workflows/          # GitHub Actions 自动化 CI/CD (Docker Publish)
└── README.md                   # 全局架构与开发文档
```

---

## ⚙️ 环境变量配置指南

### 1. 前端配置 (`client/.env.example`)
```ini
# 后端 API 请求基础地址 (本地: http://localhost:8080 | 线上: Azure 域名)
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

### 2. 后端配置 (`server/.env.example`)
```ini
# 后端监听端口 (默认 8080)
PORT=8080

# Supabase PostgreSQL 数据库连接串
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## 🚀 本地开发与快速上手

### 1. 启动后端 (Go)
```bash
cd server
go run main.go
# 默认在 http://localhost:8080 启动
```

### 2. 启动前端 (Next.js)
```bash
cd client
npm install
npm run dev
# 访问 http://localhost:3000
```

---

## 🌐 生产部署与切线

| 模块 | 托管平台 | 访问地址 | 部署触发方式 |
| :--- | :--- | :--- | :--- |
| **前端 (Next.js)** | 腾讯云 EdgeOne Pages | [https://zhixu.online](https://zhixu.online) | 推送 `main` 分支自动构建静态导出包 |
| **后端 (Go API)** | Azure App Service | `https://tanchishe-....azurewebsites.net` | 推送 `main` 分支由 GitHub Actions 编译发布 Docker 镜像 |
| **数据库 (PostgreSQL)** | Supabase Cloud | `db.itouogbtujieqovjuuew.supabase.co` | 云端托管，支持 GORM 自动建表与连接池 |

---

## 📜 许可证 (License)

本项目遵循 [MIT License](LICENSE) 开源协议。
