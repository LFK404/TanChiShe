-- 增量数据库迁移脚本：支持电竞对局录像回放 (种子与操作轨迹)
-- 适用于已有旧数据库实例的幂等无感扩容

ALTER TABLE users ADD COLUMN IF NOT EXISTS replay_seed BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS replay_inputs TEXT;

ALTER TABLE game_records ADD COLUMN IF NOT EXISTS replay_seed BIGINT NOT NULL DEFAULT 0;
ALTER TABLE game_records ADD COLUMN IF NOT EXISTS replay_inputs TEXT;
