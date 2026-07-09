import { AIMessageChunk } from '@langchain/core/messages'

const { nodeClass: AgentAgentflow } = require('./Agent')

describe('Agent AgentFlow streaming reasoning chunks', () => {
    it('streams reasoning-only chunks as thinking content without empty token events', async () => {
        const agentNode = new AgentAgentflow()
        const chunk = new AIMessageChunk({
            content: '',
            additional_kwargs: {
                reasoning_content: 'Think through the tool plan.'
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

        const response = await (agentNode as any).handleStreamingResponse(
            sseStreamer,
            llmNodeInstance,
            [],
            'chat-id',
            new AbortController(),
            false,
            true
        )

        expect(sseStreamer.streamThinkingEvent).toHaveBeenCalledWith('chat-id', 'Think through the tool plan.')
        expect(sseStreamer.streamThinkingEvent).toHaveBeenCalledWith('chat-id', '', expect.any(Number))
        expect(sseStreamer.streamTokenEvent).not.toHaveBeenCalled()
        expect(response.additional_kwargs?.reasoning_content).toBe('Think through the tool plan.')
    })
})
