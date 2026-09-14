import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { CopyBtn, Empty, Notice, PageHead, Spinner } from '@/components/ui'
import { listKeys, revealKey, type ApiKey } from '@/lib/api'
import { fullKey, maskKey } from '@/lib/format'
import {
  anthropicPython,
  claudeSettings,
  codexEnv,
  codexToml,
  modelsCurl,
  openaiNode,
  openaiPython,
} from '@/lib/setup-config'
import { useApiOrigin } from '@/lib/site'

type Tool = 'cc' | 'codex' | 'oai' | 'anth' | 'cherry' | 'cline'

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'cc', label: 'Claude Code' },
  { id: 'codex', label: 'Codex CLI' },
  { id: 'oai', label: 'OpenAI SDK' },
  { id: 'anth', label: 'Anthropic SDK' },
  { id: 'cherry', label: 'Cherry Studio' },
  { id: 'cline', label: 'Cline / Cursor' },
]

export function SetupPage() {
  const origin = useApiOrigin()
  const [params] = useSearchParams()
  const preset = Number(params.get('key') || 0)
  const keys = useQuery({ queryKey: ['keys', 1, 'setup'], queryFn: () => listKeys(1, 100) })
  const [keyId, setKeyId] = useState(0)
  const [revealed, setRevealed] = useState<Record<number, string>>({})
  const [tool, setTool] = useState<Tool>('cc')

  const items = keys.data?.items ?? []
  const selectedId = keyId || preset || items[0]?.id || 0
  const selected = items.find((k) => k.id === selectedId)

  const keyValue = selected ? revealed[selected.id] : ''
  const displayKey = keyValue || (selected ? maskKey(selected.key) : 'sk-xxxx')

  async function ensureKey(k: ApiKey): Promise<string> {
    if (revealed[k.id]) return revealed[k.id]
    const full = fullKey(await revealKey(k.id))
    setRevealed((r) => ({ ...r, [k.id]: full }))
    return full
  }

  async function copyWithReveal(build: (key: string) => string) {
    if (!selected) {
      toast.error('先选一把密钥')
      return ''
    }
    try {
      return build(await ensureKey(selected))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '完整密钥没取到')
      return ''
    }
  }

  const snippets = useMemo(() => {
    return {
      claude: claudeSettings(origin, displayKey),
      toml: codexToml(origin),
      env: codexEnv(displayKey),
      py: openaiPython(origin, displayKey),
      js: openaiNode(origin, displayKey),
      anth: anthropicPython(origin, displayKey),
      curl: modelsCurl(origin, displayKey),
    }
  }, [origin, displayKey])

  return (
    <div>
      <PageHead
        tag="地址就是本站对外域名 · 直连，不需要 VPN"
        title="接入"
        desc="选一把密钥、选你的工具，复制配置粘进去就能用。配置里已经把密钥和地址填好了。"
        actions={
          <div className="key-pick">
            <span className="tert" style={{ fontSize: 12.5 }}>
              使用密钥
            </span>
            <select
              className="select"
              style={{ width: 320 }}
              value={selectedId || ''}
              onChange={(e) => setKeyId(Number(e.target.value))}
            >
              {items.length === 0 && <option value="">还没有密钥</option>}
              {items.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}（{maskKey(k.key)}）
                </option>
              ))}
            </select>
          </div>
        }
      />

      {keys.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card static">
          <Empty title="还没有密钥可套进配置">
            <Link to="/keys">先去建一把</Link>，再建好回这里复制。
          </Empty>
        </div>
      ) : (
        <>
          <div className="tool-tabs rise" style={{ ['--i' as string]: 1 }}>
            {TOOLS.map((t) => (
              <button key={t.id} type="button" className={`tool-tab ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)}>
                <i />
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid-split">
            <div className="card static rise" style={{ ['--i' as string]: 2 }}>
              {tool === 'cc' && (
                <>
                  <div className="code-head">
                    <span>
                      写入 <b>~/.claude/settings.json</b>（Windows：<b>%USERPROFILE%\.claude\settings.json</b>）
                    </span>
                    <CopyBtn text={() => copyWithReveal((k) => claudeSettings(origin, k))} />
                  </div>
                  <pre className="code-view">{snippets.claude}</pre>
                  <ul className="tips">
                    <li>
                      <b>API_TIMEOUT_MS</b> 调大是为了长任务不掉线，保留这一行。
                    </li>
                    <li>
                      保存后重新打开 Claude Code，运行 <span className="mono-pill">/status</span> 能看到 Base URL 已切换。
                    </li>
                    <li>模型名与官方一致，用站点开放的 Claude 模型即可。</li>
                  </ul>
                </>
              )}

              {tool === 'codex' && (
                <>
                  <div className="code-head">
                    <span>
                      写入 <b>~/.codex/config.toml</b>
                    </span>
                    <CopyBtn text={snippets.toml} />
                  </div>
                  <pre className="code-view">{snippets.toml}</pre>
                  <div className="code-head" style={{ marginTop: 14 }}>
                    <span>再设置环境变量</span>
                    <CopyBtn text={() => copyWithReveal((k) => codexEnv(k))} />
                  </div>
                  <pre className="code-view">{snippets.env}</pre>
                </>
              )}

              {tool === 'oai' && (
                <>
                  <div className="code-head">
                    <span>
                      Python · <b>openai</b>
                    </span>
                    <CopyBtn text={() => copyWithReveal((k) => openaiPython(origin, k))} />
                  </div>
                  <pre className="code-view">{snippets.py}</pre>
                  <div className="code-head" style={{ marginTop: 14 }}>
                    <span>
                      Node.js · <b>openai</b>
                    </span>
                    <CopyBtn text={() => copyWithReveal((k) => openaiNode(origin, k))} />
                  </div>
                  <pre className="code-view">{snippets.js}</pre>
                </>
              )}

              {tool === 'anth' && (
                <>
                  <div className="code-head">
                    <span>
                      Python · <b>anthropic</b>
                    </span>
                    <CopyBtn text={() => copyWithReveal((k) => anthropicPython(origin, k))} />
                  </div>
                  <pre className="code-view">{snippets.anth}</pre>
                  <ul className="tips">
                    <li>
                      Anthropic SDK 的 base_url 不带 <span className="mono-pill">/v1</span>，SDK 会自己加。
                    </li>
                  </ul>
                </>
              )}

              {tool === 'cherry' && (
                <>
                  <div className="code-head">
                    <span>设置 → 模型服务 → 添加提供商</span>
                    <CopyBtn text={() => copyWithReveal((k) => `${origin}\n${k}`)} label="复制地址和密钥" />
                  </div>
                  <ul className="kv">
                    <li>
                      <span className="k-label">提供商类型</span>
                      <span className="k-value">OpenAI</span>
                    </li>
                    <li>
                      <span className="k-label">API 地址</span>
                      <span className="k-value mono">{origin}</span>
                    </li>
                    <li>
                      <span className="k-label">API 密钥</span>
                      <span className="k-value mono">{displayKey}</span>
                    </li>
                    <li>
                      <span className="k-label">模型</span>
                      <span className="k-value">点「管理」拉取列表后勾选</span>
                    </li>
                  </ul>
                  <ul className="tips">
                    <li>Cherry Studio 也支持 Anthropic 类型的提供商，用 Claude 时选它可以拿到原生思考过程。</li>
                  </ul>
                </>
              )}

              {tool === 'cline' && (
                <>
                  <div className="code-head">
                    <span>OpenAI Compatible 提供商</span>
                    <CopyBtn text={() => copyWithReveal((k) => `${origin}/v1\n${k}`)} label="复制地址和密钥" />
                  </div>
                  <ul className="kv">
                    <li>
                      <span className="k-label">Base URL</span>
                      <span className="k-value mono">
                        {origin}/v1
                      </span>
                    </li>
                    <li>
                      <span className="k-label">API Key</span>
                      <span className="k-value mono">{displayKey}</span>
                    </li>
                    <li>
                      <span className="k-label">Model ID</span>
                      <span className="k-value mono">填站点开放的模型名</span>
                    </li>
                  </ul>
                  <ul className="tips">
                    <li>Cursor 需要关掉其他模型只保留自定义模型，否则会走 Cursor 自己的通道。</li>
                  </ul>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <div className="card rise" style={{ ['--i' as string]: 3 }}>
                <div className="card-top" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="card-title">端点</div>
                    <div className="card-desc">三种协议原生支持，不做格式转换</div>
                  </div>
                </div>
                <ul className="kv">
                  <li>
                    <span className="k-label">Anthropic</span>
                    <span className="k-value mono">/v1/messages</span>
                  </li>
                  <li>
                    <span className="k-label">OpenAI Responses</span>
                    <span className="k-value mono">/v1/responses</span>
                  </li>
                  <li>
                    <span className="k-label">OpenAI Chat</span>
                    <span className="k-value mono">/v1/chat/completions</span>
                  </li>
                  <li>
                    <span className="k-label">模型列表</span>
                    <span className="k-value mono">/v1/models</span>
                  </li>
                </ul>
              </div>
              <div className="card rise" style={{ ['--i' as string]: 4 }}>
                <div className="card-top" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="card-title">验证连通</div>
                    <div className="card-desc">粘进终端跑一下</div>
                  </div>
                  <CopyBtn text={() => copyWithReveal((k) => modelsCurl(origin, k))} />
                </div>
                <pre className="code-view" style={{ fontSize: 11.5 }}>
                  {snippets.curl}
                </pre>
                <div className="stat-sub" style={{ marginTop: 10 }}>
                  返回模型列表即为成功。复制时会自动换成完整密钥。
                </div>
              </div>
              <Notice>
                配置里的域名来自站点「服务器地址」，没有配置时用当前门户域名。本地开发会落到 http://127.0.0.1:3210，不要用设计稿里的 api.transit.local。
              </Notice>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
