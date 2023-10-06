import { VectorStore } from 'langchain/vectorstores/base'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { HydeRetriever, HydeRetrieverOptions, PromptKey } from 'langchain/retrievers/hyde'
import { BaseLanguageModel } from 'langchain/base_language'
import { PromptTemplate } from 'langchain/prompts'
import { handleEscapeCharacters } from '../../../src'

class HydeRetriever_Retrievers implements INode {
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
        this.label = 'Hyde Retriever'
        this.name = 'HydeRetriever'
        this.version = 2.0
        this.type = 'HydeRetriever'
        this.icon = 'hyderetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Use HyDE retriever to retrieve from a vector store'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Prompt Key',
                name: 'promptKey',
                type: 'options',
                options: [
                    {
                        label: 'websearch',
                        name: 'websearch'
                    },
                    {
                        label: 'scifact',
                        name: 'scifact'
                    },
                    {
                        label: 'arguana',
                        name: 'arguana'
                    },
                    {
                        label: 'trec-covid',
                        name: 'trec-covid'
                    },
                    {
                        label: 'fiqa',
                        name: 'fiqa'
                    },
                    {
                        label: 'dbpedia-entity',
                        name: 'dbpedia-entity'
                    },
                    {
                        label: 'trec-news',
                        name: 'trec-news'
                    },
                    {
                        label: 'mr-tydi',
                        name: 'mr-tydi'
                    }
                ],
                default: 'websearch'
            },
            {
                label: 'Custom Prompt',
                name: 'customPrompt',
                description: 'If custom prompt is used, this will override Prompt Key',
                placeholder: 'Please write a passage to answer the question\nQuestion: {question}\nPassage:',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                default: 4,
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'SelfQuery Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Document',
                name: 'document',
                baseClasses: ['Document']
            },
            {
                label: 'Text',
                name: 'text',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const llm = nodeData.inputs?.model as BaseLanguageModel
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const promptKey = nodeData.inputs?.promptKey as PromptKey
        const customPrompt = nodeData.inputs?.customPrompt as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : 4
        const output = nodeData.outputs?.output as string

        const obj: HydeRetrieverOptions<any> = {
            llm,
            vectorStore,
            k
        }

        if (customPrompt) obj.promptTemplate = PromptTemplate.fromTemplate(customPrompt)
        else if (promptKey) obj.promptTemplate = promptKey

        const retriever = new HydeRetriever(obj)

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(input)
        else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(input)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: HydeRetriever_Retrievers }
