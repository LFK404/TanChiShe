package database

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"snake-server/pkg/security"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// User 玩家用户实体 (对应 Supabase users 表)
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Password     string    `gorm:"size:100;not null" json:"-"`
	HighScore    int       `gorm:"default:0;index:idx_leaderboard,priority:1,sort:desc" json:"highScore"`
	BestDuration int64     `gorm:"default:0;index:idx_leaderboard,priority:2,sort:asc" json:"bestDuration"`
	ReplaySeed   int64     `gorm:"default:0" json:"replaySeed,omitempty"`
	ReplayInputs string    `gorm:"type:text" json:"replayInputs,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	Token        string    `gorm:"-" json:"token,omitempty"`
}

// GameRecord 战绩流水记录表 (对应 Supabase game_records 表)
type GameRecord struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"index;size:50;not null" json:"username"`
	Score        int       `gorm:"default:0" json:"score"`
	Duration     int64     `gorm:"default:0" json:"duration"`
	ReplaySeed   int64     `gorm:"default:0" json:"replaySeed,omitempty"`
	ReplayInputs string    `gorm:"type:text" json:"replayInputs,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

var DB *gorm.DB

// InitDB 初始化 Supabase PostgreSQL 连接池
func InitDB() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return errors.New("DATABASE_URL 未配置")
	}
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return fmt.Errorf("Supabase 连接失败: %w", err)
	}

	_ = DB.AutoMigrate(&User{}, &GameRecord{})

	if sqlDB, err := DB.DB(); err == nil {
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetMaxOpenConns(20)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)
	}
	return nil
}

// PingDB 真实执行 PingContext 探针，检查数据库健康状态
func PingDB(ctx context.Context) error {
	if DB == nil {
		return errors.New("数据库连接尚未初始化")
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

func checkAndUpgradePassword(user *User, inputPwd string) bool {
	hashed := security.HashPassword(inputPwd)
	if user.Password == hashed {
		return true
	}
	if user.Password == inputPwd {
		user.Password = hashed
		if DB != nil {
			DB.Model(user).Update("password", hashed)
		}
		return true
	}
	return false
}

// Authenticate 统一鉴权、查库与自动注册逻辑
func Authenticate(rawU, rawP string, autoReg bool) (*User, int, string) {
	u, p := strings.TrimSpace(rawU), strings.TrimSpace(rawP)
	if u == "" || p == "" {
		return nil, 400, "账号或密码不能为空"
	}
	if len(u) > 50 || len(p) > 100 {
		return nil, 400, "账号或密码长度超出限制"
	}

	var user User
	err := DB.Where("username = ?", u).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if !autoReg {
				return nil, 401, "认证失效"
			}
			user = User{Username: u, Password: security.HashPassword(p)}
			if err := DB.Create(&user).Error; err != nil {
				return nil, 500, "注册用户失败"
			}
			user.Token = security.SignUserToken(user.Username)
			return &user, 200, ""
		}
		return nil, 500, "数据库查询异常"
	}

	if !checkAndUpgradePassword(&user, p) {
		return nil, 401, "密码错误"
	}
	user.Token = security.SignUserToken(user.Username)
	return &user, 200, ""
}
