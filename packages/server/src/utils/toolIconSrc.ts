import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'

/**
 * Normalize optional tool iconSrc from the API: empty clears (null); non-empty must be http(s).
 * Returns undefined when the client omitted the field (partial updates).
 */
export function normalizeOptionalToolIconSrc(iconSrc: unknown): string | null | undefined {
    if (iconSrc === undefined) return undefined
    if (iconSrc === null) return null
    if (typeof iconSrc !== 'string') {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Error: tool icon source must be a string, http(s) URL, or empty.`)
    }
    const trimmed = iconSrc.trim()
    if (!trimmed) return null
    try {
        const u = new URL(trimmed)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Error: tool icon source must be an http or https URL.`)
        }
        return u.href
    } catch (e) {
        if (e instanceof InternalFlowiseError) throw e
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Error: tool icon source must be a valid http or https URL.`)
    }
}
