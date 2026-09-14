import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { BrandMark, NewApiAttribution, Notice, PageFoot } from '@/components/ui'
import { getSelf, getUserGroups } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { initials } from '@/lib/format'
import { useConsoleOrigin, useSite } from '@/lib/site'

const NAV = [
  {
    to: '/',
    label: '总览',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/keys',
    label: '密钥',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="8" cy="15" r="4" />
        <path d="m10.85 12.15 8.9-8.9M15 8l2.5 2.5" />
      </svg>
    ),
  },
  {
    to: '/usage',
    label: '用量',
    icon: (
      <svg viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: '/wallet',
    label: '钱包',
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    to: '/invite',
    label: '邀请',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6" />
      </svg>
    ),
  },
  {
    to: '/setup',
    label: '接入',
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m7 9 3 3-3 3M13 15h4" />
      </svg>
    ),
  },
  {
    to: '/account',
    label: '账户',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
]

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const auth = useAuth()
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf, staleTime: 30_000 })
  const groups = useQuery({ queryKey: ['groups'], queryFn: getUserGroups, staleTime: 60_000 })
  const user = self.data ?? auth.bundle?.user
  const name = user?.display_name || user?.username || '用户'
  const group = user?.group
  const info = group && groups.data ? groups.data[group] : undefined
  const groupHint = group ? (info?.desc ? `${group} · ${info.desc}` : `${group}${info ? ` · ×${info.ratio}` : ''}`) : ''

  return (
    <>
      <Link className="brand" to="/" onClick={onNavigate}>
        <BrandMark />
      </Link>
      <nav className="nav-list" aria-label="主导航">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx('nav-link', isActive && 'active')}
            onClick={onNavigate}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Link className="user-badge" to="/account" onClick={onNavigate}>
        <div className="avatar">{initials(name)}</div>
        <div className="user-meta">
          <b>{name}</b>
          <small>{groupHint || user?.username}</small>
        </div>
      </Link>
    </>
  )
}

export function AppShell({ children }: { children?: ReactNode }) {
  const site = useSite()
  const self = useQuery({ queryKey: ['self'], queryFn: getSelf })
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" style={{ padding: 0 }}>
          <BrandMark />
        </Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} aria-label="打开菜单">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>菜单</span>
        </button>
      </header>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={clsx('sidebar', open && 'open')}>
        <SideNav onNavigate={() => setOpen(false)} />
      </aside>
      <div className="workspace">
        <div className="workspace-main">
          {self.data && self.data.status !== 1 && (
            <div style={{ marginBottom: 14 }}>
              <Notice tone="danger">这个账号已被停用，密钥不会再放过流量。有问题找站长。</Notice>
            </div>
          )}
          {children ?? <Outlet />}
          <PageFoot name={site.name} version={site.version} />
        </div>
      </div>
    </div>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  const site = useSite()
  const consoleOrigin = useConsoleOrigin()
  const loc = useLocation()
  const title = loc.pathname.startsWith('/register') ? '注册' : '登录'

  useEffect(() => {
    document.title = `${title} · ${site.name}`
  }, [title, site.name])

  return (
    <div className="auth-shell">
      <div className="auth-container">
        <Link className="auth-brand" to="/">
          <BrandMark size={34} />
        </Link>
        {!site.loading && !site.initialized && (
          <div style={{ width: '100%', marginBottom: 16 }}>
            <Notice tone="warn">
              站点还没初始化。管理员请到{' '}
              {consoleOrigin ? (
                <a href={consoleOrigin} target="_blank" rel="noreferrer">
                  控制台
                </a>
              ) : (
                '控制台域名'
              )}{' '}
              走完向导，再让朋友注册。
            </Notice>
          </div>
        )}
        <div className="auth-card">
          {children}
        </div>
        <p className="auth-attrib">
          <NewApiAttribution />
        </p>
      </div>
    </div>
  )
}
