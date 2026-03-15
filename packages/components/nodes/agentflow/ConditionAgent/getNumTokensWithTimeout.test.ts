/**
 * Tests for the getNumTokensWithTimeout pattern used in ConditionAgent,
 * LLM, and Agent nodes to prevent tiktoken DNS hangs.
 */

// Replicate the timeout logic from ConditionAgent.getNumTokensWithTimeout
async function getNumTokensWithTimeout(
    getNumTokens: (text: string) => Promise<number>,
    text: string,
    timeoutMs: number = 3000
): Promise<number> {
    try {
        const tokenCountPromise = getNumTokens(text)
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Token counting timed out')), timeoutMs)
        )
        return await Promise.race([tokenCountPromise, timeoutPromise])
    } catch {
        return Math.ceil(text.length / 4)
    }
}

describe('getNumTokensWithTimeout', () => {
    it('returns token count when getNumTokens resolves quickly', async () => {
        const getNumTokens = jest.fn().mockResolvedValue(42)
        const result = await getNumTokensWithTimeout(getNumTokens, 'hello world', 1000)
        expect(result).toBe(42)
        expect(getNumTokens).toHaveBeenCalledWith('hello world')
    })

    it('falls back to approximate count on timeout', async () => {
        // Use a promise that never resolves to simulate a hung network request
        const getNumTokens = jest.fn().mockReturnValue(new Promise(() => {}))
        const text = 'a'.repeat(400) // 400 chars -> ~100 tokens
        const result = await getNumTokensWithTimeout(getNumTokens, text, 50) // 50ms timeout
        expect(result).toBe(100) // Math.ceil(400 / 4)
    })

    it('falls back to approximate count on error', async () => {
        const getNumTokens = jest.fn().mockRejectedValue(new Error('fetch failed'))
        const text = 'hello world test' // 16 chars -> 4 tokens
        const result = await getNumTokensWithTimeout(getNumTokens, text, 1000)
        expect(result).toBe(4) // Math.ceil(16 / 4)
    })

    it('falls back to approximate count on DNS failure', async () => {
        const getNumTokens = jest.fn().mockRejectedValue(
            Object.assign(new Error('getaddrinfo EAI_AGAIN tiktoken.pages.dev'), {
                code: 'EAI_AGAIN',
                syscall: 'getaddrinfo',
                hostname: 'tiktoken.pages.dev'
            })
        )
        const text = 'This is a longer text for testing'
        const result = await getNumTokensWithTimeout(getNumTokens, text, 1000)
        expect(result).toBe(Math.ceil(text.length / 4))
    })

    it('returns correct approximate for empty string', async () => {
        const getNumTokens = jest.fn().mockRejectedValue(new Error('failed'))
        const result = await getNumTokensWithTimeout(getNumTokens, '', 1000)
        expect(result).toBe(0) // Math.ceil(0 / 4) = 0
    })

    it('completes within timeout duration on slow network', async () => {
        // Use a promise that never resolves to simulate a hung network request
        const getNumTokens = jest.fn().mockReturnValue(new Promise(() => {}))
        const startTime = Date.now()
        await getNumTokensWithTimeout(getNumTokens, 'test', 100)
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(500) // Should complete well before 500ms
    })
})
