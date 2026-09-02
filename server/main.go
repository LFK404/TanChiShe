package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
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

// 玩家操作轨迹按键记录
type InputRecord struct {
	Tick int    `json:"tick"`
	Dir  string `json:"dir"`
}

// 开局握手请求/返回载荷
type GameStartReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type GameStartResp struct {
	SessionToken string `json:"sessionToken"`
	Seed         uint32 `json:"seed"`
}

// 战绩结算请求载荷 (提交操作流轨迹由服务端 1ms 重放)
type GameSettleReq struct {
	Username     string        `json:"username"`
	Password     string        `json:"password"`
	SessionToken string        `json:"sessionToken" binding:"required"`
	Inputs       []InputRecord `json:"inputs"`
	TotalTicks   int           `json:"totalTicks" binding:"required"`
}

var db *gorm.DB

// 极简滑动窗口并发限流器 (单 IP 20次/秒，防高频刷榜与 DDoS)
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

// -------------------------------------------------------------
// Level 3 确定性 PRNG 算法 (Mulberry32，与前端 TypeScript 100% 对齐)
// -------------------------------------------------------------

type Mulberry32 struct {
	seed uint32
}

func NewMulberry32(seed uint32) *Mulberry32 {
	return &Mulberry32{seed: seed}
}

func (m *Mulberry32) Next() float64 {
	m.seed += 0x6D2B79F5
	t := m.seed ^ (m.seed >> 15)
	t *= (m.seed | 1)
	t ^= t + (t ^ (t >> 7))*(t|61)
	return float64((t^(t>>14))>>0) / 4294967296.0
}

// -------------------------------------------------------------
// 对局 Session 管理 (开局握手生命周期与防重放)
// -------------------------------------------------------------

type GameSession struct {
	SessionToken string
	Username     string
	Seed         uint32
	StartTime    time.Time
	Used         bool
}

var (
	sessionsMu sync.Mutex
	sessions   = make(map[string]*GameSession)
)

func createGameSession(username string) *GameSession {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	token := hex.EncodeToString(b)

	seedBig, _ := rand.Int(rand.Reader, big.NewInt(0xFFFFFFFF))
	seed := uint32(seedBig.Uint64())

	sess := &GameSession{
		SessionToken: token,
		Username:     username,
		Seed:         seed,
		StartTime:    time.Now(),
		Used:         false,
	}

	sessionsMu.Lock()
	sessions[token] = sess
	// 清理 2 小时前过期的旧 session
	cutoff := time.Now().Add(-2 * time.Hour)
	for k, v := range sessions {
		if v.StartTime.Before(cutoff) {
			delete(sessions, k)
		}
	}
	sessionsMu.Unlock()

	return sess
}

func getAndConsumeSession(token string) (*GameSession, error) {
	sessionsMu.Lock()
	defer sessionsMu.Unlock()

	sess, ok := sessions[token]
	if !ok {
		return nil, errors.New("无效的对局会话 Token 或会话已过期")
	}
	if sess.Used {
		return nil, errors.New("该对局会话已被使用，禁止重复提交战绩")
	}
	sess.Used = true
	return sess, nil
}

// -------------------------------------------------------------
// Go 后端 1ms 贪吃蛇无头仿真重放物理引擎 (Headless Replay Engine)
// -------------------------------------------------------------

const (
	GRID          = 24
	BASE_SPEED_MS = 122
	MIN_SPEED_MS  = 61
)

type Point struct {
	X int
	Y int
}

func isOpposite(d1, d2 string) bool {
	return (d1 == "UP" && d2 == "DOWN") || (d1 == "DOWN" && d2 == "UP") ||
		(d1 == "LEFT" && d2 == "RIGHT") || (d1 == "RIGHT" && d2 == "LEFT")
}

var dirDeltas = map[string]Point{
	"UP":    {X: 0, Y: -1},
	"DOWN":  {X: 0, Y: 1},
	"LEFT":  {X: -1, Y: 0},
	"RIGHT": {X: 1, Y: 0},
}

