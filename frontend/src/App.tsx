import { useState, useEffect } from 'react'
import type { Page, JobStatus } from './types'
import { apiFetch } from './api'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import AnalyzeJD from './pages/AnalyzeJD'
import JobDiscovery from './pages/JobDiscovery'
import Resumes from './pages/Resumes'
import Interviews from './pages/Interviews'
import Profile from './pages/Profile'
import Applications from './pages/Applications'
import { Menu, Zap } from 'lucide-react'
import NotFound from './pages/NotFound'
import ComingSoon from './pages/ComingSoon'
import { Button } from './components/ui'
import { NAV_GROUPS } from './nav'

const initialPage: Page = new URLSearchParams(window.location.search).get('gmail') === 'connected'
  ? 'interviews'
  : 'dashboard'

interface User {
  id: string
  name: string
  email?: string
  onboarding_completed: boolean
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage)
  const [appFilter, setAppFilter] = useState<JobStatus | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false))
  }, [])

  const navigate = (page: Page, status?: JobStatus) => {
    setAppFilter(status ?? null)
    setCurrentPage(page)
    setMenuOpen(false)
  }

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  if (checkingAuth) {
    return <div className="min-h-screen bg-canvas" />
  }

  if (!user) {
    return <Login onAuthenticated={setUser} />
  }

  if (!user.onboarding_completed) {
    return (
      <Onboarding
        userName={user.name}
        onComplete={() => setUser(u => (u ? { ...u, onboarding_completed: true } : u))}
      />
    )
  }

  const title = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === currentPage)?.label

  return (
    <div className="h-screen flex font-sans bg-canvas text-ink-900">
      <div className="hidden lg:block shrink-0">
        <Sidebar currentPage={currentPage} navigate={navigate} user={user} onLogout={logout} />
      </div>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="h-full w-60" onClick={e => e.stopPropagation()}>
            <Sidebar currentPage={currentPage} navigate={navigate} user={user} onLogout={logout} onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="shrink-0 h-14 flex items-center gap-2 px-3 lg:px-8 border-b border-line bg-canvas">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="lg:hidden size-11 grid place-items-center rounded-lg hover:bg-stone">
            <Menu className="size-5" />
          </button>
          <p className="text-sm text-muted flex-1 truncate">JobOS <span aria-hidden>/</span> <span className="font-semibold text-ink-900">{title}</span></p>
          {currentPage !== 'analyze' && (
            <Button variant="primary" onClick={() => navigate('analyze')}><Zap className="size-4" />Analyze JD</Button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          {window.location.pathname !== '/' ? <NotFound /> : <>
          {currentPage === 'dashboard' && <Dashboard userName={user.name} navigate={navigate} />}
          {currentPage === 'analyze' && <AnalyzeJD />}
          {currentPage === 'discover' && <JobDiscovery navigate={navigate} />}
          {currentPage === 'applications' && <Applications initialFilter={appFilter} navigate={navigate} />}
          {currentPage === 'resumes' && <Resumes />}
          {currentPage === 'interviews' && <Interviews />}
          {currentPage === 'profile' && <Profile />}
          {currentPage === 'outreach' && <ComingSoon title="Outreach" description="Recruiter and referral message templates aren't built yet." />}
          {currentPage === 'billing' && <ComingSoon title="Billing" description="JobOS has no paid plans yet, so there is nothing to manage here." />}
          {currentPage === 'account' && <ComingSoon title="Account & Security" description="Session management, password changes, data export and account deletion aren't built yet." />}
          </>}
        </main>
      </div>
    </div>
  )
}
