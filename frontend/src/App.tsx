import { useState, useEffect } from 'react'
import type { Page } from './types'
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

const initialPage: Page = new URLSearchParams(window.location.search).get('gmail') === 'connected'
  ? 'interviews'
  : 'dashboard'

interface User {
  id: string
  name: string
  onboarding_completed: boolean
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false))
  }, [])

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  if (checkingAuth) {
    return <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #dcdfe6 0%, #eee6d3 45%, #f6dfa8 100%)' }} />
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[1400px] h-[calc(100vh-2rem)] flex gap-3 bg-cream-50/70 rounded-[32px] p-3 shadow-[0_20px_60px_rgba(23,22,15,0.15)]">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} onLogout={logout} />
        <main className="flex-1 overflow-y-auto bg-cream-50 rounded-[24px] text-ink-900">
          {currentPage === 'dashboard' && <Dashboard userName={user.name} />}
          {currentPage === 'analyze' && <AnalyzeJD />}
          {currentPage === 'discover' && <JobDiscovery />}
          {currentPage === 'resumes' && <Resumes />}
          {currentPage === 'interviews' && <Interviews />}
          {currentPage === 'profile' && <Profile />}
        </main>
      </div>
    </div>
  )
}
