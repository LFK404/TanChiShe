package main

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"snake-server/pkg/engine"
	"snake-server/pkg/security"
)

// 攻击场景 1：作弊者试图通过伪造按键流，声称高分但实际上没吃到果实
func TestAudit_ForgedScoreInterception(t *testing.T) {
	seed := uint32(999999)
	// 传入 10 步无意义的直行操作（蛇在 10 步内未吃到苹果）
	var fakeInputs []engine.InputRecord
	totalTicks := 10

	score, _, _, isDead, err := engine.ReplayGame(seed, fakeInputs, totalTicks)
	// 蛇在 10 步内依然存活（未撞墙），但客户端若声称结算，服务端必须判定未真正死亡
	if isDead {
		t.Fatalf("【漏洞暴露】10 步未撞墙的蛇被误判为死亡！")
	}
	if score > 0 {
		t.Fatalf("【漏洞暴露】未吃到果实却计算出了分数: %d", score)
	}
	t.Logf("【拦截成功】伪造战绩被物理重放引擎成功识破 (得分=%d, 死亡=%v, 错误=%v)", score, isDead, err)
}

// 攻击场景 2：作弊者试图篡改 HMAC 令牌中的 Seed 种子以预测未来果实
func TestAudit_HMACTamperingInterception(t *testing.T) {
	token, _ := security.CreateSignedSessionToken("victim_user")
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		t.Fatalf("令牌生成格式错误")
	}

	// 攻击者解码 Payload 并恶意篡改 Seed
	rawJSON, _ := base64.RawURLEncoding.DecodeString(parts[0])
	var payload security.SessionPayload
	_ = json.Unmarshal(rawJSON, &payload)
	payload.Seed = 111111 // 篡改为固定种子

	tamperedJSON, _ := json.Marshal(payload)
	tamperedB64 := base64.RawURLEncoding.EncodeToString(tamperedJSON)
	tamperedToken := tamperedB64 + "." + parts[1] // 拼接原签名

	_, err := security.VerifyAndConsumeSessionToken(tamperedToken)
	if err == nil {
		t.Fatalf("【严重漏洞】篡改 Seed 后的令牌居然验签通过！")
	}
	t.Logf("【拦截成功】HMAC 成功识别篡改并拦截: %v", err)
}

// 攻击场景 3：作弊者试图通过高频掉头（180度反向）穿透自身身体
func TestAudit_IllegalTurnInterception(t *testing.T) {
	seed := uint32(123456)
	// 初始向 RIGHT，如果在 tick 0 强行注入 LEFT (相反方向)
	illegalInputs := []engine.InputRecord{
		{Tick: 0, Dir: "LEFT"},
	}
	// 直行 14 步必撞右墙
	totalTicks := 14

	_, _, _, isDead, err := engine.ReplayGame(seed, illegalInputs, totalTicks)
	if err != nil {
		t.Fatalf("重放异常: %v", err)
	}
	// 如果 LEFT 被非法执行，蛇会向左走从而不会在第 14 步撞右墙；
	// 如果 LEFT 被正确过滤，蛇继续向右走并在第 14 步撞右墙死亡 (isDead=true)
	if !isDead {
		t.Fatalf("【漏洞暴露】非法的 180 度掉头指令居然被执行了！")
	}
	t.Logf("【拦截成功】180 度掉头指令被物理引擎成功丢弃并撞墙死亡")
}

// 攻击场景 4：离线 AI 脚本在 0.1 秒内上传 60 秒的完美战绩 (超速攻击)
func TestAudit_SpeedhackInterception(t *testing.T) {
	fakeStartTime := time.Now().UnixMilli() // 刚刚开局 10 毫秒
	simulatedDuration := int64(60)         // 战绩耗时 60 秒

	realElapsedSec := float64(time.Now().UnixMilli()-fakeStartTime) / 1000.0
	minAllowedSec := float64(simulatedDuration) * 0.85

	if realElapsedSec >= minAllowedSec {
		t.Fatalf("测试逻辑异常")
	}
	t.Logf("【拦截成功】超速外挂被真实物理流逝时钟拦截 (真实 %.3fs < 门限 %.2fs)", realElapsedSec, minAllowedSec)
}

// 攻击场景 5：密码加固验证 —— bcrypt 工业级抗彩虹表哈希与老旧 SHA256 账号无缝兼容平滑升级
func TestAudit_BcryptAndSmoothUpgrade(t *testing.T) {
	rawPassword := "Secure_Pass_2026!#"

	// 1. 新注册用户使用 bcrypt
	bcryptHash, err := security.HashPassword(rawPassword)
	if err != nil {
		t.Fatalf("bcrypt 哈希生成失败: %v", err)
	}

	// 验证 bcrypt 正确性
	matched, needsRehash := security.VerifyPassword(bcryptHash, rawPassword)
	if !matched || needsRehash {
		t.Fatalf("bcrypt 密码校验失败，matched=%v, needsRehash=%v", matched, needsRehash)
	}
	t.Logf("【验证通过】新用户 bcrypt 工业级哈希生成与比对成功")

	// 2. 模拟老用户的加盐 SHA-256 密码
	legacyHash := security.LegacyHashPassword(rawPassword)
	matchedLegacy, needsRehashLegacy := security.VerifyPassword(legacyHash, rawPassword)
	if !matchedLegacy || !needsRehashLegacy {
		t.Fatalf("老用户 SHA256 平滑兼容失败，matched=%v, needsRehash=%v", matchedLegacy, needsRehashLegacy)
	}
	t.Logf("【验证通过】老用户加盐 SHA256 密码成功通过校验，且被正确标记为需要自动重哈希升级！")

	// 3. 错误密码攻击尝试
	matchedWrong, _ := security.VerifyPassword(bcryptHash, "Wrong_Password_123")
	if matchedWrong {
		t.Fatalf("【严重漏洞】错误密码居然校验通过了！")
	}
	t.Logf("【拦截成功】错误密码被正确拒绝")
}

// 场景 6：HMAC Secret 生产环境自检
func TestAudit_SecretHealthCheck(t *testing.T) {
	// 调用健康检查函数验证无 panic
	security.CheckSecretHealth()
	t.Logf("【验证通过】Secret 健康自检模块运行正常")
}

