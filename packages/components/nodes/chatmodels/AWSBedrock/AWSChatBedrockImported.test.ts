import { BedrockImportedChat, detectFormat, getImportedModelInfo, _resetModelInfoCache } from './FlowiseAWSChatBedrockImported'
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages'

// ---------------------------------------------------------------------------
// Mock AWS SDK clients
// ---------------------------------------------------------------------------
const mockSendRuntime = jest.fn()
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
        send: mockSendRuntime
    })),
    InvokeModelCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'InvokeModelCommand' })),
    InvokeModelWithResponseStreamCommand: jest
        .fn()
        .mockImplementation((input) => ({ ...input, _type: 'InvokeModelWithResponseStreamCommand' }))
}))

const mockSendBedrock = jest.fn()
jest.mock('@aws-sdk/client-bedrock', () => ({
    BedrockClient: jest.fn().mockImplementation(() => ({
        send: mockSendBedrock
    })),
    GetImportedModelCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'GetImportedModelCommand' }))
}))

function makeInvokeResponse(body: object) {
    return { body: new TextEncoder().encode(JSON.stringify(body)) }
}

function makeStreamResponse(chunks: object[]) {
    return {
        body: (async function* () {
            for (const chunk of chunks) {
                yield { chunk: { bytes: new TextEncoder().encode(JSON.stringify(chunk)) } }
            }
        })()
    }
}

// ---------------------------------------------------------------------------
// detectFormat
// ---------------------------------------------------------------------------
describe('detectFormat', () => {
    it('prefers openai-chat-completion when ChatCompletionRequest is supported', () => {
        expect(detectFormat(['chatcompletionrequest', 'bedrockmetacompletionrequest'])).toBe('openai-chat-completion')
    })

    it('returns openai-chat-completion for ChatCompletion variant names', () => {
        expect(detectFormat(['responsesrequest', 'chatcompletionrequest', 'completionrequest'])).toBe('openai-chat-completion')
    })

    it('returns bedrock-completion when only BedrockCompletion is available', () => {
        expect(detectFormat(['bedrockcompletionrequest'])).toBe('bedrock-completion')
    })

    it('returns bedrock-completion when no chat completion format exists', () => {
        expect(detectFormat(['completionrequest', 'embeddingchatrequest'])).toBe('bedrock-completion')
    })

    it('defaults to openai-chat-completion when no formats provided', () => {
        expect(detectFormat(undefined)).toBe('openai-chat-completion')
    })

    it('defaults to openai-chat-completion for empty array', () => {
        expect(detectFormat([])).toBe('openai-chat-completion')
    })
})

// ---------------------------------------------------------------------------
// getImportedModelInfo
// ---------------------------------------------------------------------------
describe('getImportedModelInfo', () => {
    beforeEach(() => {
        _resetModelInfoCache()
        mockSendBedrock.mockReset()
        mockSendRuntime.mockReset()
    })

    it('returns model metadata and probed formats', async () => {
        mockSendBedrock.mockResolvedValueOnce({
            instructSupported: false,
            modelArchitecture: 'llama'
        })
        mockSendRuntime.mockRejectedValueOnce(
            new Error(
                'ValidationException: Available for this model: ChatCompletionRequest, BedrockMetaCompletionRequest, CompletionRequest'
            )
        )
        const info = await getImportedModelInfo('arn:aws:bedrock:us-east-1:123:imported-model/test', 'us-east-1')
        expect(info.instructSupported).toBe(false)
        expect(info.modelArchitecture).toBe('llama')
        expect(info.supportedFormats).toContain('chatcompletionrequest')
        expect(info.supportedFormats).toContain('bedrockmetacompletionrequest')
    })

    it('caches results per model ID', async () => {
        mockSendBedrock.mockResolvedValueOnce({ instructSupported: false, modelArchitecture: 'llama' })
        mockSendRuntime.mockRejectedValueOnce(new Error('ValidationException: Available for this model: ChatCompletionRequest'))
        const arn = 'arn:aws:bedrock:us-east-1:123:imported-model/cached'
        await getImportedModelInfo(arn, 'us-east-1')
        await getImportedModelInfo(arn, 'us-east-1')
        expect(mockSendBedrock).toHaveBeenCalledTimes(1)
        expect(mockSendRuntime).toHaveBeenCalledTimes(1)
    })

    it('throws when GetImportedModel fails', async () => {
        mockSendBedrock.mockRejectedValueOnce(new Error('ValidationException: model not found'))
        await expect(getImportedModelInfo('bad-arn', 'us-east-1')).rejects.toThrow('ValidationException')
    })

    it('throws when probe fails with non-format error', async () => {
        mockSendBedrock.mockResolvedValueOnce({ instructSupported: false, modelArchitecture: 'llama' })
        mockSendRuntime.mockRejectedValueOnce(new Error('InternalServerException: unexpected error'))
        await expect(getImportedModelInfo('some-arn', 'us-east-1')).rejects.toThrow('InternalServerException')
    })
})

