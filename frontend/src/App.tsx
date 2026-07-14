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
    <div className="flex h-screen bg-white text-gray-900 font-sans">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'analyze' && <AnalyzeJD />}
        {currentPage === 'resumes' && <Resumes />}
        {currentPage === 'profile' && <Profile />}
      </main>
    </div>
  )
}
