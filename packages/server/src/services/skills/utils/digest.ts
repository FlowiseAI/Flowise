import { createHash } from 'crypto'

/** Hex sha256 of a string or buffer. */
export const sha256 = (input: string | Buffer): string => {
    const hash = createHash('sha256')
    hash.update(input)
    return hash.digest('hex')
}

/** Deterministic canonical JSON used for digests (sorted object keys). */
export const canonicalJson = (value: unknown): string => {
    return JSON.stringify(sortKeysDeep(value))
}

const sortKeysDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeysDeep)
    if (value && typeof value === 'object') {
        const entries = Object.keys(value as Record<string, unknown>)
            .sort()
            .map((k) => [k, sortKeysDeep((value as Record<string, unknown>)[k])])
        return Object.fromEntries(entries as [string, unknown][])
    }
    return value
}
