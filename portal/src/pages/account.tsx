import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button, CopyBtn, Empty, ErrorNote, Modal, Notice, OtpInput, PageHead, QrImage, Spinner } from '@/components/ui'
import {
  deleteLoginSession,
  deleteSelf,
  disable2FA,
  enable2FA,
  get2FAStatus,
  getLoginSessions,
  getSelf,
  getUserGroups,
  parseUserSetting,
  revokeOtherSessions,
  setup2FA,
  updateSelf,
  updateUserSetting,
} from '@/lib/api'
import { applyAuthRotation, logout, useAuth } from '@/lib/auth'
import { describeUserAgent, formatRelative, initials, usdToQuota } from '@/lib/format'
import { useConsoleOrigin, useSite } from '@/lib/site'

export function AccountPage() {
  const site = useSite()
  const consoleOrigin = useConsoleOrigin()
  const auth = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf })
  const groups = useQuery({ queryKey: ['groups'], queryFn: getUserGroups })
  const twofa = useQuery({ queryKey: ['2fa'], queryFn: get2FAStatus })
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: getLoginSessions })

  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [setup, setSetup] = useState<{ secret: string; qr: string; backup: string[] } | null>(null)
  const [otp, setOtp] = useState('')
  const [disableOpen, setDisableOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const u = self.data
  const setting = parseUserSetting(u?.setting)
  const name = u?.display_name || u?.username || auth.bundle?.user.username || ''
  const portalOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteLink = u?.aff_code ? `${portalOrigin}/register?aff=${encodeURIComponent(u.aff_code)}` : ''
  const group = u?.group
  const groupInfo = group && groups.data ? groups.data[group] : undefined
  const notifyOn = (setting.quota_warning_threshold ?? 0) > 0 && (setting.notify_type || 'email') === 'email'
  const recordIp = Boolean(setting.record_ip_log)

  async function saveName() {
    const res = await updateSelf({ display_name: displayName.trim() })
    if (!res.success) {
      toast.error(res.message || '显示名没改成')
      return
    }
    toast.success('显示名已更新')
    setEditingName(false)
    qc.invalidateQueries({ queryKey: ['self'] })
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) {
      toast.error('新密码至少 8 位')
      return
    }
    if (newPw !== confirmPw) {
      toast.error('两次输入的新密码不一致')
      return
    }
    const res = await updateSelf({ original_password: oldPw, password: newPw })
    if (!res.success) {
      toast.error(res.message || '密码没改成，核对一下当前密码')
      return
    }
    applyAuthRotation(res.data)
    toast.success('密码已更新')
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
  }

  async function start2FA() {
    try {
      const data = await setup2FA()
      setSetup({ secret: data.secret, qr: data.qr_code_data, backup: data.backup_codes })
      setOtp('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '两步验证初始化失败')
    }
  }

  const confirm2FA = useMutation({
    mutationFn: (code: string) => enable2FA(code),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || '验证码不对')
        return
      }
      applyAuthRotation(res.data)
      toast.success('两步验证已打开')
      setSetup(null)
      setOtp('')
      qc.invalidateQueries({ queryKey: ['2fa'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '没能打开两步验证'),
  })

  const stop2FA = useMutation({
    mutationFn: (code: string) => disable2FA(code),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || '验证码不对')
        return
      }
      applyAuthRotation(res.data)
      toast.success('两步验证已关闭')
      setDisableOpen(false)
      setOtp('')
      qc.invalidateQueries({ queryKey: ['2fa'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '没能关闭两步验证'),
  })

  async function saveSetting(patch: { notify?: boolean; recordIp?: boolean }) {
    if (!u) return
    const nextNotify = patch.notify ?? notifyOn
    const res = await updateUserSetting({
      notify_type: 'email',
      quota_warning_threshold: nextNotify ? usdToQuota(5, site.quotaPerUnit) : 1e15,
      notification_email: u.email,
      record_ip_log: patch.recordIp ?? recordIp,
      accept_unset_model_ratio_model: setting.accept_unset_model_ratio_model,
    })
    if (!res.success) {
      toast.error(res.message || '设置没保存')
      return
    }
    toast.success('已保存')
    qc.invalidateQueries({ queryKey: ['self'] })
  }

  async function onLogout() {
    await logout()
    navigate('/sign-in', { replace: true })
  }

  const dropSession = useMutation({
    mutationFn: (sid: string) => deleteLoginSession(sid),
    onSuccess: (res, sid) => {
      if (!res.success) {
        toast.error(res.message || '没能退出这台设备')
        return
      }
      if (sid === auth.bundle?.session.sid) {
        void onLogout()
        return
      }
      toast.success('已退出该设备')
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '没能退出这台设备'),
  })

  const dropOthers = useMutation({
    mutationFn: () => revokeOtherSessions(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || '没能退出其他设备')
        return
      }
      toast.success('其他设备已退出')
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '没能退出其他设备'),
  })

  const removeAccount = useMutation({
    mutationFn: () => deleteSelf(),
    onSuccess: async (res) => {
      if (!res.success) {
        toast.error(res.message || '注销没成功')
        return
      }
      await logout()
      toast.success('账户已注销')
      navigate('/sign-in', { replace: true })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '注销没成功'),
  })

  return (
    <div>
      <PageHead
        tag={`用户 ID ${u?.id ?? '—'} · 分组 ${group || '—'}`}
        title="账户"
        desc="个人资料、密码、登录设备和通知。"
        actions={
          <Button onClick={onLogout}>退出登录</Button>
        }
      />

      {self.error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorNote error={self.error} />
        </div>
      )}

      {(u?.role ?? auth.bundle?.user.role ?? 0) >= 10 && consoleOrigin && (
        <div style={{ marginBottom: 14 }}>
          <Notice>
            渠道、兑换码、分组在管理后台，和这个门户不是同一个地址。
            <a href={consoleOrigin} target="_blank" rel="noreferrer">
              打开控制台
            </a>
          </Notice>
        </div>
      )}

      <div className="card rise" style={{ ['--i' as string]: 1, marginBottom: 14 }}>
        <div className="profile">
          <div className="avatar">{initials(name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div className="input-row">
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={20} />
                <Button variant="primary" size="sm" onClick={() => void saveName()}>
                  保存
                </Button>
                <Button size="sm" onClick={() => setEditingName(false)}>
                  取消
                </Button>
              </div>
            ) : (
              <>
                <h2>{name}</h2>
                <div className="meta">
                  <span className="mono">@{u?.username}</span>
                  <span>·</span>
                  <span className="pill blue">
                    {group || '—'}
                    {groupInfo ? ` · ×${groupInfo.ratio}` : ''}
                  </span>
                  {u?.email && (
                    <>
                      <span>·</span>
                      <span>{u.email}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {!editingName && (
            <Button
              size="sm"
              onClick={() => {
                setDisplayName(u?.display_name || '')
                setEditingName(true)
              }}
            >
              修改显示名
            </Button>
          )}
        </div>
        {inviteLink && (
          <div className="copy-field" style={{ marginTop: 16 }}>
            <span>{inviteLink}</span>
            <CopyBtn text={inviteLink} label="复制邀请链接" />
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card static rise" style={{ ['--i' as string]: 2 }}>
          <div className="card-top" style={{ marginBottom: 14 }}>
            <div>
              <div className="card-title">修改密码</div>
              <div className="card-desc">改完后当前会话会续期，其他设备需要重新登录</div>
            </div>
          </div>
          <form className="form-grid" onSubmit={savePassword}>
            <div className="field">
              <label htmlFor="old-pw">当前密码</label>
              <input id="old-pw" className="input" type="password" autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="new-pw">新密码</label>
              <input id="new-pw" className="input" type="password" autoComplete="new-password" placeholder="至少 8 位" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="confirm-pw">确认新密码</label>
              <input id="confirm-pw" className="input" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary">
                更新密码
              </Button>
            </div>
          </form>
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="card static rise" style={{ ['--i' as string]: 3 }}>
            <div className="card-top" style={{ marginBottom: 6 }}>
              <div>
                <div className="card-title">安全</div>
              </div>
            </div>
            <div className="switch-row">
              <div>
                <b>两步验证</b>
                <p>
                  {twofa.data?.enabled
                    ? `已开启${twofa.data.backup_codes_remaining != null ? ` · 备用码还剩 ${twofa.data.backup_codes_remaining} 个` : ''}`
                    : '登录时需要验证器 App 的动态码。'}
                </p>
              </div>
              <button
                type="button"
                className={`toggle ${twofa.data?.enabled ? 'on' : ''}`}
                onClick={() => {
                  if (twofa.data?.enabled) setDisableOpen(true)
                  else void start2FA()
                }}
                aria-pressed={Boolean(twofa.data?.enabled)}
                aria-label="两步验证"
              />
            </div>
            <div className="switch-row">
              <div>
                <b>余额不足提醒</b>
                <p>
                  {u?.email
                    ? `低于 $5 时发邮件到 ${u.email}。`
                    : '账户没绑邮箱，打开也发不出去。先在管理员后台补邮箱。'}
                </p>
              </div>
              <button
                type="button"
                className={`toggle ${notifyOn ? 'on' : ''}`}
                disabled={!u?.email}
                onClick={() => void saveSetting({ notify: !notifyOn })}
                aria-pressed={notifyOn}
                aria-label="余额不足提醒"
              />
            </div>
            <div className="switch-row">
              <div>
                <b>记录请求来源 IP</b>
                <p>用于排查异常调用，默认关闭。</p>
              </div>
              <button
                type="button"
                className={`toggle ${recordIp ? 'on' : ''}`}
                onClick={() => void saveSetting({ recordIp: !recordIp })}
                aria-pressed={recordIp}
                aria-label="记录请求来源 IP"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card static rise" style={{ ['--i' as string]: 4, marginTop: 14 }}>
        <div className="card-top" style={{ marginBottom: 10 }}>
          <div>
            <div className="card-title">登录设备</div>
            <div className="card-desc">{sessions.data ? `${sessions.data.length} 个会话` : '正在读取'}</div>
          </div>
          <Button size="sm" onClick={() => dropOthers.mutate()} loading={dropOthers.isPending}>
            退出其他所有设备
          </Button>
        </div>
        {sessions.isLoading ? (
          <Spinner />
        ) : sessions.error ? (
          <ErrorNote error={sessions.error} />
        ) : !sessions.data?.length ? (
          <Empty>当前登录方式没有设备列表，或会话接口不可用。</Empty>
        ) : (
          sessions.data.map((s) => (
            <div className="session" key={s.sid}>
              <div>
                <b>
                  {describeUserAgent(s.user_agent)}
                  {s.current && (
                    <span className="pill green" style={{ marginLeft: 6 }}>
                      当前
                    </span>
                  )}
                </b>
                <small>
                  {s.ip || 'IP 未记录'} · {formatRelative(s.last_active_at)}
                  {s.login_method ? ` · ${s.login_method}` : ''}
                </small>
              </div>
              {!s.current && (
                <button type="button" className="tert" style={{ fontSize: 12.5, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => dropSession.mutate(s.sid)}>
                  退出
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card static danger-zone rise" style={{ ['--i' as string]: 5, marginTop: 14 }}>
        <div className="card-top" style={{ marginBottom: 0 }}>
          <div>
            <div className="card-title" style={{ color: 'var(--red)' }}>
              注销账户
            </div>
            <div className="card-desc">删除密钥与用量记录；剩余余额请先联系站长退回。管理员根账户不能注销。</div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            注销…
          </Button>
        </div>
      </div>

      <Modal
        open={setup !== null}
        onClose={() => setSetup(null)}
        title="绑定两步验证"
        desc="用验证器扫码，再输入当前动态码"
        footer={
          <>
            <Button onClick={() => setSetup(null)}>取消</Button>
            <Button variant="primary" loading={confirm2FA.isPending} onClick={() => confirm2FA.mutate(otp)}>
              完成绑定
            </Button>
          </>
        }
      >
        {setup && (
          <div className="form-grid">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <QrImage value={setup.qr} />
              <div className="stat-sub">
                扫不了就手动输入密钥
                <div className="copy-field" style={{ marginTop: 8 }}>
                  <span>{setup.secret}</span>
                  <CopyBtn text={setup.secret} />
                </div>
              </div>
            </div>
            <OtpInput value={otp} onChange={setOtp} />
            <Notice tone="warn">下面这些备用码只出现一次，请立刻保存。</Notice>
            <pre className="code-view">{setup.backup.join('\n')}</pre>
          </div>
        )}
      </Modal>

      <Modal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="关闭两步验证"
        desc="输入验证器动态码或备用码"
        footer={
          <>
            <Button onClick={() => setDisableOpen(false)}>取消</Button>
            <Button variant="danger" loading={stop2FA.isPending} onClick={() => stop2FA.mutate(otp)}>
              确认关闭
            </Button>
          </>
        }
      >
        <OtpInput value={otp} onChange={setOtp} />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="真的要注销？"
        desc="此操作不可恢复"
        footer={
          <>
            <Button onClick={() => setDeleteOpen(false)}>留下</Button>
            <Button variant="danger" loading={removeAccount.isPending} onClick={() => removeAccount.mutate()}>
              确认注销
            </Button>
          </>
        }
      >
        <Notice tone="danger">密钥会立刻失效。余额不会自动退回，先找站长。</Notice>
      </Modal>
    </div>
  )
}
