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
 * Validates if a URL is secure for external requests (prevents SSRF attacks)
 * @param {string} url The URL to validate
 * @returns {boolean} True if URL is secure, false otherwise
 */
export const isSecureURL = (url: string): boolean => {
    try {
        const urlObj = new URL(url)

        // Only allow HTTP and HTTPS protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false
        }

        // Block private/internal IP ranges and localhost
        const hostname = urlObj.hostname.toLowerCase()

        // Block localhost variants
        if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
            return false
        }

        // Block private IP ranges (IPv4)
        const ipv4Patterns = [
            /^10\./, // 10.0.0.0/8
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
            /^192\.168\./, // 192.168.0.0/16
            /^169\.254\./, // 169.254.0.0/16 (link-local)
            /^224\./, // Multicast
            /^240\./ // Reserved
        ]

        if (ipv4Patterns.some((pattern) => pattern.test(hostname))) {
            return false
        }

        // Block IPv6 private ranges
        if (hostname.includes(':')) {
            // Block IPv6 localhost, private, and link-local addresses
            const ipv6Patterns = [
                /^::1$/, // localhost
                /^fe80:/, // link-local
                /^fc00:/, // unique local
                /^fd00:/ // unique local
            ]

            if (ipv6Patterns.some((pattern) => pattern.test(hostname))) {
                return false
            }
        }

        return true
    } catch (error) {
        // Invalid URL format
        return false
    }
}

/**
 * Validates if an array contains only valid enum values
 * @param {unknown} input The input to validate
 * @param {readonly unknown[]} validValues Array of valid enum values
 * @returns {unknown[] | undefined} Validated array or undefined if invalid
 */
export const validateEnumArray = <T>(input: unknown, validValues: readonly T[]): T[] | undefined => {
    if (!input) {
        return undefined
    }

    let parsedInput: unknown[]

    // Handle string input that might be JSON
    if (typeof input === 'string') {
        try {
            parsedInput = JSON.parse(input)
        } catch {
            // If JSON parsing fails, treat as single string value
            parsedInput = [input]
        }
    } else if (Array.isArray(input)) {
        parsedInput = input
    } else {
        // Single value, wrap in array
        parsedInput = [input]
    }

    // Validate that parsedInput is an array
    if (!Array.isArray(parsedInput)) {
        return undefined
    }

    // Validate each element against valid values
    const validatedArray: T[] = []
    for (const item of parsedInput) {
        if (validValues.includes(item as T)) {
            validatedArray.push(item as T)
        } else {
            // If any item is invalid, return undefined for the whole array
            return undefined
        }
    }

    return validatedArray.length > 0 ? validatedArray : undefined
}

/**
 * Sanitizes and normalizes a URL, throws error if invalid or unsafe
 * @param {string} url The URL to sanitize
 * @returns {string} The sanitized URL
 * @throws {Error} If URL is invalid or unsafe
 */
export const sanitizeURL = (url: string): string => {
    if (typeof url !== 'string' || !url.trim()) {
        throw new Error('URL must be a non-empty string')
    }

    const trimmedURL = url.trim()

    if (!isSecureURL(trimmedURL)) {
        throw new Error('URL is not secure or contains potentially dangerous elements')
    }

    try {
        // Normalize the URL by parsing and reconstructing it
        const parsedURL = new URL(trimmedURL)
        return parsedURL.toString()
    } catch (error) {
        throw new Error(`Invalid URL format: ${error.message}`)
    }
}

/**
 * Safely converts any input to array format
 * @param {any} input The input to convert to array
 * @returns {any[]} Array representation of the input
 */
export const coerceToArray = (input: any): any[] => {
    if (input === null || input === undefined) {
        return []
    }

    if (Array.isArray(input)) {
        return input
    }

    // Handle string that might be JSON array
    if (typeof input === 'string') {
        const trimmed = input.trim()

        // Try to parse as JSON array
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed)
                if (Array.isArray(parsed)) {
                    return parsed
                }
            } catch (error) {
                // Fall through to single item array
            }
        }

        // Handle comma-separated values
        if (trimmed.includes(',')) {
            return trimmed
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
        }

        // Single string value
        return trimmed.length > 0 ? [trimmed] : []
    }

    // For all other types, wrap in array
    return [input]
}
