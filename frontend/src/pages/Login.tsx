import { useState } from 'react'
import { apiFetch } from '../api'

interface Props {
  onAuthenticated: (user: { id: string; name: string }) => void
}

export default function Login({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [university, setUniversity] = useState('')
  const [degree, setDegree] = useState('')
  const [graduationDate, setGraduationDate] = useState('')
  const [visaStatus, setVisaStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    try {
      const path = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
      const body = mode === 'signup'
        ? {
            name, email, password,
            university: university || null,
            degree: degree || null,
            graduation_date: graduationDate || null,
            visa_status: visaStatus || null,
          }
        : { email, password }

      const res = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      onAuthenticated({ id: data.id, name: data.name })
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: 'linear-gradient(135deg, #dcdfe6 0%, #eee6d3 45%, #f6dfa8 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl p-8">
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">JobOS</h1>
        <p className="text-ink-900/50 text-sm mb-6">AI Job Search Agent</p>

        <div className="flex gap-2 mb-6 bg-cream-100 rounded-full p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-900/50'}`}
          >
            Log In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-900/50'}`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-ink-900/70 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink-900/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-900/70 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink-900/70 mb-1">University</label>
                  <input
                    type="text"
                    value={university}
                    onChange={e => setUniversity(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-900/70 mb-1">Degree</label>
                  <input
                    type="text"
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink-900/70 mb-1">Graduation</label>
                  <input
                    type="date"
                    value={graduationDate}
                    onChange={e => setGraduationDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-900/70 mb-1">Visa Status</label>
                  <input
                    type="text"
                    value={visaStatus}
                    onChange={e => setVisaStatus(e.target.value)}
                    placeholder="e.g. F-1"
                    className="w-full px-4 py-2.5 border border-ink-900/10 bg-cream-100/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full mt-2 px-4 py-3 bg-gold-400 text-ink-900 rounded-full text-sm font-bold hover:bg-gold-500 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  )
}
