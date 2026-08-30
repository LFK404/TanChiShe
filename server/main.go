package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// 玩家用户实体 (对应 Supabase users 表)
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Password     string    `gorm:"size:100;not null" json:"-"`
	HighScore    int       `gorm:"default:0;index:idx_leaderboard,priority:1,sort:desc" json:"highScore"`
	BestDuration int64     `gorm:"default:0;index:idx_leaderboard,priority:2,sort:asc" json:"bestDuration"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// 战绩流水记录表 (对应 Supabase game_records 表)
type GameRecord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"index;size:50;not null" json:"username"`
	Score     int       `gorm:"default:0" json:"score"`
	Duration  int64     `gorm:"default:0" json:"duration"`
	CreatedAt time.Time `json:"createdAt"`
}

// 登录/自动注册请求载荷
type AuthReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// 战绩结算请求载荷
type SettleReq struct {
	AuthReq
	Score    int   `json:"score"`
	Duration int64 `json:"duration"`
}

var db *gorm.DB

// 极简滑动窗口并发限流器 (单 IP 20次/秒，防高频刷榜)
var (
	ipHits   = make(map[string][]time.Time)
	ipHitsMu sync.Mutex
)

func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		ipHitsMu.Lock()
		hits := ipHits[ip]
		valid := hits[:0]
		for _, t := range hits {
			if now.Sub(t) < time.Second {
				valid = append(valid, t)
			}
		}
		if len(valid) >= 20 {
			ipHits[ip] = valid
			ipHitsMu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"code": 429, "message": "请求过于频繁，请稍候重试"})
			return
		}
		ipHits[ip] = append(valid, now)
		ipHitsMu.Unlock()
		c.Next()
	}
}

// SHA256 加盐单向哈希
func hashPassword(p string) string {
	h := sha256.Sum256([]byte(p + "_ncu_snake_salt_2026"))
	return hex.EncodeToString(h[:])
}

// 密码校验与历史明文向哈希值的无感静默自升级
func checkAndUpgradePassword(user *User, inputPwd string) bool {
	hashed := hashPassword(inputPwd)
	if user.Password == hashed {
		return true
	}
	if user.Password == inputPwd {
		user.Password = hashed
		if db != nil {
			db.Model(user).Update("password", hashed)
		}
		return true
	}
	return false
}

// 统一鉴权、查库与自动注册逻辑
func authenticate(rawU, rawP string, autoReg bool) (*User, int, string) {
	u, p := strings.TrimSpace(rawU), strings.TrimSpace(rawP)
	if u == "" || p == "" {
		return nil, http.StatusBadRequest, "账号或密码不能为空"
	}
	if len(u) > 50 || len(p) > 100 {
		return nil, http.StatusBadRequest, "账号或密码长度超出限制"
	}

	var user User
	err := db.Where("username = ?", u).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if !autoReg {
				return nil, http.StatusUnauthorized, "认证失效"
			}
			user = User{Username: u, Password: hashPassword(p)}
			if err := db.Create(&user).Error; err != nil {
				return nil, http.StatusInternalServerError, "注册用户失败"
			}
			return &user, http.StatusOK, ""
		}
		return nil, http.StatusInternalServerError, "数据库查询异常"
	}

	if !checkAndUpgradePassword(&user, p) {
		return nil, http.StatusUnauthorized, "密码错误"
	}
	return &user, http.StatusOK, ""
}

// 初始化 PostgreSQL / Supabase 连接池
func initDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Println("[WARN] DATABASE_URL 未配置")
		return
	}
	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)})
	if err != nil {
		fmt.Println("[WARN] Supabase 连接失败:", err)
		return
	}
	_ = db.AutoMigrate(&User{}, &GameRecord{})
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetMaxOpenConns(20)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)
	}
}

func main() {
	initDB()
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 健康检查探针
	r.GET("/", func(c *gin.Context) {
		st := "connected"
		if db == nil {
			st = "disconnected"
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "Snake Go API", "database": st})
	})

	// 跨域与限流中间件
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:    []string{"*"},
	}))
	r.Use(RateLimitMiddleware())

	api := r.Group("/api")
	{
		// 登录/自动注册接口
		api.POST("/auth", func(c *gin.Context) {
			if db == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库未就绪"})
				return
			}
			var req AuthReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数不完整"})
				return
			}
			user, status, msg := authenticate(req.Username, req.Password, true)
			if user == nil {
				c.JSON(status, gin.H{"code": status, "message": msg})
				return
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "data": user})
		})

		// 战绩结算与防作弊校验接口
		api.POST("/settle", func(c *gin.Context) {
			if db == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库未就绪"})
				return
			}
			var req SettleReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数异常"})
				return
			}

			// 严格物理用时与吞吃速率防作弊校验 (极速最高 ~16格/秒，吃果极限平均至少 2.5 秒/颗)
			if req.Score > 0 {
				if req.Duration < 1 {
					c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "战绩异常：时长不足"})
					return
				}
				maxScore := int(float64(req.Duration)*4.0+4.0) * 10
				if req.Score > maxScore || req.Score > 10000 || req.Duration > 7200 {
					c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "战绩已被安全机制拦截"})
					return
				}
			}

			user, status, msg := authenticate(req.Username, req.Password, false)
			if user == nil {
				c.JSON(status, gin.H{"code": status, "message": msg})
				return
			}

			// 写入对局流水
			db.Create(&GameRecord{Username: user.Username, Score: req.Score, Duration: req.Duration})

			// 判定是否创下个人新纪录 (高分优先；同分时用时更短优先)
			isNew := req.Score > user.HighScore || (req.Score == user.HighScore && req.Score > 0 && (user.BestDuration == 0 || req.Duration < user.BestDuration))
			if isNew {
				user.HighScore = req.Score
				user.BestDuration = req.Duration
				db.Save(user)
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "isNewRecord": isNew, "data": user})
		})

		// 获取 Top 10 全服排行榜
		api.GET("/leaderboard", func(c *gin.Context) {
			var list []User
			if db != nil {
				_ = db.Where("high_score > 0 OR best_duration > 0").
					Order("high_score DESC, best_duration ASC").
					Limit(10).
					Find(&list).Error
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "data": list})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{Addr: ":" + port, Handler: r}

	go func() {
		fmt.Println("[INFO] API running on port " + port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			fmt.Printf("[FATAL] Listen error: %s\n", err)
		}
	}()

	// 优雅停机信号捕获
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	fmt.Println("[INFO] Server exited successfully.")
}
