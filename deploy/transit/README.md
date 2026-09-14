# transit 部署与运营手册

小范围（团队 + 朋友、邀请制）的 AI API 网关。底座是 [new-api](https://github.com/QuantumNous/new-api) 的一个薄 fork：后端补丁一项 + 独立门户 + 契约测试，其余全是配置。fork 的维护约定见仓库根目录的 `TRANSIT.md`。

```
朋友的浏览器（门户）          朋友的 Claude Code / Codex / SDK
        │                              │
        │  https://api.example.com     │  https://api.example.com/v1
        ▼                              ▼
                     Caddy（自动 TLS）
                    /                \
           门户静态文件              new-api
           （portal）                  │
                                      ├──► Postgres（用户、余额、日志）
                                      └──► Redis（缓存、限流）
                                           │
                                           ▼
                         Anthropic / OpenAI / Google 官方 API

管理员浏览器
        │  https://console.example.com
        ▼
   同一个 Caddy → 同一个 new-api（原生后台：初始化、渠道、兑换码）
```

只走官方货源。不接订阅号池、不接逆向渠道。

---

## 1. 前置条件

- 一台能直连上游 API 的 VPS（香港 / 日本 / 新加坡 / 美国），1 核 1G 起步够用，装好 Docker 与 Docker Compose v2
- **两个主机名**，A 记录都指向服务器公网 IP：一个给朋友（门户 + `/v1` API），一个给管理员（new-api 原生后台）。例如 `api.example.com` 和 `console.example.com`。**不要开 Cloudflare 橙云代理**：它对源站响应有 100 秒超时，Claude Code 一次长任务经常超过，表现为 502 后上下文丢失。只做 DNS（灰云）或直接用其他 DNS
- 至少一个上游 Key：Anthropic Console、OpenAI Platform、Google AI Studio 三选一起步
- 两个镜像由 fork 的 `transit image (GHCR)` 工作流并行构建，随公开仓库一起是公开的，可匿名拉取，不需要 `docker login`：`ghcr.io/polarisxb/transit:latest`（new-api 后端）和 `ghcr.io/polarisxb/transit-portal:latest`（用户门户静态文件）。如果以后在 GitHub 的 Package 设置里改成私有，服务器上要先 `docker login ghcr.io`（用一个只有 `read:packages` 权限的 PAT）

## 2. 部署

```bash
# 服务器上，只需要 deploy/transit 这个目录
sudo mkdir -p /opt/transit && cd /opt/transit
scp -r <本机>/transit/deploy/transit/* .    # 或者 git clone 后 cp -r deploy/transit/* .

cp .env.example .env
# 四个密钥分别生成后填进 .env
openssl rand -hex 32   # POSTGRES_PASSWORD
openssl rand -hex 32   # REDIS_PASSWORD
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 32   # CRYPTO_SECRET
nano .env              # 同时填 DOMAIN、CONSOLE_DOMAIN、ACME_EMAIL、TRANSIT_IMAGE

chmod +x scripts/backup.sh
docker compose up -d   # 镜像是公开的；只有改成私有后才需要先 docker login ghcr.io
docker compose logs -f new-api   # 打印出监听地址、没有报错即启动成功
```

浏览器先打开 **`https://CONSOLE_DOMAIN`**（管理后台），首次访问是**初始化向导**（new-api 已不再自动创建 `root/123456`）：

- 设置管理员用户名（最多 12 个字符）和密码（至少 8 位）
- **「自用模式」不要勾选**。它会让没有配置倍率的模型按默认价放行；收钱的站点应该拒绝价格未知的模型，宁可报错也不要乱扣费
- 「演示站点」不要勾选

初始化完成后：

- 朋友和你自己用门户：**`https://DOMAIN`**（登录、密钥、钱包、接入配置）
- 你继续用后台：**`https://CONSOLE_DOMAIN`**（渠道、兑换码、分组、用户）
- 两个主机名必须不同。门户占了 `/`、`/sign-in`、`/setup` 等路径，和管理后台叠在同一域名上会互相抢页面。

## 3. 首次登录后立刻做

1. 右上角头像 → 个人设置：有条件就给管理员绑 Passkey / 2FA
2. 系统设置 → 通用设置：**服务器地址** 填 `https://DOMAIN`（用户门户那个主机名，不要填 console）
3. 系统设置 → 登录注册：保持「允许新用户注册」**开启**，关闭所有第三方登录（GitHub / Discord / LinuxDO / Telegram / OIDC / 微信）。compose 里已设 `REGISTER_REQUIRE_INVITE_CODE=true`，没有有效邀请码的注册请求会被后端拒绝，提示「本站仅限邀请注册」
4. 支付网关设置 → **确认合规条款**。不确认的话兑换码功能是锁着的（我们不接在线支付，但要用兑换码给朋友充值）
5. 系统设置 → SMTP：填服务商参数并发一封测试邮件。它支撑三件事：门户里的「余额不足提醒」、后端渠道故障/自动禁用的管理员通知、门户的找回密码。**「邮箱验证」开关保持关闭**（注册不需要邮箱）；SMTP 配好照样能发验证码和重置邮件——`SendEmailVerification` 不受 `EmailVerificationEnabled` 限制

### 邀请是怎么工作的

new-api 每个用户都有一个 `aff` 码（个人中心 → 邀请），注册页从链接参数 `?aff=码` 读取它。本 fork 把它从"可选的返利码"变成了"必填的准入码"：

```
https://api.example.com/register?aff=你的aff码
```

门户「邀请」页会生成这条链接和二维码。把链接发给朋友即可。朋友注册后也有自己的 aff 码，可以再邀请人——谁邀请的谁负责，后台用户列表里能看到邀请关系。不想让某人继续邀请，暂时没有开关，但你能在用户列表里看到并删号。

朋友进门户后到「接入」页选一把密钥，复制 Claude Code / Codex / SDK 配置即可，不必手改域名。门户还提供模型价格页、忘记密码（依赖 SMTP）、自助绑定邮箱。

## 4. 后台运营配置清单

按顺序做一遍即可。

### 4.1 分组与倍率（运营设置 → 分组倍率）

new-api 内置的模型倍率就是官方价。分组倍率是叠在官方价之上的系数，按人定价全靠它：

| 分组 | 倍率 | 给谁 |
|---|---|---|
| `friends` | 1.0 | 成本价，关系好的朋友 |
| `default` | 1.25 | 覆盖手续费、汇率波动和维护时间 |

后面想加 `team`、`vip` 之类随时加。

### 4.2 渠道（渠道 → 添加渠道）

| 上游 | 渠道类型 | 备注 |
|---|---|---|
| Anthropic 官方 | `Anthropic` | 给 Claude Code 用，`/v1/messages` 原生透传 |
| OpenAI 官方 | `OpenAI` | 给 Codex CLI 和通用 SDK 用，`/v1/responses` 与 `/v1/chat/completions` 都走它 |
| Google 官方 | `Gemini` | 可选 |
| 云渠道 | `AWS` / `Vertex AI` / `Azure` | 能开发票时替代官方直连 |

每个渠道：分组勾上 `friends` 和 `default`；模型用「获取模型列表」拉取后删掉不想开放的；保存后点「测试」。同一供应商多把 Key 就多建几个渠道，new-api 自动加权随机 + 失败切换。

**不要用 `ChatGPT Subscription (Codex)` 这个渠道类型**，它走的是 chatgpt.com 订阅号 OAuth，属于号池模式，OpenAI 已明确会标记封禁。

### 4.3 用户

正常情况下朋友通过你的邀请链接自己注册（见第 3 节），注册进来默认在 `default` 分组；要给成本价的，在用户管理里把分组改成 `friends`。也可以在「用户管理 → 添加用户」里手动建号，效果一样。

### 4.4 充值（兑换码）

朋友转账给你 → 你在「兑换码」里生成对应面额的码发给他 → 他在「钱包」里兑换。额度单位换算：

```
500,000 额度 = $1
¥100 ÷ 7.2（汇率）≈ $13.9 ≈ 6,944,000 额度
```

也可以直接在用户管理里编辑余额，兑换码的好处是有记录。

### 4.5 令牌建议（朋友自己建，你可以在群里说明）

- 一台机器一个令牌，别共用，方便追用量、出问题单独停
- 跑脚本或挂机的令牌一律设「额度上限」和「模型限制」
- 固定 IP 的机器开「IP 白名单（支持 CIDR 表达式）」
- 令牌泄露就删，重新建一个，成本为零

### 4.6 速率限制（运营设置 → 速率限制）

开「基于分组的速率限制」，给 `default` 分组设一个每分钟请求上限，防止某个人的脚本失控烧光池子。

## 5. 客户端接入（发给朋友的）

这些配置门户「接入」页会按所选密钥自动生成，本节只是备份。把 `api.example.com` 换成实际域名，`sk-xxx` 换成自己的令牌。

**Claude Code** — `~/.claude/settings.json`：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

**Codex CLI** — `~/.codex/config.toml`：

```toml
model = "gpt-5.5"
model_provider = "transit"

[model_providers.transit]
name = "transit"
base_url = "https://api.example.com/v1"
env_key = "TRANSIT_API_KEY"
wire_api = "responses"
```

然后 `export TRANSIT_API_KEY=sk-xxx`（Windows 用 `setx TRANSIT_API_KEY sk-xxx`）。

**OpenAI SDK / 任何 OpenAI 兼容客户端**（Cherry Studio、Cline、Continue 等）：

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.example.com/v1", api_key="sk-xxx")
```

Anthropic SDK 同理：`Anthropic(base_url="https://api.example.com", api_key="sk-xxx")`。

## 6. 日常运维

**升级**分两步。先在本机把 fork 跟到新的上游 tag（步骤见 `TRANSIT.md`），推送后 GitHub Actions 会重建镜像；然后服务器上：

```bash
cd /opt/transit
./scripts/backup.sh
docker compose pull && docker compose up -d
docker compose logs -f --tail=100 new-api
```

上游每月发版约 9 次，建议每两周跟一次，安全修复随时跟。

**备份**：`scripts/backup.sh` 每天 `pg_dump` 到 `./backups`，保留 14 天。加到 crontab：

```
30 4 * * * /opt/transit/scripts/backup.sh >> /opt/transit/logs/backup.log 2>&1
0 5 * * * find /opt/transit/logs -name '*.log' -mtime +30 -delete
```

异地备份：在 `.env` 里设 `BACKUP_RCLONE_REMOTE=remote:bucket/transit`（先在服务器配好 rclone），`backup.sh` 本地 dump 成功后会 `rclone copy` 过去。留空则只做本地备份。服务器挂了余额数据不能丢。

**恢复**：

```bash
docker compose stop new-api
gunzip -c backups/newapi_YYYY-MM-DD_HHMM.sql.gz | docker compose exec -T postgres psql -U newapi -d newapi
docker compose start new-api
```

**监控**：`docker compose ps` 看健康状态；想要告警就在别处跑一个 Uptime Kuma 探测 `https://DOMAIN/api/status`。

门户有独立镜像 `ghcr.io/polarisxb/transit-portal`，静态文件在 `/opt/portal`，`portal-assets` 容器每次 `up` 先清空再拷到 Caddy 的卷。只改门户、没改 Go 时只重建门户镜像（几十秒，不用等 Go 构建），然后 `docker compose pull && up -d`。

**日志**：new-api 的消费日志只存 token 数和费用，`content` 字段是「模型倍率 x，分组倍率 y」这类计费说明，不存对话内容。别去开任何会记录请求体的调试选项。

## 7. 边界

四条守住，就不在"AI 中转站"整治的靶心里：

1. 邀请制（无邀请链接注册不了），不公开推广，不挂导航站
2. 只用官方 API Key 或云厂商渠道，不碰订阅号池和逆向
3. 不留存对话内容
4. 账目清楚，收多少钱、成本多少，说得出来

规模到了几十个付费用户、开始有陌生人进来，再回头考虑企业主体和备案的事。
