import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button, CopyBtn, Empty, ErrorNote, Modal, PageHead, Pagination, Spinner } from '@/components/ui'
import {
  createKey,
  deleteKey,
  getLogStats,
  getUserGroups,
  getUserModels,
  listKeys,
  revealKey,
  setKeyStatus,
  type ApiKey,
  type ApiKeyInput,
} from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { formatDate, formatQuota, formatRelative, fullKey, maskKey, startOfMonth, usdToQuota } from '@/lib/format'
import { useSite } from '@/lib/site'

const PAGE_SIZE = 20
const EXPIRY = [
  { label: '永不过期', days: 0 },
  { label: '30 天', days: 30 },
  { label: '90 天', days: 90 },
  { label: '1 年', days: 365 },
]

function statusOf(k: ApiKey) {
  if (k.status === 1) {
    if (k.expired_time !== -1 && k.expired_time < Date.now() / 1000) return { tone: 'red' as const, text: '已过期' }
    if (!k.unlimited_quota && k.remain_quota <= 0) return { tone: 'orange' as const, text: '额度用尽' }
    return { tone: 'green' as const, text: '启用' }
  }
  if (k.status === 2) return { tone: 'grey' as const, text: '已停用' }
  if (k.status === 3) return { tone: 'red' as const, text: '已过期' }
  if (k.status === 4) return { tone: 'orange' as const, text: '额度用尽' }
  return { tone: 'grey' as const, text: '未知' }
}

function keyMeta(k: ApiKey) {
  const parts: string[] = []
  if (k.group) parts.push(`分组 ${k.group}`)
  else parts.push('跟随账户')
  if (k.model_limits_enabled && k.model_limits) parts.push(`仅限 ${k.model_limits.replace(/,/g, ' · ')}`)
  else parts.push('不限模型')
  if (k.allow_ips) parts.push(`IP 白名单`)
  parts.push(k.expired_time === -1 ? '永不过期' : `${formatDate(k.expired_time)} 到期`)
  return parts.join(' · ')
}

