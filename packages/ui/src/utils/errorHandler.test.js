import { getErrorMessage } from './errorHandler'

describe('getErrorMessage', () => {
    it('uses an axios response data message when available', () => {
        const error = {
            message: 'Request failed with status code 400',
            response: {
                data: {
                    message: 'Tool name already exists'
                }
            }
        }

        expect(getErrorMessage(error)).toBe('Tool name already exists')
    })

    it('uses an axios response data error when message is unavailable', () => {
        const error = {
            message: 'Request failed with status code 400',
            response: {
                data: {
                    error: 'Invalid tool schema'
                }
            }
        }

        expect(getErrorMessage(error)).toBe('Invalid tool schema')
    })

    it('uses a string axios response body', () => {
        const error = {
            message: 'Request failed with status code 500',
            response: {
                data: 'Internal server error'
            }
        }

        expect(getErrorMessage(error)).toBe('Internal server error')
    })

    it('falls back to response status when response data is unavailable', () => {
        const error = {
            message: 'Request failed with status code 404',
            response: {
                status: 404,
                statusText: 'Not Found'
            }
        }

        expect(getErrorMessage(error)).toBe('404 Not Found')
    })

    it('falls back to a regular error message when axios response is unavailable', () => {
        expect(getErrorMessage(new Error('Network Error'))).toBe('Network Error')
    })
})
