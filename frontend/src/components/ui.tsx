import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import Mascot from './Mascot'
import type { Mood } from './Mascot'

type Variant = 'primary' | 'secondary' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-accent-hover text-white hover:bg-accent-deep',
  secondary: 'bg-white text-ink-900 border border-line hover:bg-stone',
  ghost: 'text-ink-900 hover:bg-stone',
}

export function Button({ variant = 'secondary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 min-h-11 md:min-h-10 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    />
  )
}

export function Card({ className = '', children, ...rest }: { className?: string; children: ReactNode; 'aria-live'?: 'polite' }) {
  return <section {...rest} className={`bg-white rounded-xl border border-line p-5 md:p-6 ${className}`}>{children}</section>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`rounded-xl bg-stone motion-safe:animate-pulse ${className}`} />
}

export function EmptyState({ title, hint, action, mood = 'happy' }: { title: string; hint?: string; action?: ReactNode; mood?: Mood }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-2">
      <Mascot size={72} mood={mood} />
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {hint && <p className="text-xs text-muted max-w-xs">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ onRetry, what = 'this' }: { onRetry: () => void; what?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center text-center py-8 gap-2">
      <Mascot size={72} mood="oops" />
      <p className="text-sm font-semibold text-ink-900">Couldn't load {what}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  )
}

/** Right-hand drawer; Escape or backdrop click closes. */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog" aria-modal="true" aria-label={title}
        className="w-full max-w-md h-full bg-canvas p-6 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="size-11 grid place-items-center rounded-full hover:bg-stone"><X className="size-5" /></button>
        </div>
        {children}
      </aside>
    </div>
  )
}

export const inputCls = 'w-full min-h-11 md:min-h-10 px-4 rounded-lg border border-line bg-white text-sm placeholder:text-muted'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      {children}
    </label>
  )
}

export function Chip({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'bad' | 'accent'; children: ReactNode }) {
  const t = { neutral: 'bg-stone', ok: 'bg-ok/10 text-ok', bad: 'bg-bad/10 text-bad', accent: 'bg-accent-soft' }[tone]
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t}`}>{children}</span>
}
