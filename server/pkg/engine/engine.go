package engine

import (
	"errors"
	"fmt"
)

// 网格与物理参数常量
const (
	GRID          = 24
	BASE_SPEED_MS = 122
	MIN_SPEED_MS  = 61
)

// Mulberry32 32位确定性伪随机数发生器 (与前端 TypeScript 100% 字节对齐)
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

// Point 二维网格整型坐标
type Point struct {
	X int
	Y int
}

// InputRecord 玩家输入帧轨迹
type InputRecord struct {
	Tick int    `json:"tick"`
	Dir  string `json:"dir"`
}

var dirDeltas = map[string]Point{
	"UP":    {X: 0, Y: -1},
	"DOWN":  {X: 0, Y: 1},
	"LEFT":  {X: -1, Y: 0},
	"RIGHT": {X: 1, Y: 0},
}

func isOpposite(d1, d2 string) bool {
	return (d1 == "UP" && d2 == "DOWN") || (d1 == "DOWN" && d2 == "UP") ||
		(d1 == "LEFT" && d2 == "RIGHT") || (d1 == "RIGHT" && d2 == "LEFT")
}

// spawnFoodInReplay 严格对应前端 spawnFood 生成算法
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

// ReplayGame 在内存中 1ms 无头重跑整个游戏，输出服务端验证的得分、长度、耗时与是否真正死亡
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

		// 1. 消费按键排队 (最大深度 2)
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
			fence = make(map[string]bool)
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
