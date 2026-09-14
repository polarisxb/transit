import { useQuery } from '@tanstack/react-query'

import { getStatus, type SiteStatus } from './api'
import { DEFAULT_QUOTA_PER_UNIT } from './format'

export const PORTAL_NAME = 'Polaris API'

export interface Site {
  name: string
  logo: string
  quotaPerUnit: number
  usdRate: number
  registerEnabled: boolean
  passwordLoginEnabled: boolean
  passwordEncryption: boolean
  emailVerification: boolean
  turnstile: boolean
  docsLink: string
  version: string
  serverAddress: string
  initialized: boolean
  raw: SiteStatus | undefined
  loading: boolean
}

function normalizeOrigin(value?: string): string {
  return (value ?? '').trim().replace(/\/$/, '')
}

/** new-api ships ServerAddress = http://localhost:3000. Treat that as unset. */
function isFactoryServerAddress(value: string): boolean {
  const n = value.toLowerCase()
  return (
    n === '' ||
    n === 'http://localhost:3000' ||
    n === 'https://localhost:3000' ||
    n === 'http://127.0.0.1:3000' ||
    n === 'https://127.0.0.1:3000' ||
    n === 'localhost:3000'
  )
}

/** Hostname written into client configs. Never hardcode api.transit.local. */
export function resolveApiOrigin(serverAddress?: string): string {
  const env = normalizeOrigin(import.meta.env.VITE_API_PUBLIC_ORIGIN)
  if (env) return env
  const server = normalizeOrigin(serverAddress)
  if (server && !isFactoryServerAddress(server)) return server
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      const local = normalizeOrigin(import.meta.env.VITE_DEV_API_TARGET)
      return local || 'http://127.0.0.1:3210'
    }
    return window.location.origin
  }
  return 'http://127.0.0.1:3210'
}

/** Ignore factory `/logo.png` from /api/status; portal always ships the official New API mark. */
export function resolveBrandLogo(logo?: string): string {
  const v = (logo ?? '').trim()
  if (!v || v === '/logo.png' || v === '/logo.svg') return ''
  return v
}

export function applyFavicon() {
  if (typeof document === 'undefined') return
  const href = '/logo.png'
  try {
    const next = new URL(href, window.location.href).href
    const existing = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    if (existing.length === 1 && existing[0].href === next) return
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = href
    existing.forEach((el) => el.remove())
    document.head.appendChild(link)
  } catch {
    // ignore malformed URLs
  }
}

export function useSite(): Site {
  const q = useQuery({
    queryKey: ['site-status'],
    queryFn: getStatus,
    staleTime: 5 * 60_000,
    retry: 1,
  })
  const s = q.data
  return {
    name: PORTAL_NAME,
    logo: resolveBrandLogo(s?.logo),
    quotaPerUnit: s?.quota_per_unit || DEFAULT_QUOTA_PER_UNIT,
    usdRate: s?.usd_exchange_rate && s.usd_exchange_rate > 0 ? s.usd_exchange_rate : 7.2,
    registerEnabled: s?.register_enabled ?? true,
    passwordLoginEnabled: s?.password_login_enabled ?? true,
    passwordEncryption: s?.password_login_encryption_enabled ?? false,
    emailVerification: s?.email_verification ?? false,
    turnstile: s?.turnstile_check ?? false,
    docsLink: s?.docs_link || '',
    version: s?.version || '',
    serverAddress: s?.server_address || '',
    initialized: s?.setup !== false,
    raw: s,
    loading: q.isLoading,
  }
}

export function useApiOrigin(): string {
  const site = useSite()
  return resolveApiOrigin(site.serverAddress)
}

function safeConsoleOrigin(raw: string): string {
  try {
    const u = new URL(raw)
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.origin
  } catch {
    return ''
  }
  return ''
}

export function useConsoleOrigin(): string {
  const q = useQuery({
    queryKey: ['portal-config'],
    queryFn: async () => {
      const res = await fetch('/portal-config.json', { credentials: 'same-origin' })
      if (!res.ok) return { consoleOrigin: '' }
      const body = (await res.json()) as { consoleOrigin?: string }
      return { consoleOrigin: typeof body.consoleOrigin === 'string' ? body.consoleOrigin : '' }
    },
    staleTime: 60 * 60_000,
    retry: false,
  })
  return safeConsoleOrigin(q.data?.consoleOrigin || '')
}
