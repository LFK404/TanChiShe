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

// -------------------------------------------------------------
// 1. 结构体定义：用户数据与请求契约
// -------------------------------------------------------------

// UserRecord 用户战绩实体：保存最高纪录与用时
type UserRecord struct {
	Username     string `json:"username"`
	Password     string `json:"password"`
	HighScore    int    `json:"highScore"`    // 个人最高得分
	BestDuration int64  `json:"bestDuration"` // 创下最高分时的用时(秒)
	UpdatedAt    string `json:"updatedAt"`    // 纪录产生时间
}

// 登录/注册请求
type AuthRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// 游戏结算请求
type SettleRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Score    int    `json:"score"`
	Duration int64  `json:"duration"`
}

// -------------------------------------------------------------
// 2. 本地文件持久化管理（带读写锁，防止并发写坏文件）
// -------------------------------------------------------------

type DataStore struct {
	sync.RWMutex
	filePath string
	Users    map[string]*UserRecord `json:"users"`
}

var store *DataStore

func initStore(filePath string) {
	store = &DataStore{
		filePath: filePath,
		Users:    make(map[string]*UserRecord),
	}

	// 尝试读取已有的 json 文件
	data, err := os.ReadFile(filePath)
	if err == nil {
		var temp struct {
			Users map[string]*UserRecord `json:"users"`
		}
		if jsonErr := json.Unmarshal(data, &temp); jsonErr == nil && temp.Users != nil {
			store.Users = temp.Users
		}
	}
}

// 保存内存数据到文件
func (s *DataStore) persist() {
	// 注意：调用前外部必须已经持有锁
	wrapper := struct {
		Users map[string]*UserRecord `json:"users"`
	}{
		Users: s.Users,
	}

	bytes, err := json.MarshalIndent(wrapper, "", "  ")
	if err == nil {
		_ = os.WriteFile(s.filePath, bytes, 0644)
	}
}

// -------------------------------------------------------------
// 3. 主程序与路由定义
// -------------------------------------------------------------

func main() {
	// 初始化本地数据库
	initStore("users.json")

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 配置跨域中间件，方便本地与 EdgeOne 代理访问
	r.Use(cors.New(cors.Config{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API 路由组
	api := r.Group("/api")
	{
		// 1. 玩家鉴权：已存在则验证密码，不存在则自动注册并建档
		api.POST("/auth", handleAuth)

		// 2. 游戏结算：判定是否刷新历史最高分（同分比耗时）
		api.POST("/settle", handleSettle)

		// 3. 排行榜查询：获取全局 Top 10
		api.GET("/leaderboard", handleLeaderboard)
	}

	fmt.Println("🚀 TanChiShe Backend API running on http://localhost:8080")
	_ = r.Run(":8080")
}

// -------------------------------------------------------------
// 4. 业务处理函数
// -------------------------------------------------------------

func handleAuth(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入完整的用户名和密码"})
		return
	}

	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)
	if username == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "用户名或密码不能为空白字符"})
		return
	}

	store.Lock()
	defer store.Unlock()

	user, exists := store.Users[username]
	if !exists {
		// 用户不存在：直接自动注册建档
		newUser := &UserRecord{
			Username:     username,
			Password:     password,
			HighScore:    0,
			BestDuration: 0,
			UpdatedAt:    time.Now().Format("2006-01-02 15:04:05"),
		}
		store.Users[username] = newUser
		store.persist()

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "注册并登录成功",
			"data":    newUser,
		})
		return
	}

	// 用户已存在：校验密码
	if user.Password != password {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "密码错误，请核对后重试"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "登录成功",
		"data":    user,
	})
}

func handleSettle(c *gin.Context) {
	var req SettleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "结算参数异常"})
		return
	}

	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)
	if username == "" || req.Score < 0 || req.Duration < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "非法的结算数据"})
		return
	}

	store.Lock()
	defer store.Unlock()

	user, exists := store.Users[username]
	if !exists || user.Password != password {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "用户认证失效"})
		return
	}

	// 核心业务算法：判断是否打破个人最佳战绩
	// 条件1：当前得分绝对高于历史最高分
	// 条件2：当前得分等于最高分，但通关耗时更短
	isNewRecord := false
	if req.Score > user.HighScore {
		isNewRecord = true
	} else if req.Score == user.HighScore && req.Score > 0 {
		if user.BestDuration == 0 || req.Duration < user.BestDuration {
			isNewRecord = true
		}
	}

	if isNewRecord {
		user.HighScore = req.Score
		user.BestDuration = req.Duration
		user.UpdatedAt = time.Now().Format("2006-01-02 15:04:05")
		store.persist()
	}

	c.JSON(http.StatusOK, gin.H{
		"code":        200,
		"message":     "战绩结算完成",
		"isNewRecord": isNewRecord,
		"data":        user,
	})
}

func handleLeaderboard(c *gin.Context) {
	store.RLock()
	defer store.RUnlock()

	// 把 map 转换为切片以进行多权重排序
	list := make([]*UserRecord, 0, len(store.Users))
	for _, u := range store.Users {
		// 过滤掉得分为0的空账号，增强榜单展示质量
		if u.HighScore > 0 {
			list = append(list, u)
		}
	}

	// 双重排序：分数降序 -> 耗时升序
	sort.Slice(list, func(i, j int) bool {
		if list[i].HighScore == list[j].HighScore {
			return list[i].BestDuration < list[j].BestDuration
		}
		return list[i].HighScore > list[j].HighScore
	})

	// 仅取前 10 名
	limit := 10
	if len(list) < limit {
		limit = len(list)
	}

	// 脱敏处理，不输出密码字段
	type SafeUser struct {
		Username     string `json:"username"`
		HighScore    int    `json:"highScore"`
		BestDuration int64  `json:"bestDuration"`
		UpdatedAt    string `json:"updatedAt"`
	}

	result := make([]SafeUser, limit)
	for i := 0; i < limit; i++ {
		result[i] = SafeUser{
			Username:     list[i].Username,
			HighScore:    list[i].HighScore,
			BestDuration: list[i].BestDuration,
			UpdatedAt:    list[i].UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}