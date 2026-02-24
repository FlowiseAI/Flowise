import { validateMimeTypeAndExtensionMatch } from 'flowise-components'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../errors/utils'

/**
 * Validates that file extension matches the declared MIME type with standardized error handling
 *
 * This function wraps validateMimeTypeAndExtensionMatch to provide consistent
 * error handling across the codebase. It prevents MIME type spoofing attacks
 * (CVE-2025-61687) by ensuring file extensions match declared MIME types.
 *
 * @param {string} filename The original filename
 * @param {string} mimetype The declared MIME type
 * @throws {InternalFlowiseError} If validation fails, throws BAD_REQUEST error
 * @example
 * ```typescript
 * validateFileMimeTypeAndExtensionMatch(file.originalname, file.mimetype)
 * ```
 */
export function validateFileMimeTypeAndExtensionMatch(filename: string, mimetype: string): void {
    try {
        validateMimeTypeAndExtensionMatch(filename, mimetype)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, getErrorMessage(error))
    }
}
