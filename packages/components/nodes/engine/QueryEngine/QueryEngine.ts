import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import {
    RetrieverQueryEngine,
    BaseNode,
    Metadata,
    ResponseSynthesizer,
    CompactAndRefine,
    TreeSummarize,
    Refine,
    SimpleResponseBuilder
} from 'llamaindex'

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

    constructor() {
        this.label = 'Query Engine'
        this.name = 'queryEngine'
        this.version = 1.0
        this.type = 'QueryEngine'
        this.icon = 'query-engine.png'
        this.category = 'Engine'
        this.description = 'Simple query engine built to answer question over your data, without memory'
        this.baseClasses = [this.type]
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
    }

    async init(nodeData: INodeData): Promise<any> {
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever
        const responseSynthesizerObj = nodeData.inputs?.responseSynthesizer

        if (responseSynthesizerObj) {
            if (responseSynthesizerObj.type === 'TreeSummarize') {
                const responseSynthesizer = new ResponseSynthesizer({
                    responseBuilder: new TreeSummarize(vectorStoreRetriever.serviceContext, responseSynthesizerObj.textQAPromptTemplate),
                    serviceContext: vectorStoreRetriever.serviceContext
                })
                return new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
            } else if (responseSynthesizerObj.type === 'CompactAndRefine') {
                const responseSynthesizer = new ResponseSynthesizer({
                    responseBuilder: new CompactAndRefine(
                        vectorStoreRetriever.serviceContext,
                        responseSynthesizerObj.textQAPromptTemplate,
                        responseSynthesizerObj.refinePromptTemplate
                    ),
                    serviceContext: vectorStoreRetriever.serviceContext
                })
                return new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
            } else if (responseSynthesizerObj.type === 'Refine') {
                const responseSynthesizer = new ResponseSynthesizer({
                    responseBuilder: new Refine(
                        vectorStoreRetriever.serviceContext,
                        responseSynthesizerObj.textQAPromptTemplate,
                        responseSynthesizerObj.refinePromptTemplate
                    ),
                    serviceContext: vectorStoreRetriever.serviceContext
                })
                return new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
            } else if (responseSynthesizerObj.type === 'SimpleResponseBuilder') {
                const responseSynthesizer = new ResponseSynthesizer({
                    responseBuilder: new SimpleResponseBuilder(vectorStoreRetriever.serviceContext),
                    serviceContext: vectorStoreRetriever.serviceContext
                })
                return new RetrieverQueryEngine(vectorStoreRetriever, responseSynthesizer)
            }
        }

        const queryEngine = new RetrieverQueryEngine(vectorStoreRetriever)
        return queryEngine
    }

    async run(nodeData: INodeData, input: string): Promise<string | object> {
        const queryEngine = nodeData.instance as RetrieverQueryEngine
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean

        const response = await queryEngine.query(input)
        if (returnSourceDocuments && response.sourceNodes?.length)
            return { text: response?.response, sourceDocuments: reformatSourceDocuments(response.sourceNodes) }

        return response?.response
    }
}

const reformatSourceDocuments = (sourceNodes: BaseNode<Metadata>[]) => {
    const sourceDocuments = []
    for (const node of sourceNodes) {
        sourceDocuments.push({
            pageContent: (node as any).text,
            metadata: node.metadata
        })
    }
    return sourceDocuments
}

module.exports = { nodeClass: QueryEngine_LlamaIndex }
