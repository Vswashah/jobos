import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { apiFetch, useFetch } from '../api'
import Toast from '../components/Toast'
import { Button, Card, Drawer, EmptyState, ErrorState, Skeleton } from '../components/ui'
import type { Job, JobStatus, Navigate } from '../types'

const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: 'found', label: 'Found' }, { status: 'applied', label: 'Applied' },
  { status: 'interviewing', label: 'Interviewing' }, { status: 'offered', label: 'Offered' },
  { status: 'rejected', label: 'Rejected' },
]
const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Applications({ initialFilter, navigate }: { initialFilter: JobStatus | null; navigate: Navigate }) {
  const { data, error, loading, reload } = useFetch<{ jobs: Job[] }>('/api/jobs/')
  const [jobs, setJobs] = useState<Job[]>([])
  const [query, setQuery] = useState('')
  const [only, setOnly] = useState<JobStatus | null>(initialFilter)
  const [selected, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error'; celebrate?: boolean } | null>(null)

  useEffect(() => { if (data) setJobs(data.jobs) }, [data])
  useEffect(() => setOnly(initialFilter), [initialFilter])

  const move = async (id: string, status: JobStatus) => {
    const prev = jobs
    if (prev.find(j => j.id === id)?.status === status) return
    setJobs(js => js.map(j => (j.id === id ? { ...j, status } : j))) // optimistic; rolled back below on failure
    const res = await apiFetch(`/api/jobs/${id}/status?status=${status}`, { method: 'PATCH' }).catch(() => null)
    if (!res?.ok) {
      setJobs(prev)
      setToast({ message: 'Could not update status — change reverted', kind: 'error' })
    } else {
      setToast(status === 'offered'
        ? { message: 'An offer! Congratulations!', celebrate: true }
        : { message: `Moved to ${COLUMNS.find(c => c.status === status)!.label}` })
      reload()
    }
  }

  const q = query.trim().toLowerCase()
  const visible = useMemo(
    () => jobs.filter(j => (!q || `${j.company} ${j.role}`.toLowerCase().includes(q))),
    [jobs, q],
  )
  const cols = only ? COLUMNS.filter(c => c.status === only) : COLUMNS
  const current = jobs.find(j => j.id === selected)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
          <p className="text-muted mt-1">Drag cards between columns, or use the status menu on each card.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('analyze')}>Add via Analyze JD</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <label className="relative flex-1 min-w-48 max-w-sm">
          <span className="sr-only">Search applications</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company or role"
            className="w-full min-h-11 md:min-h-10 pl-9 pr-3 rounded-lg border border-line bg-white text-sm" />
        </label>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by status">
          {[{ status: null, label: 'All' }, ...COLUMNS].map(c => (
            <button key={c.label} aria-pressed={only === c.status} onClick={() => setOnly(c.status as JobStatus | null)}
              className={`min-h-11 md:min-h-10 px-4 rounded-lg text-sm font-semibold border ${only === c.status ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-line hover:bg-stone'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Skeleton className="h-80" /> : error ? <Card><ErrorState what="applications" onRetry={reload} /></Card> :
        jobs.length === 0 ? <Card><EmptyState title="No applications yet" hint="Analyze a job description and it will appear here as Found."
          action={<Button variant="primary" onClick={() => navigate('analyze')}>Analyze a JD</Button>} /></Card> : (
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
            {cols.map(col => {
              const items = visible.filter(j => j.status === col.status)
              return (
                <section key={col.status} aria-label={col.label}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { const id = e.dataTransfer.getData('text/plain'); if (id) move(id, col.status) }}
                  className={`${only ? 'w-full max-w-md' : 'w-72'} shrink-0 snap-start rounded-xl bg-stone p-3`}>
                  <h3 className="px-2 py-1 text-sm font-bold flex justify-between">{col.label}<span className="text-muted">{items.length}</span></h3>
                  <ul className="space-y-2 mt-2 min-h-16">
                    {items.map(j => (
                      <li key={j.id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', j.id)}
                        className="bg-white rounded-xl border border-line p-3 cursor-grab active:cursor-grabbing">
                        <button onClick={() => setSelected(j.id)} className="text-left w-full">
                          <p className="text-sm font-bold truncate">{j.company}</p>
                          <p className="text-xs text-muted truncate">{j.role}</p>
                          <p className="text-xs text-muted mt-1">{j.applied_at ? `Applied ${fmt(j.applied_at)}` : `Found ${fmt(j.found_at)}`}</p>
                        </button>
                        <label className="block mt-2">
                          <span className="sr-only">Status for {j.company}</span>
                          <select value={j.status} onChange={e => move(j.id, e.target.value as JobStatus)}
                            className="w-full min-h-11 md:min-h-9 rounded-full border border-line bg-canvas px-3 text-xs font-semibold">
                            {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                          </select>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

      {current && (
        <Drawer title={current.company} onClose={() => setSelected(null)}>
          <dl className="space-y-4 text-sm">
            <div><dt className="text-muted">Role</dt><dd className="font-semibold">{current.role}</dd></div>
            <div><dt className="text-muted">Status</dt><dd className="font-semibold capitalize">{current.status}</dd></div>
            <div><dt className="text-muted">Found</dt><dd>{fmt(current.found_at)}</dd></div>
            {current.applied_at && <div><dt className="text-muted">Applied</dt><dd>{fmt(current.applied_at)}</dd></div>}
            {current.location && <div><dt className="text-muted">Location</dt><dd>{current.location}{current.remote_type ? ` · ${current.remote_type}` : ''}</dd></div>}
            {current.required_skills.length > 0 && (
              <div><dt className="text-muted mb-1">Required skills</dt>
                <dd className="flex flex-wrap gap-1.5">{current.required_skills.map(s => <span key={s} className="px-2.5 py-1 rounded-full bg-stone text-xs font-semibold">{s}</span>)}</dd></div>
            )}
            <div><dt className="text-muted">Sponsorship signal</dt>
              <dd>{current.h1b_sponsor === null ? 'Unknown — verify with the employer' : current.h1b_sponsor ? 'Reported by the data source — verify with the employer' : 'Not reported'}</dd></div>
          </dl>
          {current.source_url && (
            <a href={current.source_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 mt-6 min-h-11 text-sm font-semibold underline">Open posting<ExternalLink className="size-4" /></a>
          )}
        </Drawer>
      )}
      {toast && <Toast message={toast.message} kind={toast.kind} celebrate={toast.celebrate} onDone={() => setToast(null)} />}
    </div>
  )
}
