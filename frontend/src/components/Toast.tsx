import { useEffect } from 'react'
import Mascot from './Mascot'

interface Props {
  message: string
  kind?: 'success' | 'error'
  celebrate?: boolean
  onDone: () => void
}

export default function Toast({ message, kind = 'success', celebrate, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, celebrate ? 4500 : 2500)
    return () => clearTimeout(t)
  }, [onDone, celebrate])

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold animate-[fadeIn_0.15s_ease-out] ${
        kind === 'success' ? 'bg-ink-900 text-white' : 'bg-bad text-white'
      }`}
    >
      {celebrate && <Mascot size={56} mood="celebrate" />}
      {message}
    </div>
  )
}
