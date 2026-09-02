-- 贪吃蛇数据库初始化脚本 (PostgreSQL / Supabase)
-- 包含用户表、战绩流水表、电竞对局录像字段、复合排行榜索引与 RLS 行级安全防护

-- 1. 玩家用户信息表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    high_score INTEGER NOT NULL DEFAULT 0,
    best_duration BIGINT NOT NULL DEFAULT 0,
    replay_seed BIGINT NOT NULL DEFAULT 0,
    replay_inputs TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 复合排行榜高频排序索引：高分降序优先，同分时耗时升序优先
CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON users (high_score DESC, best_duration ASC);

-- 2. 战绩历史对局流水表
CREATE TABLE IF NOT EXISTS game_records (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    duration BIGINT NOT NULL DEFAULT 0,
    replay_seed BIGINT NOT NULL DEFAULT 0,
    replay_inputs TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户战绩时间轴查询索引
CREATE INDEX IF NOT EXISTS idx_records_username ON game_records (username, created_at DESC);

-- 3. 开启行级安全防护 (Row Level Security)，防止通过 Supabase 公网 Data API 非法越权读写
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;
