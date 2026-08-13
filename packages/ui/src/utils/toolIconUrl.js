/**
 * Custom Tool icon source: optional field; when set, must be an absolute http(s) URL.
 * @param {string|undefined|null} value
 * @returns {boolean}
 */
export function isOptionalHttpOrHttpsToolIconUrl(value) {
    if (value == null) return true
    const v = String(value).trim()
    if (!v) return true
    try {
        const u = new URL(v)
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}

/**
 * @param {string|undefined|null} value
 * @returns {string|null}
 */
export function getValidHttpOrHttpsToolIconUrl(value) {
    if (value == null) return null
    const v = String(value).trim()
    if (!v) return null
    try {
        const u = new URL(v)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
        return u.href
    } catch {
        return null
    }
}

/**
 * Resolves a value suitable for CSS `background-image: url(...)`, or null to use color/default fallback.
 * Accepts http(s) URLs, root-relative paths, and data URLs; rejects plain invalid strings like "abc".
 * @param {string|undefined|null} iconSrc
 * @returns {string|null}
 */
export function getItemCardIconBackgroundUrl(iconSrc) {
    if (iconSrc == null) return null
    const t = String(iconSrc).trim()
    if (!t) return null
    const http = getValidHttpOrHttpsToolIconUrl(t)
    if (http) return http
    if (t.startsWith('/') || t.startsWith('./')) return t
    if (t.toLowerCase().startsWith('data:')) return t
    return null
}
