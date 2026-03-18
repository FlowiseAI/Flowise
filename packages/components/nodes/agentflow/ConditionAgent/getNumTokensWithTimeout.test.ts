/**
 * Tests for the getNumTokensWithTimeout utility used in ConditionAgent,
 * LLM, and Agent nodes to prevent tiktoken DNS hangs.
 */
import { getNumTokensWithTimeout } from '../utils'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

describe('getNumTokensWithTimeout', () => {
    it('returns token count when getNumTokens resolves quickly', async () => {
        const llmNodeInstance = {
            getNumTokens: jest.fn().mockResolvedValue(42)
        } as unknown as BaseChatModel
        const result = await getNumTokensWithTimeout(llmNodeInstance, 'hello world', 1000)
        expect(result).toBe(42)
        expect(llmNodeInstance.getNumTokens).toHaveBeenCalledWith('hello world')
    })

    it('falls back to approximate count on timeout', async () => {
        jest.useFakeTimers()
        const llmNodeInstance = {
            getNumTokens: jest.fn().mockReturnValue(new Promise(() => {}))
        } as unknown as BaseChatModel
        const text = 'a'.repeat(400) // 400 chars -> ~100 tokens
        const promise = getNumTokensWithTimeout(llmNodeInstance, text, 50)
        jest.advanceTimersByTime(50)
        const result = await promise
        expect(result).toBe(100) // Math.ceil(400 / 4)
        jest.useRealTimers()
    })

    it('falls back to approximate count on error', async () => {
        const llmNodeInstance = {
            getNumTokens: jest.fn().mockRejectedValue(new Error('fetch failed'))
        } as unknown as BaseChatModel
        const text = 'hello world test' // 16 chars -> 4 tokens
        const result = await getNumTokensWithTimeout(llmNodeInstance, text, 1000)
        expect(result).toBe(4) // Math.ceil(16 / 4)
    })

    it('falls back to approximate count on DNS failure', async () => {
        const llmNodeInstance = {
            getNumTokens: jest.fn().mockRejectedValue(
                Object.assign(new Error('getaddrinfo EAI_AGAIN tiktoken.pages.dev'), {
                    code: 'EAI_AGAIN',
                    syscall: 'getaddrinfo',
                    hostname: 'tiktoken.pages.dev'
                })
            )
        } as unknown as BaseChatModel
        const text = 'This is a longer text for testing'
        const result = await getNumTokensWithTimeout(llmNodeInstance, text, 1000)
        expect(result).toBe(Math.ceil(text.length / 4))
    })

    it('returns correct approximate for empty string', async () => {
        const llmNodeInstance = {
            getNumTokens: jest.fn().mockRejectedValue(new Error('failed'))
        } as unknown as BaseChatModel
        const result = await getNumTokensWithTimeout(llmNodeInstance, '', 1000)
        expect(result).toBe(0) // Math.ceil(0 / 4) = 0
    })

    it('completes within timeout duration on slow network', async () => {
        jest.useFakeTimers()
        const llmNodeInstance = {
            getNumTokens: jest.fn().mockReturnValue(new Promise(() => {}))
        } as unknown as BaseChatModel
        const promise = getNumTokensWithTimeout(llmNodeInstance, 'test', 100)
        jest.advanceTimersByTime(100)
        await expect(promise).resolves.toBe(1) // Math.ceil('test'.length / 4) = 1
        jest.useRealTimers()
    })
})
