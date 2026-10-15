import { LayoutDashboard, Zap, Compass, KanbanSquare, FileText, Mic, MessageSquare, User, CreditCard, Shield } from 'lucide-react'
import type { Page } from './types'

export const NAV_GROUPS: { label: string; items: { id: Page; label: string; icon: typeof Zap }[] }[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analyze', label: 'Analyze JD', icon: Zap },
      { id: 'discover', label: 'Discover Jobs', icon: Compass },
      { id: 'applications', label: 'Applications', icon: KanbanSquare },
      { id: 'resumes', label: 'My Resumes', icon: FileText },
      { id: 'interviews', label: 'Interviews', icon: Mic },
      { id: 'outreach', label: 'Outreach', icon: MessageSquare },
    ],
  },
  { label: 'Personal', items: [{ id: 'profile', label: 'My Profile', icon: User }] },
  {
    label: 'Preferences',
    items: [
      { id: 'billing', label: 'Billing', icon: CreditCard },
      { id: 'account', label: 'Account & Security', icon: Shield },
    ],
  },
]
