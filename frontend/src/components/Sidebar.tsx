import type { Page } from '../types'
const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'analyze',   label: 'Analyze JD', icon: '⚡' },
  { id: 'resumes',   label: 'My Resumes', icon: '📄' },
  { id: 'profile',   label: 'My Profile', icon: '👤' },
]

interface Props {
  currentPage: Page
  setCurrentPage: (page: Page) => void
}

export default function Sidebar({ currentPage, setCurrentPage }: Props) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">JobOS</h1>
        <p className="text-xs text-gray-500 mt-0.5">AI Job Search Agent</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id as Page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === item.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">V</div>
          <div>
            <p className="text-sm font-medium text-gray-900">Vishwaa Shah</p>
            <p className="text-xs text-gray-500">M.S. CS @ UTD</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
