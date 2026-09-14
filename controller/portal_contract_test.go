package controller

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TestPortalContract locks the JSON response shapes the user portal reads.
func TestPortalContract(t *testing.T) {
	previousDB := model.DB
	previousLogDB := model.LOG_DB
	previousRedis := common.RedisEnabled
	previousSecret := common.SessionSecret
	previousPasswordLogin := common.PasswordLoginEnabled
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.UserSession{},
		&model.TwoFA{},
		&model.Token{},
		&model.Log{},
		&model.TopUp{},
		&model.QuotaData{},
		&model.Channel{},
		&model.Ability{},
		&model.Model{},
		&model.Vendor{},
	))
	model.DB = db
	model.LOG_DB = db
	common.RedisEnabled = false
	common.SessionSecret = "portal-contract-test-session-secret"
	common.PasswordLoginEnabled = true
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	t.Cleanup(func() {
		model.DB = previousDB
		model.LOG_DB = previousLogDB
		common.RedisEnabled = previousRedis
		common.SessionSecret = previousSecret
		common.PasswordLoginEnabled = previousPasswordLogin
	})

	passwordHash, err := common.Password2Hash("correct-horse")
	require.NoError(t, err)
	user := &model.User{
		Username:        "portal-user",
		Password:        passwordHash,
		DisplayName:     "Portal User",
		Role:            common.RoleCommonUser,
		Status:          common.UserStatusEnabled,
		Group:           "default",
		Quota:           1_000_000,
		UsedQuota:       100,
		RequestCount:    3,
		AffCode:         "AFFPORTAL",
		AffCount:        1,
		AffQuota:        0,
		AffHistoryQuota: 50,
		Setting:         `{"notify_type":"email"}`,
		AuthVersion:     1,
	}
	require.NoError(t, db.Create(user).Error)

	allowIPs := "127.0.0.1"
	token := &model.Token{
		UserId:             user.Id,
		Key:                "sk-portal-contract-test-key-aaaa",
		Status:             1,
		Name:               "laptop",
		CreatedTime:        1_700_000_100,
		AccessedTime:       1_700_000_200,
		ExpiredTime:        -1,
		RemainQuota:        5000,
		UnlimitedQuota:     false,
		ModelLimitsEnabled: false,
		ModelLimits:        "",
		AllowIps:           &allowIPs,
		UsedQuota:          10,
		Group:              "default",
	}
	require.NoError(t, db.Create(token).Error)

	require.NoError(t, db.Create(&model.TopUp{
		UserId:        user.Id,
		Amount:        500000,
		Money:         1,
		TradeNo:       "portal-topup-1",
		PaymentMethod: "redeem",
		CreateTime:    common.GetTimestamp() - 60,
		Status:        "success",
	}).Error)

	require.NoError(t, db.Create(&model.QuotaData{
		UserID:    user.Id,
		Username:  user.Username,
		ModelName: "gpt-4o-mini",
		CreatedAt: 1_700_000_400,
		TokenUsed: 120,
		Count:     2,
		Quota:     80,
	}).Error)

	priority := int64(0)
	weight := uint(100)
	require.NoError(t, db.Create(&model.Channel{
		Id:       1,
		Type:     constant.ChannelTypeOpenAI,
		Key:      "sk-channel",
		Status:   common.ChannelStatusEnabled,
		Name:     "openai",
		Weight:   &weight,
		Models:   "gpt-4o-mini",
		Group:    "default",
		Priority: &priority,
	}).Error)
	require.NoError(t, db.Create(&model.Ability{
		Group:     "default",
		Model:     "gpt-4o-mini",
		ChannelId: 1,
		Enabled:   true,
		Priority:  &priority,
		Weight:    weight,
	}).Error)
	model.InvalidatePricingCache()

	gin.SetMode(gin.TestMode)

	loginBody, err := common.Marshal(map[string]string{
		"username": user.Username,
		"password": "correct-horse",
	})
	require.NoError(t, err)

	loginRec := httptest.NewRecorder()
	loginCtx, _ := gin.CreateTestContext(loginRec)
	loginCtx.Request = httptest.NewRequest(http.MethodPost, "/api/user/login", bytes.NewReader(loginBody))
	loginCtx.Request.Header.Set("Content-Type", "application/json")
	Login(loginCtx)

	require.Equal(t, http.StatusOK, loginRec.Code)
	loginResp := decodePortalJSON(t, loginRec)
	require.Equal(t, true, loginResp["success"])
	assertAuthBundle(t, asObject(t, loginResp["data"], "data"))
	assertAuthCookies(t, loginRec)

	var refreshCookie *http.Cookie
	for _, cookie := range loginRec.Result().Cookies() {
		if cookie.Name == service.RefreshCookieName {
			refreshCookie = cookie
		}
	}
	require.NotNil(t, refreshCookie, "login must set refresh cookie")

	t.Run("RefreshAuthWithCookie", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/user/auth/refresh", nil)
		c.Request.AddCookie(refreshCookie)
		RefreshAuth(c)
		require.Equal(t, http.StatusOK, rec.Code)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		assertAuthBundle(t, asObject(t, body["data"], "data"))
		assertAuthCookies(t, rec)
	})

	t.Run("RefreshAuthWithoutCookie", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/user/auth/refresh", nil)
		RefreshAuth(c)
		require.Equal(t, http.StatusUnauthorized, rec.Code)
		body := decodePortalJSON(t, rec)
		require.Equal(t, false, body["success"])
	})

	t.Run("GetSelf", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/user/self", nil)
		c.Set("id", user.Id)
		c.Set("role", user.Role)
		GetSelf(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		requireKeys(t, data, "id", "username", "display_name", "role", "group", "quota", "used_quota", "request_count", "status", "aff_code", "aff_count", "aff_quota", "aff_history_quota", "setting")
		requireJSONNumber(t, data["id"], "data.id")
		require.IsType(t, "", data["username"])
		require.IsType(t, "", data["display_name"])
		requireJSONNumber(t, data["role"], "data.role")
		require.IsType(t, "", data["group"])
		requireJSONNumber(t, data["quota"], "data.quota")
		requireJSONNumber(t, data["used_quota"], "data.used_quota")
		requireJSONNumber(t, data["request_count"], "data.request_count")
		requireJSONNumber(t, data["status"], "data.status")
		require.IsType(t, "", data["aff_code"])
		requireJSONNumber(t, data["aff_count"], "data.aff_count")
		requireJSONNumber(t, data["aff_quota"], "data.aff_quota")
		requireJSONNumber(t, data["aff_history_quota"], "data.aff_history_quota")
		assert.NotNil(t, data["setting"])
	})

	t.Run("GetAllTokens", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/token/?p=1&size=20", nil)
		c.Set("id", user.Id)
		GetAllTokens(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		requireKeys(t, data, "items", "total", "page", "page_size")
		requireJSONNumber(t, data["total"], "data.total")
		requireJSONNumber(t, data["page"], "data.page")
		requireJSONNumber(t, data["page_size"], "data.page_size")
		items := asArray(t, data["items"], "data.items")
		require.NotEmpty(t, items)
		item := asObject(t, items[0], "data.items[0]")
		requireKeys(t, item, "id", "name", "key", "status", "remain_quota", "used_quota", "unlimited_quota", "expired_time", "created_time", "accessed_time", "group", "model_limits_enabled", "model_limits", "allow_ips")
		requireJSONNumber(t, item["id"], "id")
		require.IsType(t, "", item["name"])
		require.IsType(t, "", item["key"])
		requireJSONNumber(t, item["status"], "status")
		requireJSONNumber(t, item["remain_quota"], "remain_quota")
		requireJSONNumber(t, item["used_quota"], "used_quota")
		require.IsType(t, false, item["unlimited_quota"])
		requireJSONNumber(t, item["expired_time"], "expired_time")
		requireJSONNumber(t, item["created_time"], "created_time")
		requireJSONNumber(t, item["accessed_time"], "accessed_time")
		require.IsType(t, "", item["group"])
		require.IsType(t, false, item["model_limits_enabled"])
	})

	t.Run("GetTokenKey", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/token/"+strconv.Itoa(token.Id)+"/key", nil)
		c.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
		c.Set("id", user.Id)
		GetTokenKey(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		require.IsType(t, "", data["key"])
		require.Equal(t, token.Key, data["key"])
	})

	require.NoError(t, db.Create(&model.Log{
		UserId:           user.Id,
		Username:         user.Username,
		CreatedAt:        1_700_000_500,
		Type:             model.LogTypeConsume,
		Content:          "model ratio 1",
		TokenName:        token.Name,
		ModelName:        "gpt-4o-mini",
		Quota:            42,
		PromptTokens:     10,
		CompletionTokens: 5,
		UseTime:          3,
		IsStream:         true,
		Group:            "default",
		Other:            `{"model_ratio":1}`,
	}).Error)

	t.Run("GetUserLogs", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/log/self?type=2", nil)
		c.Set("id", user.Id)
		GetUserLogs(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		requireKeys(t, data, "items", "total")
		requireJSONNumber(t, data["total"], "data.total")
		items := asArray(t, data["items"], "data.items")
		require.NotEmpty(t, items)
		item := asObject(t, items[0], "data.items[0]")
		requireKeys(t, item, "id", "created_at", "type", "content", "token_name", "model_name", "quota", "prompt_tokens", "completion_tokens", "use_time", "is_stream", "group", "other")
		requireJSONNumber(t, item["id"], "id")
		requireJSONNumber(t, item["created_at"], "created_at")
		requireJSONNumber(t, item["type"], "type")
		require.IsType(t, "", item["content"])
		require.IsType(t, "", item["token_name"])
		require.IsType(t, "", item["model_name"])
		requireJSONNumber(t, item["quota"], "quota")
		requireJSONNumber(t, item["prompt_tokens"], "prompt_tokens")
		requireJSONNumber(t, item["completion_tokens"], "completion_tokens")
		requireJSONNumber(t, item["use_time"], "use_time")
		require.IsType(t, false, item["is_stream"])
		require.IsType(t, "", item["group"])
		assert.NotNil(t, item["other"])
	})

	t.Run("GetLogsSelfStat", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/log/self/stat", nil)
		c.Set("username", user.Username)
		GetLogsSelfStat(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		requireKeys(t, data, "quota", "rpm", "tpm")
		requireJSONNumber(t, data["quota"], "data.quota")
		requireJSONNumber(t, data["rpm"], "data.rpm")
		requireJSONNumber(t, data["tpm"], "data.tpm")
	})

	t.Run("GetUserTopUps", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/user/topup/self?p=1&page_size=20", nil)
		c.Set("id", user.Id)
		GetUserTopUps(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		requireKeys(t, data, "items", "total")
		requireJSONNumber(t, data["total"], "data.total")
		items := asArray(t, data["items"], "data.items")
		require.NotEmpty(t, items)
		item := asObject(t, items[0], "data.items[0]")
		requireKeys(t, item, "id", "trade_no", "amount", "money", "status", "create_time", "payment_method")
		requireJSONNumber(t, item["id"], "id")
		require.IsType(t, "", item["trade_no"])
		requireJSONNumber(t, item["amount"], "amount")
		requireJSONNumber(t, item["money"], "money")
		require.IsType(t, "", item["status"])
		requireJSONNumber(t, item["create_time"], "create_time")
		require.IsType(t, "", item["payment_method"])
	})

	t.Run("GetUserQuotaDates", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/data/self?start_timestamp=1699990000&end_timestamp=1700010000", nil)
		c.Set("id", user.Id)
		GetUserQuotaDates(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		items := asArray(t, body["data"], "data")
		require.NotEmpty(t, items)
		item := asObject(t, items[0], "data[0]")
		requireKeys(t, item, "model_name", "created_at", "token_used", "count", "quota")
		require.IsType(t, "", item["model_name"])
		requireJSONNumber(t, item["created_at"], "created_at")
		requireJSONNumber(t, item["token_used"], "token_used")
		requireJSONNumber(t, item["count"], "count")
		requireJSONNumber(t, item["quota"], "quota")
	})

	t.Run("GetStatus", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
		GetStatus(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		data := asObject(t, body["data"], "data")
		requireKeys(t, data, "system_name", "version", "quota_per_unit", "register_enabled", "password_login_enabled", "password_login_encryption_enabled", "email_verification", "turnstile_check", "server_address", "setup")
	})

	t.Run("GetPricing", func(t *testing.T) {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/pricing", nil)
		GetPricing(c)
		body := decodePortalJSON(t, rec)
		require.Equal(t, true, body["success"])
		requireKeys(t, body, "data", "group_ratio", "usable_group")
		require.IsType(t, map[string]any{}, body["group_ratio"])
		require.IsType(t, map[string]any{}, body["usable_group"])
		items := asArray(t, body["data"], "data")
		if len(items) == 0 {
			return
		}
		item := asObject(t, items[0], "data[0]")
		requireKeys(t, item, "model_name", "quota_type", "model_ratio", "model_price", "completion_ratio", "enable_groups")
		require.IsType(t, "", item["model_name"])
		requireJSONNumber(t, item["quota_type"], "quota_type")
		requireJSONNumber(t, item["model_ratio"], "model_ratio")
		requireJSONNumber(t, item["model_price"], "model_price")
		requireJSONNumber(t, item["completion_ratio"], "completion_ratio")
		require.IsType(t, []any{}, item["enable_groups"])
	})
}