// spawnFoodInReplay 严格对应前端 spawnFood 算法
func spawnFoodInReplay(rng *Mulberry32, snake []Point, fence map[string]bool, currentBonus *Point) (*Point, *Point) {
	snakeKeys := make(map[string]bool)
	for _, p := range snake {
		snakeKeys[fmt.Sprintf("%d,%d", p.X, p.Y)] = true
	}

	var empty []Point
	for r := 0; r < GRID; r++ {
		for c := 0; c < GRID; c++ {
			k := fmt.Sprintf("%d,%d", c, r)
			if !snakeKeys[k] && !fence[k] {
				empty = append(empty, Point{X: c, Y: r})
			}
		}
	}

	if len(empty) == 0 {
		return nil, currentBonus
	}

	// 1. 红苹果保底生成 (消费 1 个随机数)
	r1 := rng.Next()
	foodIdx := int(r1 * float64(len(empty)))
	newFood := empty[foodIdx]

	// 2. 金色幸运果判定 (消费第 2 个随机数)
	r2 := rng.Next()
	newBonus := currentBonus
	if r2 < 0.25 && currentBonus == nil && len(empty) > 3 {
		var remainingEmpty []Point
		for _, p := range empty {
			if p.X != newFood.X || p.Y != newFood.Y {
				remainingEmpty = append(remainingEmpty, p)
			}
		}
		if len(remainingEmpty) > 0 {
			// 消费第 3 个随机数选择金果坐标
			r3 := rng.Next()
			bonusIdx := int(r3 * float64(len(remainingEmpty)))
			bp := remainingEmpty[bonusIdx]
			newBonus = &bp
		}
	}

	return &newFood, newBonus
}

// ReplayGame 在内存中完整重跑整个游戏，输出服务端验证的得分、长度与是否真正死亡
func ReplayGame(seed uint32, inputs []InputRecord, totalTicks int) (int, int, int64, bool, error) {
	if totalTicks <= 0 || totalTicks > 20000 {
		return 0, 0, 0, false, errors.New("步数超出合理物理范围")
	}

	rng := NewMulberry32(seed)
	snake := []Point{{X: 10, Y: 12}, {X: 9, Y: 12}, {X: 8, Y: 12}}
	fence := make(map[string]bool)
	dir := "RIGHT"
	var queue []string
	score := 0
	speedMs := BASE_SPEED_MS
	var bonusPoint *Point
	bonusExpireTick := 0
	totalElapsedMs := 0

	// 初始开局生成第一颗红果与金果
	food, bp := spawnFoodInReplay(rng, snake, fence, bonusPoint)
	if food == nil {
		return 0, 0, 0, false, errors.New("开局网格异常")
	}
	bonusPoint = bp
	if bonusPoint != nil {
		bonusExpireTick = int(8000 / speedMs)
	}

	// 按 tick 聚合输入
	inputsMap := make(map[int][]string)
	for _, in := range inputs {
		d := in.Dir
		if d == "UP" || d == "DOWN" || d == "LEFT" || d == "RIGHT" {
			inputsMap[in.Tick] = append(inputsMap[in.Tick], d)
		}
	}

	isDead := false

	for tick := 0; tick < totalTicks; tick++ {
		totalElapsedMs += speedMs

		// 1. 处理在当前 tick 按下的方向键入队 (最大深度 2)
		if dirs, ok := inputsMap[tick]; ok {
			for _, d := range dirs {
				last := dir
				if len(queue) > 0 {
					last = queue[len(queue)-1]
				}
				if d != last && !isOpposite(last, d) && len(queue) < 2 {
					queue = append(queue, d)
				}
			}
		}

		// 2. 消费转向队列
		if len(queue) > 0 {
			nextDir := queue[0]
			queue = queue[1:]
			if !isOpposite(dir, nextDir) {
				dir = nextDir
			}
		}

		// 3. 计算新蛇头坐标
		delta := dirDeltas[dir]
		head := Point{X: snake[0].X + delta.X, Y: snake[0].Y + delta.Y}

		// 4. 边界碰撞检测
		if head.X < 0 || head.X >= GRID || head.Y < 0 || head.Y >= GRID {
			if tick == totalTicks-1 {
				isDead = true
				break
			}
			return 0, 0, 0, false, fmt.Errorf("蛇在第 %d 步提前撞墙死亡", tick)
		}

		// 5. 自身身体碰撞检测
		isEatingApple := (food != nil && head.X == food.X && head.Y == food.Y)
		bodyToCheck := snake
		if !isEatingApple {
			bodyToCheck = snake[:len(snake)-1]
		}
		hitBody := false
		for _, p := range bodyToCheck {
			if p.X == head.X && p.Y == head.Y {
				hitBody = true
				break
			}
		}
		if hitBody {
			if tick == totalTicks-1 {
				isDead = true
				break
			}
			return 0, 0, 0, false, fmt.Errorf("蛇在第 %d 步提前撞自身死亡", tick)
		}

		// 6. 吃到普通红苹果 (长身子 + 清空栅栏 + 动态加速)
		if isEatingApple {
			snake = append([]Point{head}, snake...)
			score += 10
			fence = make(map[string]bool) // 清空栅栏
			speedMs = max(MIN_SPEED_MS, BASE_SPEED_MS-(score/40)*4)
			food, bonusPoint = spawnFoodInReplay(rng, snake, fence, bonusPoint)
			if bonusPoint != nil && bonusExpireTick == 0 {
				bonusExpireTick = tick + int(8000/speedMs)
			}
			continue
		}

		// 7. 残留栅栏碰撞检测
		if fence[fmt.Sprintf("%d,%d", head.X, head.Y)] {
			if tick == totalTicks-1 {
				isDead = true
				break
			}
			return 0, 0, 0, false, fmt.Errorf("蛇在第 %d 步提前撞栅栏死路", tick)
		}

		// 8. 吃到金色幸运果 (+30 分，保留栅栏)
		if bonusPoint != nil && head.X == bonusPoint.X && head.Y == bonusPoint.Y {
			score += 30
			bonusPoint = nil
			bonusExpireTick = 0
		}

		// 9. 金色幸运果 8 秒倒计时过期
		if bonusExpireTick > 0 && tick >= bonusExpireTick {
			bonusPoint = nil
			bonusExpireTick = 0
		}

		// 10. 正常移动：蛇头前进，蛇尾留下栅栏
		nextSnake := append([]Point{head}, snake...)
		tail := nextSnake[len(nextSnake)-1]
		nextSnake = nextSnake[:len(nextSnake)-1]
		fence[fmt.Sprintf("%d,%d", tail.X, tail.Y)] = true
		snake = nextSnake
	}

	durationSec := int64(totalElapsedMs / 1000)
	if durationSec < 1 {
		durationSec = 1
	}

	return score, len(snake), durationSec, isDead, nil
}

