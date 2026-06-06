import { getErrorMessage, getAxiosErrorMessage } from './errorHandler'

describe('getErrorMessage', () => {
    it('returns the message from an Error object', () => {
        expect(getErrorMessage(new Error('boom'))).toBe('boom')
    })

    it('serialises a plain object when it has no message property', () => {
        const result = getErrorMessage({ code: 42 })
        expect(result).toContain('42')
    })
})

describe('getAxiosErrorMessage', () => {
    it('returns a safe fallback when error.response is undefined (network failure / timeout / CORS)', () => {
        const axiosNetworkError = new Error('Network Error')
        // Axios sets no .response on network-level failures
        expect(axiosNetworkError.response).toBeUndefined()
        expect(getAxiosErrorMessage(axiosNetworkError)).toBe('Network Error')
    })

    it('returns a safe fallback when the error itself is undefined', () => {
        expect(getAxiosErrorMessage(undefined)).toBe('An unexpected error occurred')
    })

    it('returns a safe fallback when the error is null', () => {
        expect(getAxiosErrorMessage(null)).toBe('An unexpected error occurred')
    })

    it('extracts response.data.message when the server returns a structured error', () => {
        const error = { response: { data: { message: 'Validation failed', code: 400 } } }
        expect(getAxiosErrorMessage(error)).toBe('Validation failed')
    })

    it('extracts response.data.error when only that key is present', () => {
        const error = { response: { data: { error: 'Unauthorized' } } }
        expect(getAxiosErrorMessage(error)).toBe('Unauthorized')
    })

    it('returns a plain string response body as-is', () => {
        const error = { response: { data: 'Internal Server Error' } }
        expect(getAxiosErrorMessage(error)).toBe('Internal Server Error')
    })

    it('falls back to error.message when response.data is falsy', () => {
        const error = { response: { data: null }, message: 'Request failed with status 503' }
        expect(getAxiosErrorMessage(error)).toBe('Request failed with status 503')
    })

    it('returns the generic fallback when there is no message at all', () => {
        const error = {}
        expect(getAxiosErrorMessage(error)).toBe('An unexpected error occurred')
    })
})
