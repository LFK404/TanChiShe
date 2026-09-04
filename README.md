# 🐍 贪吃蛇 (Snake) - 极简全栈现代版

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-blue)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Backend-Go%201.22%20Gin-00ADD8)](https://gin-gonic.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🌟 **在线即玩**：[https://zhixu.online](https://zhixu.online)  
> 📖 **设计理念**：极简纯白留白现代美学 (NCU HOME 视觉风格) + 天青蓝 (`#66CCFF` / `#0099FF`) + 纯代码级矢量无 Emoji 极简设计 + 视听触三位一体沉浸体验。

---

## 🏛️ 系统架构

```mermaid
flowchart LR
    Client["📱 前端 Next.js 15<br>(Canvas 2D + 双轨BGM + 触觉引擎)"]
    CDN["⚡ 边缘加速<br>(EdgeOne @ zhixu.online)"]
    Backend["⚙️ 后端服务<br>(Go Gin 分层架构 @ Azure)"]
    DB["🗄️ 云数据库<br>(Supabase PostgreSQL)"]

    Client <--> CDN
    Client <-->|REST API / HMAC 会话| Backend
    Backend <-->|GORM Pool| DB
```

---

## 🌟 核心特性

- 🎨 **天青蓝现代极简美学**：纯白/浅灰底板 + 天青蓝主色 + 极薄无阴影细线边框，辅以多巴胺四色微点缀与纯矢量线性图标（0 系统 Emoji）。
- 🌙 **全景深空墨蓝夜间模式 (OLED Deep Dark)**：纯矢量超椭圆日/月切换微拟态按钮；全局注入 `#0A0F1D` 深空变量；Header 导航顶栏、控制中心浮层、Canvas 遮罩、虚拟按键、离屏背景，以及成就殿堂、新手指南、走位卡片、登录卡片等全弹窗全景自适应，告别任何白边与反差。
- 🖼️ **走位几何抽象艺术卡片 (Generative Trajectory Art)**：
  - 基于 **Chaikin 2阶样条倒角算法**，将 90° 直角折线平滑为流体书法拓扑折线；
  - 融合**时序色彩渐变**（天青蓝 ➔ 深天蓝 ➔ 连击金 ➔ 暮光紫）与**半透明走位热力密度叠合**；
  - 离屏渲染 900×1200 瑞士国际主义海报，配备等宽战绩看板与 NCU HOME 28% 超椭圆朱红拟物印章，支持一键复制与下载；弹窗采用纯文本与纯净布局，杜绝花哨矢量图标。
- 🏆 **结算面板与段位勋章人文极简**：结算界面移除机械繁琐的战报复制，点亮高饱和微拟态段位勋章高光光晕，去除死因与评价中的粗糙方括号。
- 📜 **本地对局档案谱**：风云榜集成双模胶囊切换，断网与弱网下亦能自动归档最近 10 局对局，支持随时重温与离线唤起走位几何海报。
- 🏆 **风云榜单行纯净排布与战绩微走势**：
  - 得分与最佳耗时严格保持单行同行紧凑呈现且彻底去除多余括号（如 `480 1m 25s`），历史无耗时对局优雅回退仅显得分；
  - 底部个人最高分与排位评语去除层层括号，次行独立沉淀近 5 局得分走势 SVG 微折线，消除文字与折线挤压踩踏。
- ⏳ **极简外置流光导轨与绝对零物理位移**：
  - 移出 Canvas 视界，采用高度恒定为 4px 的极简流光细槽，金果出现与消隐时保持恒定物理占位，**Canvas 棋盘绝对 0 像素位移**；
  - 金果倒计时、临期急速频闪与 3 秒连击时钟完全由物理步序（Simulation Tick）驱动，起步等待态与暂停态物理冻结，消除现实时钟漂移。
- 🌊 **蛇身逐节流体吞咽波 (Organic Digestion Wave)**：进食时正弦微隆起波（40ms/节）从蛇头传导至蛇尾，内部叠加晶莹自发光核（金果流金炽白），赋予流体物理生命力。
- 🐍 **灵动微表情与石化余温微动效**：
  - **蛇头情绪状态机与灵动明眸**：正前方死角时触发濒死惊慌神态（眼白瞪大至 3.0px + 瞳孔骤缩微颤）、吃果触发治愈月牙笑弧（2.5px）、常态明眸微雕放大（眼白 2.6px / 瞳孔 1.45px 附带晶莹微高光）、落幕触发释然闭目；
  - **死路余温石化冷却**：蛇尾蜕下的栅栏在前 180ms 内由浅天青渐变冷却为浅灰石化，告别方块突兀硬刷；
  - **等宽数字防抖动**：全局数值采用 `tabular-nums` 严格等宽对齐，彻底消除数字跳动时的界面抽搐。
- ⚡ **3秒极速连击与阶梯加成 (黄金能量行波)**：
  - 2 连击轻简显示浮字专注走位，3 连击起激活全蛇身 380ms 黄金能量行波（Fluid Golden Wave）与金光流动微描边，波峰亮金、波腰天青、波谷深蓝流畅交织，找回电竞飞驰感且护眼不眩晕；
  - 第 3 次起触发阶梯额外奖励（+5/+10...累加）；剩余 1 秒温和暖橙提示。
- 📳 **视听触三位一体系统**：
  - **多层级触觉引擎**：支持【强力 / 轻柔 / 关闭】三档切换，触觉职责严格单向分层，杜绝双重误触；
  - **温润声学微雕与声卡自愈**：Web Audio 原生合成器接入 2600Hz 低通滤波；暂停时平滑降至 360Hz 沉水声场；发声前自动检测并唤醒 `suspended` 挂起状态；
  - **纯净防重叠双轨 BGM**：大厅温馨吉他与局内元气音乐智能转场；重开对局瞬间自动清退死亡结算延时大厅音轨，严密杜绝音轨重叠共播竞态，切局时滤镜频率强制复位 2600Hz 清澈声场。
- 🏆 **24 枚多巴胺微拟态成就殿堂**：超椭圆圆角底座、不规则灵动曲线、主辅双色共生与暗态/亮态动态激活，配备局中悬浮微弹窗与专属华丽大和弦。
- 🎥 **电竞对局录像回放剧场**：风云榜支持一键【🎥 观摩走位】，支持 `1.0x / 1.5x / 2.0x` 倍速切换与全物理轨迹重放。
- 🛡️ **Level 3 物理重放防作弊与数据库全链路原子事务**：
  - 确定性伪随机种子 (Mulberry32) + Go 后端 1ms 无头物理重放验算真实战绩；
  - 开局独占会话令牌绑定（消费即焚与异步补货）与单次结算互斥锁，彻底杜绝重复提交消费报错；
  - 致命碰撞即时断案退出，彻底消除浏览器帧事件循环调度微小时间差导致的非对齐拒单误杀；
  - GORM 事务原子提交流水入库与最高分/录像轨迹更新，杜绝并发与单步失败；
  - 排行榜接口配置 `Cache-Control: no-store` 与客户端穿透防缓存，破纪录战绩 100% 实时穿透同步展示。
- 📱 **多端全分辨率与高分屏超清适配**：全屏滑屏与微型虚拟十字键双模自适应；Canvas 接入 `window.devicePixelRatio` 缩放物理缓冲区，高分屏超清锐利。
- 🎛️ **极简音频与触感控制中心**：Header 集成 BGM 音量、SFX 音量独立分轨控制滑块与全屏无感透明遮罩。

---

## 📂 目录结构

```text
├── client/                     # 📱 前端 (Next.js 15 App Router + SSG 静态导出)
│   ├── app/                    # 页面入口、PWA Manifest 与全局样式
│   ├── components/             # Board (Canvas 引擎), TrajectoryCardModal (走位艺术海报), Header, Achievements, Leaderboard, Tutorial
│   ├── hooks/                  # useSnake (确定性时序引擎 & 轨迹采集), useAuth (认证持久化)
│   ├── services/api.ts         # REST API 封装 (HMAC 会话握手 & 录像轨迹验算)
│   ├── utils/achievements.ts   # 24 枚成就定义与达成检测引擎
│   ├── utils/audio.ts          # Web Audio API 8-bit 原生合成器 (低通温润滤波 & 沉水透传)
│   ├── utils/haptics.ts        # 工业级多层级触觉振动反馈管理器
│   ├── utils/prng.ts           # Mulberry32 跨语言 32 位确定性 PRNG
│   └── public/                 # 静态资源、矢量图标、音效与 PWA Service Worker
│
├── server/                     # ⚙️ 后端 (Go 1.22+ Gin 标准分层架构)
│   ├── main.go                 # 服务入口、路由配置与优雅停机
│   ├── pkg/engine/             # 1ms 无头物理重放与作弊校验引擎 (含 3 秒连击与阶梯加分)
│   ├── pkg/security/           # 无状态 HMAC 会话令牌与滑动窗口限流器
│   ├── pkg/database/           # GORM 数据库连接池与自动迁移
│   ├── replay_test.go          # 物理重放与防作弊单元测试
│   ├── security_audit_test.go  # 越权、数据篡改与超速外挂安全审计测试
│   └── Dockerfile              # 多阶段容器构建
│
├── docs/                       # 📖 课程实践报告与架构设计规范 (含 Generative Art 说明)
├── supabase/migrations/        # 🗄️ 数据库 SQL 全量与增量迁移文件
├── AGENTS.md                   # 📜 项目开发宪法与技术规范
└── README.md                   # 📖 项目说明文档
```

---

## 🚀 快速上手

### 1. 后端启动
```bash
cd server && go run main.go
# 监听 http://localhost:8080
```

### 2. 前端启动
```bash
cd client && npm install && npm run dev
# 浏览器访问 http://localhost:3000
```

---

## 📜 开源协议

本项目遵循 [MIT License](LICENSE) 协议。