func requireKeys(t *testing.T, obj map[string]any, keys ...string) {
	t.Helper()
	for _, key := range keys {
		_, ok := obj[key]
		require.True(t, ok, "missing key %s", key)
	}
}

func decodePortalJSON(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	require.NoError(t, common.Unmarshal(rec.Body.Bytes(), &body), "body=%s", rec.Body.String())
	return body
}

func asObject(t *testing.T, v any, path string) map[string]any {
	t.Helper()
	obj, ok := v.(map[string]any)
	require.True(t, ok, "%s: want object, got %T", path, v)
	return obj
}

func asArray(t *testing.T, v any, path string) []any {
	t.Helper()
	arr, ok := v.([]any)
	require.True(t, ok, "%s: want array, got %T", path, v)
	return arr
}

func requireJSONNumber(t *testing.T, v any, path string) {
	t.Helper()
	switch v.(type) {
	case float64, int, int32, int64:
		return
	default:
		require.Failf(t, "not a number", "%s: %T (%v)", path, v, v)
	}
}

func assertAuthBundle(t *testing.T, data map[string]any) {
	t.Helper()
	require.IsType(t, "", data["access_token"])
	require.NotEmpty(t, data["access_token"])
	requireJSONNumber(t, data["access_expires_at"], "data.access_expires_at")
	session := asObject(t, data["session"], "data.session")
	require.IsType(t, "", session["sid"])
	require.NotEmpty(t, session["sid"])
	user := asObject(t, data["user"], "data.user")
	requireJSONNumber(t, user["id"], "data.user.id")
	require.IsType(t, "", user["username"])
	requireJSONNumber(t, user["role"], "data.user.role")
}

func assertAuthCookies(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	joined := strings.Join(rec.Header().Values("Set-Cookie"), "\n")
	require.Contains(t, joined, service.RefreshCookieName)
	require.Contains(t, joined, service.SessionHintCookieName)
}
