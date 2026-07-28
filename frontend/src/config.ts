// Unset in production on purpose: requests go to a relative /api/... path,
// which Render's rewrite rule proxies to the backend server-side. That
// keeps the browser's view of everything same-origin, so the session
// cookie is a first-party cookie instead of a cross-site one that Safari
// (and increasingly Chrome) blocks outright regardless of SameSite=None.
export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '' : 'http://localhost:8000')
