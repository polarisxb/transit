import type { LoginSession } from './auth'
import { request, unwrap } from './http'

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export interface SiteStatus {
  version?: string
  system_name?: string
  logo?: string
  footer_html?: string
  docs_link?: string
  server_address?: string
  quota_per_unit?: number
  display_in_currency?: boolean
  usd_exchange_rate?: number
  custom_currency_symbol?: string
  register_enabled?: boolean
  password_login_enabled?: boolean
  password_register_enabled?: boolean
  password_login_encryption_enabled?: boolean
  email_verification?: boolean
  turnstile_check?: boolean
  turnstile_site_key?: string
  self_use_mode_enabled?: boolean
  announcements_enabled?: boolean
  setup?: boolean
}

export async function getStatus() {
  return unwrap(await request<SiteStatus>('/api/status', { auth: false }))
}

export async function getNotice() {
  return unwrap(await request<string>('/api/notice', { auth: false }))
}

export interface RegisterPayload {
  username: string
  password: string
  aff_code?: string
  email?: string
  verification_code?: string
}

export function register(payload: RegisterPayload) {
  return request('/api/user/register?turnstile=', { method: 'POST', body: payload, auth: false })
}

// ---------------------------------------------------------------------------
// Self
// ---------------------------------------------------------------------------
export interface UserSetting {
  notify_type?: string
  quota_warning_threshold?: number
  notification_email?: string
  record_ip_log?: boolean
  accept_unset_model_ratio_model?: boolean
  language?: string
}

export interface UserProfile {
  id: number
  username: string
  display_name: string
  role: number
  email?: string
  group: string
  quota: number
  used_quota: number
  request_count: number
  status: number
  aff_code?: string
  aff_count: number
  aff_quota: number
  aff_history_quota: number
  inviter_id?: number
  created_time?: number
  setting?: string | UserSetting
}

export async function getSelf() {
  return unwrap(await request<UserProfile>('/api/user/self'))
}

export interface UpdateSelfPayload {
  display_name?: string
  password?: string
  original_password?: string
}

export function updateSelf(payload: UpdateSelfPayload) {
  return request('/api/user/self', { method: 'PUT', body: payload })
}

export function deleteSelf() {
  return request('/api/user/self', { method: 'DELETE' })
}

export function parseUserSetting(raw: UserProfile['setting']): UserSetting {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    const v = JSON.parse(raw) as unknown
    return v && typeof v === 'object' ? (v as UserSetting) : {}
  } catch {
    return {}
  }
}

export function updateUserSetting(payload: {
  notify_type: string
  quota_warning_threshold: number
  notification_email?: string
  record_ip_log: boolean
  accept_unset_model_ratio_model?: boolean
}) {
  return request('/api/user/setting', { method: 'PUT', body: payload })
}

export async function getUserModels() {
  return unwrap(await request<string[]>('/api/user/models'))
}

export interface UserGroupInfo {
  ratio: number
  desc: string
}

export async function getUserGroups() {
  return unwrap(await request<Record<string, UserGroupInfo>>('/api/user/groups'))
}

export async function getAffCode() {
  return unwrap(await request<string>('/api/user/aff'))
}

export function redeemCode(key: string) {
  return request<number>('/api/user/topup', { method: 'POST', body: { key } })
}

export function transferAffQuota(quota: number) {
  return request('/api/user/aff_transfer', { method: 'POST', body: { quota } })
}

