// One place for every backend call. Change VITE_API_URL in .env, never in code.
const BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    })
    if (!res.ok) throw new Error(`Server replied ${res.status}`)
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Backend did not respond in time')
    throw new Error(
      err.message.startsWith('Server') ? err.message : `Cannot reach backend at ${BASE}`
    )
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  baseUrl: BASE,
  health: () => request('/api/health'),
  getSettings: () => request('/api/settings'),
  updateSettings: (s) => request('/api/settings', { method: 'PUT', body: JSON.stringify(s) }),
  createSession: (s) => request('/api/sessions', { method: 'POST', body: JSON.stringify(s) }),
  listSessions: () => request('/api/sessions'),
  getAnalytics: () => request('/api/analytics'),
}
