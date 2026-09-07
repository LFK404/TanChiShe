package engine

import (
	"errors"
	"fmt"
)

// 网格与物理参数常量
const (
	GRID          = 25
	BASE_SPEED_MS = 170
	MIN_SPEED_MS  = 68
)

// CalcSpeedMs 计算当前得分对应的单步时间周期 (毫秒)
// 0.1x 平滑非线性阶梯算速函数 (基础170ms=1.0x，上限68ms=2.5x，每档+0.1x，得分跨度每档逐次+20)
func CalcSpeedMs(score int) int {
	switch {
	case score >= 3600:
		return 68 // 2.5x (极限封顶)
	case score >= 3220:
		return 71 // 2.4x
	case score >= 2860:
		return 74 // 2.3x
	case score >= 2520:
		return 77 // 2.2x
	case score >= 2200:
		return 81 // 2.1x
	case score >= 1900:
		return 85 // 2.0x
	case score >= 1620:
		return 89 // 1.9x
	case score >= 1360:
		return 94 // 1.8x
	case score >= 1120:
		return 100 // 1.7x (残影/心跳开启)
	case score >= 900:
		return 106 // 1.6x
	case score >= 700:
		return 113 // 1.5x
	case score >= 520:
		return 121 // 1.4x
	case score >= 360:
		return 131 // 1.3x
	case score >= 220:
		return 142 // 1.2x
	case score >= 100:
		return 155 // 1.1x
	default:
		return BASE_SPEED_MS // 1.0x (0~99分 170ms)
	}
}

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

type BonusType string

const (
	BonusGold  BonusType = "GOLD"
	BonusFrost BonusType = "FROST"
	BonusPhase BonusType = "PHASE"
)

type BonusItem struct {
	Point Point
	Type  BonusType
}

// spawnFoodInReplay 严格对应前端独立多果生成算法 (金果 20%, 冰果 10%, 虚化果 5%)
func spawnFoodInReplay(rng *Mulberry32, snake []Point, fence map[string]bool, currentBonus *BonusItem) (*Point, *BonusItem) {
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

	// 2. 特殊幸运果判定 (消费第 2 个随机数判定类型：金果 20%、冰果 10%、虚化果 5%)
	r2 := rng.Next()
	newBonus := currentBonus
	if currentBonus == nil && len(empty) > 3 {
		var selectedType BonusType
		if r2 < 0.20 {
			selectedType = BonusGold
		} else if r2 < 0.30 {
			selectedType = BonusFrost
		} else if r2 < 0.35 {
			selectedType = BonusPhase
		}

		if selectedType != "" {
			var remainingEmpty []Point
			for _, p := range empty {
				if p.X != newFood.X || p.Y != newFood.Y {
					remainingEmpty = append(remainingEmpty, p)
				}
			}
			if len(remainingEmpty) > 0 {
				r3 := rng.Next()
				bonusIdx := int(r3 * float64(len(remainingEmpty)))
				bp := remainingEmpty[bonusIdx]
				newBonus = &BonusItem{Point: bp, Type: selectedType}
			}
		}
	}

	return &newFood, newBonus
}