export interface TopupRecord {
  id: number
  trade_no: string
  amount: number
  money: number
  status: string
  create_time: number
  complete_time?: number
  payment_method?: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export async function getTopupHistory(p: number, pageSize: number) {
  return unwrap(
    await request<Page<TopupRecord>>('/api/user/topup/self', { query: { p, page_size: pageSize } })
  )
}

// ---------------------------------------------------------------------------
// API keys (tokens)
// ---------------------------------------------------------------------------
export interface ApiKey {
  id: number
  name: string
  key: string
  status: number // 1 enabled, 2 disabled, 3 expired, 4 exhausted
  remain_quota: number
  used_quota: number
  unlimited_quota: boolean
  expired_time: number // -1 never
  created_time: number
  accessed_time: number
  group?: string | null
  model_limits_enabled: boolean
  model_limits?: string | null
  allow_ips?: string | null
}

export interface ApiKeyInput {
  name: string
  remain_quota: number
  expired_time: number
  unlimited_quota: boolean
  model_limits_enabled: boolean
  model_limits: string
  allow_ips: string
  group: string
  auto_groups: string[]
  cross_group_retry: boolean
}

export async function listKeys(p: number, size: number, keyword?: string) {
  if (keyword?.trim()) {
    return unwrap(
      await request<Page<ApiKey>>('/api/token/search', { query: { p, page_size: size, keyword: keyword.trim() } })
    )
  }
  return unwrap(await request<Page<ApiKey>>('/api/token/', { query: { p, size } }))
}

export function createKey(input: ApiKeyInput) {
  return request<ApiKey>('/api/token/', { method: 'POST', body: input })
}

export function updateKey(input: ApiKeyInput & { id: number }) {
  return request<ApiKey>('/api/token/', { method: 'PUT', body: input })
}

export function setKeyStatus(id: number, status: 1 | 2) {
  return request('/api/token/?status_only=true', { method: 'PUT', body: { id, status } })
}

export function deleteKey(id: number) {
  return request(`/api/token/${id}/`, { method: 'DELETE' })
}

export async function revealKey(id: number) {
  return unwrap(await request<{ key: string }>(`/api/token/${id}/key`, { method: 'POST' })).key
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------
export const LOG_TYPE = {
  topup: 1,
  consume: 2,
  manage: 3,
  system: 4,
  error: 5,
  refund: 6,
  login: 7,
} as const

export interface UsageLog {
  id: number
  created_at: number
  type: number
  content: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  group: string
  request_id: string
  other: string
}

export interface LogQuery {
  p?: number
  page_size?: number
  type?: number
  token_name?: string
  model_name?: string
  start_timestamp?: number
  end_timestamp?: number
}

export async function listLogs(q: LogQuery) {
  return unwrap(await request<Page<UsageLog>>('/api/log/self', { query: { ...q } }))
}

export interface LogStats {
  quota: number
  rpm: number
  tpm: number
}

export async function getLogStats(q: Pick<LogQuery, 'start_timestamp' | 'end_timestamp' | 'token_name' | 'model_name'>) {
  return unwrap(await request<LogStats>('/api/log/self/stat', { query: { ...q } }))
}

export interface QuotaDataItem {
  model_name?: string
  created_at: number
  token_used?: number
  count?: number
  quota?: number
}

export async function getQuotaDates(start: number, end: number) {
  return unwrap(
    await request<QuotaDataItem[]>('/api/data/self', {
      query: { start_timestamp: start, end_timestamp: end, default_time: 'day' },
    })
  )
}

export interface TwoFAStatus {
  enabled: boolean
  locked?: boolean
  backup_codes_remaining?: number
}

export async function get2FAStatus() {
  return unwrap(await request<TwoFAStatus>('/api/user/2fa/status'))
}

export async function setup2FA() {
  return unwrap(await request<{ secret: string; qr_code_data: string; backup_codes: string[] }>('/api/user/2fa/setup', { method: 'POST' }))
}

export function enable2FA(code: string) {
  return request('/api/user/2fa/enable', { method: 'POST', body: { code } })
}

export function disable2FA(code: string) {
  return request('/api/user/2fa/disable', { method: 'POST', body: { code } })
}

export async function getLoginSessions() {
  return unwrap(await request<LoginSession[]>('/api/user/sessions'))
}

export function deleteLoginSession(sid: string) {
  return request(`/api/user/sessions/${encodeURIComponent(sid)}`, { method: 'DELETE' })
}

export function revokeOtherSessions() {
  return request('/api/user/sessions/revoke-others', { method: 'POST' })
}
