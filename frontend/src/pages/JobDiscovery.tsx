import { useState } from 'react'
import { Compass, ExternalLink, Search } from 'lucide-react'
import { apiFetch, useFetch } from '../api'
import Toast from '../components/Toast'
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton, inputCls } from '../components/ui'
import type { Job, Navigate } from '../types'

const sponsorship = (j: Job) =>
  j.h1b_sponsor === true ? { tone: 'ok' as const, text: 'Sponsorship reported' }
    : j.h1b_sponsor === false ? { tone: 'neutral' as const, text: 'No sponsorship reported' }
      : { tone: 'neutral' as const, text: 'Sponsorship unknown — verify' }

export default function JobDiscovery({ navigate }: { navigate: Navigate }) {
  const { data, error, loading, reload } = useFetch<{ jobs: Job[] }>('/api/jobs/')
  const [discovering, setDiscovering] = useState(false)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error' } | null>(null)
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState('')

  const discover = async () => {
    setDiscovering(true)
    try {
      const res = await apiFetch('/api/jobs/discover', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.detail || 'Discovery failed')
      setToast({ message: `Scanned ${body.scanned} postings — ${body.found} new role${body.found === 1 ? '' : 's'}` })
      reload()
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Job discovery failed', kind: 'error' })
    } finally {
      setDiscovering(false)
    }
  }

  const q = query.trim().toLowerCase()
  const jobs = (data?.jobs ?? [])
    .filter(j => j.status === 'found' && j.f1_eligible === true && j.source_url)
    .filter(j => !q || `${j.company} ${j.role} ${j.location ?? ''}`.toLowerCase().includes(q))
    .filter(j => !remote || j.remote_type === remote)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Discover jobs</h2>
        <p className="text-muted mt-1">Live web search for internships and new-grad roles that mention F-1/OPT candidates.</p>
      </div>

      <section className="bg-white border border-line rounded-xl p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold">Run discovery</h3>
          <p className="text-xs text-muted mt-0.5 max-w-md" aria-live="polite">
            {discovering ? 'Searching the live web — this can take up to 30 seconds…' : 'Searches using your profile skills and graduation date. New roles are saved below.'}
          </p>
        </div>
        <Button variant="primary" onClick={discover} disabled={discovering}><Compass className="size-4" />{discovering ? 'Searching…' : 'Find roles'}</Button>
      </section>

      <p className="text-xs text-muted">
        Sponsorship and eligibility labels come from each posting as read by an AI search and can be wrong or out of date.
        Treat them as a research aid, not legal or immigration advice — confirm with the employer and your school's international office.
      </p>

      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-48">
          <span className="sr-only">Search roles</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
          <input className={`${inputCls} pl-9`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company, role or location" />
        </label>
        <label>
          <span className="sr-only">Work arrangement</span>
          <select className={`${inputCls} w-auto`} value={remote} onChange={e => setRemote(e.target.value)}>
            <option value="">Any arrangement</option>
            <option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
          </select>
        </label>
      </div>

      {loading ? <Skeleton className="h-64" /> : error ? <Card><ErrorState what="roles" onRetry={reload} /></Card> :
        jobs.length === 0 ? (
          <Card><EmptyState title={data?.jobs.length ? 'No roles match your filters' : 'No discovered roles yet'}
            hint={data?.jobs.length ? undefined : 'Run discovery to search for open roles.'} /></Card>
        ) : (
          <ul className="space-y-3">
            {jobs.map(j => {
              const s = sponsorship(j)
              return (
                <li key={j.id}>
                  <Card className="!p-4 md:!p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{j.company}</p>
                        <p className="text-sm text-muted">{j.role}</p>
                        <p className="text-xs text-muted mt-1">{j.location || 'Location unknown'}{j.remote_type && ` · ${j.remote_type}`}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Chip tone={s.tone}>{s.text}</Chip>
                        <Chip tone="accent">F-1/OPT mentioned</Chip>
                      </div>
                    </div>
                    {j.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">{j.required_skills.slice(0, 6).map(k => <Chip key={k}>{k}</Chip>)}</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <a href={j.source_url!} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 min-h-11 md:min-h-10 px-4 rounded-lg border border-line bg-white text-sm font-semibold hover:bg-stone">
                        View posting<ExternalLink className="size-4" aria-hidden /></a>
                      <Button onClick={() => navigate('analyze')}>Analyze JD</Button>
                      <Button variant="ghost" onClick={() => navigate('applications', 'found')}>Track</Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      {toast && <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  )
}
