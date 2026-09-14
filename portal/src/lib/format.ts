// new-api stores balances as integer "quota" where quota_per_unit (500000 by
// default) equals one US dollar of upstream list price.

export const DEFAULT_QUOTA_PER_UNIT = 500000

export function quotaToUsd(quota: number, perUnit = DEFAULT_QUOTA_PER_UNIT): number {
  if (!Number.isFinite(quota) || !Number.isFinite(perUnit) || perUnit <= 0) return 0
  const n = quota / perUnit
  return Number.isFinite(n) ? n : 0
}

export function usdToQuota(usd: number, perUnit = DEFAULT_QUOTA_PER_UNIT): number {
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(perUnit) || perUnit <= 0) return 0
  const q = Math.round(usd * perUnit)
  if (!Number.isFinite(q) || q <= 0) return 0
  return Math.min(q, Number.MAX_SAFE_INTEGER)
}

const AFF_STORAGE_KEY = 'transit.aff'

/** Invite codes are short tokens. Strip anything that does not belong in ?aff=. */
export function normalizeAff(raw: string): string {
  return raw.trim().slice(0, 32).replace(/[^A-Za-z0-9_-]/g, '')
}

/** Accept a bare code or a full /register?aff= link. */
export function extractAff(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const urlLike = /^https?:\/\//i.test(trimmed) || /[/?#]/.test(trimmed)
  try {
    const q = new URL(trimmed).searchParams.get('aff')
    if (q) return normalizeAff(q)
  } catch {
    // not a URL
  }
  const m = trimmed.match(/[?&]aff=([^&\s#]+)/i)
  if (m) {
    try {
      return normalizeAff(decodeURIComponent(m[1]))
    } catch {
      return normalizeAff(m[1])
    }
  }
  if (urlLike) return ''
  return normalizeAff(trimmed)
}

export function persistAff(code: string): string {
  const next = extractAff(code)
  if (next) sessionStorage.setItem(AFF_STORAGE_KEY, next)
  return next
}

export function readStoredAff(urlAff = ''): string {
  const fromUrl = persistAff(urlAff)
  if (fromUrl) return fromUrl
  return normalizeAff(sessionStorage.getItem(AFF_STORAGE_KEY) || '')
}

export function clearStoredAff() {
  sessionStorage.removeItem(AFF_STORAGE_KEY)
}

export function formatUsd(usd: number, digits?: number): string {
  const d = digits ?? (Math.abs(usd) >= 100 ? 2 : Math.abs(usd) >= 1 ? 3 : 4)
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

export function formatQuota(quota: number, perUnit = DEFAULT_QUOTA_PER_UNIT, digits?: number): string {
  return formatUsd(quotaToUsd(quota, perUnit), digits)
}

export function formatCny(usd: number, rate: number): string {
  return `¥${(usd * rate).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatInt(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return formatInt(n)
}

export function formatDateTime(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds < 0) return '—'
  const d = new Date(unixSeconds * 1000)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function formatDate(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds < 0) return '—'
  const d = new Date(unixSeconds * 1000)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatRelative(unixSeconds: number): string {
  if (!unixSeconds || unixSeconds <= 0) return '从未'
  const diff = Math.floor(Date.now() / 1000) - unixSeconds
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  return formatDate(unixSeconds)
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return '<1s'
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`
  return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`
}

export function maskKey(key: string): string {
  if (!key) return ''
  const k = key.startsWith('sk-') ? key : `sk-${key}`
  if (k.length <= 12) return k
  return `${k.slice(0, 7)}…${k.slice(-4)}`
}

export function fullKey(key: string): string {
  return key.startsWith('sk-') ? key : `sk-${key}`
}

export function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

export function daysAgo(n: number): number {
  return startOfToday() - n * 86400
}

export function startOfMonth(): number {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function initials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  if (/[\u4e00-\u9fff]/.test(t)) return t.slice(0, 2)
  const parts = t.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

export function describeUserAgent(ua: string): string {
  if (!ua) return '未知设备'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Safari\//.test(ua) && !/Chrome/.test(ua)
        ? 'Safari'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : '浏览器'
  if (/iPhone/.test(ua)) return `iPhone · ${browser}`
  if (/iPad/.test(ua)) return `iPad · ${browser}`
  if (/Android/.test(ua)) return `Android · ${browser}`
  if (/Macintosh/.test(ua)) return `Mac · ${browser}`
  if (/Windows/.test(ua)) return `Windows · ${browser}`
  if (/Linux/.test(ua)) return `Linux · ${browser}`
  return browser
}
