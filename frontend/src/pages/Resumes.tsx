import { useState, useEffect } from 'react'

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
  found: 'bg-gray-100 text-gray-600',
  applied: 'bg-blue-50 text-blue-700',
  interviewing: 'bg-purple-50 text-purple-700',
  offered: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

const STATUS_OPTIONS = ['found', 'applied', 'interviewing', 'offered', 'rejected']

export default function Resumes() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/jobs/')
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateStatus = async (jobId: string, status: string) => {
    await fetch(`http://localhost:8000/api/jobs/${jobId}/status?status=${status}`, {
      method: 'PATCH'
    })
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Application Tracker</h2>
        <p className="text-gray-500 mt-1">Every JD you've analyzed — track your pipeline</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {STATUS_OPTIONS.map(status => (
          <div key={status} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {jobs.filter(j => j.status === status).length}
            </div>
            <div className="text-xs text-gray-500 mt-1 capitalize">{status}</div>
          </div>
        ))}
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No jobs yet</h3>
            <p className="text-gray-500 text-sm">Analyze a JD to start tracking</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Skills</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{job.company}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{job.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(job.required_skills || []).slice(0, 4).map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{s}</span>
                      ))}
                      {job.required_skills?.length > 4 && (
                        <span className="text-xs text-gray-400">+{job.required_skills.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(job.found_at)}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={job.status}
                      onChange={e => updateStatus(job.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[job.status] || STATUS_COLORS.found}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} className="bg-white text-gray-900 capitalize">{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
