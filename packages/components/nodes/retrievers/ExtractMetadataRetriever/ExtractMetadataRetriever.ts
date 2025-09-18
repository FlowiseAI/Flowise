import { Document } from '@langchain/core/documents'
import { VectorStore, VectorStoreRetriever, VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'
import { z } from 'zod'
import { convertStructuredSchemaToZod } from '../../sequentialagents/commonUtils'

const queryPrefix = 'query'
const defaultPrompt = `Extract keywords from the query: {{${queryPrefix}}}`

class ExtractMetadataRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge?: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Extract Metadata Retriever'
        this.name = 'extractMetadataRetriever'
        this.version = 1.0
        this.type = 'ExtractMetadataRetriever'
        this.icon = 'dynamicMetadataRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Extract keywords/metadata from the query and use it to filter documents'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
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
                label: 'Prompt',
                name: 'dynamicMetadataFilterRetrieverPrompt',
                type: 'string',
                description: 'Prompt to extract metadata from query',
                rows: 4,
                additionalParams: true,
                default: defaultPrompt
            },
            {
                label: 'JSON Structured Output',
                name: 'dynamicMetadataFilterRetrieverStructuredOutput',
                type: 'datagrid',
                description:
                    'Instruct the model to give output in a JSON structured schema. This output will be used as the metadata filter for connected vector store',
                datagrid: [
                    { field: 'key', headerName: 'Key', editable: true },
                    {
                        field: 'type',
                        headerName: 'Type',
                        type: 'singleSelect',
                        valueOptions: ['String', 'String Array', 'Number', 'Boolean', 'Enum'],
                        editable: true
                    },
                    { field: 'enumValues', headerName: 'Enum Values', editable: true },
                    { field: 'description', headerName: 'Description', flex: 1, editable: true }
                ],
                optional: true,
                additionalParams: true
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
                label: 'Extract Metadata Retriever',
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
        let llm = nodeData.inputs?.model
        const llmStructuredOutput = nodeData.inputs?.dynamicMetadataFilterRetrieverStructuredOutput
        const topK = nodeData.inputs?.topK as string
        const dynamicMetadataFilterRetrieverPrompt = nodeData.inputs?.dynamicMetadataFilterRetrieverPrompt as string
        const query = nodeData.inputs?.query as string
        const finalInputQuery = query ? query : input

        const output = nodeData.outputs?.output as string

        if (llmStructuredOutput && llmStructuredOutput !== '[]') {
            try {
                const structuredOutput = z.object(convertStructuredSchemaToZod(llmStructuredOutput))

                // @ts-ignore
                llm = llm.withStructuredOutput(structuredOutput)
            } catch (exception) {
                console.error(exception)
            }
        }

        const retriever = DynamicMetadataRetriever.fromVectorStore(vectorStore, {
            structuredLLM: llm,
            prompt: dynamicMetadataFilterRetrieverPrompt,
            topK: topK ? parseInt(topK, 10) : (vectorStore as any)?.k ?? 4
        })
        retriever.filter = vectorStore?.lc_kwargs?.filter ?? (vectorStore as any).filter

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(finalInputQuery)
        else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(finalInputQuery)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

type RetrieverInput<V extends VectorStore> = Omit<VectorStoreRetrieverInput<V>, 'k'> & {
    topK?: number
    structuredLLM: any
    prompt: string
}

class DynamicMetadataRetriever<V extends VectorStore> extends VectorStoreRetriever<V> {
    topK = 4
    structuredLLM: any
    prompt = ''

    constructor(input: RetrieverInput<V>) {
        super(input)
        this.topK = input.topK ?? this.topK
        this.structuredLLM = input.structuredLLM ?? this.structuredLLM
        this.prompt = input.prompt ?? this.prompt
    }

    async getFilter(query: string): Promise<any> {
        const structuredResponse = await this.structuredLLM.invoke(this.prompt.replace(`{{${queryPrefix}}}`, query))
        return structuredResponse
    }

    async getRelevantDocuments(query: string): Promise<Document[]> {
        const newFilter = await this.getFilter(query)
        // @ts-ignore
        this.filter = { ...this.filter, ...newFilter }
        const results = await this.vectorStore.similaritySearchWithScore(query, this.topK, this.filter)

        const finalDocs: Document[] = []
        for (const result of results) {
            finalDocs.push(
                new Document({
                    pageContent: result[0].pageContent,
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

module.exports = { nodeClass: ExtractMetadataRetriever_Retrievers }
