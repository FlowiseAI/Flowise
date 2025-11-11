import { flatten } from 'lodash'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import {
    TreeSummarize,
    SimpleResponseBuilder,
    Refine,
    BaseEmbedding,
    ResponseSynthesizer,
    CompactAndRefine,
    QueryEngineTool,
    LLMQuestionGenerator,
    SubQuestionQueryEngine,
    Metadata,
    serviceContextFromDefaults,
    NodeWithScore
} from 'llamaindex'
import { reformatSourceDocuments } from '../EngineUtils'
import { EvaluationRunTracerLlama } from '../../../evaluation/EvaluationRunTracerLlama'

class SubQuestionQueryEngine_LlamaIndex implements INode {
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
        this.label = 'Sub Question Query Engine'
        this.name = 'subQuestionQueryEngine'
        this.version = 2.0
        this.type = 'SubQuestionQueryEngine'
        this.icon = 'subQueryEngine.svg'
        this.category = 'Engine'
        this.description =
            'Breaks complex query into sub questions for each relevant data source, then gather all the intermediate responses and synthesizes a final response'
        this.baseClasses = [this.type, 'BaseQueryEngine']
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'QueryEngine Tools',
                name: 'queryEngineTools',
                type: 'QueryEngineTool',
                list: true
            },
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel_LlamaIndex'
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'BaseEmbedding_LlamaIndex'
            },
            {
                label: 'Response Synthesizer',
                name: 'responseSynthesizer',
                type: 'ResponseSynthesizer',
                description:
                    'ResponseSynthesizer is responsible for sending the query, nodes, and prompt templates to the LLM to generate a response. See <a target="_blank" href="https://ts.llamaindex.ai/modules/response_synthesizer">more</a>',
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

        await EvaluationRunTracerLlama.injectEvaluationMetadata(nodeData, options, queryEngine)

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (shouldStreamResponse) {
            const stream = await queryEngine.query({ query: input, stream: true })
            for await (const chunk of stream) {
                text += chunk.response
                if (chunk.sourceNodes) sourceNodes = chunk.sourceNodes
                if (!isStreamingStarted) {
                    isStreamingStarted = true
                    if (sseStreamer) {
                        sseStreamer.streamStartEvent(chatId, chunk.response)
                    }
                }
                if (sseStreamer) {
                    sseStreamer.streamTokenEvent(chatId, chunk.response)
                }
            }

            if (returnSourceDocuments) {
                sourceDocuments = reformatSourceDocuments(sourceNodes)
                if (sseStreamer) {
                    sseStreamer.streamSourceDocumentsEvent(chatId, sourceDocuments)
                }
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
    const embeddings = nodeData.inputs?.embeddings as BaseEmbedding
    const model = nodeData.inputs?.model

    const serviceContext = serviceContextFromDefaults({
        llm: model,
        embedModel: embeddings
    })

    let queryEngineTools = nodeData.inputs?.queryEngineTools as QueryEngineTool[]
    queryEngineTools = flatten(queryEngineTools)

    let queryEngine = SubQuestionQueryEngine.fromDefaults({
        serviceContext,
        queryEngineTools,
        questionGen: new LLMQuestionGenerator({ llm: model })
    })

    const responseSynthesizerObj = nodeData.inputs?.responseSynthesizer
    if (responseSynthesizerObj) {
        if (responseSynthesizerObj.type === 'TreeSummarize') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new TreeSummarize(serviceContext, responseSynthesizerObj.textQAPromptTemplate),
                serviceContext
            })
            queryEngine = SubQuestionQueryEngine.fromDefaults({
                responseSynthesizer,
                serviceContext,
                queryEngineTools,
                questionGen: new LLMQuestionGenerator({ llm: model })
            })
        } else if (responseSynthesizerObj.type === 'CompactAndRefine') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new CompactAndRefine(
                    serviceContext,
                    responseSynthesizerObj.textQAPromptTemplate,
                    responseSynthesizerObj.refinePromptTemplate
                ),
                serviceContext
            })
            queryEngine = SubQuestionQueryEngine.fromDefaults({
                responseSynthesizer,
                serviceContext,
                queryEngineTools,
                questionGen: new LLMQuestionGenerator({ llm: model })
            })
        } else if (responseSynthesizerObj.type === 'Refine') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new Refine(
                    serviceContext,
                    responseSynthesizerObj.textQAPromptTemplate,
                    responseSynthesizerObj.refinePromptTemplate
                ),
                serviceContext
            })
            queryEngine = SubQuestionQueryEngine.fromDefaults({
                responseSynthesizer,
                serviceContext,
                queryEngineTools,
                questionGen: new LLMQuestionGenerator({ llm: model })
            })
        } else if (responseSynthesizerObj.type === 'SimpleResponseBuilder') {
            const responseSynthesizer = new ResponseSynthesizer({
                responseBuilder: new SimpleResponseBuilder(serviceContext),
                serviceContext
            })
            queryEngine = SubQuestionQueryEngine.fromDefaults({
                responseSynthesizer,
                serviceContext,
                queryEngineTools,
                questionGen: new LLMQuestionGenerator({ llm: model })
            })
        }
    }

    return queryEngine
}

module.exports = { nodeClass: SubQuestionQueryEngine_LlamaIndex }
