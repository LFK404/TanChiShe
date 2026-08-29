package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
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

func initDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://postgres.itouogbtujieqovjuuew:15880993898lfk@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		fmt.Println("[WARN] Supabase PostgreSQL connect failed:", err)
		return
	}

	// 自动同步与迁移数据表结构
	if err = db.AutoMigrate(&User{}, &GameRecord{}); err != nil {
		fmt.Println("[WARN] AutoMigrate warning:", err)
	} else {
		fmt.Println("[INFO] Supabase PostgreSQL schema connected and migrated successfully!")
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

			var user User
			result := db.Where("username = ?", u).First(&user)
			if result.Error != nil {
				if result.Error == gorm.ErrRecordNotFound {
					user = User{
						Username: u,
						Password: p,
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
				if user.Password != p {
					c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "密码错误"})
					return
				}
			}

			c.JSON(http.StatusOK, gin.H{"code": 200, "data": user})
		})

		// 对局战绩结算
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

			// 防刷分物理校验
			if req.Score > 0 {
				maxPossibleScore := int((req.Duration+2)*4) * 10
				if req.Duration < 3 && req.Score > 40 {
					c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "战绩数据异常，已被安全机制拦截"})
					return
				}
				if req.Score > maxPossibleScore && req.Duration < 10 {
					c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "战绩数据异常，已被安全机制拦截"})
					return
				}
			}

			var user User
			if err := db.Where("username = ?", u).First(&user).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "认证失效"})
				return
			}
			if user.Password != p {
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
	fmt.Println("[INFO] Backend API running on port " + port)
	_ = r.Run(":" + port)
}
