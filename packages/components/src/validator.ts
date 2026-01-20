import { mapMimeTypeToExt } from './utils'

/**
 * Validates if a string is a valid UUID v4
 * @param {string} uuid The string to validate
 * @returns {boolean} True if valid UUID, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
    // UUID v4 regex pattern
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Pattern.test(uuid)
}

/**
 * Validates if a string is a valid URL
 * @param {string} url The string to validate
 * @returns {boolean} True if valid URL, false otherwise
 */
export const isValidURL = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Validates if a string contains path traversal attempts
 * @param {string} path The string to validate
 * @returns {boolean} True if path traversal detected, false otherwise
 */
export const isPathTraversal = (path: string): boolean => {
    // Check for common path traversal patterns
    const dangerousPatterns = [
        '..', // Directory traversal
        '/', // Root directory
        '\\', // Windows root directory
        '%2e', // URL encoded .
        '%2f', // URL encoded /
        '%5c' // URL encoded \
    ]

    return dangerousPatterns.some((pattern) => path.toLowerCase().includes(pattern))
}

/**
 * Enhanced path validation for workspace-scoped file operations
 * @param {string} filePath The file path to validate
 * @returns {boolean} True if path traversal detected, false otherwise
 */
export const isUnsafeFilePath = (filePath: string): boolean => {
    if (!filePath || typeof filePath !== 'string') {
        return true
    }

    // Check for path traversal patterns
    const dangerousPatterns = [
        /\.\./, // Directory traversal (..)
        /%2e%2e/i, // URL encoded ..
        /%2f/i, // URL encoded /
        /%5c/i, // URL encoded \
        /\0/, // Null bytes
        // eslint-disable-next-line no-control-regex
        /[\x00-\x1f]/, // Control characters
        /^\/[^/]/, // Absolute Unix paths (starting with /)
        /^[a-zA-Z]:\\/, // Absolute Windows paths (C:\)
        /^\\\\[^\\]/, // UNC paths (\\server\)
        /^\\\\\?\\/ // Extended-length paths (\\?\)
    ]

    return dangerousPatterns.some((pattern) => pattern.test(filePath))
}

/**
 * Validates filename format and security
 * @param {string} filename The filename to validate
 * @returns {void} Throws an error if validation fails
 */
const validateFilename = (filename: string): void => {
    if (!filename || typeof filename !== 'string') {
        throw new Error('Invalid filename: filename is required and must be a string')
    }
    if (isUnsafeFilePath(filename)) {
        throw new Error(`Invalid filename: unsafe characters or path traversal attempt detected in filename "${filename}"`)
    }
}

/**
 * Extracts and normalizes file extension from filename
 * @param {string} filename The filename
 * @returns {string} The normalized extension (lowercase, without dot) or empty string
 */
const extractFileExtension = (filename: string): string => {
    const filenameParts = filename.split('.')
    if (filenameParts.length <= 1) {
        return ''
    }
    let ext = filenameParts.pop()!.toLowerCase()
    // Normalize common extension variations to match MIME type mappings
    const extensionNormalizationMap: { [key: string]: string } = {
        jpeg: 'jpg', // image/jpeg and image/jpg both map to 'jpg'
        tif: 'tiff', // image/tiff and image/tif both map to 'tiff'
        oga: 'ogg' // audio/ogg and audio/oga both map to 'ogg'
    }
    ext = extensionNormalizationMap[ext] ?? ext
    return ext
}

/**
 * Validates that file extension matches the declared MIME type
 *
 * This function addresses CVE-2025-61687 by preventing MIME type spoofing attacks.
 * It ensures that the file extension matches the declared MIME type, preventing
 * attackers from uploading malicious files (e.g., .js file with text/plain MIME type).
 *
 * @param {string} filename The original filename
 * @param {string} mimetype The declared MIME type
 * @returns {void} Throws an error if validation fails
 */
export const validateMimeTypeAndExtensionMatch = (filename: string, mimetype: string): void => {
    validateFilename(filename)

    if (!mimetype || typeof mimetype !== 'string') {
        throw new Error('Invalid MIME type: MIME type is required and must be a string')
    }

    const normalizedExt = extractFileExtension(filename)

    if (!normalizedExt) {
        // Files without extensions are rejected for security
        throw new Error('File type not allowed: files must have a valid file extension')
    }

    // Get the expected extension from mapMimeTypeToExt (returns extension without dot)
    const expectedExt = mapMimeTypeToExt(mimetype)

    if (!expectedExt) {
        // If mapMimeTypeToExt doesn't recognize the MIME type, it's not supported
        throw new Error(`MIME type "${mimetype}" is not supported or does not have a valid file extension mapping`)
    }

    // Ensure the file extension matches the expected extension for the MIME type
    if (normalizedExt !== expectedExt) {
        throw new Error(
            `MIME type mismatch: file extension "${normalizedExt}" does not match declared MIME type "${mimetype}". Expected: ${expectedExt}`
        )
    }
}
