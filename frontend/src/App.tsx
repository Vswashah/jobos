import { useState } from 'react'
import type { Page } from './types'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AnalyzeJD from './pages/AnalyzeJD'
import Resumes from './pages/Resumes'
import Profile from './pages/Profile'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[1400px] h-[calc(100vh-2rem)] flex gap-3 bg-cream-50/70 rounded-[32px] p-3 shadow-[0_20px_60px_rgba(23,22,15,0.15)]">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="flex-1 overflow-y-auto bg-cream-50 rounded-[24px] text-ink-900">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'analyze' && <AnalyzeJD />}
          {currentPage === 'resumes' && <Resumes />}
          {currentPage === 'profile' && <Profile />}
        </main>
      </div>
    </div>
  )
}
