/**
 * Fix key to be used in vector store
 * @param key - Key to fix
 * @returns Fixed key
 */
function fixKey(key: string) {
    return key.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Sanitize metadata keys to be used in vector store
 * @param metadata - Metadata to sanitize
 * @returns Sanitized metadata
 */
export const fixKeysRecursively = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(fixKeysRecursively)
    }

    if (data !== null && typeof data === 'object') {
        return Object.entries(data).reduce((acc, [key, value]) => {
            const newKey = fixKey(key)
            acc[newKey] = fixKeysRecursively(value)
            return acc
        }, {} as Record<string, any>)
    }
    return data
}
