import { clearAuth, getAuthState, getFreshAccessToken, refreshAuthentication } from './auth'

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  code?: string
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Attach the bearer token and retry once after a refresh on 401. Default true. */
  auth?: boolean
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path
}

async function send(path: string, opts: RequestOptions, token: string | null) {
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-store',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
}

/**
 * Call the new-api REST API. Business failures (`success: false`) are returned,
 * not thrown, so callers can show the server's message. Transport failures and
 * non-2xx statuses throw ApiError. A 401 triggers one refresh + retry.
 */
export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const useAuth = opts.auth ?? true
  let token = useAuth ? await getFreshAccessToken() : null
  let res: Response
  try {
    res = await send(path, opts, token)
  } catch {
    throw new ApiError('网络断了，检查一下连接再试', 0)
  }

  if (res.status === 401 && useAuth) {
    const outcome = await refreshAuthentication()
    if (outcome === 'authenticated') {
      token = getAuthState().bundle?.access_token ?? null
      try {
        res = await send(path, opts, token)
      } catch {
        throw new ApiError('网络断了，检查一下连接再试', 0)
      }
    }
    if (res.status === 401) {
      clearAuth()
      throw new ApiError('登录已过期，请重新登录', 401, 'AUTH_UNAUTHORIZED')
    }
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  const body = (json && typeof json === 'object' ? json : {}) as ApiResponse<T>

  if (!res.ok) {
    const fallback = res.status >= 500 ? '站点暂时有点忙，过几秒再试' : `请求失败（HTTP ${res.status}）`
    throw new ApiError(body.message || fallback, res.status, body.code)
  }
  return body
}

/** Unwrap a response, throwing on business failure. */
export function unwrap<T>(res: ApiResponse<T>, fallback = '这次没办成'): T {
  if (!res.success) throw new ApiError(res.message || fallback, 200, res.code)
  return res.data as T
}
