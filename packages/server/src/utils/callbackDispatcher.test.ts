import { createHmac } from 'crypto'

const mockAxiosPost = jest.fn()
const mockLoggerError = jest.fn()

jest.mock('axios', () => ({ post: mockAxiosPost }))
jest.mock('./logger', () => ({ error: mockLoggerError }))

import { dispatchCallback } from './callbackDispatcher'

const URL = 'https://example.com/callback'
const PAYLOAD = { status: 'SUCCESS', chatId: 'abc-123', data: { text: 'hello' } }

function expectedSignature(body: string, secret: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

describe('dispatchCallback', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('POSTs JSON payload to the callback URL', async () => {
        mockAxiosPost.mockResolvedValue({ status: 200 })

        await dispatchCallback(URL, PAYLOAD)

        expect(mockAxiosPost).toHaveBeenCalledTimes(1)
        expect(mockAxiosPost).toHaveBeenCalledWith(URL, JSON.stringify(PAYLOAD), {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        })
    })

    it('includes X-Flowise-Signature header when secret is provided', async () => {
        mockAxiosPost.mockResolvedValue({ status: 200 })
        const secret = 'my-secret'
        const body = JSON.stringify(PAYLOAD)

        await dispatchCallback(URL, PAYLOAD, secret)

        expect(mockAxiosPost).toHaveBeenCalledWith(
            URL,
            body,
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Flowise-Signature': expectedSignature(body, secret)
                })
            })
        )
    })

    it('does not include X-Flowise-Signature when no secret is provided', async () => {
        mockAxiosPost.mockResolvedValue({ status: 200 })

        await dispatchCallback(URL, PAYLOAD)

        const call = mockAxiosPost.mock.calls[0]
        expect(call[2].headers).not.toHaveProperty('X-Flowise-Signature')
    })

    it('retries on failure and succeeds on second attempt', async () => {
        mockAxiosPost.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ status: 200 })

        const promise = dispatchCallback(URL, PAYLOAD)
        await jest.advanceTimersByTimeAsync(3000)
        await promise

        expect(mockAxiosPost).toHaveBeenCalledTimes(2)
        expect(mockLoggerError).not.toHaveBeenCalled()
    })

    it('logs an error after all 3 attempts fail and does not throw', async () => {
        mockAxiosPost.mockRejectedValue(new Error('unreachable'))

        const promise = dispatchCallback(URL, PAYLOAD)
        await jest.advanceTimersByTimeAsync(3000)
        await jest.advanceTimersByTimeAsync(6000)
        await promise

        expect(mockAxiosPost).toHaveBeenCalledTimes(3)
        expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Failed to deliver callback'))
    })
})
