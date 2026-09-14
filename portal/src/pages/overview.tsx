import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { CopyBtn, ErrorNote, PageHead, Segmented, Spinner, StatCard } from '@/components/ui'
import { getLogStats, getNotice, getQuotaDates, getSelf, getUserGroups, listKeys, type ApiKey } from '@/lib/api'
import { claudeSettings, codexToml, openaiPython } from '@/lib/setup-config'
import {
  daysAgo,
  formatCny,
  formatInt,
  formatQuota,
  formatRelative,
  formatTokens,
  greeting,
  maskKey,
  quotaToUsd,
  startOfToday,
} from '@/lib/format'
import { useApiOrigin, useSite } from '@/lib/site'

type Range = '7' | '14' | '30'

function dayKey(ts: number) {
  const d = new Date(ts * 1000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function keyStatus(k: ApiKey) {
  if (k.status === 1) {
    if (k.expired_time !== -1 && k.expired_time < Date.now() / 1000) return { tone: 'red' as const, text: '已过期' }
    if (!k.unlimited_quota && k.remain_quota <= 0) return { tone: 'orange' as const, text: '额度用尽' }
    return { tone: 'green' as const, text: '正常运转' }
  }
  if (k.status === 2) return { tone: 'grey' as const, text: '已停用' }
  if (k.status === 3) return { tone: 'red' as const, text: '已过期' }
  if (k.status === 4) return { tone: 'orange' as const, text: '额度用尽' }
  return { tone: 'grey' as const, text: '未知' }
}

export function OverviewPage() {
  const site = useSite()
  const origin = useApiOrigin()
  const [days, setDays] = useState<Range>('14')
  const [tool, setTool] = useState<'cc' | 'codex' | 'oai'>('cc')
  const n = Number(days)
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf })
  const groups = useQuery({ queryKey: ['groups'], queryFn: getUserGroups })
  const today = useQuery({
    queryKey: ['log-stats', 'today'],
    queryFn: () => getLogStats({ start_timestamp: startOfToday(), end_timestamp: Math.floor(Date.now() / 1000) }),
  })
  const series = useQuery({
    queryKey: ['quota-dates', n],
    queryFn: () => getQuotaDates(daysAgo(n - 1), Math.floor(Date.now() / 1000)),
  })
  const keys = useQuery({ queryKey: ['keys', 1], queryFn: () => listKeys(1, 8) })
  const notice = useQuery({ queryKey: ['notice'], queryFn: getNotice, staleTime: 5 * 60_000 })

  const u = self.data
  const groupInfo = u && groups.data ? groups.data[u.group] : undefined
  const name = u?.display_name || u?.username || ''

  const chart = useMemo(() => {
    const byDay = new Map<string, { quota: number; tokens: number; ts: number }>()
    const byModel = new Map<string, number>()
    for (let i = n - 1; i >= 0; i--) {
      const ts = daysAgo(i)
      byDay.set(dayKey(ts), { quota: 0, tokens: 0, ts })
    }
    for (const row of series.data ?? []) {
      const key = dayKey(row.created_at)
      const bucket = byDay.get(key)
      if (bucket) {
        bucket.quota += row.quota ?? 0
        bucket.tokens += row.token_used ?? 0
      }
      if (row.model_name) byModel.set(row.model_name, (byModel.get(row.model_name) ?? 0) + (row.quota ?? 0))
    }
    const daysList = [...byDay.entries()].map(([key, v]) => ({ key, ...v }))
    const maxQuota = Math.max(1, ...daysList.map((d) => d.quota))
    const periodTotal = daysList.reduce((s, d) => s + d.quota, 0)
    const peak = daysList.reduce((best, d) => (d.quota > best.quota ? d : best), daysList[0] ?? { key: '', quota: 0 })
    const topModels = [...byModel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    return { daysList, maxQuota, periodTotal, peak, topModels }
  }, [series.data, n])

  const firstKey = keys.data?.items[0]
  const previewKey = firstKey ? maskKey(firstKey.key) : 'sk-xxxx…xxxx'
  const copyText =
    tool === 'cc'
      ? claudeSettings(origin, previewKey)
      : tool === 'codex'
        ? codexToml(origin)
        : openaiPython(origin, previewKey)

  const todayUsd = today.data ? quotaToUsd(today.data.quota, site.quotaPerUnit) : undefined
  const dateLabel = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

  return (
    <div>
      <PageHead
        ping
        tag={`${dateLabel} · ${site.loading ? '正在连站点' : '服务正常'}`}
        title={`${greeting()}${name ? `，${name}` : ''}`}
        desc={
          todayUsd !== undefined
            ? `今日已消耗 ${formatQuota(today.data!.quota, site.quotaPerUnit)}。额度按上游官方价折算，实际扣费 = 官方价 × 分组倍率。`
            : '额度按上游官方价折算为美元显示。'
        }
        actions={
          <>
            <Link className="btn btn-ghost" to="/setup">
              接入文档
            </Link>
            <Link className="btn btn-primary" to="/keys">
              + 新建密钥
            </Link>
          </>
        }
      />

      {self.error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorNote error={self.error} />
        </div>
      )}

      {u && (u.quota <= 0 || (!keys.isLoading && !keys.data?.items.length)) && (
        <nav className="start-path rise" aria-label="接下来">
          <Link to="/keys">
            <span className="n">01</span>
            <b>{keys.data?.items.length ? '密钥已就绪' : '建一把密钥'}</b>
            <p>{keys.data?.items.length ? '再到接入页把配置贴进工具。' : '一台环境一把。创建后立刻复制完整 key。'}</p>
          </Link>
          <Link to="/setup">
            <span className="n">02</span>
            <b>复制接入配置</b>
            <p>Claude Code、Codex、Cherry Studio 只换地址和密钥。</p>
          </Link>
          <Link to={u.quota <= 0 ? '/wallet' : '/invite'}>
            <span className="n">03</span>
            <b>{u.quota <= 0 ? '兑换余额' : '邀请朋友'}</b>
            <p>
              {u.quota <= 0
                ? '找站长或邀请你的人要兑换码，填进钱包即到账。'
                : '把邀请页里的链接发出去，对方点开就能注册。'}
            </p>
          </Link>
        </nav>
      )}

      <div className="grid-4">
        <StatCard
          i={1}
          accent
          label="可用余额"
          value={u ? formatQuota(u.quota, site.quotaPerUnit) : '—'}
          hint={
            u ? (
              <>
                ≈ {formatCny(quotaToUsd(u.quota, site.quotaPerUnit), site.usdRate)} · <Link to="/wallet">快捷充值</Link>
              </>
            ) : undefined
          }
        />
        <StatCard
          i={2}
          label="今日消费"
          value={today.data ? formatQuota(today.data.quota, site.quotaPerUnit) : '—'}
          hint={today.data ? `${formatTokens(today.data.tpm)} tokens/min 吞吐` : undefined}
        />
        <StatCard
          i={3}
          label="累计消耗"
          value={u ? formatQuota(u.used_quota, site.quotaPerUnit) : '—'}
          hint={u ? `${formatInt(u.request_count)} 次调用请求` : undefined}
        />
        <StatCard
          i={4}
          label="权限分组"
          value={<span className="stat-num sm">{u?.group || '—'}</span>}
          hint={
            groupInfo
              ? `${groupInfo.ratio}× ${groupInfo.desc || (groupInfo.ratio === 1 ? '无任何溢价倍率' : '')}`
              : undefined
          }
        />
      </div>

      <div className="grid-split">
        <div className="card rise" style={{ ['--i' as string]: 5 }}>
          <div className="card-top">
            <div>
              <div className="card-title">{n} 天用量走势</div>
              <div className="card-desc">
                合计 {formatQuota(chart.periodTotal, site.quotaPerUnit)}
                {chart.peak.quota > 0 ? ` · 峰值在 ${chart.peak.key} (${formatQuota(chart.peak.quota, site.quotaPerUnit)})` : ''}
              </div>
            </div>
            <Segmented
              value={days}
              onChange={setDays}
              options={[
                { id: '7', label: '7 天' },
                { id: '14', label: '14 天' },
                { id: '30', label: '30 天' },
              ]}
            />
          </div>
          {series.isLoading ? (
            <Spinner />
          ) : series.error ? (
            <ErrorNote error={series.error} />
          ) : (
            <div className="chart-canvas" role="img" aria-label="每日消费柱状图">
              {chart.daysList.map((d) => {
                const h = d.quota <= 0 ? 2 : Math.max(6, Math.round((d.quota / chart.maxQuota) * 100))
                return (
                  <div
                    key={d.key}
                    className="col"
                    data-tooltip={`${d.key} · ${formatQuota(d.quota, site.quotaPerUnit)}`}
                  >
                    <div
                      className={clsxFill(d.quota === chart.peak.quota && chart.peak.quota > 0)}
                      style={{ height: `${h}%` }}
                    />
                    <span className="col-date">{d.key.split('/')[1]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card rise" style={{ ['--i' as string]: 6 }}>
          <div className="card-top">
            <div>
              <div className="card-title">模型消耗结构</div>
              <div className="card-desc">
                {chart.topModels[0]
                  ? `${chart.topModels[0][0]} 占比 ${Math.round((chart.topModels[0][1] / Math.max(1, chart.periodTotal)) * 100)}%`
                  : `最近 ${n} 天还没有模型消耗`}
              </div>
            </div>
          </div>
          {chart.topModels.length === 0 ? (
            <p className="stat-sub">打一枪之后，这里会按模型拆开给你看。</p>
          ) : (
            <ul className="model-flow">
              {chart.topModels.map(([name, q]) => (
                <li key={name}>
                  <div className="flow-meta">
                    <code>{name}</code>
                    <span>{formatQuota(q, site.quotaPerUnit)}</span>
                  </div>
                  <div className="track">
                    <div
                      className="track-bar"
                      style={{ width: `${Math.max(4, (q / (chart.topModels[0]?.[1] || 1)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card table-box rise" style={{ ['--i' as string]: 7 }}>
        <div className="table-top">
          <div>
            <div className="card-title">密钥分配与熔断</div>
            <div className="card-desc">独立配额监控与单机设备控制</div>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/keys">
            + 分配新设备
          </Link>
        </div>
        {keys.isLoading ? (
          <Spinner />
        ) : keys.error ? (
          <div style={{ padding: 16 }}>
            <ErrorNote error={keys.error} />
          </div>
        ) : !keys.data?.items.length ? (
          <div className="empty">
            <b>还没有密钥</b>
            先建一把再去「接入」贴配置。一台机器一把，出问题也好单独停。
            <div style={{ marginTop: 12 }}>
              <Link className="btn btn-primary btn-sm" to="/keys">
                去建密钥
              </Link>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>应用场景 / 设备</th>
                  <th>密钥签名</th>
                  <th>运行状态</th>
                  <th className="r">额度限制</th>
                  <th className="r">当期消耗</th>
                  <th>最后请求</th>
                </tr>
              </thead>
              <tbody>
                {keys.data.items.slice(0, 4).map((k) => {
                  const st = keyStatus(k)
                  return (
                    <tr key={k.id}>
                      <td className="wrap" style={{ fontWeight: 600 }}>
                        {k.name}
                      </td>
                      <td>
                        <span className="mono-pill">{maskKey(k.key)}</span>
                      </td>
                      <td>
                        <span className={`badge-dot ${st.tone}`}>{st.text}</span>
                      </td>
                      <td className="r tert">{k.unlimited_quota ? '不限' : formatQuota(k.remain_quota, site.quotaPerUnit)}</td>
                      <td className="r mono" style={{ fontWeight: 500 }}>
                        {formatQuota(k.used_quota, site.quotaPerUnit)}
                      </td>
                      <td className="tert">{formatRelative(k.accessed_time)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notice.data && notice.data.trim() && (
        <div className="card rise" style={{ ['--i' as string]: 8, marginTop: 14 }}>
          <div className="card-title">站点公告</div>
          <p className="stat-sub" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
            {notice.data.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()}
          </p>
        </div>
      )}

      <div className="grid-split" style={{ marginTop: 14 }}>
        <div className="card rise" style={{ ['--i' as string]: 8 }}>
          <div className="card-top">
            <div>
              <div className="card-title">快速配置</div>
              <div className="card-desc">完整六种工具在「接入」页，这里先给常用三份</div>
            </div>
            <CopyBtn text={copyText} label="拷贝配置" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Segmented
              value={tool}
              onChange={setTool}
              options={[
                { id: 'cc', label: 'Claude Code' },
                { id: 'codex', label: 'Codex' },
                { id: 'oai', label: 'OpenAI API' },
              ]}
            />
          </div>
          <pre className="code-view">
            {tool === 'cc' && (
              <>
                <span className="c">// ~/.claude/settings.json</span>
                {'\n'}
                {claudeSettings(origin, previewKey)}
              </>
            )}
            {tool === 'codex' && (
              <>
                <span className="c"># ~/.codex/config.toml</span>
                {'\n'}
                {codexToml(origin)}
              </>
            )}
            {tool === 'oai' && (
              <>
                <span className="c"># Python · openai SDK</span>
                {'\n'}
                {openaiPython(origin, previewKey)}
              </>
            )}
          </pre>
          {!firstKey && <p className="stat-sub" style={{ marginTop: 10 }}>还没有密钥时，这里用占位符。建一把再到「接入」页套完整 key。</p>}
        </div>
        <div className="card rise" style={{ ['--i' as string]: 9 }}>
          <div className="card-top">
            <div>
              <div className="card-title">接入指引</div>
              <div className="card-desc">极简三步，直连无需代理</div>
            </div>
          </div>
          <ul className="guide-flow">
            <li className="flow-step">
              <span className="step-num">1</span>
              <div className="step-content">
                <b>签发设备密钥</b>
                <p>为每台独立运行环境配置专用密钥，防止跨设备泄露。</p>
              </div>
            </li>
            <li className="flow-step">
              <span className="step-num">2</span>
              <div className="step-content">
                <b>设置端点地址</b>
                <p>到「接入」页复制直连 Base URL，粘进工具即可生效。</p>
              </div>
            </li>
            <li className="flow-step">
              <span className="step-num">3</span>
              <div className="step-content">
                <b>实时观察吞吐</b>
                <p>Token 用量和费用在「用量」里同步，不记录任何对话内容。</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function clsxFill(active: boolean) {
  return active ? 'col-fill active-max' : 'col-fill'
}
