package main

import (
	"testing"
)

func TestMulberry32(t *testing.T) {
	rng := NewMulberry32(12345)
	v1 := rng.Next()
	v2 := rng.Next()
	v3 := rng.Next()

	if v1 < 0 || v1 >= 1.0 || v2 < 0 || v2 >= 1.0 || v3 < 0 || v3 >= 1.0 {
		t.Fatalf("PRNG 输出范围异常: %f, %f, %f", v1, v2, v3)
	}
	t.Logf("PRNG 前3项: %f, %f, %f", v1, v2, v3)
}

func TestReplayGameCrashWall(t *testing.T) {
	// 蛇初始在 (10, 12)，向右直行走 14 步必撞右墙 (x=24 越界)
	seed := uint32(888888)
	var inputs []InputRecord
	totalTicks := 14

	score, length, duration, isDead, err := ReplayGame(seed, inputs, totalTicks)
	if err != nil {
		t.Fatalf("重放发生意外错误: %v", err)
	}
	if !isDead {
		t.Fatalf("直走 14 步应当撞墙死亡，但返回存活")
	}
	t.Logf("直走撞墙验证成功: 得分=%d, 长度=%d, 耗时=%ds, 死亡=%v", score, length, duration, isDead)
}

func TestReplayGameCheatingRejection(t *testing.T) {
	// 如果总步数声明为 5 步，但此时蛇在 (15, 12) 根本没有撞墙，声称游戏结束 -> 应判定未死亡
	seed := uint32(888888)
	var inputs []InputRecord
	totalTicks := 5

	_, _, _, isDead, err := ReplayGame(seed, inputs, totalTicks)
	if err != nil {
		t.Logf("成功捕获异常: %v", err)
	}
	if isDead {
		t.Fatalf("5 步根本未撞墙，不应返回死亡！")
	}
	t.Log("作弊拦截验证成功：未实际死亡无法伪造战绩！")
}
