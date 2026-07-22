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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/jobs/analytics`)
      .then(r => r.json())
      .then(data => {
        setStats(data.stats)
        setActivity(data.recent_activity || [])
      })
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, Vishwaa 👋</h2>
        <p className="text-gray-500 mt-1">Your AI-powered job search dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Applied', value: stats?.applied ?? 0, color: 'bg-blue-500' },
            { label: 'Interviewing', value: stats?.interviewing ?? 0, color: 'bg-purple-500' },
            { label: 'Offered', value: stats?.offered ?? 0, color: 'bg-green-500' },
            { label: 'Rejected', value: stats?.rejected ?? 0, color: 'bg-red-400' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className={`${item.color} text-white rounded-lg p-4`}>
                <div className="text-3xl font-bold">{item.value}</div>
              </div>
              <div className="text-sm text-gray-500 mt-2">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">🚀</div>
            <p className="text-sm">No activity yet — analyze your first JD to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  {item.action === 'job_analyzed' ? '🔍' : '📄'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatAction(item.action, item.metadata)}
                  </p>
                  <p className="text-xs text-gray-400">{formatTime(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
