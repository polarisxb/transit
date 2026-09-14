import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Component, StrictMode, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { Toaster } from 'sonner'

import { AppShell } from '@/components/app-shell'
import { BrandMark } from '@/components/ui'
import { bootstrapAuth, useAuth } from '@/lib/auth'
import { applyFavicon, useSite } from '@/lib/site'
import { AccountPage } from '@/pages/account'
import { InvitePage } from '@/pages/invite'
import { KeysPage } from '@/pages/keys'
import { LandingPage } from '@/pages/landing'
import { OverviewPage } from '@/pages/overview'
import { PricingPage } from '@/pages/pricing'
import { ForgotPage } from '@/pages/forgot'
import { RegisterPage } from '@/pages/register'
import { ResetPage } from '@/pages/reset'
import { SetupPage } from '@/pages/setup'
import { SignInPage } from '@/pages/sign-in'
import { UsagePage } from '@/pages/usage'
import { WalletPage } from '@/pages/wallet'

import '@/styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => (err instanceof Error && 'status' in err && (err as { status: number }).status === 401 ? false : count < 1),
      refetchOnWindowFocus: false,
    },
  },
})

class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null }

  static getDerivedStateFromError(err: Error) {
    return { message: err.message || '页面出错了' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info.componentStack)
  }

  render() {
    if (!this.state.message) return this.props.children
    return (
      <div className="boot">
        <div>
          <p>页面出错了，刷新一下通常能好。</p>
          <p className="tert" style={{ marginTop: 8 }}>
            {this.state.message}
          </p>
        </div>
      </div>
    )
  }
}

function BootBrand() {
  return (
        <div className="brand" style={{ padding: 0, justifyContent: 'center', marginBottom: 12 }}>
          <BrandMark />
        </div>
  )
}

function BootScreen({ message = '正在确认登录状态…' }: { message?: string }) {
  return (
    <div className="boot">
      <div>
        <BootBrand />
        <p style={{ textAlign: 'center' }}>{message}</p>
      </div>
    </div>
  )
}

function OfflineScreen() {
  const auth = useAuth()
  const site = useSite()
  const autoTried = useRef<number | undefined>(undefined)
  const [now, setNow] = useState(() => Date.now())
  const remain = auth.retryAt ? Math.max(0, Math.ceil((auth.retryAt - now) / 1000)) : 0

  useEffect(() => {
    if (!auth.retryAt) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [auth.retryAt])

  useEffect(() => {
    if (!auth.retryAt || remain > 0 || autoTried.current === auth.retryAt) return
    autoTried.current = auth.retryAt
    void bootstrapAuth({ force: true })
  }, [auth.retryAt, remain])

  const limited = remain > 0
  const backendUp = Boolean(site.raw)

  return (
    <div className="boot">
      <div>
        <BootBrand />
        {limited ? (
          <>
            <p>登录确认太频繁，接口暂时限流了。</p>
            <p className="tert" style={{ marginTop: 8, textAlign: 'center' }}>
              不是后端挂了。{remain} 秒后自动再试。
            </p>
          </>
        ) : backendUp ? (
          <>
            <p>会话确认失败。</p>
            <p className="tert" style={{ marginTop: 8, textAlign: 'center' }}>
              站点还在，点刷新再试一次。
            </p>
          </>
        ) : (
          <>
            <p>暂时连不上站点。</p>
            <p className="tert" style={{ marginTop: 8, textAlign: 'center' }}>
              多半是网络或后端还没起来，刷新再试一次。
            </p>
          </>
        )}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => void bootstrapAuth({ force: true })}>
            {limited ? '现在重试' : '刷新'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GuestOnly() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'checking') return <BootScreen />
  if (auth.status === 'offline') return <OfflineScreen />
  if (auth.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/sign-in' && from !== '/register' && from !== '/' ? from : '/'} replace />
  }
  return <Outlet />
}

function HomeRoute() {
  const auth = useAuth()
  if (auth.status === 'checking') return <BootScreen />
  if (auth.status === 'offline') return <OfflineScreen />
  if (auth.status === 'authenticated') {
    return (
      <AppShell>
        <OverviewPage />
      </AppShell>
    )
  }
  return <LandingPage />
}

function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'checking') return <BootScreen />
  if (auth.status === 'offline') return <OfflineScreen />
  if (auth.status !== 'authenticated') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }
  return <AppShell />
}

function BrandChrome() {
  useEffect(() => {
    applyFavicon()
  }, [])
  return null
}

function Root() {
  const auth = useAuth()
  const prevAuth = useRef(auth.status)
  useEffect(() => {
    void bootstrapAuth()
  }, [])
  useEffect(() => {
    if (prevAuth.current === 'authenticated' && auth.status === 'anonymous') {
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== 'site-status' && q.queryKey[0] !== 'portal-config',
      })
    }
    prevAuth.current = auth.status
  }, [auth.status])

  return (
    <>
      <BrandChrome />
      <div className="bg-glow" />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route element={<GuestOnly />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
        </Route>
        <Route path="/user/reset" element={<ResetPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/keys" element={<KeysPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" closeButton duration={5000} />
    </>
  )
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root 节点不存在')

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
)

const hot = import.meta.hot
const root: Root = (hot?.data.root as Root | undefined) ?? createRoot(rootEl)
if (hot) hot.data.root = root
root.render(app)
