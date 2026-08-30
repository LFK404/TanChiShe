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

// User 玩家实体
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Password     string    `gorm:"size:100;not null" json:"-"`
	HighScore    int       `gorm:"default:0;index:idx_leaderboard,priority:1,sort:desc" json:"highScore"`
	BestDuration int64     `gorm:"default:0;index:idx_leaderboard,priority:2,sort:asc" json:"bestDuration"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// GameRecord 对局战绩流水实体
type GameRecord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"index;size:50;not null" json:"username"`
	Score     int       `gorm:"default:0" json:"score"`
	Duration  int64     `gorm:"default:0" json:"duration"`
	CreatedAt time.Time `json:"createdAt"`
}

type AuthReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type SettleReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Score    int    `json:"score"`
	Duration int64  `json:"duration"`
}

var db *gorm.DB

// 极简内存滑动窗口限流器 (单 IP 限制 20 次/秒，杜绝暴力爆破与 DDoS)
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
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"code":    429,
				"message": "请求过于频繁，请稍候重试",
			})
			return
		}
		ipHits[ip] = append(valid, now)
		ipHitsMu.Unlock()

		c.Next()
	}
}

// 极简加盐哈希计算 (杜绝数据库明文存储密码)
func hashPassword(p string) string {
	h := sha256.Sum256([]byte(p + "_ncu_snake_salt_2026"))
	return hex.EncodeToString(h[:])
}

// 验证密码并支持旧明文平滑升级为加盐哈希
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

func initDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Println("[WARN] DATABASE_URL 未配置，数据库服务未启动。")
		return
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		fmt.Println("[WARN] Supabase PostgreSQL 连接失败:", err)
		return
	}

	// 自动同步与迁移数据表结构
	if err = db.AutoMigrate(&User{}, &GameRecord{}); err != nil {
		fmt.Println("[WARN] AutoMigrate warning:", err)
	} else {
		fmt.Println("[INFO] Supabase PostgreSQL 数据表初始化与迁移成功！")
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetMaxOpenConns(20)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)
	}
}

func main() {
	initDB()
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 根路径健康检查
	r.GET("/", func(c *gin.Context) {
		dbStatus := "connected"
		if db == nil {
			dbStatus = "disconnected"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"service":  "Snake Go API Server",
			"database": dbStatus,
		})
	})

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		AllowCredentials: false,
	}))

	r.Use(RateLimitMiddleware())

	api := r.Group("/api")
	{
		// 玩家登录/自动注册
		api.POST("/auth", func(c *gin.Context) {
			if db == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库连接初始化中，请稍后重试"})
				return
			}

			var req AuthReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数不完整"})
				return
			}
			u, p := strings.TrimSpace(req.Username), strings.TrimSpace(req.Password)
			if u == "" || p == "" {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "账号或密码不能为空"})
				return
			}
			if len(u) > 50 || len(p) > 100 {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "账号或密码长度超出限制"})
				return
			}

			var user User
			result := db.Where("username = ?", u).First(&user)
			if result.Error != nil {
				if errors.Is(result.Error, gorm.ErrRecordNotFound) {
					user = User{
						Username: u,
						Password: hashPassword(p),
					}
					if createErr := db.Create(&user).Error; createErr != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "注册用户失败"})
						return
					}
				} else {
					c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "数据库查询异常"})
					return
				}
			} else {
				if !checkAndUpgradePassword(&user, p) {
					c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "密码错误"})
					return
				}
			}

			c.JSON(http.StatusOK, gin.H{"code": 200, "data": user})
		})

		// 对局战绩结算 (全时长物理防作弊校验)
		api.POST("/settle", func(c *gin.Context) {
			if db == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库连接初始化中，请稍后重试"})
				return
			}

			var req SettleReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数异常"})
				return
			}

			u, p := strings.TrimSpace(req.Username), strings.TrimSpace(req.Password)

			// 严密物理防作弊校验：每秒最大合理吃果速率理论上限 + 基础用时保护
			if req.Score > 0 {
				if req.Duration < 1 {
					c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "战绩异常：游玩时长不足"})
					return
				}
				// 理论最高得分公式：(时长 * 4.0 + 初始缓冲 4) * 10
				maxAllowedScore := int(float64(req.Duration)*4.0+4.0) * 10
				if req.Score > maxAllowedScore || req.Score > 10000 || req.Duration > 7200 {
					c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "战绩数据异常，已被安全机制拦截"})
					return
				}
			}

			var user User
			if err := db.Where("username = ?", u).First(&user).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "认证失效"})
				return
			}
			if !checkAndUpgradePassword(&user, p) {
				c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "密码错误"})
				return
			}

			db.Create(&GameRecord{
				Username: u,
				Score:    req.Score,
				Duration: req.Duration,
			})

			isNewRecord := req.Score > user.HighScore || (req.Score == user.HighScore && req.Score > 0 && (user.BestDuration == 0 || req.Duration < user.BestDuration))
			if isNewRecord {
				user.HighScore = req.Score
				user.BestDuration = req.Duration
				db.Save(&user)
			}

			c.JSON(http.StatusOK, gin.H{"code": 200, "isNewRecord": isNewRecord, "data": user})
		})

		// Top 10 排行榜
		api.GET("/leaderboard", func(c *gin.Context) {
			if db == nil {
				c.JSON(http.StatusOK, gin.H{"code": 200, "data": []User{}})
				return
			}

			var list []User
			err := db.Where("high_score > 0 OR best_duration > 0").
				Order("high_score DESC, best_duration ASC").
				Limit(10).
				Find(&list).Error

			if err != nil {
				c.JSON(http.StatusOK, gin.H{"code": 200, "data": []User{}})
				return
			}

			c.JSON(http.StatusOK, gin.H{"code": 200, "data": list})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		fmt.Println("[INFO] Backend API running on port " + port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			fmt.Printf("[FATAL] Listen error: %s\n", err)
		}
	}()

	// 监听系统停机信号 (SIGINT / SIGTERM)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	fmt.Println("[INFO] Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		fmt.Println("[WARN] Server forced to shutdown:", err)
	}

	fmt.Println("[INFO] Server exited successfully.")
}
