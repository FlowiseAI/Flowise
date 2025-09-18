import { VectorStore } from '@langchain/core/vectorstores'
import { ScoreThresholdRetriever } from 'langchain/retrievers/score_threshold'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'

class SimilarityThresholdRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Similarity Score Threshold Retriever'
        this.name = 'similarityThresholdRetriever'
        this.version = 2.0
        this.type = 'SimilarityThresholdRetriever'
        this.icon = 'similaritythreshold.svg'
        this.category = 'Retrievers'
        this.description = 'Return results based on the minimum similarity percentage'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Query',
                name: 'query',
                type: 'string',
                description: 'Query to retrieve documents from retriever. If not specified, user question will be used',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Minimum Similarity Score (%)',
                name: 'minSimilarityScore',
                description: 'Finds results with at least this similarity score',
                type: 'number',
                default: 80,
                step: 1
            },
            {
                label: 'Max K',
                name: 'maxK',
                description: `The maximum number of results to fetch`,
                type: 'number',
                default: 20,
                step: 1,
                additionalParams: true
            },
            {
                label: 'K Increment',
                name: 'kIncrement',
                description: `How much to increase K by each time. It'll fetch N results, then N + kIncrement, then N + kIncrement * 2, etc.`,
                type: 'number',
                default: 2,
                step: 1,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Similarity Threshold Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: ['Document', 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const minSimilarityScore = nodeData.inputs?.minSimilarityScore as number
        const query = nodeData.inputs?.query as string
        const maxK = nodeData.inputs?.maxK as string
        const kIncrement = nodeData.inputs?.kIncrement as string

        const output = nodeData.outputs?.output as string

        const retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
            minSimilarityScore: minSimilarityScore ? minSimilarityScore / 100 : 0.9,
            maxK: maxK ? parseInt(maxK, 10) : 100,
            kIncrement: kIncrement ? parseInt(kIncrement, 10) : 2
        })
        retriever.filter = vectorStore?.lc_kwargs?.filter ?? (vectorStore as any).filter

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(query ? query : input)
        else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(query ? query : input)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: SimilarityThresholdRetriever_Retrievers }
