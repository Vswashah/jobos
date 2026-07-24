import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

interface Stats {
  total_analyzed: number
  applied: number
  interviewing: number
  offered: number
  rejected: number
  resumes_generated: number
}

interface Activity {
  action: string
  entity_type: string
  metadata: any
  created_at: string
}

interface Streak {
  current_streak: number
  longest_streak: number
  active_today: boolean
  grid: Array<{ date: string; count: number }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [streak, setStreak] = useState<Streak | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/jobs/analytics`)
      .then(r => r.json())
      .then(data => {
        setStats(data.stats)
        setActivity(data.recent_activity || [])
      })
      .catch(() => {})

    fetch(`${API_BASE}/api/jobs/streak`)
      .then(r => r.json())
      .then(setStreak)
      .catch(() => {})
  }, [])

  const formatAction = (action: string, metadata: any) => {
    if (action === 'job_analyzed') return `Analyzed ${metadata?.company || 'a job'} — ${metadata?.role || ''}`
    if (action === 'resume_generated') return `Generated resume for ${metadata?.company || 'a company'}`
    return action
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const statCards = [
    { label: 'JDs Analyzed', value: stats?.total_analyzed ?? '—', icon: '🔍' },
    { label: 'Resumes Generated', value: stats?.resumes_generated ?? '—', icon: '📄' },
    { label: 'Applied', value: stats?.applied ?? '—', icon: '📨' },
    { label: 'Interviewing', value: stats?.interviewing ?? '—', icon: '🎯' },
  ]

  const dotClass = (count: number) => {
    if (count === 0) return 'bg-white/10'
    if (count <= 2) return 'bg-gold-400/40'
    if (count <= 5) return 'bg-gold-400/70'
    return 'bg-gold-400'
  }

  // grid is chronological (oldest→newest, 84 days); chunk into 12 weeks of 7
  // days each so it renders as a GitHub-style column-per-week heatmap
  const weeks: Array<Array<{ date: string; count: number }>> = []
  if (streak) {
    for (let i = 0; i < streak.grid.length; i += 7) {
      weeks.push(streak.grid.slice(i, i + 7))
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">Welcome back, Vishwaa 👋</h2>
        <p className="text-ink-900/50 mt-1">Your AI-powered job search dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-ink-900/5 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gold-300/40 flex items-center justify-center text-lg mb-3">{stat.icon}</div>
            <div className="text-2xl font-extrabold text-ink-900">{stat.value}</div>
            <div className="text-sm text-ink-900/50 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Activity Streak */}
      <div className="bg-ink-900 rounded-2xl p-6 mb-4 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-cream-50">Activity Streak</h3>
            <p className="text-xs text-cream-50/40 mt-0.5">Days in a row you've worked your job search</p>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <div className="text-3xl font-extrabold text-gold-400">
                {streak ? streak.current_streak : '—'}
                <span className="text-lg align-top ml-0.5">🔥</span>
              </div>
              <div className="text-xs text-cream-50/40">current</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-cream-50">{streak ? streak.longest_streak : '—'}</div>
              <div className="text-xs text-cream-50/40">longest</div>
            </div>
          </div>
        </div>

        {streak ? (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(day => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} action${day.count === 1 ? '' : 's'}`}
                    className={`w-3 h-3 rounded-[3px] ${dotClass(day.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[92px]" />
        )}
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 mb-4 shadow-sm">
        <h3 className="text-lg font-bold text-ink-900 mb-4">Pipeline</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Applied', value: stats?.applied ?? 0, dark: true },
            { label: 'Interviewing', value: stats?.interviewing ?? 0, dark: false },
            { label: 'Offered', value: stats?.offered ?? 0, dark: true },
            { label: 'Rejected', value: stats?.rejected ?? 0, dark: false },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className={`rounded-2xl p-4 ${item.dark ? 'bg-ink-900 text-cream-50' : 'bg-gold-400 text-ink-900'}`}>
                <div className="text-3xl font-extrabold">{item.value}</div>
              </div>
              <div className="text-sm text-ink-900/50 mt-2">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-ink-900 mb-4">Recent Activity</h3>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-ink-900/30">
            <div className="text-4xl mb-2">🚀</div>
            <p className="text-sm">No activity yet — analyze your first JD to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-cream-100/60">
                <div className="w-9 h-9 rounded-full bg-gold-300/40 flex items-center justify-center text-sm shrink-0">
                  {item.action === 'job_analyzed' ? '🔍' : '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">
                    {formatAction(item.action, item.metadata)}
                  </p>
                  <p className="text-xs text-ink-900/40">{formatTime(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
