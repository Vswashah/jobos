import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { apiFetch } from '../api'
import { Button, Field, inputCls } from '../components/ui'
import Mascot from '../components/Mascot'

interface Props {
  onAuthenticated: (user: { id: string; name: string; onboarding_completed: boolean }) => void
}

export default function Login({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [f, setF] = useState({ name: '', email: '', password: '', university: '', degree: '', graduationDate: '', visaStatus: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const signup = mode === 'signup'
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!f.email.trim() || !f.password) return setError('Email and password are required')
    if (signup && !f.name.trim()) return setError('Name is required')
    if (signup && f.password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)
    try {
      const body = signup
        ? { name: f.name, email: f.email, password: f.password, university: f.university || null, degree: f.degree || null,
            graduation_date: f.graduationDate || null, visa_status: f.visaStatus || null }
        : { email: f.email, password: f.password }
      const res = await apiFetch(signup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong')
      onAuthenticated({ id: data.id, name: data.name, onboarding_completed: data.onboarding_completed })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 font-sans bg-canvas">
      <div className="w-full max-w-md bg-white rounded-xl border border-line shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Mascot size={56} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">JobOS</h1>
            <p className="text-muted text-sm">Your AI job-search command center</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-stone rounded-lg p-1" role="group" aria-label="Account mode">
          {(['login', 'signup'] as const).map(m => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 min-h-11 rounded-lg text-sm font-semibold ${mode === m ? 'bg-white shadow-sm' : 'text-muted'}`}>
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          {signup && <Field label="Name"><input className={inputCls} autoComplete="name" value={f.name} onChange={set('name')} /></Field>}
          <Field label="Email"><input className={inputCls} type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></Field>
          <Field label="Password">
            <span className="relative block">
              <input className={`${inputCls} pr-12`} type={showPw ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'}
                value={f.password} onChange={set('password')} placeholder={signup ? 'At least 8 characters' : 'Your password'} />
              <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-10 grid place-items-center rounded-full text-muted hover:bg-stone">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </Field>

          {signup && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="University"><input className={inputCls} value={f.university} onChange={set('university')} placeholder="Optional" /></Field>
              <Field label="Degree"><input className={inputCls} value={f.degree} onChange={set('degree')} placeholder="Optional" /></Field>
              <Field label="Graduation"><input className={inputCls} type="date" value={f.graduationDate} onChange={set('graduationDate')} /></Field>
              <Field label="Visa status"><input className={inputCls} value={f.visaStatus} onChange={set('visaStatus')} placeholder="Optional, e.g. F-1" /></Field>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading} className="w-full mt-2">
            {loading ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
