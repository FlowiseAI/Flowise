// packages/ui/src/api.ts
export const API_ROOT = import.meta.env.VITE_API_BASE_URL as string
if (!API_ROOT) {
    console.error('❌ Missing VITE_API_BASE_URL! Check your .env or Vercel settings.')
}

export function buildUrl(path: string) {
    const segment = typeof path === 'string' ? (path.startsWith('/') ? path.slice(1) : path) : ''
    return `${API_ROOT}/api/${segment}`
}
