import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Empty, ErrorNote, PageHead, Pagination, Segmented, Spinner, StatCard } from '@/components/ui'
import { getLogStats, listLogs, LOG_TYPE, type UsageLog } from '@/lib/api'
import { daysAgo, formatDateTime, formatDuration, formatInt, formatQuota, formatTokens, startOfToday } from '@/lib/format'
import { useSite } from '@/lib/site'

const PAGE_SIZE = 25

const RANGES = [
  { id: 'today', label: '今天', start: () => startOfToday() },
  { id: '7d', label: '7 天', start: () => daysAgo(6) },
  { id: '30d', label: '30 天', start: () => daysAgo(29) },
  { id: 'all', label: '全部', start: () => 0 },
] as const

type RangeId = (typeof RANGES)[number]['id']

function cacheInfo(log: UsageLog): string | null {
  if (!log.other) return null
  try {
    const o = JSON.parse(log.other) as Record<string, unknown>
    const cached = Number(o.cache_tokens ?? o.cached_tokens ?? o.cache_read_input_tokens ?? 0)
    const created = Number(o.cache_creation_tokens ?? o.cache_creation_input_tokens ?? 0)
    const parts: string[] = []
    if (cached > 0) parts.push(`缓存命中 ${formatTokens(cached)}`)
    if (created > 0) parts.push(`缓存写入 ${formatTokens(created)}`)
    return parts.length ? parts.join(' · ') : null
  } catch {
    return null
  }
}

export function UsagePage() {
  const site = useSite()
  const [range, setRange] = useState<RangeId>('7d')
  const [type, setType] = useState<number>(LOG_TYPE.consume)
  const [model, setModel] = useState('')
  const [token, setToken] = useState('')
  const [page, setPage] = useState(1)

  const start = RANGES.find((r) => r.id === range)!.start()
  const end = Math.floor(Date.now() / 1000)
  const filters = {
    start_timestamp: start || undefined,
    end_timestamp: end,
    model_name: model.trim() || undefined,
    token_name: token.trim() || undefined,
  }

  const stats = useQuery({ queryKey: ['log-stats', filters], queryFn: () => getLogStats(filters) })
  const logs = useQuery({
    queryKey: ['logs', filters, type, page],
    queryFn: () => listLogs({ ...filters, type: type || undefined, p: page, page_size: PAGE_SIZE }),
  })

  const items = logs.data?.items ?? []
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 0
  const avg = stats.data && days > 0 ? stats.data.quota / days : 0

  return (
    <div>
      <PageHead
        tag="只记录 token 数与费用 · 不记录任何请求内容"
        title="用量"
        desc="按官方价折算的美元额度。缓存命中会在备注里标出来——上游没有单独的缓存汇总接口，所以不编一个百分比。"
        actions={
          <Segmented
            value={range}
            onChange={(id) => {
              setRange(id)
              setPage(1)
            }}
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          />
        }
      />

      <div className="grid-4">
        <StatCard
          i={1}
          accent
          label={range === 'all' ? '全部消费' : `${RANGES.find((r) => r.id === range)?.label}消费`}
          value={stats.data ? formatQuota(stats.data.quota, site.quotaPerUnit) : '—'}
          hint={days > 0 && stats.data ? `日均 ${formatQuota(avg, site.quotaPerUnit)}` : undefined}
        />
        <StatCard i={2} label="记录条数" value={logs.data ? formatInt(logs.data.total) : '—'} hint="当前筛选条件下" />
        <StatCard i={3} label="请求 / 分钟" value={stats.data ? formatInt(stats.data.rpm) : '—'} hint="最近一分钟" />
        <StatCard i={4} label="Token / 分钟" value={stats.data ? formatTokens(stats.data.tpm) : '—'} hint="最近一分钟" />
      </div>

      <div className="card table-box rise" style={{ ['--i' as string]: 5 }}>
        <div className="table-top">
          <div>
            <div className="card-title">逐笔记录</div>
            <div className="card-desc">{logs.data ? `${logs.data.total} 条 · 按时间倒序` : '正在读取'}</div>
          </div>
          <div className="filters">
            <select
              className="select"
              value={type}
              onChange={(e) => {
                setType(Number(e.target.value))
                setPage(1)
              }}
              aria-label="记录类型"
            >
              <option value={LOG_TYPE.consume}>消费</option>
              <option value={LOG_TYPE.topup}>充值</option>
              <option value={LOG_TYPE.error}>错误</option>
              <option value={0}>全部类型</option>
            </select>
            <input
              className="input"
              placeholder="模型名过滤"
              style={{ width: 150 }}
              value={model}
              onChange={(e) => {
                setModel(e.target.value)
                setPage(1)
              }}
            />
            <input
              className="input"
              placeholder="密钥名过滤"
              style={{ width: 130 }}
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        {logs.isLoading ? (
          <Spinner />
        ) : logs.error ? (
          <div style={{ padding: 16 }}>
            <ErrorNote error={logs.error} />
          </div>
        ) : items.length === 0 ? (
          <Empty title="这段时间是空的">换个时间范围，或者先去「接入」页跑通一次调用。</Empty>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <colgroup>
                <col style={{ width: '16%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>模型</th>
                  <th>密钥</th>
                  <th className="r">输入 / 输出</th>
                  <th className="r">费用</th>
                  <th className="r">耗时</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const cache = cacheInfo(l)
                  const isTopup = l.type === LOG_TYPE.topup
                  const isError = l.type === LOG_TYPE.error
                  return (
                    <tr key={l.id}>
                      <td className="mono tert clip">{formatDateTime(l.created_at).slice(5, 16)}</td>
                      <td className="wrap">
                        {isError && <span className="pill red">错误</span>}{' '}
                        {isTopup ? <span className="pill green">充值</span> : <span className="mono-pill">{l.model_name || '—'}</span>}
                      </td>
                      <td className="tert clip">{l.token_name || '—'}</td>
                      <td className="r tokens">
                        {l.prompt_tokens || l.completion_tokens ? (
                          <>
                            <span className="in">{formatInt(l.prompt_tokens)}</span>
                            {' / '}
                            <span className="out">{formatInt(l.completion_tokens)}</span>
                          </>
                        ) : (
                          <span className="tert">—</span>
                        )}
                      </td>
                      <td className="r mono" style={{ fontWeight: 600, color: isTopup ? '#1f8a43' : undefined }}>
                        {isTopup ? '+' : ''}
                        {l.quota ? formatQuota(l.quota, site.quotaPerUnit) : '$0.000'}
                      </td>
                      <td className="r tert mono">{l.use_time ? formatDuration(l.use_time) : '—'}</td>
                      <td className="wrap">
                        {cache ? <span className="cache">{cache}</span> : <span className="tert clip">{l.content || '—'}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {logs.data && <Pagination page={page} pageSize={PAGE_SIZE} total={logs.data.total} onChange={setPage} />}
      </div>
    </div>
  )
}
