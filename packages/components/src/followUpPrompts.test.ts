import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockInvoke = jest.fn<() => Promise<{ questions: string[] }>>()
const mockWithStructuredOutput = jest.fn(() => ({ invoke: mockInvoke }))

jest.mock('@langchain/anthropic', () => ({
    ChatAnthropic: jest.fn()
}))

jest.mock('@langchain/google-genai', () => ({
    ChatGoogleGenerativeAI: jest.fn()
}))

jest.mock('@langchain/mistralai', () => ({
    ChatMistralAI: jest.fn()
}))

jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn(() => ({ withStructuredOutput: mockWithStructuredOutput })),
    AzureChatOpenAI: jest.fn()
}))

jest.mock('@langchain/groq', () => ({
    ChatGroq: jest.fn()
}))

jest.mock('ollama', () => ({
    Ollama: jest.fn()
}))

jest.mock('./utils', () => ({
    getCredentialData: jest.fn()
}))

import { getCredentialData } from './utils'
import { FollowUpPromptProvider } from './Interface'
import { generateFollowUpPrompts } from './followUpPrompts'

describe('generateFollowUpPrompts retry classification', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(getCredentialData).mockResolvedValue({ openAIApiKey: 'openai-key' })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('retries an Axios-style 504 error', async () => {
        jest.useFakeTimers()
        const gatewayTimeoutError = Object.assign(new Error('Request failed with status code 504'), {
            status: 504,
            statusCode: 504,
            response: { status: 504 }
        })
        mockInvoke.mockRejectedValueOnce(gatewayTimeoutError).mockResolvedValueOnce({ questions: ['What happened next?'] })

        const result = generateFollowUpPrompts(
            {
                status: true,
                selectedProvider: FollowUpPromptProvider.OPENAI,
                [FollowUpPromptProvider.OPENAI]: {
                    credentialId: 'cred-1',
                    modelName: 'gpt-4o-mini',
                    prompt: 'Generate follow-ups for {history}',
                    temperature: '0'
                }
            } as any,
            'hello',
            {}
        )

        await jest.advanceTimersByTimeAsync(500)

        await expect(result).resolves.toEqual({ questions: ['What happened next?'] })

        expect(mockInvoke).toHaveBeenCalledTimes(2)
    })
})
