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
 * Validates if a resolved path accesses sensitive system directories
 * Uses pattern-based detection to identify known sensitive system directories
 * at root level or one level deep, while allowing legitimate paths like /usr/src
 * @param {string} resolvedPath The resolved absolute path to validate
 * @returns {boolean} True if path accesses sensitive system directory, false otherwise
 */
export const isSensitiveSystemPath = (resolvedPath: string): boolean => {
    if (!resolvedPath || typeof resolvedPath !== 'string') {
        return false
    }

    // Pattern-based detection for known sensitive system directories:
    // Blocks obvious system directories while allowing legitimate paths like /usr/src, /usr/local/src, /opt, etc.
    // 1. At root level (e.g., /etc, /sys, /bin, /sbin) - one segment after root
    // 2. One level deep (e.g., /etc/passwd, /sys/kernel, /var/log) - two segments total
    // 3. Specific sensitive subdirectories (e.g., /var/log, /var/run) - two segments with specific parent
    // 4. System binary directories (e.g., /usr/bin, /usr/sbin, /usr/local/bin) - prevents overwriting system executables
    const sensitiveSystemPatterns = [
        /^[/\\](etc|sys|proc|dev|boot|root|bin|sbin)([/\\]|$)/i, // Root level: /etc, /sys, /proc, /bin, /sbin, etc.
        /^[/\\](etc|sys|proc|dev|boot|root|bin|sbin)[/\\][^/\\]*$/i, // One level deep: /etc/passwd, /sys/kernel, /bin/sh, etc.
        /^[/\\]var[/\\](log|run|lib|spool|mail)([/\\]|$)/i, // Sensitive /var subdirectories: /var/log, /var/run, etc.
        /^[/\\]usr[/\\](bin|sbin)([/\\]|$)/i, // System binary directories: /usr/bin, /usr/sbin
        /^[/\\]usr[/\\]local[/\\](bin|sbin)([/\\]|$)/i // Local system binaries: /usr/local/bin, /usr/local/sbin
    ]

    return sensitiveSystemPatterns.some((pattern) => pattern.test(resolvedPath))
}

/**
 * Validates if a file path is within the allowed workspace boundaries
 * @param {string} filePath The file path to validate
 * @param {string} workspacePath The workspace base path
 * @returns {boolean} True if path is within workspace, false otherwise
 */
export const isWithinWorkspace = (filePath: string, workspacePath: string): boolean => {
    if (!filePath || !workspacePath) {
        return false
    }

    try {
        const path = require('path')

        // Resolve both paths to absolute paths
        const resolvedFilePath = path.resolve(workspacePath, filePath)
        const resolvedWorkspacePath = path.resolve(workspacePath)

        // Normalize paths to handle different separators
        const normalizedFilePath = path.normalize(resolvedFilePath)
        const normalizedWorkspacePath = path.normalize(resolvedWorkspacePath)

        // Check if the file path starts with the workspace path
        const relativePath = path.relative(normalizedWorkspacePath, normalizedFilePath)

        // If relative path starts with '..' or is absolute, it's outside workspace
        return !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
    } catch (error) {
        // If any error occurs during path resolution, deny access
        return false
    }
}

/**
 * Validates if a browser executable path is safe to use
 * Prevents arbitrary code execution through environment variable manipulation
 * @param {string} executablePath The browser executable path to validate
 * @returns {boolean} True if path is safe, false otherwise
 */
export const isSafeBrowserExecutable = (executablePath: string | undefined): boolean => {
    if (!executablePath) {
        return true // If not specified, let browser library use its default
    }

    if (typeof executablePath !== 'string' || executablePath.trim() === '') {
        return false
    }

    const path = require('path')
    const fs = require('fs')

    try {
        // Normalize the path
        const normalizedPath = path.normalize(executablePath)

        // Must be an absolute path
        if (!path.isAbsolute(normalizedPath)) {
            return false
        }

        // Allowed browser executable locations (system-managed only)
        const allowedPaths = [
            // Linux/Unix Chromium/Chrome paths
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chrome',
            '/snap/bin/chromium',
            // macOS Chrome/Chromium paths
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            // Windows Chrome/Chromium paths (normalized with forward slashes)
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/Chromium/Application/chrome.exe',
            // Firefox paths
            '/usr/bin/firefox',
            '/Applications/Firefox.app/Contents/MacOS/firefox',
            'C:/Program Files/Mozilla Firefox/firefox.exe',
            'C:/Program Files (x86)/Mozilla Firefox/firefox.exe'
        ]

        // Normalize allowed paths for comparison (handle Windows backslashes)
        const normalizedAllowedPaths = allowedPaths.map((p) => path.normalize(p))

        // Check if the path exactly matches one of the allowed paths
        const isAllowedPath = normalizedAllowedPaths.some((allowedPath) => normalizedPath.toLowerCase() === allowedPath.toLowerCase())

        if (!isAllowedPath) {
            return false
        }

        // Additional security: Verify file exists and is executable (where applicable)
        // This prevents using a path before malicious file is written
        try {
            if (fs.existsSync(normalizedPath)) {
                const stats = fs.statSync(normalizedPath)
                // On Unix-like systems, check if file is executable
                if (process.platform !== 'win32') {
                    // Check if file has execute permissions (using bitwise AND)
                    // 0o111 checks for execute permission for user, group, or others
                    return (stats.mode & 0o111) !== 0
                }
                return stats.isFile()
            }
            // If file doesn't exist, reject it (prevents race conditions)
            return false
        } catch {
            return false
        }
    } catch (error) {
        // If any error occurs during validation, deny access
        return false
    }
}
