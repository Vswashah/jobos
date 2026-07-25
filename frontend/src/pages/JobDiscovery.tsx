import { useState, useEffect } from 'react'
import Toast from '../components/Toast'
import { API_BASE } from '../config'

interface Job {
  id: string
  company: string
  role: string
  location: string | null
  remote_type: string | null
  status: string
  required_skills: string[]
  h1b_sponsor: boolean | null
  f1_eligible: boolean
  source_url: string | null
}

export default function JobDiscovery() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error' } | null>(null)

  const loadJobs = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/jobs/`)
      .then(r => r.json())
      .then(data => setJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const discoverJobs = async () => {
    setDiscovering(true)
    try {
      const res = await fetch(`${API_BASE}/api/jobs/discover`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Discovery failed')
      setToast({ message: `Scanned ${data.scanned} postings — found ${data.found} new role${data.found === 1 ? '' : 's'}` })
      loadJobs()
    } catch (e: any) {
      setToast({ message: e.message || 'Job discovery failed', kind: 'error' })
    } finally {
      setDiscovering(false)
    }
  }

  const discovered = jobs.filter(j => j.status === 'found' && j.f1_eligible === true)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">Discover Jobs</h2>
        <p className="text-ink-900/50 mt-1">Live web search for F1/OPT-eligible internships and new-grad roles</p>
      </div>

      {/* Discovery trigger */}
      <div className="bg-ink-900 rounded-2xl p-6 mb-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-cream-50">Grok Web Search</h3>
          <p className="text-xs text-cream-50/40 mt-0.5">
            {discovering ? 'Searching the live web for postings — this can take up to 30s...' : 'Finds real, currently-open postings that welcome F1/OPT candidates'}
          </p>
        </div>
        <button
          onClick={discoverJobs}
          disabled={discovering}
          className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50 shrink-0"
        >
          {discovering ? '⏳ Searching...' : '🧭 Find F1-Eligible Roles'}
        </button>
      </div>

      {/* Discovered jobs list */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-ink-900 mb-4">Discovered Roles ({discovered.length})</h3>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-cream-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : discovered.length === 0 ? (
          <p className="text-sm text-ink-900/40">No discovered roles yet — click "Find F1-Eligible Roles" to search.</p>
        ) : (
          <div className="space-y-3">
            {discovered.map(job => (
              <div key={job.id} className="p-4 rounded-2xl border border-ink-900/5 bg-cream-100/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">
                      {job.company}
                      <span className="text-ink-900/40 font-normal"> · {job.role}</span>
                    </p>
                    <p className="text-xs text-ink-900/50 mt-0.5">
                      {job.location || 'Location unknown'}
                      {job.remote_type && ` · ${job.remote_type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.h1b_sponsor && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">H1B Sponsor</span>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">F1 Eligible</span>
                  </div>
                </div>
                {job.required_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {job.required_skills.slice(0, 6).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gold-300/30 text-ink-900/80 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                )}
                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs font-semibold text-ink-900/60 hover:text-ink-900 underline"
                  >
                    View posting →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  )
}
