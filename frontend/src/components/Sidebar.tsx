import { LogOut, X } from 'lucide-react'
import Mascot from './Mascot'
import type { Navigate, Page } from '../types'
import { NAV_GROUPS } from '../nav'

interface Props {
  currentPage: Page
  navigate: Navigate
  user: { name: string; email?: string }
  onLogout: () => void
  onClose?: () => void
}

export default function Sidebar({ currentPage, navigate, user, onLogout, onClose }: Props) {
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <aside className="w-60 h-full bg-stone border-r border-line flex flex-col">
      <div className="px-5 h-14 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Mascot size={28} />JobOS
        </h1>
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="size-11 -mr-3 grid place-items-center rounded-lg text-muted hover:bg-line/60">
            <X className="size-5" />
          </button>
        )}
      </div>
      <nav aria-label="Main" className="flex-1 px-3 py-2 overflow-y-auto space-y-5">
        {NAV_GROUPS.map(g => (
          <div key={g.label}>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map(({ id, label, icon: Icon }) => {
                const active = currentPage === id
                return (
                  <li key={id}>
                    <button
                      onClick={() => navigate(id)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-full flex items-center gap-3 px-3 min-h-11 md:min-h-9 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-accent-soft text-accent-deep' : 'text-ink-900/80 hover:bg-line/60'
                      }`}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" aria-hidden />}
                      <Icon className={`size-4 ${active ? 'text-accent' : 'text-muted'}`} aria-hidden />
                      {label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-line flex items-center gap-3 shrink-0">
        <div className="size-8 rounded-full bg-accent-soft text-accent-deep grid place-items-center text-sm font-semibold shrink-0">{initial}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{user.name}</p>
          {user.email && <p className="text-xs text-muted truncate">{user.email}</p>}
        </div>
        <button onClick={onLogout} aria-label="Log out" className="size-11 md:size-9 grid place-items-center rounded-lg text-muted hover:bg-line/60 hover:text-ink-900">
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  )
}
