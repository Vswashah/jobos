import { useState, useEffect } from 'react'
import Toast from '../components/Toast'
import { API_BASE } from '../config'

interface Job {
  id: string
  company: string
  role: string
  status: string
  found_at: string
  applied_at: string | null
  required_skills: string[]
  f1_eligible: boolean
}

const STATUS_COLORS: Record<string, string> = {
  found: 'bg-cream-200 text-ink-900/60',
  applied: 'bg-gold-300/40 text-ink-900',
  interviewing: 'bg-violet-100 text-violet-700',
  offered: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_OPTIONS = ['found', 'applied', 'interviewing', 'offered', 'rejected']

export default function Resumes() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/jobs/`)
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateStatus = async (jobId: string, status: string) => {
    const prevJobs = jobs
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j))
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/status?status=${status}`, {
        method: 'PATCH'
      })
      if (!res.ok) throw new Error('Failed to update status')
    } catch {
      setJobs(prevJobs)
      setToast({ message: 'Failed to update status', kind: 'error' })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">Application Tracker</h2>
        <p className="text-ink-900/50 mt-1">Every JD you've analyzed — track your pipeline</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {STATUS_OPTIONS.map(status => (
          <div key={status} className="bg-white rounded-2xl border border-ink-900/5 p-4 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-ink-900">
              {jobs.filter(j => j.status === status).length}
            </div>
            <div className="text-xs text-ink-900/50 mt-1 capitalize">{status}</div>
          </div>
        ))}
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-2xl border border-ink-900/5 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-ink-900/30">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-ink-900 mb-1">No jobs yet</h3>
            <p className="text-ink-900/50 text-sm">Analyze a JD to start tracking</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream-100/60 border-b border-ink-900/5">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-900/40 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-900/40 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-900/40 uppercase">Skills</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-900/40 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-900/40 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-cream-100/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-ink-900">{job.company}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-ink-900/60">{job.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(job.required_skills || []).slice(0, 4).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-gold-300/30 text-ink-900/80 rounded-full text-xs">{s}</span>
                      ))}
                      {job.required_skills?.length > 4 && (
                        <span className="text-xs text-ink-900/40">+{job.required_skills.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-900/50">
                    {formatDate(job.found_at)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={job.status}
                      onChange={e => updateStatus(job.id, e.target.value)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[job.status] || STATUS_COLORS.found}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} className="bg-white text-ink-900 capitalize">{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  )
}