// ---------------------------------------------------------------------------
// BedrockImportedChat — message conversion
// ---------------------------------------------------------------------------
describe('BedrockImportedChat message conversion', () => {
    function makeChat(format = 'bedrock-completion' as any) {
        return new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format,
            temperature: 0.7,
            maxTokens: 200,
            streaming: false
        })
    }

    describe('convertMessagesToPrompt (BedrockCompletion)', () => {
        const chat = makeChat('bedrock-completion')

        it('converts basic user message', () => {
            const result = chat.convertMessagesToPrompt([new HumanMessage('Hello')])
            expect(result).toBe('User: Hello\nAssistant:')
        })

        it('converts system + user + assistant messages', () => {
            const result = chat.convertMessagesToPrompt([
                new SystemMessage('You are helpful.'),
                new HumanMessage('Hi'),
                new AIMessage('Hello!'),
                new HumanMessage('Bye')
            ])
            expect(result).toContain('You are helpful.')
            expect(result).toContain('User: Hi')
            expect(result).toContain('Assistant: Hello!')
            expect(result).toContain('User: Bye')
            expect(result.endsWith('Assistant:')).toBe(true)
        })

        it('converts tool messages', () => {
            const result = chat.convertMessagesToPrompt([
                new HumanMessage('call tool'),
                new ToolMessage({ content: '{"result": 42}', tool_call_id: 'tc1' })
            ])
            expect(result).toContain('Tool: {"result": 42}')
        })
    })

    describe('convertMessagesToOpenAI (OpenAIChatCompletion)', () => {
        const chat = makeChat('openai-chat-completion')

        it('converts basic messages to OpenAI format', () => {
            const result = chat.convertMessagesToOpenAI([new SystemMessage('Be helpful'), new HumanMessage('Hello')])
            expect(result).toEqual([
                { role: 'system', content: 'Be helpful' },
                { role: 'user', content: 'Hello' }
            ])
        })

        it('converts AI messages with tool_calls', () => {
            const aiMsg = new AIMessage({
                content: '',
                additional_kwargs: {
                    tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'add', arguments: '{"a":1}' } }]
                }
            })
            const result = chat.convertMessagesToOpenAI([aiMsg])
            expect(result[0].role).toBe('assistant')
            expect(result[0].tool_calls).toHaveLength(1)
        })

        it('converts ToolMessage with tool_call_id', () => {
            const result = chat.convertMessagesToOpenAI([new ToolMessage({ content: 'result', tool_call_id: 'tc1' })])
            expect(result[0]).toEqual({ role: 'tool', content: 'result', tool_call_id: 'tc1' })
        })
    })
})

// ---------------------------------------------------------------------------
// BedrockImportedChat — _generate (non-streaming)
// ---------------------------------------------------------------------------
describe('BedrockImportedChat _generate', () => {
    beforeEach(() => {
        mockSendRuntime.mockReset()
    })

    it('sends BedrockCompletion request and parses response', async () => {
        mockSendRuntime.mockResolvedValueOnce(makeInvokeResponse({ completion: 'Hello from Llama!', stop_reason: 'stop' }))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'arn:aws:bedrock:us-east-1:123:imported-model/llama',
            format: 'bedrock-completion',
            streaming: false
        })

        const result = await chat._generate([new HumanMessage('Hi')], {} as any)
        expect(result.generations).toHaveLength(1)
        expect(result.generations[0].text).toBe('Hello from Llama!')
    })

    it('sends OpenAIChatCompletion request and parses response', async () => {
        mockSendRuntime.mockResolvedValueOnce(
            makeInvokeResponse({
                choices: [{ message: { role: 'assistant', content: 'Hello from GPT!' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            })
        )

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'arn:aws:bedrock:us-east-1:123:imported-model/gpt',
            format: 'openai-chat-completion',
            streaming: false
        })

        const result = await chat._generate([new HumanMessage('Hi')], {} as any)
        expect(result.generations[0].text).toBe('Hello from GPT!')
        expect((result.llmOutput as any)?.tokenUsage.totalTokens).toBe(15)
    })

    it('parses OpenAI tool_calls in response', async () => {
        mockSendRuntime.mockResolvedValueOnce(
            makeInvokeResponse({
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: '',
                            tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'calc', arguments: '{"x":1}' } }]
                        }
                    }
                ]
            })
        )

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'openai-chat-completion',
            streaming: false
        })

        const result = await chat._generate([new HumanMessage('Use tool')], {} as any)
        expect((result.generations[0].message.additional_kwargs as any).tool_calls).toHaveLength(1)
        expect((result.generations[0].message.additional_kwargs as any).tool_calls[0].function.name).toBe('calc')
    })

    it('handles empty choices in OpenAI response', async () => {
        mockSendRuntime.mockResolvedValueOnce(makeInvokeResponse({ choices: [] }))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'openai-chat-completion',
            streaming: false
        })

        const result = await chat._generate([new HumanMessage('Hi')], {} as any)
        expect(result.generations[0].text).toBe('')
    })

    it('normalizes ModelNotReady errors', async () => {
        mockSendRuntime.mockRejectedValueOnce(new Error('ModelNotReadyException: model is still loading'))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'bedrock-completion',
            streaming: false
        })

        await expect(chat._generate([new HumanMessage('Hi')], {} as any)).rejects.toThrow('not ready to serve')
    })

    it('normalizes ResourceNotFound errors', async () => {
        mockSendRuntime.mockRejectedValueOnce(new Error('ResourceNotFoundException: model xyz not found'))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'bad-arn',
            format: 'bedrock-completion',
            streaming: false
        })

        await expect(chat._generate([new HumanMessage('Hi')], {} as any)).rejects.toThrow('Model not found')
    })
})

