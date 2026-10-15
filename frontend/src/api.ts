import { useEffect, useState } from 'react'
import { API_BASE } from './config'

/** fetch() with the session cookie always included — required since the
 * frontend and backend are separately-hosted origins in production. A 401
 * from anywhere but the auth check itself means the session expired or was
 * revoked; reload so App's auth check runs again and drops to the login page. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include' })
  if (res.status === 401 && path !== '/api/auth/me') {
    window.location.reload()
  }
  return res
}

/** GET helper: { data, error, loading, reload }. Non-2xx counts as an error. */
export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setLoading(true)
    setError(false)
    apiFetch(path)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => live && setData(d))
      .catch(() => live && setError(true))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [path, tick])
  return { data, error, loading, reload: () => setTick(t => t + 1) }
}
