import { get } from 'lodash'
import { Document } from '@langchain/core/documents'
import { VectorStore, VectorStoreRetriever, VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'

const defaultReturnFormat = '{{context}}\nSource: {{metadata.source}}'

class CustomRetriever_Retrievers implements INode {
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
        this.label = 'Custom Retriever'
        this.name = 'customRetriever'
        this.version = 1.0
        this.type = 'CustomRetriever'
        this.icon = 'customRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Return results based on predefined format'
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
                label: 'Result Format',
                name: 'resultFormat',
                type: 'string',
                rows: 4,
                description:
                    'Format to return the results in. Use {{context}} to insert the pageContent of the document and {{metadata.key}} to insert metadata values.',
                default: defaultReturnFormat
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to vector store topK',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Custom Retriever',
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
        const query = nodeData.inputs?.query as string
        const topK = nodeData.inputs?.topK as string
        const resultFormat = nodeData.inputs?.resultFormat as string

        const output = nodeData.outputs?.output as string

        const retriever = CustomRetriever.fromVectorStore(vectorStore, {
            resultFormat,
            topK: topK ? parseInt(topK, 10) : (vectorStore as any)?.k ?? 4
        })

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

type RetrieverInput<V extends VectorStore> = Omit<VectorStoreRetrieverInput<V>, 'k'> & {
    topK?: number
    resultFormat?: string
}

class CustomRetriever<V extends VectorStore> extends VectorStoreRetriever<V> {
    resultFormat: string
    topK = 4

    constructor(input: RetrieverInput<V>) {
        super(input)
        this.topK = input.topK ?? this.topK
        this.resultFormat = input.resultFormat ?? this.resultFormat
    }

    async getRelevantDocuments(query: string): Promise<Document[]> {
        const results = await this.vectorStore.similaritySearchWithScore(query, this.topK, this.filter)

        const finalDocs: Document[] = []
        for (const result of results) {
            let res = this.resultFormat.replace(/{{context}}/g, result[0].pageContent)
            res = replaceMetadata(res, result[0].metadata)
            finalDocs.push(
                new Document({
                    pageContent: res,
                    metadata: result[0].metadata
                })
            )
        }
        return finalDocs
    }

    static fromVectorStore<V extends VectorStore>(vectorStore: V, options: Omit<RetrieverInput<V>, 'vectorStore'>) {
        return new this<V>({ ...options, vectorStore })
    }
}

function replaceMetadata(template: string, metadata: Record<string, any>): string {
    const metadataRegex = /{{metadata\.([\w.]+)}}/g

    return template.replace(metadataRegex, (match, path) => {
        const value = get(metadata, path)
        return value !== undefined ? String(value) : match
    })
}

module.exports = { nodeClass: CustomRetriever_Retrievers }
