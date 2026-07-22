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
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-[fadeIn_0.15s_ease-out] ${
        kind === 'success' ? 'bg-gray-900' : 'bg-red-600'
      }`}
    >
      {message}
    </div>
  )
}
