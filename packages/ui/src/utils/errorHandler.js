const isErrorWithMessage = (error) => {
    return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
}

const toErrorWithMessage = (maybeError) => {
    if (isErrorWithMessage(maybeError)) return maybeError

    try {
        return new Error(JSON.stringify(maybeError))
    } catch {
        // fallback in case there's an error stringifying the maybeError
        // like with circular references for example.
        return new Error(String(maybeError))
    }
}

export const getErrorMessage = (error) => {
    return toErrorWithMessage(error).message
}

/**
 * Safely extract a human-readable message from an Axios error.
 *
 * Axios errors may lack `error.response` when the request never received a
 * response (network failure, timeout, CORS block, cancelled request, etc.).
 * Reading `error.response.data` without a null-guard throws a secondary
 * TypeError that masks the original failure.
 *
 * Priority order:
 *   1. error.response.data.message  (structured API error)
 *   2. error.response.data.error    (some APIs use this key)
 *   3. error.response.data          (plain string body)
 *   4. HTTP status code             (e.g. "Request failed with status 500")
 *   5. error.message                (Axios / JS built-in message)
 *   6. Generic fallback
 */
export const getAxiosErrorMessage = (error) => {
    if (error?.response?.data) {
        const data = error.response.data
        if (typeof data === 'object') {
            return data.message || data.error || getErrorMessage(error)
        }
        return String(data)
    }
    return error?.message || 'An unexpected error occurred'
}
