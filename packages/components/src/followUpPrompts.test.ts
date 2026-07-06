import { FollowUpPromptConfig, FollowUpPromptProvider, ICommonObject } from './Interface'
import { generateFollowUpPrompts } from './followUpPrompts'
import { getCredentialData } from './utils'
import { ChatOpenAI } from '@langchain/openai'

jest.mock('./utils', () => ({
    getCredentialData: jest.fn()
}))

const invokeMock = jest.fn()
const withStructuredOutputMock = jest.fn(() => ({
    invoke: invokeMock
}))

jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation(() => ({
        withStructuredOutput: withStructuredOutputMock
    })),
    AzureChatOpenAI: jest.fn()
}))

const mockedGetCredentialData = getCredentialData as jest.MockedFunction<typeof getCredentialData>
const mockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>

const createFollowUpPromptConfig = (status = true): FollowUpPromptConfig => {
    const providerConfig = {
        credentialId: 'credential-id',
        modelName: 'gpt-4.1-mini',
        baseUrl: '',
        prompt: 'Suggest follow-up questions for {history}',
        temperature: '0.2'
    }

    return {
        status,
        selectedProvider: FollowUpPromptProvider.OPENAI,
        [FollowUpPromptProvider.ANTHROPIC]: providerConfig,
        [FollowUpPromptProvider.AZURE_OPENAI]: providerConfig,
        [FollowUpPromptProvider.GOOGLE_GENAI]: providerConfig,
        [FollowUpPromptProvider.MISTRALAI]: providerConfig,
        [FollowUpPromptProvider.OPENAI]: providerConfig,
        [FollowUpPromptProvider.GROQ]: providerConfig,
        [FollowUpPromptProvider.OLLAMA]: providerConfig
    }
}

describe('generateFollowUpPrompts', () => {
    beforeEach(() => {
        jest.useRealTimers()
        jest.clearAllMocks()
        mockedGetCredentialData.mockResolvedValue({ openAIApiKey: 'openai-key' })
    })

    it('returns follow-up questions when the provider succeeds', async () => {
        const questions = ['What is next?', 'Can you expand?', 'Any constraints?']
        invokeMock.mockResolvedValue({ questions })

        const result = await generateFollowUpPrompts(createFollowUpPromptConfig(), 'history', {} as ICommonObject)

        expect(result).toEqual({ questions })
        expect(mockedChatOpenAI).toHaveBeenCalledWith({
            apiKey: 'openai-key',
            model: 'gpt-4.1-mini',
            temperature: 0.2,
            useResponsesApi: true
        })
        expect(invokeMock).toHaveBeenCalledWith('Suggest follow-up questions for history')
    })

    it('retries once when the first provider call fails', async () => {
        const questions = ['Question one?', 'Question two?', 'Question three?']
        invokeMock.mockRejectedValueOnce(new Error('temporary provider failure')).mockResolvedValueOnce({ questions })

        const result = await generateFollowUpPrompts(createFollowUpPromptConfig(), 'history', {} as ICommonObject)

        expect(result).toEqual({ questions })
        expect(invokeMock).toHaveBeenCalledTimes(2)
    })

    it('returns undefined when provider calls time out', async () => {
        jest.useFakeTimers()
        invokeMock.mockImplementation(() => new Promise(() => undefined))

        const resultPromise = generateFollowUpPrompts(createFollowUpPromptConfig(), 'history', {} as ICommonObject)
        await Promise.resolve()

        await jest.advanceTimersByTimeAsync(20000)

        await expect(resultPromise).resolves.toBeUndefined()
        expect(invokeMock).toHaveBeenCalledTimes(2)
    })

    it('does not read credentials or call a provider when follow-up prompts are disabled', async () => {
        const result = await generateFollowUpPrompts(createFollowUpPromptConfig(false), 'history', {} as ICommonObject)

        expect(result).toBeUndefined()
        expect(mockedGetCredentialData).not.toHaveBeenCalled()
        expect(mockedChatOpenAI).not.toHaveBeenCalled()
    })
})
