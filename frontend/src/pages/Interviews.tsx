import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { Button, Card, CardHeader, Chip, EmptyState, ErrorState, Skeleton } from '../components/ui'
import Toast from '../components/Toast'
import { API_BASE } from '../config'
import { apiFetch } from '../api'

interface Interview {
  id: string
  company: string
  role: string
  round: number
  format: string
  interview_date: string | null
  interviewer_name: string | null
  outcome: string | null
  notes: string | null
  application_id: string
}

const emptyForm = {
  company: '', round: 1, format: 'video', interview_date: '', interviewer_name: '', notes: '',
}

export default function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error' } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadInterviews = () => {
    setLoading(true)
    setLoadError(false)
    apiFetch(`/api/interviews/`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(data => setInterviews(data.interviews || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  const loadStatus = () => {
    apiFetch(`/api/gmail/status`)
      .then(r => r.json())
      .then(data => setConnected(data.connected))
      .catch(() => setConnected(false))
  }

  useEffect(() => {
    loadInterviews()
    loadStatus()
    if (new URLSearchParams(window.location.search).get('gmail') === 'connected') {
      setToast({ message: 'Gmail connected — click Sync Now to scan for interview emails' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const connectGmail = () => {
    window.location.href = `${API_BASE}/api/gmail/authorize`
  }

  const disconnectGmail = async () => {
    try {
      const res = await apiFetch(`/api/gmail/disconnect`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      setConnected(false)
      setToast({ message: 'Gmail disconnected' })
    } catch {
      setToast({ message: 'Failed to disconnect Gmail', kind: 'error' })
    }
  }

  const syncGmail = async () => {
    setSyncing(true)
    try {
      const res = await apiFetch(`/api/gmail/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Sync failed')
      setToast({ message: `Scanned ${data.scanned} emails — found ${data.interviews_found} new interview${data.interviews_found === 1 ? '' : 's'}` })
      loadInterviews()
    } catch (e: any) {
      setToast({ message: e.message || 'Gmail sync failed', kind: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  const openLogInterview = () => {
    setForm(emptyForm)
    setModalOpen(true)
  }

  const submitInterview = async () => {
    const company = form.company.trim()
    if (!company) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/interviews/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          round: form.round,
          format: form.format,
          interview_date: form.interview_date || null,
          interviewer_name: form.interviewer_name || null,
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to log interview')
      setModalOpen(false)
      setToast({ message: `Logged interview with ${company}` })
      loadInterviews()
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to log interview', kind: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const nowMs = Date.now()
  const isUpcoming = (iv: Interview) => !!iv.interview_date && new Date(iv.interview_date).getTime() >= nowMs
  const byDate = (a: Interview, b: Interview) => new Date(a.interview_date ?? 0).getTime() - new Date(b.interview_date ?? 0).getTime()
  const upcoming = interviews.filter(isUpcoming).sort(byDate)
  const past = interviews.filter(iv => !isUpcoming(iv)).sort((a, b) => byDate(b, a))

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBD'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    })
  }

  const formatIcon = (format: string) => {
    if (format === 'phone') return '📞'
    if (format === 'video') return '🎥'
    if (format === 'onsite') return '🏢'
    if (format === 'technical') return '💻'
    return '🎙️'
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Interviews</h2>
        <p className="text-muted mt-1">Detected from Gmail by an AI scan (check the details), or logged manually.</p>
      </div>

      {/* Gmail connection */}
      <div className="bg-white border border-line rounded-xl p-5 md:p-6 mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink-900">Gmail Integration</h3>
          <p className="text-xs text-muted mt-0.5">
            {connected === null ? 'Checking connection...'
              : connected ? 'Connected — scans your inbox for interview invites'
              : 'Not connected yet'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <button
                onClick={syncGmail}
                disabled={syncing}
                className="px-4 py-2 bg-accent-hover text-white rounded-lg text-sm font-bold hover:bg-accent-deep disabled:opacity-50"
              >
                {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
              </button>
              <button
                onClick={disconnectGmail}
                className="px-4 py-2 text-muted hover:text-ink-900 rounded-lg text-sm font-semibold"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connectGmail}
              className="px-4 py-2 bg-accent-hover text-white rounded-lg text-sm font-bold hover:bg-accent-deep"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      {/* Interviews list */}
      <Card>
        <CardHeader title="Interviews" action={<Button variant="primary" onClick={openLogInterview}>+ Log interview</Button>} />
        {loading ? <Skeleton className="h-40" /> : loadError ? <ErrorState what="interviews" onRetry={loadInterviews} /> :
          interviews.length === 0 ? <EmptyState title="No interviews yet" hint="Connect Gmail to detect invites, or log one manually." /> : (
            [{ label: 'Upcoming', items: upcoming }, { label: 'Past or undated', items: past }].filter(g => g.items.length).map(g => (
              <div key={g.label} className="mb-5 last:mb-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">{g.label} ({g.items.length})</h4>
                <ul className="space-y-2">
                  {g.items.map(iv => (
                    <li key={iv.id} className="flex items-center gap-4 p-4 rounded-xl border border-line bg-canvas">
                      <div className="size-10 rounded-full bg-accent-soft grid place-items-center text-lg shrink-0" aria-hidden>{formatIcon(iv.format)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{iv.company} — Round {iv.round}{iv.role && <span className="text-muted font-normal"> · {iv.role}</span>}</p>
                        <p className="text-xs text-muted mt-0.5">{formatDate(iv.interview_date)}{iv.interviewer_name && ` · ${iv.interviewer_name}`}</p>
                        {iv.notes && <p className="text-xs text-muted mt-1 truncate">{iv.notes}</p>}
                      </div>
                      {iv.outcome && <Chip>{iv.outcome}</Chip>}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
      </Card>

      {/* Log Interview Modal */}
      {modalOpen && (
        <Modal title="Log Interview" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Company</label>
              <input
                autoFocus
                type="text"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Must match a company you've analyzed a JD for"
                className="w-full px-4 min-h-11 md:min-h-10 border border-line bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-ink-900/70 mb-1">Round</label>
                <input
                  type="number"
                  min={1}
                  value={form.round}
                  onChange={e => setForm(f => ({ ...f, round: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 min-h-11 md:min-h-10 border border-line bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-900/70 mb-1">Format</label>
                <select
                  value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                  className="w-full px-4 min-h-11 md:min-h-10 border border-line bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {['phone', 'video', 'onsite', 'technical', 'other'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={form.interview_date}
                onChange={e => setForm(f => ({ ...f, interview_date: e.target.value }))}
                className="w-full px-4 min-h-11 md:min-h-10 border border-line bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Interviewer</label>
              <input
                type="text"
                value={form.interviewer_name}
                onChange={e => setForm(f => ({ ...f, interviewer_name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-4 min-h-11 md:min-h-10 border border-line bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Anything worth remembering"
                className="w-full px-4 py-3 border border-line bg-stone rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted hover:bg-stone rounded-lg">
                Cancel
              </button>
              <button
                onClick={submitInterview}
                disabled={saving || !form.company.trim()}
                className="px-4 py-2 bg-accent-hover text-white rounded-lg text-sm font-bold hover:bg-accent-deep disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Log Interview'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} />}
    </div>
  )
}
