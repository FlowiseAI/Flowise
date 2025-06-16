// packages/ui/src/api.ts
export const API_ROOT = import.meta.env.VITE_API_BASE_URL as string
if (!API_ROOT) console.error('Missing VITE_API_BASE_URL')

export function buildUrl(path: string) {
  // always end up with exactly one /api prefix
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_ROOT}/api${p}`
}
