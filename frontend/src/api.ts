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
