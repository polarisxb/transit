import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { AuthShell } from '@/components/app-shell'
import { Button, Notice } from '@/components/ui'
import { sendPasswordReset } from '@/lib/api'

export function ForgotPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) {
      toast.error('先填绑定过的邮箱')
      return
    }
    setBusy(true)
    try {
      const res = await sendPasswordReset(value)
      if (!res.success) {
        toast.error(res.message || '这次没发出去')
        return
      }
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '这次没发出去')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="card static" style={{ padding: '26px 26px 22px' }}>
        <h1>找回密码</h1>
        <p className="lead">用账号绑定的邮箱收重置链接。前提是站点已经配好邮件服务。</p>
        {sent ? (
          <Notice>
            如果这个邮箱绑定了账号，重置邮件已经发出；几分钟没收到就找站长。
          </Notice>
        ) : (
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="reset-email">邮箱</label>
              <input
                id="reset-email"
                className="input"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="primary" size="lg" block loading={busy}>
              发送重置邮件
            </Button>
          </form>
        )}
      </div>
      <div className="auth-foot">
        想起来了？<Link to="/sign-in">去登录</Link>
      </div>
    </AuthShell>
  )
}