// ReplayGame 在内存中 1ms 无头重跑整个游戏，输出服务端验证的得分、长度、耗时与是否真正死亡
func ReplayGame(seed uint32, inputs []InputRecord, totalTicks int) (int, int, int64, bool, error) {
	if totalTicks <= 0 || totalTicks > 20000 {
		return 0, 0, 0, false, errors.New("步数超出合法区间")
	}

	rng := NewMulberry32(seed)
	snake := []Point{{X: 10, Y: 12}, {X: 9, Y: 12}, {X: 8, Y: 12}}
	fence := make(map[string]bool)
	dir := "RIGHT"
	var queue []string
	score := 0
	speedMs := BASE_SPEED_MS
	var bonusItem *BonusItem
	bonusExpireTick := 0
	totalElapsedMs := 0
	lastEatElapsedMs := -99999
	comboCount := 0
	frostRemainingTicks := 0
	phaseRemainingTicks := 0

	// 初始开局生成第一颗红果与特殊果实
	food, bi := spawnFoodInReplay(rng, snake, fence, bonusItem)
	if food == nil {
		return 0, 0, 0, false, errors.New("开局网格异常")
	}
	bonusItem = bi
	if bonusItem != nil {
		durMs := 8000
		if bonusItem.Type == BonusFrost {
			durMs = 3000
		} else if bonusItem.Type == BonusPhase {
			durMs = 2000
		}
		bonusExpireTick = int(float64(durMs) / float64(speedMs))
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
		currentSpeed := speedMs
		if frostRemainingTicks > 0 {
			currentSpeed = int(float64(speedMs) * 1.45)
			frostRemainingTicks--
		}
		if phaseRemainingTicks > 0 {
			phaseRemainingTicks--
		}
		totalElapsedMs += currentSpeed

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

		// 4. 边界碰撞检测 (虚化果激活时四壁环形传送穿透，否则发生致命碰撞)
		if phaseRemainingTicks > 0 {
			head.X = (head.X + GRID) % GRID
			head.Y = (head.Y + GRID) % GRID
		} else if head.X < 0 || head.X >= GRID || head.Y < 0 || head.Y >= GRID {
			isDead = true
			break
		}

		// 5. 自身身体碰撞检测 (虚化果激活时豁免身体碰撞)
		isEatingApple := (food != nil && head.X == food.X && head.Y == food.Y)
		bodyToCheck := snake
		if !isEatingApple {
			bodyToCheck = snake[:len(snake)-1]
		}
		hitBody := false
		if phaseRemainingTicks == 0 {
			for _, p := range bodyToCheck {
				if p.X == head.X && p.Y == head.Y {
					hitBody = true
					break
				}
			}
		}
		if hitBody {
			isDead = true
			break
		}

		// 6. 吃到普通红苹果 (长身子 + 连击刷新 + 阶梯加分 + 清空栅栏 + 动态加速)
		if isEatingApple {
			snake = append([]Point{head}, snake...)
			if lastEatElapsedMs >= 0 && totalElapsedMs-lastEatElapsedMs <= 3000 {
				comboCount++
			} else {
				comboCount = 1
			}
			lastEatElapsedMs = totalElapsedMs
			extraComboScore := 0
			if comboCount >= 3 {
				extraComboScore = (comboCount - 2) * 5
			}
			score += 10 + extraComboScore

			fence = make(map[string]bool)
			speedMs = CalcSpeedMs(score)
			food, bonusItem = spawnFoodInReplay(rng, snake, fence, bonusItem)
			if bonusItem != nil && bonusExpireTick == 0 {
				durMs := 8000
				if bonusItem.Type == BonusFrost {
					durMs = 3000
				} else if bonusItem.Type == BonusPhase {
					durMs = 2000
				}
				bonusExpireTick = tick + int(float64(durMs)/float64(speedMs))
			}
			continue
		}

		// 7. 残留栅栏碰撞检测 (虚化果激活时豁免死路障壁碰撞)
		if phaseRemainingTicks == 0 && fence[fmt.Sprintf("%d,%d", head.X, head.Y)] {
			isDead = true
			break
		}

		// 8. 吃到特殊幸运果 (金果+30分，冰果+10分减速3s，虚化果+10分穿墙2s)
		if bonusItem != nil && head.X == bonusItem.Point.X && head.Y == bonusItem.Point.Y {
			if lastEatElapsedMs >= 0 && totalElapsedMs-lastEatElapsedMs <= 3000 {
				comboCount++
			} else {
				comboCount = 1
			}
			lastEatElapsedMs = totalElapsedMs
			extraComboScore := 0
			if comboCount >= 3 {
				extraComboScore = (comboCount - 2) * 5
			}

			baseFruitScore := 10
			if bonusItem.Type == BonusGold {
				baseFruitScore = 30
			} else if bonusItem.Type == BonusFrost {
				frostRemainingTicks = int(3000.0 / float64(speedMs))
			} else if bonusItem.Type == BonusPhase {
				phaseRemainingTicks = int(2000.0 / float64(speedMs))
			}

			score += baseFruitScore + extraComboScore
			bonusItem = nil
			bonusExpireTick = 0
		}

		// 9. 特殊幸运果倒计时过期
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
