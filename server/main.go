package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// User 玩家实体 (Password 通过 json:"-" 自动在响应中安全隐藏)
type User struct {
	Username     string `json:"username"`
	Password     string `json:"-"`
	HighScore    int    `json:"highScore"`
	BestDuration int64  `json:"bestDuration"`
	UpdatedAt    string `json:"updatedAt"`
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

var (
	storeFile = "users.json"
	storeMu   sync.RWMutex
	users     = make(map[string]*User)
)

func loadStore() {
	data, err := os.ReadFile(storeFile)
	if err == nil {
		var temp struct {
			Users map[string]*User `json:"users"`
		}
		if json.Unmarshal(data, &temp) == nil && temp.Users != nil {
			users = temp.Users
		}
	}
}

func saveStore() {
	bytes, err := json.MarshalIndent(gin.H{"users": users}, "", "  ")
	if err == nil {
		_ = os.WriteFile(storeFile, bytes, 0644)
	}
}

func main() {
	loadStore()
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 根路径健康检查与服务就绪探针 (支持 Azure / Kubernetes / 浏览器探测)
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "TanChiShe Go API Server"})
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

			storeMu.Lock()
			defer storeMu.Unlock()

			user, exists := users[u]
			if !exists {
				user = &User{Username: u, Password: p, UpdatedAt: time.Now().Format("2006-01-02 15:04:05")}
				users[u] = user
				saveStore()
			} else if user.Password != p {
				c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "密码错误"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "data": user})
		})

		// 对局战绩结算
		api.POST("/settle", func(c *gin.Context) {
			var req SettleReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数异常"})
				return
			}

			storeMu.Lock()
			defer storeMu.Unlock()

			user, exists := users[strings.TrimSpace(req.Username)]
			if !exists || user.Password != strings.TrimSpace(req.Password) {
				c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "认证失效"})
				return
			}

			isNewRecord := req.Score > user.HighScore || (req.Score == user.HighScore && req.Score > 0 && (user.BestDuration == 0 || req.Duration < user.BestDuration))
			if isNewRecord {
				user.HighScore = req.Score
				user.BestDuration = req.Duration
				user.UpdatedAt = time.Now().Format("2006-01-02 15:04:05")
				saveStore()
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "isNewRecord": isNewRecord, "data": user})
		})

		// Top 10 排行榜
		api.GET("/leaderboard", func(c *gin.Context) {
			storeMu.RLock()
			defer storeMu.RUnlock()

			list := make([]*User, 0, len(users))
			for _, u := range users {
				if u.HighScore > 0 || u.BestDuration > 0 {
					list = append(list, u)
				}
			}
			sort.Slice(list, func(i, j int) bool {
				if list[i].HighScore == list[j].HighScore {
					return list[i].BestDuration < list[j].BestDuration
				}
				return list[i].HighScore > list[j].HighScore
			})

			limit := 10
			if len(list) < limit {
				limit = len(list)
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "data": list[:limit]})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("🚀 Backend API running on port " + port)
	_ = r.Run(":" + port)
}