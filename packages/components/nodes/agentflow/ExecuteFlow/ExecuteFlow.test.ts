jest.mock('../../../src/httpSecurity', () => ({
    secureAxiosRequest: jest.fn()
}))
jest.mock('../../../src/utils', () => ({
    getCredentialData: jest.fn().mockResolvedValue({}),
    getCredentialParam: jest.fn().mockReturnValue(''),
    processTemplateVariables: jest.fn((state) => state),
    parseJsonBody: jest.fn((s) => JSON.parse(s))
}))

import { secureAxiosRequest } from '../../../src/httpSecurity'
import { INodeData, ICommonObject } from '../../../src/Interface'

const { nodeClass: ExecuteFlow_Agentflow } = require('./ExecuteFlow')

function makeNodeData(overrides: Partial<INodeData> = {}): INodeData {
    return {
        id: 'node-1',
        label: 'Execute Flow',
        name: 'executeFlowAgentflow',
        type: 'ExecuteFlow',
        inputs: {
            executeFlowBaseURL: 'http://localhost:3000',
            executeFlowSelectedFlow: 'flow-abc',
            executeFlowInput: 'Hello',
            executeFlowReturnResponseAs: 'userMessage'
        },
        ...overrides
    } as INodeData
}

function makeOptions(overrides: Partial<ICommonObject> = {}): ICommonObject {
    return {
        baseURL: 'http://localhost:3000',
        chatflowid: 'different-flow',
        chatId: 'chat-123',
        agentflowRuntime: { state: {}, chatHistory: [] },
        isLastNode: false,
        appDataSource: {},
        databaseEntities: {},
        ...overrides
    }
}

describe('ExecuteFlow_Agentflow', () => {
    let node: any

    beforeEach(() => {
        node = new ExecuteFlow_Agentflow()
        jest.clearAllMocks()
    })

    it('preserves sourceDocuments from chatflow response', async () => {
        const mockDocs = [{ pageContent: 'doc1', metadata: { source: 'test.pdf' } }]
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'Answer based on docs', sourceDocuments: mockDocs }
        })

        const result = await node.run(makeNodeData(), '', makeOptions())

        expect(result.output.content).toBe('Answer based on docs')
        expect(result.output.sourceDocuments).toEqual(mockDocs)
    })

    it('preserves usedTools from chatflow response', async () => {
        const mockTools = [{ tool: 'calculator', toolInput: '2+2', toolOutput: '4' }]
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'The answer is 4', usedTools: mockTools }
        })

        const result = await node.run(makeNodeData(), '', makeOptions())

        expect(result.output.usedTools).toEqual(mockTools)
    })

    it('preserves artifacts from chatflow response', async () => {
        const mockArtifacts = [{ type: 'image', data: 'base64data' }]
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'Here is the image', artifacts: mockArtifacts }
        })

        const result = await node.run(makeNodeData(), '', makeOptions())

        expect(result.output.artifacts).toEqual(mockArtifacts)
    })

    it('preserves fileAnnotations from chatflow response', async () => {
        const mockAnnotations = [{ fileName: 'report.pdf', filePath: '/tmp/report.pdf' }]
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'See attached file', fileAnnotations: mockAnnotations }
        })

        const result = await node.run(makeNodeData(), '', makeOptions())

        expect(result.output.fileAnnotations).toEqual(mockAnnotations)
    })

    it('preserves all metadata fields together', async () => {
        const mockDocs = [{ pageContent: 'doc1', metadata: {} }]
        const mockTools = [{ tool: 'search', toolInput: 'query', toolOutput: 'result' }]
        const mockArtifacts = [{ type: 'chart', data: '{}' }]
        const mockAnnotations = [{ fileName: 'data.csv', filePath: '/tmp/data.csv' }]

        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: {
                text: 'Full response',
                sourceDocuments: mockDocs,
                usedTools: mockTools,
                artifacts: mockArtifacts,
                fileAnnotations: mockAnnotations
            }
        })

        const result = await node.run(makeNodeData(), '', makeOptions())

        expect(result.output.content).toBe('Full response')
        expect(result.output.sourceDocuments).toEqual(mockDocs)
        expect(result.output.usedTools).toEqual(mockTools)
        expect(result.output.artifacts).toEqual(mockArtifacts)
        expect(result.output.fileAnnotations).toEqual(mockAnnotations)
    })

    it('omits metadata fields when not present in response', async () => {
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'Simple response' }
        })

        const result = await node.run(makeNodeData(), '', makeOptions())

        expect(result.output.content).toBe('Simple response')
        expect(result.output.sourceDocuments).toBeUndefined()
        expect(result.output.usedTools).toBeUndefined()
        expect(result.output.artifacts).toBeUndefined()
        expect(result.output.fileAnnotations).toBeUndefined()
    })

    it('streams metadata via sseStreamer when isLastNode', async () => {
        const mockDocs = [{ pageContent: 'doc1' }]
        const mockTools = [{ tool: 'calc' }]
        const sseStreamer = {
            streamTokenEvent: jest.fn(),
            streamSourceDocumentsEvent: jest.fn(),
            streamUsedToolsEvent: jest.fn(),
            streamArtifactsEvent: jest.fn(),
            streamFileAnnotationsEvent: jest.fn()
        }

        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'Streamed response', sourceDocuments: mockDocs, usedTools: mockTools }
        })

        await node.run(makeNodeData(), '', makeOptions({ isLastNode: true, sseStreamer }))

        expect(sseStreamer.streamTokenEvent).toHaveBeenCalledWith('chat-123', 'Streamed response')
        expect(sseStreamer.streamSourceDocumentsEvent).toHaveBeenCalledWith('chat-123', mockDocs)
        expect(sseStreamer.streamUsedToolsEvent).toHaveBeenCalledWith('chat-123', mockTools)
    })

    it('does not stream metadata when not isLastNode', async () => {
        const sseStreamer = {
            streamTokenEvent: jest.fn(),
            streamSourceDocumentsEvent: jest.fn(),
            streamUsedToolsEvent: jest.fn(),
            streamArtifactsEvent: jest.fn(),
            streamFileAnnotationsEvent: jest.fn()
        }

        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            data: { text: 'Response', sourceDocuments: [{ pageContent: 'doc' }] }
        })

        await node.run(makeNodeData(), '', makeOptions({ isLastNode: false, sseStreamer }))

        expect(sseStreamer.streamTokenEvent).not.toHaveBeenCalled()
        expect(sseStreamer.streamSourceDocumentsEvent).not.toHaveBeenCalled()
    })
})