export function KeysPage() {
  const site = useSite()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<{ name: string; key: string } | null>(null)
  const [revealed, setRevealed] = useState<Record<number, string>>({})
  const [pendingDelete, setPendingDelete] = useState<ApiKey | null>(null)

  const keys = useQuery({ queryKey: ['keys', page, q], queryFn: () => listKeys(page, PAGE_SIZE, q) })
  const month = useQuery({
    queryKey: ['log-stats', 'month'],
    queryFn: () => getLogStats({ start_timestamp: startOfMonth(), end_timestamp: Math.floor(Date.now() / 1000) }),
  })

  const items = useMemo(() => {
    const list = keys.data?.items ?? []
    if (status === 'all') return list
    return list.filter((k) => {
      const st = statusOf(k)
      if (status === 'on') return st.tone === 'green'
      if (status === 'off') return st.text === '已停用'
      if (status === 'out') return st.text === '额度用尽'
      return true
    })
  }, [keys.data, status])

  const allForStats = keys.data?.items ?? []
  const active = allForStats.filter((k) => statusOf(k).tone === 'green').length
  const hottest = [...allForStats].sort((a, b) => b.used_quota - a.used_quota)[0]
  const need = allForStats.find((k) => statusOf(k).text === '额度用尽')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['keys'] })

  const toggle = useMutation({
    mutationFn: (k: ApiKey) => setKeyStatus(k.id, k.status === 1 ? 2 : 1),
    onSuccess: (res) => {
      if (!res.success) toast.error(res.message || '启停没成功')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '启停没成功'),
  })

  const remove = useMutation({
    mutationFn: (k: ApiKey) => deleteKey(k.id),
    onSuccess: (res) => {
      if (res.success) toast.success('密钥已删除')
      else toast.error(res.message || '删除没成功')
      setPendingDelete(null)
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '删除没成功'),
  })

  async function reveal(k: ApiKey) {
    if (revealed[k.id]) {
      setRevealed((r) => {
        const next = { ...r }
        delete next[k.id]
        return next
      })
      return
    }
    try {
      const key = fullKey(await revealKey(k.id))
      setRevealed((r) => ({ ...r, [k.id]: key }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '完整密钥没取到')
    }
  }

  async function copyKey(k: ApiKey) {
    try {
      const value = revealed[k.id] ?? fullKey(await revealKey(k.id))
      const ok = await copyText(value)
      if (ok) toast.success('已复制完整密钥')
      else toast.error('复制没成功，请手动选中')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '完整密钥没取到')
    }
  }

  return (
    <div>
      <PageHead
        tag={`${keys.data?.total ?? 0} 把密钥${keys.data ? ` · ${active} 把在用` : ''}`}
        title="密钥"
        desc="每把密钥独立计量、可单独停用。建议一台机器一把；跑脚本的密钥务必设额度上限。"
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            + 新建密钥
          </Button>
        }
      />

      <div className="grid-3">
        <div className="card rise" style={{ ['--i' as string]: 1 }}>
          <div className="stat-label">本月密钥消耗</div>
          <div className="stat-num">{month.data ? formatQuota(month.data.quota, site.quotaPerUnit) : '—'}</div>
          <div className="stat-sub">{keys.data ? `${keys.data.total} 把密钥合计` : '正在汇总'}</div>
        </div>
        <div className="card rise" style={{ ['--i' as string]: 2 }}>
          <div className="stat-label">最活跃</div>
          <div className="stat-num sm">{hottest?.name || '还没有调用'}</div>
          <div className="stat-sub">
            {hottest ? `已用 ${formatQuota(hottest.used_quota, site.quotaPerUnit)}` : '建一把密钥开始用'}
          </div>
        </div>
        <div className="card rise" style={{ ['--i' as string]: 3 }}>
          <div className="stat-label">需要关注</div>
          <div className="stat-num sm" style={{ color: need ? 'var(--orange)' : undefined }}>
            {need ? '1 把额度用尽' : '暂无异常'}
          </div>
          <div className="stat-sub">
            {need ? (
              <>
                {need.name} · <Link to="/wallet">追加额度</Link>
              </>
            ) : (
              '额度用尽或过期的密钥会出现在这里'
            )}
          </div>
        </div>
      </div>

      <div className="card table-box rise" style={{ ['--i' as string]: 4 }}>
        <div className="table-top">
          <div>
            <div className="card-title">全部密钥</div>
            <div className="card-desc">点眼睛显示完整密钥，复制后请妥善保管</div>
          </div>
          <div className="filters">
            <input
              className="input"
              placeholder="搜索名称…"
              style={{ width: 180 }}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="状态">
              <option value="all">全部状态</option>
              <option value="on">启用</option>
              <option value="off">已停用</option>
              <option value="out">额度用尽</option>
            </select>
          </div>
        </div>
        {keys.isLoading ? (
          <Spinner />
        ) : keys.error ? (
          <div style={{ padding: 16 }}>
            <ErrorNote error={keys.error} />
          </div>
        ) : items.length === 0 ? (
          <Empty title="还没有密钥">点右上角「新建密钥」，一台机器一把。</Empty>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>密钥</th>
                  <th>状态</th>
                  <th className="r">额度</th>
                  <th>最近使用</th>
                  <th className="r">管理</th>
                </tr>
              </thead>
              <tbody>
                {items.map((k) => {
                  const st = statusOf(k)
                  const shown = revealed[k.id]
                  const remain = k.unlimited_quota ? 0 : k.remain_quota
                  const used = k.used_quota
                  const cap = remain + used
                  const pct = !k.unlimited_quota && cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0
                  return (
                    <tr key={k.id}>
                      <td className="wrap" style={{ fontWeight: 600 }}>
                        {k.name}
                        <div className="tert" style={{ fontSize: 11.5, fontWeight: 400, marginTop: 2 }}>
                          {keyMeta(k)}
                        </div>
                      </td>
                      <td>
                        <div className="key-cell">
                          <span className="mono-pill">{shown ?? maskKey(k.key)}</span>
                          <button type="button" className="icon-btn" title={shown ? '隐藏' : '显示'} onClick={() => reveal(k)}>
                            <svg viewBox="0 0 24 24">
                              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button type="button" className="icon-btn" title="复制" onClick={() => copyKey(k)}>
                            <svg viewBox="0 0 24 24">
                              <rect x="9" y="9" width="12" height="12" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-dot ${st.tone}`}>{st.text}</span>
                      </td>
                      <td className="r">
                        <div className="quota-cell">
                          {k.unlimited_quota ? (
                            <span className="tert">
                              跟随账户 · 已用 <span className="mono">{formatQuota(k.used_quota, site.quotaPerUnit)}</span>
                            </span>
                          ) : (
                            <>
                              <span>
                                <span className="mono" style={{ fontWeight: 600 }}>
                                  {formatQuota(k.remain_quota, site.quotaPerUnit)}
                                </span>{' '}
                                <span className="tert">/ {formatQuota(cap, site.quotaPerUnit)}</span>
                              </span>
                              <div className="track">
                                <div className={`track-bar ${pct >= 90 ? 'warn' : 'accent'}`} style={{ width: `${pct || 2}%` }} />
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="tert">{formatRelative(k.accessed_time)}</td>
                      <td>
                        <div className="actions">
                          <Link to={`/setup?key=${k.id}`}>配置</Link>
                          <button type="button" className="linkish" onClick={() => toggle.mutate(k)}>
                            {k.status === 1 ? '停用' : '启用'}
                          </button>
                          <button type="button" className="linkish danger" onClick={() => setPendingDelete(k)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {keys.data && <Pagination page={page} pageSize={PAGE_SIZE} total={keys.data.total} onChange={setPage} />}
      </div>

      <div className="notice rise" style={{ ['--i' as string]: 5, marginTop: 14 }}>
        <svg viewBox="0 0 24 24">
          <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
        </svg>
        <div>密钥泄露了怎么办：直接删掉重建，成本为零。正在用这把密钥的客户端会立刻失效，其他密钥不受影响。</div>
      </div>

      <CreateKeyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={async (name) => {
          setCreating(false)
          invalidate()
          try {
            const page1 = await listKeys(1, PAGE_SIZE)
            const created = page1.items.find((k) => k.name === name) ?? page1.items[0]
            if (created) setCreatedKey({ name: created.name, key: fullKey(await revealKey(created.id)) })
          } catch {
            toast.success('密钥已创建。请到列表里点眼睛查看完整密钥。')
          }
        }}
      />

      <Modal
        open={createdKey !== null}
        onClose={() => setCreatedKey(null)}
        title="密钥已创建"
        desc="完整密钥只在这里展示一次，关掉就只剩掩码"
        footer={
          <>
            <CopyBtn text={createdKey?.key ?? ''} label="复制完整密钥" />
            <Link className="btn btn-ghost" to="/setup" onClick={() => setCreatedKey(null)}>
              去接入页
            </Link>
            <Button variant="primary" onClick={() => setCreatedKey(null)}>
              我已保存
            </Button>
          </>
        }
      >
        <p className="stat-sub" style={{ marginBottom: 10 }}>
          {createdKey?.name}
        </p>
        <div className="copy-field">
          <span>{createdKey?.key}</span>
        </div>
      </Modal>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="删除密钥"
        desc="此操作不可恢复"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>取消</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => pendingDelete && remove.mutate(pendingDelete)}>
              删除
            </Button>
          </>
        }
      >
        <p className="stat-sub">
          确定删除 <b style={{ color: 'var(--ink)' }}>{pendingDelete?.name}</b> 吗？正在使用这把密钥的客户端会立刻失效。
        </p>
      </Modal>
    </div>
  )
}

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (name: string) => void
}) {
  const site = useSite()
  const [name, setName] = useState('')
  const [unlimited, setUnlimited] = useState(true)
  const [usd, setUsd] = useState('10')
  const [expiryDays, setExpiryDays] = useState(0)
  const [allowIps, setAllowIps] = useState('')
  const [limitModels, setLimitModels] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [group, setGroup] = useState('')

  const groups = useQuery({ queryKey: ['groups'], queryFn: getUserGroups, enabled: open })
  const available = useQuery({ queryKey: ['user-models'], queryFn: getUserModels, enabled: open && limitModels })

  const create = useMutation({
    mutationFn: (input: ApiKeyInput) => createKey(input),
    onSuccess: (res, input) => {
      if (!res.success) {
        toast.error(res.message || '创建没成功')
        return
      }
      reset()
      onCreated(input.name)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '创建没成功'),
  })

  function reset() {
    setName('')
    setUnlimited(true)
    setUsd('10')
    setExpiryDays(0)
    setAllowIps('')
    setLimitModels(false)
    setModels([])
    setGroup('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(usd)
    if (!unlimited && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error('请输入有效的额度上限')
      return
    }
    if (!unlimited && amount > 1_000_000) {
      toast.error('单把密钥额度不能超过 $1,000,000')
      return
    }
    create.mutate({
      name: name.trim(),
      unlimited_quota: unlimited,
      remain_quota: unlimited ? 0 : usdToQuota(amount, site.quotaPerUnit),
      expired_time: expiryDays === 0 ? -1 : Math.floor(Date.now() / 1000) + expiryDays * 86400,
      allow_ips: allowIps
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n'),
      model_limits_enabled: limitModels && models.length > 0,
      model_limits: limitModels ? models.join(',') : '',
      group,
      auto_groups: [],
      cross_group_retry: false,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新建密钥"
      desc="创建后只显示一次完整密钥，请立刻复制保存"
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" type="submit" form="create-key" loading={create.isPending}>
            创建密钥
          </Button>
        </>
      }
    >
      <form id="create-key" onSubmit={onSubmit} className="form-grid">
        <div className="field">
          <label htmlFor="key-name">名称</label>
          <input
            id="key-name"
            className="input"
            placeholder="例如：MacBook · Claude Code"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            autoFocus
          />
          <span className="hint">建议用「设备 · 用途」命名，方便在用量里区分。</span>
        </div>
        <div className="field">
          <label>额度上限</label>
          <div className="choice-row">
            <button type="button" className={`choice ${unlimited ? 'on' : ''}`} onClick={() => setUnlimited(true)}>
              跟随账户余额
            </button>
            <button type="button" className={`choice ${!unlimited ? 'on' : ''}`} onClick={() => setUnlimited(false)}>
              单独限额
            </button>
          </div>
          {!unlimited && (
            <div className="input-row">
              <input className="input mono" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} aria-label="额度上限美元" />
            </div>
          )}
          <span className="hint">挂机脚本、借给同事用的密钥建议单独限额，用完即停，不会拖垮整个账户。</span>
        </div>
        <div className="field">
          <label>有效期</label>
          <div className="choice-row">
            {EXPIRY.map((p) => (
              <button
                key={p.days}
                type="button"
                className={`choice ${expiryDays === p.days ? 'on' : ''}`}
                onClick={() => setExpiryDays(p.days)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="key-group">分组</label>
            <select id="key-group" className="select" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">跟随账户</option>
              {Object.entries(groups.data ?? {}).map(([g, info]) => (
                <option key={g} value={g}>
                  {g} · ×{info.ratio}
                  {info.desc ? ` · ${info.desc}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="key-ips">
              IP 白名单 <span className="tert">（可选）</span>
            </label>
            <input
              id="key-ips"
              className="input mono"
              placeholder="逗号分隔，支持 CIDR"
              value={allowIps}
              onChange={(e) => setAllowIps(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <div className="switch-row" style={{ border: 'none', padding: 0 }}>
            <div>
              <b>限制可用模型</b>
              <p>只勾选需要的模型，防止误用高价模型。</p>
            </div>
            <button
              type="button"
              className={`toggle ${limitModels ? 'on' : ''}`}
              onClick={() => setLimitModels((v) => !v)}
              aria-pressed={limitModels}
              aria-label="限制可用模型"
            />
          </div>
          {limitModels && (
            <div className="models-box">
              {available.isLoading ? (
                <span className="tert">正在拉取模型列表…</span>
              ) : (
                (available.data ?? []).map((m) => (
                  <label key={m}>
                    <input
                      type="checkbox"
                      checked={models.includes(m)}
                      onChange={(e) => setModels((cur) => (e.target.checked ? [...cur, m] : cur.filter((x) => x !== m)))}
                    />
                    <span>{m}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
