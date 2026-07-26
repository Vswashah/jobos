import type { Page } from '../types'
const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'analyze',   label: 'Analyze JD', icon: '⚡' },
  { id: 'discover',  label: 'Discover Jobs', icon: '🧭' },
  { id: 'resumes',   label: 'My Resumes', icon: '📄' },
  { id: 'interviews', label: 'Interviews', icon: '🎙️' },
  { id: 'profile',   label: 'My Profile', icon: '👤' },
]

interface Props {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  user: { id: string; name: string }
  onLogout: () => void
}

export default function Sidebar({ currentPage, setCurrentPage, user, onLogout }: Props) {
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <aside className="w-64 bg-ink-900 rounded-[24px] flex flex-col shrink-0">
      <div className="px-6 py-6">
        <h1 className="text-xl font-extrabold text-cream-50 tracking-tight">JobOS</h1>
        <p className="text-xs text-cream-50/50 mt-0.5">AI Job Search Agent</p>
      </div>
      <nav className="flex-1 px-4 py-2 space-y-2">
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id as Page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
              currentPage === item.id
                ? 'bg-gold-400 text-ink-900'
                : 'text-cream-50/60 hover:bg-white/5 hover:text-cream-50'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mx-4 mb-4 p-4 rounded-2xl bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold-400 flex items-center justify-center text-ink-900 text-sm font-bold shrink-0">{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-cream-50 truncate">{user.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs font-semibold text-cream-50/40 hover:text-cream-50 shrink-0"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  )
}
