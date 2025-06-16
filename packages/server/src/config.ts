export const ALLOWED_ORIGINS = (
    process.env.CORS_ORIGINS ||
    'https://flowise-3pwu813kc-marcus-thomas-projects-90ba4767.vercel.app,http://localhost:3000'
)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

export const isDev = process.env.NODE_ENV !== 'production'
