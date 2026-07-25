import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
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
  const [connected, setConnected] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<{ message: string; kind?: 'success' | 'error' } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadInterviews = () => {
    setLoading(true)
    apiFetch(`/api/interviews/`)
      .then(r => r.json())
      .then(data => setInterviews(data.interviews || []))
      .catch(() => {})
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBD'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
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
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">Interviews</h2>
        <p className="text-ink-900/50 mt-1">Auto-detected from Gmail, or logged manually</p>
      </div>

      {/* Gmail connection */}
      <div className="bg-ink-900 rounded-2xl p-6 mb-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-cream-50">Gmail Integration</h3>
          <p className="text-xs text-cream-50/40 mt-0.5">
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
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
              >
                {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
              </button>
              <button
                onClick={disconnectGmail}
                className="px-4 py-2 text-cream-50/60 hover:text-cream-50 rounded-full text-sm font-semibold"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connectGmail}
              className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      {/* Interviews list */}
      <div className="bg-white rounded-2xl border border-ink-900/5 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Upcoming & Past ({interviews.length})</h3>
          <button
            onClick={openLogInterview}
            className="text-sm text-ink-900 bg-gold-400 hover:bg-gold-500 font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            + Log Interview
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-cream-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <p className="text-sm text-ink-900/40">No interviews yet — connect Gmail or log one manually.</p>
        ) : (
          <div className="space-y-3">
            {interviews.map(iv => (
              <div key={iv.id} className="flex items-center gap-4 p-4 rounded-2xl border border-ink-900/5 bg-cream-100/40">
                <div className="w-10 h-10 rounded-full bg-gold-300/40 flex items-center justify-center text-lg shrink-0">
                  {formatIcon(iv.format)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">
                    {iv.company} — Round {iv.round}
                    {iv.role && <span className="text-ink-900/40 font-normal"> · {iv.role}</span>}
                  </p>
                  <p className="text-xs text-ink-900/50 mt-0.5">
                    {formatDate(iv.interview_date)}
                    {iv.interviewer_name && ` · ${iv.interviewer_name}`}
                  </p>
                  {iv.notes && <p className="text-xs text-ink-900/40 mt-1 truncate">{iv.notes}</p>}
                </div>
                {iv.outcome && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-ink-900/70 shrink-0 capitalize">
                    {iv.outcome}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
                  className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-900/70 mb-1">Format</label>
                <select
                  value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
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
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Interviewer</label>
              <input
                type="text"
                value={form.interviewer_name}
                onChange={e => setForm(f => ({ ...f, interviewer_name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Anything worth remembering"
                className="w-full px-4 py-3 border border-ink-900/10 bg-cream-100/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-900/60 hover:bg-cream-200 rounded-full">
                Cancel
              </button>
              <button
                onClick={submitInterview}
                disabled={saving || !form.company.trim()}
                className="px-4 py-2 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
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
