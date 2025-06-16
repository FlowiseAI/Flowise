// packages/ui/src/api.ts
export const API_ROOT = import.meta.env.VITE_API_BASE_URL as string
if (!API_ROOT) {
  console.error('❌ Missing VITE_API_BASE_URL! Check your .env or Vercel settings.')
}

/**
 * Given a path like 'v1/auth/resolve' or '/v1/auth/resolve',
 * returns 'https://your-host.com/api/v1/auth/resolve'
 */
export function buildUrl(path: string) {
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${API_ROOT}/api/${clean}`
}
