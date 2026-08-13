const { nodeClass: DirectReply_Agentflow } = require('./DirectReply')

describe('DirectReply_Agentflow', () => {
    const createNode = () => new DirectReply_Agentflow()
    const createOptions = () => ({
        agentflowRuntime: { state: { existing: 'state' } },
        chatId: 'chat-1',
        isLastNode: true,
        sseStreamer: {
            streamTokenEvent: jest.fn(),
            streamArtifactsEvent: jest.fn()
        }
    })

    it('returns text only when no artifacts are provided', async () => {
        const node = createNode()
        const options = createOptions()

        const result = await node.run(
            {
                id: 'directReplyAgentflow_0',
                inputs: { directReplyMessage: 'done' }
            },
            '',
            options
        )

        expect(result.output).toEqual({ content: 'done' })
        expect(options.sseStreamer.streamTokenEvent).toHaveBeenCalledWith('chat-1', 'done')
        expect(options.sseStreamer.streamArtifactsEvent).not.toHaveBeenCalled()
    })

    it('attaches resolved artifacts from the artifacts input', async () => {
        const node = createNode()
        const options = createOptions()
        const artifacts = [
            { type: 'png', data: 'FILE-STORAGE::image.png' },
            { type: 'pdf', data: 'FILE-STORAGE::report.pdf' }
        ]

        const result = await node.run(
            {
                id: 'directReplyAgentflow_0',
                inputs: {
                    directReplyMessage: 'generated files',
                    directReplyArtifacts: JSON.stringify(artifacts)
                }
            },
            '',
            options
        )

        expect(result.output).toEqual({
            content: 'generated files',
            artifacts
        })
        expect(options.sseStreamer.streamTokenEvent).toHaveBeenCalledWith('chat-1', 'generated files')
        expect(options.sseStreamer.streamArtifactsEvent).toHaveBeenCalledWith('chat-1', artifacts)
    })

    it('detects artifact-only messages without returning artifact JSON as content', async () => {
        const node = createNode()
        const options = createOptions()
        const artifacts = [{ type: 'png', data: 'FILE-STORAGE::image.png' }]

        const result = await node.run(
            {
                id: 'directReplyAgentflow_0',
                inputs: { directReplyMessage: JSON.stringify(artifacts) }
            },
            '',
            options
        )

        expect(result.output).toEqual({
            content: ' ',
            artifacts
        })
        expect(options.sseStreamer.streamTokenEvent).not.toHaveBeenCalled()
        expect(options.sseStreamer.streamArtifactsEvent).toHaveBeenCalledWith('chat-1', artifacts)
    })
})
