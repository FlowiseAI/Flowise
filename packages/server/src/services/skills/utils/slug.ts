/**
 * Convert an arbitrary label into a safe tool-name slug for LangChain tools.
 * Lowercase, ascii-safe, `_` separated, max length 64.
 */
export const slugify = (input: string, maxLen = 64): string => {
    const base = input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    return (base || 'skill').slice(0, maxLen)
}

/** Basename without extension (used when picking a tool name). */
export const stripExtension = (filename: string): string => {
    const idx = filename.lastIndexOf('.')
    return idx === -1 ? filename : filename.slice(0, idx)
}
