import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button, Empty, ErrorNote, Notice, PageHead, Pagination, Spinner } from '@/components/ui'
import { getLogStats, getSelf, getTopupHistory, redeemCode } from '@/lib/api'
import { daysAgo, formatCny, formatDateTime, formatQuota, quotaToUsd, startOfToday } from '@/lib/format'
import { useSite } from '@/lib/site'

const PAGE_SIZE = 10

function topupMethod(method?: string) {
  if (!method) return '兑换码'
  if (method === 'redeem' || method === 'balance') return '兑换码'
  return method
}

function topupStatus(status?: string) {
  if (status === 'success' || status === 'complete' || status === 'completed') return { tone: 'green' as const, text: '已到账' }
  if (status === 'pending') return { tone: 'orange' as const, text: '处理中' }
  if (status === 'failed' || status === 'expired') return { tone: 'red' as const, text: '失败' }
  return { tone: 'green' as const, text: status || '已到账' }
}

export function WalletPage() {
  const site = useSite()
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [page, setPage] = useState(1)
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf })
  const week = useQuery({
    queryKey: ['log-stats', '7d'],
    queryFn: () => getLogStats({ start_timestamp: daysAgo(6), end_timestamp: Math.floor(Date.now() / 1000) }),
  })
  const today = useQuery({
    queryKey: ['log-stats', 'today'],
    queryFn: () => getLogStats({ start_timestamp: startOfToday(), end_timestamp: Math.floor(Date.now() / 1000) }),
  })
  const history = useQuery({ queryKey: ['topups', page], queryFn: () => getTopupHistory(page, PAGE_SIZE) })

  const redeem = useMutation({
    mutationFn: (key: string) => redeemCode(key),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || '这张兑换码没能入账')
        return
      }
      toast.success(res.data ? `已到账 ${formatQuota(res.data, site.quotaPerUnit)}` : '兑换成功，余额已更新')
      setCode('')
      qc.invalidateQueries({ queryKey: ['self'] })
      qc.invalidateQueries({ queryKey: ['topups'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '这张兑换码没能入账'),
  })

  const u = self.data
  const daily = week.data ? week.data.quota / 7 : 0
  const daysLeft =
    u && daily > 0 ? Math.max(1, Math.round(u.quota / daily)) : u && u.quota > 0 ? undefined : 0
  const usedPct =
    u && u.used_quota + u.quota > 0 ? Math.min(100, Math.round((u.used_quota / (u.used_quota + u.quota)) * 100)) : 0

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const key = code.trim()
    if (!key) {
      toast.error('先把兑换码贴进来')
      return
    }
    redeem.mutate(key)
  }

  return (
    <div>
      <PageHead
        tag={`额度按上游官方价折算 · 1 USD = ¥${site.usdRate.toFixed(2)} 参考汇率`}
        title="钱包"
        desc="余额不足时用兑换码充值。本站不接在线支付：转账给站长后领取兑换码，兑换即到账。"
      />

      <div className="grid-split">
        <div className="card rise" style={{ ['--i' as string]: 1 }}>
          {self.error ? (
            <ErrorNote error={self.error} />
          ) : (
            <>
              <div className="balance-hero">
                <div>
                  <div className="stat-label">可用余额</div>
                  <div className="stat-num accent">{u ? formatQuota(u.quota, site.quotaPerUnit) : '—'}</div>
                  <div className="stat-sub">
                    {u ? (
                      <>
                        ≈ {formatCny(quotaToUsd(u.quota, site.quotaPerUnit), site.usdRate)}
                        {daysLeft ? (
                          <>
                            {' '}
                            · 按近 7 日均用量约可用 <b style={{ color: 'var(--ink)' }}>{daysLeft} 天</b>
                          </>
                        ) : null}
                      </>
                    ) : (
                      '正在读取余额'
                    )}
                  </div>
                </div>
                <div className="burn">
                  <div>
                    <b>{week.data ? formatQuota(daily, site.quotaPerUnit) : '—'}</b>日均消费
                  </div>
                  <div>
                    <b>{u ? formatQuota(u.used_quota, site.quotaPerUnit) : '—'}</b>累计消费
                  </div>
                  <div>
                    <b>{today.data ? formatQuota(today.data.quota, site.quotaPerUnit) : '—'}</b>今日消费
                  </div>
                </div>
              </div>
              <div className="track" style={{ marginTop: 18, height: 6 }}>
                <div className="track-bar accent" style={{ width: `${Math.max(2, 100 - usedPct)}%` }} />
              </div>
              <div className="stat-sub" style={{ marginTop: 8 }}>
                累计已用占「已用 + 剩余」的 {usedPct}%
              </div>
              {u && u.quota <= 0 && (
                <div style={{ marginTop: 14 }}>
                  <Notice>余额是 0。找站长或邀请你的人要一张兑换码，填到右边即到账。</Notice>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card rise redeem" style={{ ['--i' as string]: 2 }}>
          <div className="card-top" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-title">兑换码充值</div>
              <div className="card-desc">输入站长给你的兑换码</div>
            </div>
          </div>
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field">
              <input
                className="input"
                placeholder="TR-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" block loading={redeem.isPending}>
              兑换到账
            </Button>
          </form>
          <div className="stat-sub" style={{ marginTop: 12 }}>
            兑换码一次性使用。失败不会崩页面，错了换一张再试。
          </div>
        </div>
      </div>

      <div className="grid-split rev">
        <div className="card rise" style={{ ['--i' as string]: 3 }}>
          <div className="card-top" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-title">怎么充值</div>
              <div className="card-desc">朋友之间的简单流程</div>
            </div>
          </div>
          <ul className="how">
            <li>微信或支付宝转账给站长，备注你的用户名。</li>
            <li>站长按 ¥{site.usdRate.toFixed(2)} / $1 的参考汇率生成等额兑换码发给你。</li>
            <li>在左侧输入兑换码，余额实时到账，账单里会留下记录。</li>
            <li>分组倍率叠在官方价上；friends 通常是成本价。</li>
          </ul>
          <div style={{ marginTop: 16 }}>
            <Notice>余额没有有效期。用不完可以随时联系站长按原价退回。</Notice>
          </div>
        </div>

        <div className="card table-box rise" style={{ ['--i' as string]: 4 }}>
          <div className="table-top">
            <div>
              <div className="card-title">充值记录</div>
              <div className="card-desc">{history.data ? `${history.data.total} 笔` : '正在读取'}</div>
            </div>
          </div>
          {history.isLoading ? (
            <Spinner />
          ) : history.error ? (
            <div style={{ padding: 16 }}>
              <ErrorNote error={history.error} />
            </div>
          ) : !history.data?.items.length ? (
            <Empty title="还没有充值记录">转账给站长、拿到兑换码之后，第一笔会出现在这里。</Empty>
          ) : (
            <div className="table-scroll">
              <table className="data">
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>方式</th>
                    <th>凭证</th>
                    <th className="r">金额</th>
                    <th className="r">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((row) => {
                    const st = topupStatus(row.status)
                    const usd = row.money || quotaToUsd(Number(row.amount) || 0, site.quotaPerUnit)
                    return (
                      <tr key={row.id}>
                        <td className="mono tert clip">{formatDateTime(row.create_time)}</td>
                        <td>{topupMethod(row.payment_method)}</td>
                        <td className="wrap">
                          {row.trade_no ? <span className="mono-pill">{row.trade_no}</span> : <span className="tert">—</span>}
                        </td>
                        <td className="r mono" style={{ fontWeight: 600, color: '#1f8a43' }}>
                          +{formatQuota(usdToDisplayQuota(usd, site.quotaPerUnit, row.amount), site.quotaPerUnit, 2)}
                        </td>
                        <td className="r">
                          <span className={`badge-dot ${st.tone}`}>{st.text}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {history.data && <Pagination page={page} pageSize={PAGE_SIZE} total={history.data.total} onChange={setPage} />}
        </div>
      </div>
    </div>
  )
}

function usdToDisplayQuota(money: number, perUnit: number, amount: number) {
  if (money > 0) return Math.round(money * perUnit)
  return amount
}