// ---------------------------------------------------------------------------
// BedrockImportedChat — streaming
// ---------------------------------------------------------------------------
describe('BedrockImportedChat streaming', () => {
    beforeEach(() => {
        mockSendRuntime.mockReset()
    })

    it('streams BedrockCompletion chunks', async () => {
        mockSendRuntime.mockResolvedValueOnce(makeStreamResponse([{ completion: 'Hello ' }, { completion: 'world!' }]))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'bedrock-completion',
            streaming: true
        })

        const chunks: string[] = []
        for await (const chunk of chat._streamResponseChunks([new HumanMessage('Hi')], {} as any)) {
            chunks.push(chunk.text)
        }
        expect(chunks).toEqual(['Hello ', 'world!'])
    })

    it('streams OpenAIChatCompletion delta chunks', async () => {
        mockSendRuntime.mockResolvedValueOnce(
            makeStreamResponse([{ choices: [{ delta: { content: 'Hello ' } }] }, { choices: [{ delta: { content: 'world!' } }] }])
        )

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'openai-chat-completion',
            streaming: true
        })

        const chunks: string[] = []
        for await (const chunk of chat._streamResponseChunks([new HumanMessage('Hi')], {} as any)) {
            chunks.push(chunk.text)
        }
        expect(chunks).toEqual(['Hello ', 'world!'])
    })

    it('skips empty stream chunks', async () => {
        mockSendRuntime.mockResolvedValueOnce(makeStreamResponse([{ completion: '' }, { completion: 'data' }, { completion: '' }]))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'bedrock-completion',
            streaming: true
        })

        const chunks: string[] = []
        for await (const chunk of chat._streamResponseChunks([new HumanMessage('Hi')], {} as any)) {
            chunks.push(chunk.text)
        }
        expect(chunks).toEqual(['data'])
    })

    it('_generate uses streaming when enabled with runManager', async () => {
        mockSendRuntime.mockResolvedValueOnce(makeStreamResponse([{ completion: 'streamed' }]))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'bedrock-completion',
            streaming: true
        })

        const mockRunManager = { handleLLMNewToken: jest.fn() }
        const result = await chat._generate([new HumanMessage('Hi')], {} as any, mockRunManager as any)
        expect(result.generations[0].text).toBe('streamed')
        expect(mockRunManager.handleLLMNewToken).toHaveBeenCalledWith('streamed')
    })
})

// ---------------------------------------------------------------------------
// Image validation
// ---------------------------------------------------------------------------
describe('BedrockImportedChat image handling', () => {
    beforeEach(() => {
        mockSendRuntime.mockReset()
    })

    it('rejects remote image URLs', async () => {
        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'openai-chat-completion',
            streaming: false
        })

        const msg = new HumanMessage({
            content: [
                { type: 'text', text: 'What is this?' },
                { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }
            ]
        })

        await expect(chat._generate([msg], {} as any)).rejects.toThrow('base64 data URLs')
    })

    it('accepts base64 data URL images', async () => {
        mockSendRuntime.mockResolvedValueOnce(makeInvokeResponse({ choices: [{ message: { content: 'A cat' } }] }))

        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'openai-chat-completion',
            streaming: false
        })

        const msg = new HumanMessage({
            content: [
                { type: 'text', text: 'What is this?' },
                { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } }
            ]
        })

        const result = await chat._generate([msg], {} as any)
        expect(result.generations[0].text).toBe('A cat')
    })
})

// ---------------------------------------------------------------------------
// IVisionChatModal interface
// ---------------------------------------------------------------------------
describe('IVisionChatModal interface', () => {
    it('implements setMultiModalOption', () => {
        const chat = new BedrockImportedChat('test-id', {
            region: 'us-east-1',
            modelId: 'test-model',
            format: 'bedrock-completion'
        })
        const option = { image: { allowImageUploads: true } }
        chat.setMultiModalOption(option)
        expect(chat.multiModalOption).toEqual(option)
    })

    it('exposes configuredModel and id', () => {
        const chat = new BedrockImportedChat('my-node-id', {
            region: 'us-east-1',
            modelId: 'arn:aws:bedrock:us-east-1:123:imported-model/test',
            format: 'bedrock-completion'
        })
        expect(chat.id).toBe('my-node-id')
        expect(chat.configuredModel).toBe('arn:aws:bedrock:us-east-1:123:imported-model/test')
    })
})
