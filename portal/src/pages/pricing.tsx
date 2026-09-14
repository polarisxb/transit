import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Empty, ErrorNote, PageHead, Spinner } from '@/components/ui'
import { getPricing, getSelf, type PricingModel } from '@/lib/api'
import { formatUsd } from '@/lib/format'
import { useSite } from '@/lib/site'

function hasRatio(value: number | null | undefined): boolean {
  return value !== undefined && value !== null && Number.isFinite(Number(value))
}

function groupRatioOf(ratios: Record<string, number> | undefined, group: string): number {
  const n = ratios?.[group]
  return n !== undefined && Number.isFinite(n) && n > 0 ? n : 1
}

function tokenBase(model: PricingModel, groupRatio: number): number {
  return model.model_ratio * 2 * groupRatio
}

function formatTokenPrice(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return formatUsd(n)
}

function vendorLabel(model: PricingModel, vendors: Record<number, string>): string {
  if (model.owner_by) return model.owner_by
  if (model.vendor_id && vendors[model.vendor_id]) return vendors[model.vendor_id]
  return ''
}

function usableGroups(model: PricingModel, usable: Record<string, string>): string[] {
  const enabled = model.enable_groups ?? []
  const keys = Object.keys(usable)
  if (enabled.includes('all')) return keys
  return enabled.filter((g) => g in usable)
}

export function PricingPage() {
  const site = useSite()
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf })
  const pricing = useQuery({ queryKey: ['pricing'], queryFn: getPricing })
  const [q, setQ] = useState('')
  const [vendor, setVendor] = useState('all')
  const [endpoint, setEndpoint] = useState('all')
  const [group, setGroup] = useState('')

  const usable = pricing.data?.usable_group ?? {}
  const ratios = pricing.data?.group_ratio ?? {}
  const userGroup = self.data?.group || 'default'
  const selectedGroup = group && group in usable ? group : userGroup in usable ? userGroup : Object.keys(usable)[0] || 'default'
  const groupRatio = groupRatioOf(ratios, selectedGroup)

  const vendors = useMemo(() => {
    const map: Record<number, string> = {}
    for (const v of pricing.data?.vendors ?? []) {
      if (v.id) map[v.id] = v.name
    }
    return map
  }, [pricing.data?.vendors])

  const models = pricing.data?.success ? (pricing.data.data ?? []) : []

  const vendorOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const m of models) {
      const label = vendorLabel(m, vendors)
      if (label) seen.set(label, label)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'zh'))
  }, [models, vendors])

  const endpointOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const m of models) {
      for (const e of m.supported_endpoint_types ?? []) {
        if (e) seen.add(e)
      }
    }
    return [...seen].sort()
  }, [models])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return models.filter((m) => {
      if (needle && !m.model_name.toLowerCase().includes(needle) && !(m.description || '').toLowerCase().includes(needle)) {
        return false
      }
      if (vendor !== 'all' && vendorLabel(m, vendors) !== vendor) return false
      if (endpoint !== 'all' && !(m.supported_endpoint_types ?? []).includes(endpoint)) return false
      return true
    })
  }, [models, q, vendor, endpoint, vendors])

  const showCache = rows.some((m) => m.quota_type === 0 && !m.billing_expr && hasRatio(m.cache_ratio))

  return (
    <div>
      <PageHead
        tag={`官方价 × 分组倍率 = 你的价；1 USD = ¥${site.usdRate.toFixed(2)}`}
        title="模型"
        desc="按当前分组看单价。密钥可以指定别的分组，用上面的切换对照。"
        actions={
          <select
            className="select"
            aria-label="分组"
            value={selectedGroup}
            onChange={(e) => setGroup(e.target.value)}
          >
            {Object.entries(usable).map(([id, desc]) => (
              <option key={id} value={id}>
                {id}
                {desc ? ` · ${desc}` : ''}
                {ratios[id] != null ? ` · ×${ratios[id]}` : ''}
              </option>
            ))}
          </select>
        }
      />

      <div className="card table-box rise" style={{ ['--i' as string]: 1 }}>
        <div className="table-top">
          <div>
            <div className="card-title">价格表</div>
            <div className="card-desc">
              当前分组 {selectedGroup}，倍率 ×{groupRatio}
              {self.data?.group && self.data.group !== selectedGroup ? `（账户分组是 ${self.data.group}）` : ''}
            </div>
          </div>
          <div className="filters">
            <input
              className="input"
              placeholder="搜索模型名…"
              style={{ width: 180 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="select" value={vendor} onChange={(e) => setVendor(e.target.value)} aria-label="供应商">
              <option value="all">全部供应商</option>
              {vendorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select className="select" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} aria-label="端点">
              <option value="all">全部端点</option>
              {endpointOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {pricing.isLoading || self.isLoading ? (
          <Spinner />
        ) : pricing.error ? (
          <div style={{ padding: 16 }}>
            <ErrorNote error={pricing.error} />
          </div>
        ) : !pricing.data?.success ? (
          <div style={{ padding: 16 }}>
            <ErrorNote error={pricing.data?.message || '价格表没拉下来'} />
          </div>
        ) : rows.length === 0 ? (
          <Empty title="没有匹配的模型">换个搜索词，或看看后台渠道有没有配到这个分组。</Empty>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>模型</th>
                  <th>计费方式</th>
                  <th className="r">输入 $/1M</th>
                  <th className="r">输出 $/1M</th>
                  {showCache && <th className="r">缓存读</th>}
                  <th>可用分组</th>
                  <th>端点</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const tiered = Boolean(m.billing_expr)
                  const perCall = m.quota_type === 1
                  const base = tokenBase(m, groupRatio)
                  const input = perCall ? m.model_price * groupRatio : base
                  const output = perCall ? input : base * m.completion_ratio
                  const cache = !perCall && hasRatio(m.cache_ratio) ? base * Number(m.cache_ratio) : Number.NaN
                  const groups = usableGroups(m, usable)
                  return (
                    <tr key={m.model_name}>
                      <td className="wrap" style={{ fontWeight: 600 }}>
                        {m.model_name}
                        {vendorLabel(m, vendors) && (
                          <div className="tert" style={{ fontSize: 11.5, fontWeight: 400, marginTop: 2 }}>
                            {vendorLabel(m, vendors)}
                          </div>
                        )}
                      </td>
                      <td>
                        {tiered ? (
                          <span className="badge-dot orange">阶梯计价</span>
                        ) : perCall ? (
                          <span className="badge-dot grey">按次</span>
                        ) : (
                          <span className="badge-dot green">按 token</span>
                        )}
                      </td>
                      <td className="r mono">
                        {tiered ? `${formatTokenPrice(base)} 起` : perCall ? `${formatUsd(input)} / 次` : formatTokenPrice(input)}
                      </td>
                      <td className="r mono">{tiered || perCall ? '—' : formatTokenPrice(output)}</td>
                      {showCache && <td className="r mono">{Number.isFinite(cache) ? formatTokenPrice(cache) : '—'}</td>}
                      <td className="wrap tert">{groups.length ? groups.join(' · ') : '—'}</td>
                      <td className="wrap tert">{(m.supported_endpoint_types ?? []).join(' · ') || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
