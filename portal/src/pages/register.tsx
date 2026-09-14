import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { AuthShell } from '@/components/app-shell'
import { Button, Notice } from '@/components/ui'
import { register } from '@/lib/api'
import { login } from '@/lib/auth'
import { request } from '@/lib/http'
import { clearStoredAff, extractAff, persistAff, readStoredAff } from '@/lib/format'
import { useSite } from '@/lib/site'

function strengthLevel(password: string): number {
  if (!password) return 0
  let n = 0
  if (password.length >= 8) n++
  if (password.length >= 12) n++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) n++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) n++
  return Math.min(4, n)
}

export function RegisterPage() {
  const site = useSite()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [aff, setAff] = useState(() => readStoredAff(params.get('aff') || ''))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [verification, setVerification] = useState('')
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const level = strengthLevel(password)
  const blocked = !site.registerEnabled
  const recognized = extractAff(aff)

  function onAffChange(value: string) {
    setAff(value)
    persistAff(value)
  }

  async function sendCode() {
    if (!email.trim()) {
      toast.error('请先填写邮箱')
      return
    }
    setSending(true)
    try {
      const res = await request('/api/verification', { auth: false, query: { email: email.trim(), turnstile: '' } })
      if (res.success) toast.success('验证码已发送，去邮箱看一眼')
      else toast.error(res.message || '验证码没发出去')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '验证码没发出去')
    } finally {
      setSending(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const code = extractAff(aff)
    if (!code) {
      toast.error('先填邀请码。也可以把朋友发你的整条链接贴进来。')
      return
    }
    if (password !== confirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (password.length < 8) {
      toast.error('密码至少 8 位')
      return
    }
    persistAff(code)
    setBusy(true)
    try {
      const res = await register({
        username: username.trim(),
        password,
        aff_code: code,
        ...(site.emailVerification ? { email: email.trim(), verification_code: verification.trim() } : {}),
      })
      if (!res.success) {
        toast.error(res.message || '邀请码无效，或本站仅限邀请注册')
        return
      }
      clearStoredAff()
      const result = await login(username.trim(), password)
      if (result.kind === 'ok') {
        toast.success('注册成功。先建一把密钥，再到「接入」复制配置。')
        navigate('/', { replace: true })
      } else if (result.kind === '2fa') {
        toast.success('账号建好了，请登录并完成两步验证')
        navigate('/sign-in', { replace: true })
      } else {
        toast.success('注册成功，请登录')
        navigate('/sign-in', { replace: true })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '注册没成功')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="card static" style={{ padding: '26px 26px 22px' }}>
        {blocked ? (
          <>
            <h1>暂停注册</h1>
            <p className="lead">管理员暂时关掉了新用户注册。</p>
            <Link className="btn btn-ghost btn-block" to="/sign-in">
              我已有账号，去登录
            </Link>
          </>
        ) : (
          <>
            <h1>创建账号</h1>
            <p className="lead">本站邀请制。朋友把链接发给你，点开就能填；也可以把邀请码或整条链接贴在下面。</p>
            {site.turnstile && (
              <div style={{ marginBottom: 16 }}>
                <Notice tone="warn">站点开了 Turnstile，本门户还没接。注册如果被拦，请管理员先关掉它。</Notice>
              </div>
            )}
            <form className="form-grid" onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="aff">邀请码</label>
                <input
                  id="aff"
                  className="input mono"
                  placeholder="邀请码，或整条邀请链接"
                  autoComplete="off"
                  autoFocus={!recognized}
                  value={aff}
                  onChange={(e) => onAffChange(e.target.value)}
                  required
                />
                <span className="hint">
                  {recognized ? `已识别邀请码 ${recognized}` : '没有码就让朋友把邀请页里的链接发给你。'}
                </span>
              </div>
              <div className="field">
                <label htmlFor="username">用户名</label>
                <input
                  id="username"
                  className="input"
                  autoComplete="username"
                  maxLength={12}
                  autoFocus={Boolean(recognized)}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <span className="hint">登录用，之后不可修改。最多 12 个字符。</span>
              </div>
              {site.emailVerification && (
                <>
                  <div className="field">
                    <label htmlFor="email">邮箱</label>
                    <div className="input-row">
                      <input
                        id="email"
                        className="input"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <Button onClick={sendCode} loading={sending}>
                        发送验证码
                      </Button>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="verification">邮箱验证码</label>
                    <input
                      id="verification"
                      className="input mono"
                      inputMode="numeric"
                      value={verification}
                      onChange={(e) => setVerification(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              <div className="field">
                <label htmlFor="password">密码</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="strength" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} className={level > i ? (level >= 3 ? 'on' : 'mid') : undefined} />
                  ))}
                </div>
                <span className="hint">至少 8 位。</span>
              </div>
              <div className="field">
                <label htmlFor="confirm">确认密码</label>
                <input
                  id="confirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="primary" size="lg" block loading={busy}>
                注册
              </Button>
            </form>
          </>
        )}
      </div>
      <div className="auth-foot">
        {blocked ? null : (
          <>
            邀请只用于准入，不产生返利。已有账号？<Link to="/sign-in">登录</Link>
          </>
        )}
      </div>
    </AuthShell>
  )
}