// -------------------------------------------------------------
// 数据库与鉴权
// -------------------------------------------------------------

func hashPassword(p string) string {
	h := sha256.Sum256([]byte(p + "_ncu_snake_salt_2026"))
	return hex.EncodeToString(h[:])
}

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
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "Snake Go API (Level 3 AntiCheat)", "database": st})
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
		// 1. 用户登录/自动注册
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

		// 2. 对局握手开局：下发加密会话 Token 与确定性 PRNG 随机种子
		api.POST("/game/start", func(c *gin.Context) {
			var req GameStartReq
			_ = c.ShouldBindJSON(&req)

			username := strings.TrimSpace(req.Username)
			session := createGameSession(username)

			c.JSON(http.StatusOK, gin.H{
				"code": 200,
				"data": GameStartResp{
					SessionToken: session.SessionToken,
					Seed:         session.Seed,
				},
			})
		})

		// 3. 终极战绩结算：Go 后端 1ms 内存物理重放按键流，由服务端计算真实战绩！
		api.POST("/game/settle", func(c *gin.Context) {
			if db == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"code": 503, "message": "数据库未就绪"})
				return
			}
			var req GameSettleReq
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数格式异常"})
				return
			}

			// 校验并消费会话 Token
			session, err := getAndConsumeSession(req.SessionToken)
			if err != nil {
				c.JSON(http.StatusForbidden, gin.H{"code": 403, "message": err.Error()})
				return
			}

			// 鉴权用户
			user, status, msg := authenticate(req.Username, req.Password, false)
			if user == nil {
				c.JSON(status, gin.H{"code": status, "message": msg})
				return
			}

			// 物理重放整个游戏
			verifiedScore, verifiedLength, verifiedDuration, isDead, err := ReplayGame(session.Seed, req.Inputs, req.TotalTicks)
			if err != nil || !isDead {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": fmt.Sprintf("战绩防作弊验算未通过: %v", err),
				})
				return
			}

			// 写入对局流水 (只以服务端验算出的真实战绩为准！)
			db.Create(&GameRecord{
				Username: user.Username,
				Score:    verifiedScore,
				Duration: verifiedDuration,
			})

			// 判定是否创下个人新纪录
			isNew := verifiedScore > user.HighScore || (verifiedScore == user.HighScore && verifiedScore > 0 && (user.BestDuration == 0 || verifiedDuration < user.BestDuration))
			if isNew {
				user.HighScore = verifiedScore
				user.BestDuration = verifiedDuration
				db.Save(user)
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

		// 4. 历史遗留 settle 接口降级拦截 (防止老脚本直接调用)
		api.POST("/settle", func(c *gin.Context) {
			c.JSON(http.StatusUpgradeRequired, gin.H{
				"code":    426,
				"message": "安全协议已全面升级为 Level 3 确定性重放验证，请升级客户端参与竞技排行！",
			})
		})

		// 5. 获取 Top 10 全服排行榜
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

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	fmt.Println("[INFO] Server exited successfully.")
}
