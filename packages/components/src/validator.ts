import path from 'path'
import { mapMimeTypeToExt, getUserHome } from './utils'

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

/**
 * Get allowed base directories for vector store operations
 * @returns {string[]} Array of allowed base directory paths
 */
const getAllowedVectorStoreBaseDirs = (): string[] => {
    const allowedDirs: string[] = []

    // Allow user home .flowise directory
    const userHome = getUserHome()
    allowedDirs.push(path.join(userHome, '.flowise'))

    // Allow configured blob storage path if set
    if (process.env.BLOB_STORAGE_PATH) {
        allowedDirs.push(path.resolve(process.env.BLOB_STORAGE_PATH))
    }

    return allowedDirs
}

/**
 * Validates and sanitizes a vector store base path to prevent path traversal attacks
 *
 * This function addresses path traversal vulnerabilities in vector stores (Faiss, SimpleStore)
 * by ensuring user-provided paths cannot escape allowed directories.
 *
 * @param {string | undefined} userProvidedPath The base path provided by user (can be empty/undefined)
 * @returns {string} A validated, absolute path within allowed directories
 * @throws {Error} If path validation fails or path is outside allowed directories
 */
export const validateVectorStorePath = (userProvidedPath: string | undefined): string => {
    // If no path provided, use default secure location
    if (!userProvidedPath || userProvidedPath.trim() === '') {
        return path.join(getUserHome(), '.flowise', 'vectorstore')
    }

    const basePath = userProvidedPath.trim()

    // Check for explicit path traversal patterns (..)
    if (basePath.includes('..')) {
        throw new Error('Invalid path: path traversal attempt detected')
    }

    // Check for URL-encoded path traversal
    if (basePath.toLowerCase().includes('%2e') || basePath.toLowerCase().includes('%2f') || basePath.toLowerCase().includes('%5c')) {
        throw new Error('Invalid path: encoded path traversal attempt detected')
    }

    // Check for null bytes and control characters
    if (/\0/.test(basePath) || /[\x00-\x1f]/.test(basePath)) {
        throw new Error('Invalid path: null bytes or control characters detected')
    }

    // Check for Windows-specific absolute paths and UNC paths (even on Unix systems)
    // This prevents cross-platform attack vectors
    if (/^[a-zA-Z]:\\/.test(basePath)) {
        throw new Error('Invalid path: Windows absolute paths are not allowed')
    }
    if (/^\\\\[^\\]/.test(basePath)) {
        throw new Error('Invalid path: UNC paths are not allowed')
    }
    if (/^\\\\\?\\/.test(basePath)) {
        throw new Error('Invalid path: Extended-length paths are not allowed')
    }

    // Resolve to absolute path
    // If path is relative, resolve it relative to the .flowise directory (safe default)
    // If path is already absolute, keep it as-is
    let resolvedPath: string
    if (path.isAbsolute(basePath)) {
        resolvedPath = path.resolve(basePath)
    } else {
        // Relative paths are resolved within the .flowise directory for safety
        resolvedPath = path.resolve(path.join(getUserHome(), '.flowise', basePath))
    }

    // Verify the resolved path doesn't contain '..' after resolution
    if (resolvedPath.includes('..')) {
        throw new Error('Invalid path: path traversal detected in resolved path')
    }

    // Check if resolved path is within allowed directories
    const allowedDirs = getAllowedVectorStoreBaseDirs()
    const isWithinAllowedDir = allowedDirs.some((allowedDir) => {
        // Normalize both paths for comparison
        const normalizedResolved = path.normalize(resolvedPath)
        const normalizedAllowed = path.normalize(allowedDir)

        // Check if resolved path starts with allowed directory
        // Add path separator to avoid partial matches (e.g., /home/user/.flowise vs /home/user/.flowise2)
        return normalizedResolved === normalizedAllowed || normalizedResolved.startsWith(normalizedAllowed + path.sep)
    })

    if (!isWithinAllowedDir) {
        throw new Error(
            `Invalid path: path must be within allowed directories (${allowedDirs.join(', ')}). ` + `Attempted path: ${resolvedPath}`
        )
    }

    return resolvedPath
}
