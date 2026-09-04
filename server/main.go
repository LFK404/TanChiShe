package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"snake-server/pkg/database"
	"snake-server/pkg/engine"
	"snake-server/pkg/security"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type AuthReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type GameSettleReq struct {
	SessionToken string               `json:"sessionToken" binding:"required"`
	Inputs       []engine.InputRecord `json:"inputs"`
	TotalTicks   int                  `json:"totalTicks" binding:"required"`
}

func extractUser(c *gin.Context) (*database.User, error) {
	authHeader := c.GetHeader("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, errors.New("缺少身份认证令牌")
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	username, err := security.ParseUserToken(token)
	if err != nil {
		return nil, err
	}
	var user database.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, errors.New("用户不存在或登录已过期")
	}
	return &user, nil
}

func main() {
	security.CheckSecretHealth()

	if err := database.InitDB(); err != nil {
		fmt.Printf("[WARN] 数据库初始化提示: %v\n", err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 跨域与全局限流中间件
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:    []string{"*"},
	}))
	r.Use(security.RateLimitMiddleware())

	// 1. 云原生健康与就绪探针 (Liveness & Readiness Probe)
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "Snake Go API (Level 3 AntiCheat & Modular Clean Architecture)",
		})
	})

	r.GET("/healthz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := database.PingDB(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy", "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "database": "connected"})
	})

	r.GET("/readyz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	api := r.Group("/api")
	{
		// 1. 用户登录/自动注册
		api.POST("/auth", func(c *gin.Context) {
			if database.DB == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库未就绪"})
				return
			}
			var req AuthReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数不完整"})
				return
			}
			user, status, msg := database.Authenticate(req.Username, req.Password, true)
			if user == nil {
				c.JSON(status, gin.H{"code": status, "message": msg})
				return
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "data": user})
		})

		// 2. 对局握手开局：下发 HMAC 签名无状态会话 Token 与确定性随机种子
		api.POST("/game/start", func(c *gin.Context) {
			user, err := extractUser(c)
			username := ""
			if err == nil && user != nil {
				username = user.Username
			}

			sessionToken, seed := security.CreateSignedSessionToken(username)
			c.JSON(http.StatusOK, gin.H{
				"code": 200,
				"data": gin.H{
					"sessionToken": sessionToken,
					"seed":         seed,
				},
			})
		})

		// 3. 战绩结算：Go 后端 1ms 物理重放 + 真实流逝时间双重拦截
		api.POST("/game/settle", func(c *gin.Context) {
			if database.DB == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库未就绪"})
				return
			}
			var req GameSettleReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数格式异常"})
				return
			}

			// 验签并消费对局 Token
			payload, err := security.VerifyAndConsumeSessionToken(req.SessionToken)
			if err != nil {
				c.JSON(http.StatusForbidden, gin.H{"code": 403, "message": err.Error()})
				return
			}

			// 鉴权用户
			user, err := extractUser(c)
			if err != nil || user == nil {
				c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "身份认证失效，请重新登录"})
				return
			}

			// 防越权代打漏洞 (IDOR)：严格校验令牌签署用户与当前登录用户的一致性
			if payload.Username != "" && payload.Username != user.Username {
				c.JSON(http.StatusForbidden, gin.H{"code": 403, "message": "对局令牌与当前结算用户不匹配，禁止越权提交战绩"})
				return
			}

			// 物理重放整个游戏
			verifiedScore, verifiedLength, verifiedDuration, isDead, err := engine.ReplayGame(payload.Seed, req.Inputs, req.TotalTicks)
			if err != nil || !isDead {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": fmt.Sprintf("战绩防作弊验算未通过: %v", err),
				})
				return
			}

			// 防线 2：真实物理流逝时间校验
			realElapsedSec := float64(time.Now().UnixMilli()-payload.StartTime) / 1000.0
			minAllowedSec := float64(verifiedDuration) * 0.85
			if realElapsedSec < minAllowedSec {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": fmt.Sprintf("战绩已被安全机制拦截：物理流逝时间不足 (实际 %.1fs < 模拟耗时 %.1fs)", realElapsedSec, minAllowedSec),
				})
				return
			}

			// 序列化按键轨迹流为 JSON
			inputsJSON, _ := json.Marshal(req.Inputs)
			inputsStr := string(inputsJSON)

			// 写入对局流水 (内含分布式唯一 Nonce 约束，防止多节点并发二次重放)
			if database.DB != nil {
				record := database.GameRecord{
					Username:     user.Username,
					SessionNonce: payload.Nonce,
					Score:        verifiedScore,
					Duration:     verifiedDuration,
					ReplaySeed:   int64(payload.Seed),
					ReplayInputs: inputsStr,
				}
				if err := database.DB.Create(&record).Error; err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"code":    400,
						"message": "该对局已被结算消费，禁止重复提交战绩",
					})
					return
				}
			}

			// 判定是否创下个人新纪录 (原子化安全条件更新并保存最高分录像轨迹)
			isNew := verifiedScore > user.HighScore || (verifiedScore == user.HighScore && verifiedScore > 0 && (user.BestDuration == 0 || verifiedDuration < user.BestDuration))
			if isNew && database.DB != nil {
				user.HighScore = verifiedScore
				user.BestDuration = verifiedDuration
				user.ReplaySeed = int64(payload.Seed)
				user.ReplayInputs = inputsStr
				database.DB.Model(user).Where("id = ?", user.ID).Updates(map[string]interface{}{
					"high_score":    verifiedScore,
					"best_duration": verifiedDuration,
					"replay_seed":   int64(payload.Seed),
					"replay_inputs": inputsStr,
				})
			}

			// 保持客户端传入的有效 Bearer Token
			authHeader := c.GetHeader("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				user.Token = strings.TrimPrefix(authHeader, "Bearer ")
			}

			c.JSON(http.StatusOK, gin.H{
				"code":        200,
				"isNewRecord": isNew,
				"data": gin.H{
					"score":       verifiedScore,
					"length":      verifiedLength,
					"duration":    verifiedDuration,
					"isNewRecord": isNew,
					"user":        user,
				},
			})
		})

		// 4. 历史遗留 settle 接口拦截
		api.POST("/settle", func(c *gin.Context) {
			c.JSON(http.StatusUpgradeRequired, gin.H{
				"code":    426,
				"message": "安全协议已全面升级为 Level 3 确定性重放验证，请升级客户端参与竞技排行！",
			})
		})

		// 5. 获取 Top 10 全服排行榜
		api.GET("/leaderboard", func(c *gin.Context) {
			var list []database.User
			if database.DB != nil {
				_ = database.DB.Where("high_score > 0 OR best_duration > 0").
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

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	fmt.Println("[INFO] Server exited successfully.")
}
