import { AIMessageChunk } from '@langchain/core/messages'

const { nodeClass: LLMAgentflow } = require('./LLM')

describe('LLM AgentFlow streaming reasoning chunks', () => {
    it('streams reasoning-only chunks as thinking content without empty token events', async () => {
        const llmNode = new LLMAgentflow()
        const chunk = new AIMessageChunk({
            content: '',
            additional_kwargs: {
                reasoning_content: 'Think before answering.'
            }
        })
        const llmNodeInstance = {
            stream: jest.fn(async function* () {
                yield chunk
            })
        }
        const sseStreamer = {
            streamThinkingEvent: jest.fn(),
            streamTokenEvent: jest.fn()
        }

        const response = await (llmNode as any).handleStreamingResponse(
            sseStreamer,
            llmNodeInstance,
            [],
            'chat-id',
            new AbortController(),
            false,
            true
        )

        expect(sseStreamer.streamThinkingEvent).toHaveBeenCalledWith('chat-id', 'Think before answering.')
        expect(sseStreamer.streamThinkingEvent).toHaveBeenCalledWith('chat-id', '', expect.any(Number))
        expect(sseStreamer.streamTokenEvent).not.toHaveBeenCalled()
        expect(response.additional_kwargs?.reasoning_content).toBe('Think before answering.')
    })
})
