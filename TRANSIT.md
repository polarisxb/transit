# transit：new-api 的薄 fork

这个仓库是 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 的 fork，用于小范围（团队 + 朋友、邀请制）的 AI API 网关。上游 README 原样保留在 `README.md`；本文件只讲 fork 自己的约定。部署与运营手册在 `deploy/transit/README.md`。

## 分支与远端

| 名称 | 含义 |
|---|---|
| `upstream` 远端 | `https://github.com/QuantumNous/new-api.git`，只读 |
| `transit` 分支 | 上游最新 release tag + 本 fork 的补丁序列。**唯一的工作分支** |
| `origin` 远端 | 你自己的 GitHub 仓库（见下文「发布」） |

当前基线：`v1.0.0-rc.33`。

## 补丁清单

每个补丁一个 commit，commit message 以 `[transit]` 开头，方便 `git log --oneline v1.0.0-rc.33..transit` 一眼看全。

| # | 补丁 | 改动 | 为什么不直接配置 |
|---|---|---|---|
| 1 | 强制邀请码注册：`REGISTER_REQUIRE_INVITE_CODE=true` 时，注册请求必须携带属于现有用户的 `aff` 码，否则返回「本站仅限邀请注册」。覆盖密码注册、统一 OAuth 注册、微信注册三条路径 | `controller/invite.go`（新）、`controller/invite_test.go`（新）、`controller/{user,oauth,wechat}.go`、`common/{constants,init}.go`、`i18n/keys.go`、`i18n/locales/*.yaml`，共约 30 行 | 上游的 `aff` 码是可选返利码，没有「必填」开关 |
| — | 部署套件 `deploy/transit/` 与 GHCR 构建工作流 `.github/workflows/transit-image.yml` | 全是新文件 | 不是补丁，是配套 |

### 加补丁的纪律

- 先问一遍「能不能用配置解决」。分组倍率、注册开关、登录方式、站点名称/Logo/首页内容、日志、限流，上游后台全都有。
- 能新建文件就不改旧文件；能改后端就不碰前端（前端 19 万行、改动频繁，rebase 冲突大户）。
- 用环境变量而不是后台选项接入新开关，避免碰 `model/option.go` 这个高频冲突文件。
- 每个补丁附一个最小单测，rebase 后靠它确认补丁还活着。
- 上游可能会收的功能（比如这个邀请码门禁）顺手提 PR；合入后本地补丁直接删。

## 跟上游升级

上游每月约 90 次提交、9 个 release。只跟 **tag**，不跟 `main`。

```bash
git fetch upstream --tags
git tag --sort=-creatordate | head -5          # 看最新 tag
git rebase v1.0.0-rc.NN                        # 把补丁序列搬到新 tag 上，有冲突逐个解

# 验证
go build ./controller/... ./common/... ./i18n/... ./model/...
go test ./controller/ -run TestResolveInviter -count=1

git push --force-with-lease origin transit     # 触发 GHCR 重建
```

然后按 `deploy/transit/README.md` 第 6 节在服务器上 `docker compose pull && up -d`。安全修复不等两周，随时跟。

## 发布（第一次）

```bash
# 建一个公开的 GitHub fork（AGPL 要求修改版源码对用户可得，公开仓库最省事）
gh repo fork QuantumNous/new-api --fork-name transit --clone=false
git remote add origin https://github.com/<你>/transit.git
git push -u origin transit
```

推上去以后：

1. 仓库 Settings → Actions：把上游自带的 `ci.yml`、`docker-build.yml`、`docker-image-branch.yml`、`electron-build.yml`、`release.yml`、`sync-release-to-gitcode.yml` 逐个 **Disable workflow**。它们需要 Docker Hub 等 secrets，会一直红。不要删文件，删了下次 rebase 会冲突。
2. Actions 里确认 `transit image (GHCR)` 跑绿，产物在 `ghcr.io/<你>/transit:latest`。用 `GITHUB_TOKEN` 从公开仓库推出来的包是公开的，可匿名拉取；若在 Package 设置里改成私有，服务器上就需要 `docker login ghcr.io`。
3. 站点后台「系统设置 → 关于」里放上 fork 仓库链接。

## 许可证义务（AGPL-3.0 + 上游附加条款）

- 修改版对外提供服务，就必须让使用者能拿到修改版源码——公开仓库即可满足。
- 界面上必须保留上游的署名 `Frontend design and development by New API contributors` 和指向 `https://github.com/QuantumNous/new-api` 的链接。我们不改前端，天然满足；以后任何人动前端 footer / about 时注意。
- `LICENSE` 文件不要动。

## 本地开发

```bash
# 后端（不含前端，改动后端逻辑时够用）
go build ./controller/... ./common/... ./i18n/... ./model/...
go test ./controller/ -run TestResolveInviter -count=1

# 完整可运行的二进制需要先构建前端（主包用 go:embed 嵌入 web/dist）
cd web && bun install && bun run build && cd ..
go build -o new-api .
REGISTER_REQUIRE_INVITE_CODE=true ./new-api --port 3000
```

上游的 `makefile` 里有 `dev`、`dev-web`、`dev-api` 目标，前端热更新开发用那个。
