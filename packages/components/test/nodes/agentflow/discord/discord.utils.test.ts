import getErrorMessage from '../../../../nodes/agentflow/Discord/utils'

describe('getErrorMessage', () => {
    it('formats network errors', () => {
        const err = { message: 'timeout', response: undefined }
        expect(getErrorMessage(err)).toMatch(/Network error/)
    })

    it('handles 403 Forbidden', () => {
        const err = { response: { status: 403, data: 'nope' } }
        expect(getErrorMessage(err)).toBe('Bot lacks permission to send messages in this channel')
    })

    it('rate limit contains retry-after', () => {
        const err = { response: { status: 429, data: 'slow down', headers: { 'retry-after': '5' } } }
        expect(getErrorMessage(err)).toMatch(/Retry after 5 seconds/)
    })

    it('falls back to generic', () => {
        const err = { response: { status: 500, data: { foo: 'bar' } } }
        expect(getErrorMessage(err)).toMatch(/Discord API Error/)
    })
})
