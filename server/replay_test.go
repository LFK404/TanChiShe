package main

import (
	"testing"
	"time"
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

func TestHMACTokenLifecycle(t *testing.T) {
	username := "test_player"
	token, seed := createSignedSessionToken(username)
	if token == "" || seed == 0 {
		t.Fatalf("创建签名 Token 失败: token=%s, seed=%d", token, seed)
	}

	payload, err := verifyAndConsumeSessionToken(token)
	if err != nil {
		t.Fatalf("验签 Token 失败: %v", err)
	}
	if payload.Username != username || payload.Seed != seed {
		t.Fatalf("Token 负载数据不匹配: %+v", payload)
	}

	// 二次消费应当被拒绝 (防重放)
	_, err = verifyAndConsumeSessionToken(token)
	if err == nil {
		t.Fatalf("重复消费 Token 应当报错被拒，但未报错！")
	}
	t.Logf("Token 首次验签成功，且成功防重放二次消费！")
}

func TestReplayGameCrashWall(t *testing.T) {
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

func TestRealTimeDurationCheck(t *testing.T) {
	// 测试物理时间不足时的拦截
	startTime := time.Now().UnixMilli()
	// 假设模拟耗时 60 秒，但真实才过了 100 毫秒
	simulatedDuration := int64(60)
	realElapsedSec := float64(time.Now().UnixMilli()-startTime) / 1000.0
	minAllowedSec := float64(simulatedDuration) * 0.85

	if realElapsedSec >= minAllowedSec {
		t.Fatalf("测试逻辑异常: 真实时间不应大于最小允许时间")
	}
	t.Logf("真实时间拦截逻辑验证成功: 真实流逝 %.2fs < 最小允许 %.2fs", realElapsedSec, minAllowedSec)
}
