package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

var (
	consumedNonceMu sync.Mutex
	consumedNonces  = make(map[string]time.Time)

	ipHits   = make(map[string][]time.Time)
	ipHitsMu sync.Mutex
)

// CheckSecretHealth 自检 HMAC Secret 强度，若在 Release 模式下使用默认弱密钥则报警
func CheckSecretHealth() {
	key := os.Getenv("HMAC_SECRET_KEY")
	mode := os.Getenv("GIN_MODE")
	if (key == "" || len(key) < 32) && mode == "release" {
		fmt.Printf("[SECURITY WARNING] 生产环境检测到 HMAC_SECRET_KEY 为空或弱密钥，强烈建议在环境变量中配置至少 32 字节的高熵随机密钥！\n")
	}
}

func getHMACSecret() []byte {
	if key := os.Getenv("HMAC_SECRET_KEY"); key != "" {
		return []byte(key)
	}
	return []byte("ncu_snake_hmac_secret_key_2026_level3_security")
}

// SessionPayload 无状态对局令牌数据载荷
type SessionPayload struct {
	Username  string `json:"u"`
	Seed      uint32 `json:"s"`
	StartTime int64  `json:"t"`
	Nonce     string `json:"n"`
}

func signHMAC(data []byte) string {
	mac := hmac.New(sha256.New, getHMACSecret())
	mac.Write(data)
	return hex.EncodeToString(mac.Sum(nil))
}

// CreateSignedSessionToken 创建无状态 HMAC 签名对局 Token
func CreateSignedSessionToken(username string) (string, uint32) {
	seedBig, _ := rand.Int(rand.Reader, big.NewInt(0xFFFFFFFF))
	seed := uint32(seedBig.Uint64())

	nonceBytes := make([]byte, 8)
	_, _ = rand.Read(nonceBytes)
	nonce := hex.EncodeToString(nonceBytes)

	payload := SessionPayload{
		Username:  username,
		Seed:      seed,
		StartTime: time.Now().UnixMilli(),
		Nonce:     nonce,
	}

	payloadJSON, _ := json.Marshal(payload)
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)
	signature := signHMAC([]byte(payloadB64))

	return fmt.Sprintf("%s.%s", payloadB64, signature), seed
}

// VerifyAndConsumeSessionToken 验签并一次性消费对局 Token (防重放)
func VerifyAndConsumeSessionToken(token string) (*SessionPayload, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, errors.New("无效的对局令牌格式")
	}

	payloadB64, signature := parts[0], parts[1]
	expectedSig := signHMAC([]byte(payloadB64))
	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return nil, errors.New("对局令牌签名校验失败：数据已被篡改")
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, errors.New("对局令牌解析异常")
	}

	var payload SessionPayload
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, errors.New("对局令牌内容解析失败")
	}

	// 1. 绝对生命周期检查 (开局至结算不得超过 2 小时)
	if time.Since(time.UnixMilli(payload.StartTime)) > 2*time.Hour {
		return nil, errors.New("对局令牌已超时失效")
	}

	consumedNonceMu.Lock()
	defer consumedNonceMu.Unlock()

	if _, exists := consumedNonces[payload.Nonce]; exists {
		return nil, errors.New("该对局令牌已被使用，禁止重复提交战绩")
	}
	consumedNonces[payload.Nonce] = time.Now()

	cutoff := time.Now().Add(-2 * time.Hour)
	for k, v := range consumedNonces {
		if v.Before(cutoff) {
			delete(consumedNonces, k)
		}
	}

	return &payload, nil
}

// SignUserToken 生成用户登录凭证
func SignUserToken(username string) string {
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	raw := fmt.Sprintf("%s:%s", username, ts)
	b64 := base64.RawURLEncoding.EncodeToString([]byte(raw))
	sig := signHMAC([]byte(b64))
	return fmt.Sprintf("%s.%s", b64, sig)
}

// ParseUserToken 解析并验证用户登录凭证
func ParseUserToken(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", errors.New("无效的认证令牌")
	}
	b64, sig := parts[0], parts[1]
	if !hmac.Equal([]byte(sig), []byte(signHMAC([]byte(b64)))) {
		return "", errors.New("认证令牌已失效或被篡改")
	}
	raw, err := base64.RawURLEncoding.DecodeString(b64)
	if err != nil {
		return "", errors.New("认证令牌解析异常")
	}
	chunks := strings.Split(string(raw), ":")
	if len(chunks) < 2 {
		return "", errors.New("认证令牌格式异常")
	}
	return chunks[0], nil
}

// HashPassword 使用工业级 bcrypt 生成密码安全散列 (工作因数 cost 10)
func HashPassword(p string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	return string(bytes), err
}

// LegacyHashPassword 向后兼容老用户的 SHA256 加盐单向哈希
func LegacyHashPassword(p string) string {
	h := sha256.Sum256([]byte(p + "_ncu_snake_salt_2026"))
	return hex.EncodeToString(h[:])
}

// VerifyPassword 密码多态比对与平滑升级探测 (优先 bcrypt，后向兼容老旧 SHA256)
// 返回参数: (是否匹配成功, 是否需要无感升级重哈希)
func VerifyPassword(hashedPassword, plainPassword string) (bool, bool) {
	// 1. 优先尝试 bcrypt 校验
	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword)); err == nil {
		return true, false
	}

	// 2. 向后平滑兼容：尝试老旧加盐 SHA-256 比对
	if hashedPassword == LegacyHashPassword(plainPassword) {
		return true, true // 密码正确，但标记需要自动无感重哈希升级为 bcrypt
	}

	// 3. 容错明文兼容 (仅针对极早期开发脏数据)
	if hashedPassword == plainPassword {
		return true, true
	}

	return false, false
}

// RateLimitMiddleware 单 IP 20次/秒 滑动窗口并发限流
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
