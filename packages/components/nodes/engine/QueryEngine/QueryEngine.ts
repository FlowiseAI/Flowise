import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import {
    RetrieverQueryEngine,
    ResponseSynthesizer,
    CompactAndRefine,
    TreeSummarize,
    Refine,
    SimpleResponseBuilder,
    Metadata,
    NodeWithScore
} from 'llamaindex'
import { reformatSourceDocuments } from '../EngineUtils'

class QueryEngine_LlamaIndex implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Query Engine'
        this.name = 'queryEngine'
        this.version = 2.0
        this.type = 'QueryEngine'
        this.icon = 'query-engine.png'
        this.category = 'Engine'
        this.description = 'Simple query engine built to answer question over your data, without memory'
        this.baseClasses = [this.type, 'BaseQueryEngine']
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'VectorIndexRetriever'
            },
            {
                label: 'Response Synthesizer',
                name: 'responseSynthesizer',
                type: 'ResponseSynthesizer',
                description:
                    'ResponseSynthesizer is responsible for sending the query, nodes, and prompt templates to the LLM to generate a response. See <a target="_blank" href="https://ts.llamaindex.ai/modules/low_level/response_synthesizer">more</a>',
                optional: true
            },
            {
                label: 'Return Source Documents',
                name: 'returnSourceDocuments',
                type: 'boolean',
                optional: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData): Promise<any> {
        return prepareEngine(nodeData)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const queryEngine = prepareEngine(nodeData)

        let text = ''
        let sourceDocuments: ICommonObject[] = []
        let sourceNodes: NodeWithScore<Metadata>[] = []
        let isStreamingStarted = false
        const isStreamingEnabled = options.socketIO && options.socketIOClientId

        if (isStreamingEnabled) {
            const stream = await queryEngine.query({ query: input, stream: true })
            for await (const chunk of stream) {
                text += chunk.response
                if (chunk.sourceNodes) sourceNodes = chunk.sourceNodes
                if (!isStreamingStarted) {
                    isStreamingStarted = true
                    options.socketIO.to(options.socketIOClientId).emit('start', chunk.response)
                }

                options.socketIO.to(options.socketIOClientId).emit('token', chunk.response)
            }

            if (returnSourceDocuments) {
                sourceDocuments = reformatSourceDocuments(sourceNodes)
                options.socketIO.to(options.socketIOClientId).emit('sourceDocuments', sourceDocuments)
            }
        } else {
            const response = await queryEngine.query({ query: input })
            text = response?.response
            sourceDocuments = reformatSourceDocuments(response?.sourceNodes ?? [])
        }

        if (returnSourceDocuments) return { text, sourceDocuments }
        else return { text }
    }
}

const prepareEngine = (nodeData: INodeData) => {
    const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever
    const responseSynthesizerObj = nodeData.inputs?.responseSynthesizer

    let queryEngine = new RetrieverQueryEngine(vectorStoreRetriever)

    if (responseSynthesizerObj) {
        if (responseSynthesizerObj.type === 'TreeSummarize') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new TreeSummarize(vectorStoreRetriever.serviceContext, responseSynthesizerObj.textQAPromptTemplate),
                serviceContext: vectorStoreRetriever.serviceContext
            })
            queryEngine = new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
        } else if (responseSynthesizerObj.type === 'CompactAndRefine') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new CompactAndRefine(
                    vectorStoreRetriever.serviceContext,
                    responseSynthesizerObj.textQAPromptTemplate,
                    responseSynthesizerObj.refinePromptTemplate
                ),
                serviceContext: vectorStoreRetriever.serviceContext
            })
            queryEngine = new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
        } else if (responseSynthesizerObj.type === 'Refine') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new Refine(
                    vectorStoreRetriever.serviceContext,
                    responseSynthesizerObj.textQAPromptTemplate,
                    responseSynthesizerObj.refinePromptTemplate
                ),
                serviceContext: vectorStoreRetriever.serviceContext
            })
            queryEngine = new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
        } else if (responseSynthesizerObj.type === 'SimpleResponseBuilder') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new SimpleResponseBuilder(vectorStoreRetriever.serviceContext),
                serviceContext: vectorStoreRetriever.serviceContext
            })
            queryEngine = new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
        }
    }

    return queryEngine
}

module.exports = { nodeClass: QueryEngine_LlamaIndex }
