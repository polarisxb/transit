import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { AuthShell } from '@/components/app-shell'
import { Button, Notice, OtpInput } from '@/components/ui'
import { login, login2fa } from '@/lib/auth'
import { useSite } from '@/lib/site'

export function SignInPage() {
  const site = useSite()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [flowToken, setFlowToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const from = (location.state as { from?: string } | null)?.from || '/'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (site.passwordEncryption) return
    setBusy(true)
    try {
      const result = flowToken ? await login2fa(code.trim(), flowToken) : await login(username.trim(), password)
      if (result.kind === 'ok') navigate(from, { replace: true })
      else if (result.kind === '2fa') {
        setFlowToken(result.flowToken)
        setCode('')
      } else toast.error(result.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="card static" style={{ padding: '26px 26px 22px' }}>
        <h1>{flowToken ? '两步验证' : '登录'}</h1>
        <p className="lead">
          {flowToken ? (
            <>
              输入验证器 App 里 <b style={{ color: 'var(--ink)' }}>{username || '你的账号'}</b> 当前的 6 位动态码。
            </>
          ) : (
            '仅限邀请的私人网关。'
          )}
        </p>
        {!site.passwordLoginEnabled && !site.passwordEncryption && (
          <div style={{ marginBottom: 16 }}>
            <Notice tone="danger">站点关了密码登录。本门户只支持账号密码，请管理员重新打开。</Notice>
          </div>
        )}
        {site.passwordEncryption && (
          <div style={{ marginBottom: 16 }}>
            <Notice tone="danger">
              站点开了密码加密登录，本门户还不支持。请管理员关掉「密码登录加密」后再用这里登录。
            </Notice>
          </div>
        )}
        {site.turnstile && !site.passwordEncryption && (
          <div style={{ marginBottom: 16 }}>
            <Notice tone="warn">站点开了 Turnstile 人机验证，本门户还没接。登录如果被拦，请管理员先关掉它。</Notice>
          </div>
        )}
        <form className="form-grid" onSubmit={onSubmit}>
          {flowToken ? (
            <OtpInput value={code} onChange={setCode} />
          ) : (
            <>
              <div className="field">
                <label htmlFor="username">用户名</label>
                <input
                  id="username"
                  className="input"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">密码</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="hint">
                  <Link to="/forgot">忘记密码？</Link>
                </span>
              </div>
            </>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={busy}
            disabled={site.passwordEncryption || !site.passwordLoginEnabled}
          >
            {flowToken ? '验证并登录' : '登录'}
          </Button>
          {flowToken && (
            <Button
              variant="ghost"
              block
              onClick={() => {
                setFlowToken(null)
                setCode('')
              }}
            >
              返回重新输入密码
            </Button>
          )}
        </form>
      </div>
      <div className="auth-foot">
        {flowToken
          ? '动态码 30 秒刷新一次，过期请重新输入。'
          : site.registerEnabled
            ? '还没有账号？用朋友发你的邀请链接打开即可，也可以到注册页粘贴邀请码。'
            : '本站仅限邀请注册。'}
        {!flowToken && site.registerEnabled && (
          <>
            {' '}
            <Link to="/register">前往注册页</Link>
          </>
        )}
      </div>
    </AuthShell>
  )
}
