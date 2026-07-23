import { useEffect } from 'react'

interface Props {
  message: string
  kind?: 'success' | 'error'
  onDone: () => void
}

export default function Toast({ message, kind = 'success', onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full shadow-lg text-sm font-semibold animate-[fadeIn_0.15s_ease-out] ${
        kind === 'success' ? 'bg-ink-900 text-cream-50' : 'bg-red-600 text-white'
      }`}
    >
      {message}
    </div>
  )
}
