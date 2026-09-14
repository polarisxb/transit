import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { AuthShell } from '@/components/app-shell'
import { Button, CopyBtn, Notice } from '@/components/ui'
import { resetPassword } from '@/lib/api'

export function ResetPage() {
  const [params] = useSearchParams()
  const email = (params.get('email') || '').trim()
  const token = (params.get('token') || '').trim()
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onReset() {
    if (!email || !token) {
      setError('链接不完整，请从邮件里重新打开。')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await resetPassword(email, token)
      if (!res.success || !res.data) {
        setError(res.message || '重置没成功，链接可能已失效。')
        return
      }
      setPassword(res.data)
      toast.success('密码已重置')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置没成功')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="card static" style={{ padding: '26px 26px 22px' }}>
        <h1>重置密码</h1>
        <p className="lead">
          {password
            ? '新密码只显示这一次。登录后到账户页改成自己的密码。'
            : '点下面的按钮才会消耗这封邮件里的重置链接，邮件客户端预览不会提前作废。'}
        </p>
        {!email || !token ? (
          <Notice tone="warn">链接缺少邮箱或令牌。请从重置邮件里重新打开。</Notice>
        ) : password ? (
          <>
            <div className="copy-field">
              <span>{password}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <CopyBtn text={password} label="复制新密码" />
            </div>
          </>
        ) : (
          <>
            {error && (
              <div style={{ marginBottom: 16 }}>
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
            <Button type="button" variant="primary" size="lg" block loading={busy} onClick={() => void onReset()}>
              重置密码
            </Button>
          </>
        )}
      </div>
      <div className="auth-foot">
        <Link to="/sign-in">去登录</Link>
      </div>
    </AuthShell>
  )
}
