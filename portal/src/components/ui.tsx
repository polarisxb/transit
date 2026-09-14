import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { toast } from 'sonner'

import { copyText } from '@/lib/clipboard'
import { qrSvg } from '@/lib/qr'
import { PORTAL_NAME } from '@/lib/site'

export const NEW_API_REPO = 'https://github.com/QuantumNous/new-api'

/** Official New API mark: web/public/logo.png from QuantumNous/new-api. */
export function BrandIcon({ size = 28 }: { size?: number }) {
  return <img src="/logo.png" width={size} height={size} alt="" />
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <>
      <div className="brand-icon" style={{ width: size, height: size }}>
        <BrandIcon size={size} />
      </div>
      <b>{PORTAL_NAME}</b>
    </>
  )
}

export function NewApiAttribution({ version }: { version?: string }) {
  return (
    <span>
      © {new Date().getFullYear()}{' '}
      <a href={NEW_API_REPO} target="_blank" rel="noreferrer">
        New API
      </a>
      . Frontend design and development by New API contributors.
      {version ? ` · ${version}` : ''}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  i = 0,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: boolean
  i?: number
  className?: string
}) {
  return (
    <div className={clsx('card rise', className)} style={{ ['--i' as string]: i }}>
      <div className="stat-label">{label}</div>
      <div className={clsx('stat-num', accent && 'accent')}>{value}</div>
      {hint !== undefined && <div className="stat-sub">{hint}</div>}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'accent'
  size?: 'md' | 'sm' | 'lg'
  block?: boolean
  loading?: boolean
}

export function Button({
  variant = 'ghost',
  size = 'md',
  block,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'btn-ghost',
        variant === 'danger' && 'btn-danger',
        variant === 'accent' && 'btn-accent',
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        block && 'btn-block',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            style={{ animation: 'btn-spin 0.75s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}

export function CopyBtn({
  text,
  label = '复制',
  doneLabel = '已复制',
}: {
  text: string | (() => Promise<string> | string)
  label?: string
  doneLabel?: string
}) {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function onClick() {
    try {
      const value = typeof text === 'function' ? await text() : text
      if (!value) {
        toast.error('还没有可复制的内容')
        return
      }
      const ok = await copyText(value)
      if (!ok) {
        toast.error('复制没成功，请手动选中再复制')
        return
      }
      setDone(true)
      timer.current = window.setTimeout(() => setDone(false), 1600)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '复制没成功')
    }
  }

  return (
    <button type="button" className={clsx('copy-btn', done && 'done')} onClick={onClick}>
      {done ? (
        <>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{doneLabel}</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  desc?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" style={{ width: wide ? 'min(640px, 100%)' : undefined }} role="dialog" aria-modal>
        <div className="modal-head">
          <div>
            <div className="card-title" style={{ fontSize: 17 }}>
              {title}
            </div>
            {desc && <div className="card-desc">{desc}</div>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
}) {
  const root = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const seg = root.current
    const t = thumb.current
    const active = seg?.querySelector<HTMLButtonElement>('button.active')
    if (!active || !t) return
    t.style.left = `${active.offsetLeft}px`
    t.style.width = `${active.offsetWidth}px`
  }, [value, options])

  return (
    <div className="segmented" ref={root}>
      {options.map((o) => (
        <button key={o.id} type="button" className={clsx(value === o.id && 'active')} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
      <div className="segmented-thumb" ref={thumb} />
    </div>
  )
}

export function Empty({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="empty">
      {title && <b>{title}</b>}
      {children}
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const nums: number[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i)
  }
  const shown: Array<number | 'gap'> = []
  for (const n of nums) {
    const last = shown[shown.length - 1]
    if (typeof last === 'number' && n - last > 1) shown.push('gap')
    shown.push(n)
  }
  return (
    <div className="table-foot">
      <span>
        第 {page} / {pages} 页 · 共 {total} 条
      </span>
      <div className="pager">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹
        </button>
        {shown.map((n, i) =>
          n === 'gap' ? (
            <span key={`g${i}`} className="tert" style={{ padding: '0 4px' }}>
              …
            </span>
          ) : (
            <button key={n} type="button" className={clsx(n === page && 'on')} onClick={() => onChange(n)}>
              {n}
            </button>
          )
        )}
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          ›
        </button>
      </div>
    </div>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'danger'
  children: ReactNode
}) {
  return (
    <div className={clsx('notice', tone !== 'info' && tone)}>
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <div>{children}</div>
    </div>
  )
}

export function Spinner({ label = '正在加载…' }: { label?: string }) {
  return (
    <div className="empty" role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{
          color: 'var(--accent)',
          animation: 'spin 0.75s linear infinite',
        }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span style={{ fontSize: 12.5, color: 'var(--ink-tertiary)' }}>{label}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <Notice tone="danger">
      {msg || '这次没读到数据。刷新一下，还不行就看下后端是不是没起来。'}
    </Notice>
  )
}

export function PageHead({
  tag,
  title,
  desc,
  ping,
  actions,
}: {
  tag: ReactNode
  title: string
  desc?: ReactNode
  ping?: boolean
  actions?: ReactNode
}) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} · ${PORTAL_NAME}`
    return () => {
      document.title = prev
    }
  }, [title])
  return (
    <header className="header rise">
      <div>
        <div className="sub-tag">
          {ping && <span className="dot-ping" />}
          <span>{tag}</span>
        </div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="btn-group">{actions}</div>}
    </header>
  )
}

export function PageFoot({ name, version }: { name: string; version?: string }) {
  return (
    <footer className="page-foot">
      <span>{name} · 基于 New API 二次开发</span>
      <NewApiAttribution version={version} />
    </footer>
  )
}

export function QrImage({ value, size = 96 }: { value: string; size?: number }) {
  if (!value) return <div className="qr-box" aria-hidden />
  return <div className="qr-box" aria-hidden dangerouslySetInnerHTML={{ __html: qrSvg(value, size) }} />
}

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string
  onChange: (v: string) => void
  length?: number
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const chars = Array.from({ length }, (_, i) => value[i] ?? '')

  function setAt(i: number, ch: string) {
    const next = chars.slice()
    next[i] = ch
    onChange(next.join('').slice(0, length))
  }

  return (
    <div className="otp">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="input"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={ch}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1)
            setAt(i, v)
            if (v && i < length - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
            if (!pasted) return
            e.preventDefault()
            onChange(pasted)
            refs.current[Math.min(pasted.length, length) - 1]?.focus()
          }}
        />
      ))}
    </div>
  )
}

export { NewsletterFooter } from './newsletter-footer'
