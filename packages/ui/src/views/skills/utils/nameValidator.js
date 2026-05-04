// Mirror of backend validation

const NAME_RE = /^[A-Za-z0-9._-]+$/
const MAX_NAME_LEN = 120

export const validateNodeName = (name) => {
    if (!name || typeof name !== 'string') return 'Name is required'
    const trimmed = name.trim()
    if (!trimmed) return 'Name is required'
    if (trimmed.length > MAX_NAME_LEN) return `Name must be at most ${MAX_NAME_LEN} characters`
    if (trimmed === '.' || trimmed === '..') return 'Name cannot be "." or ".."'
    if (!NAME_RE.test(trimmed)) return 'Use only letters, numbers, dot, dash, underscore'
    return ''
}

export const validateSkillSlug = (slug) => {
    if (!slug) return '' // slug is optional on create; backend will derive one
    if (slug.length > 64) return 'Slug must be at most 64 characters'
    if (!/^[a-z0-9-]+$/.test(slug)) return 'Slug must be lowercase letters, numbers, or dashes'
    return ''
}
