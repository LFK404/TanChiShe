-- Supabase Migration: 玩家表与对局流水表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    high_score INTEGER NOT NULL DEFAULT 0,
    best_duration BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_leaderboard ON users (high_score DESC, best_duration ASC);

CREATE TABLE IF NOT EXISTS game_records (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    duration BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_username ON game_records (username, created_at DESC);

-- 开启行级安全防护 (Row Level Security)，防止通过 Supabase REST API 非法越权操作
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;
