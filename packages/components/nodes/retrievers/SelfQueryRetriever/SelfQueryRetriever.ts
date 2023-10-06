import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { SelfQueryRetriever, SelfQueryRetrieverArgs } from 'langchain/retrievers/self_query'
import { FunctionalTranslator } from 'langchain/retrievers/self_query/functional'
import { AttributeInfo } from 'langchain/schema/query_constructor'
import { BaseLanguageModel } from 'langchain/base_language'
import { VectorStore } from 'langchain/vectorstores/base'
import { QueryConstructorChainOptions } from 'langchain/chains/query_constructor'
import { getBaseClasses, handleEscapeCharacters } from '../../../src/utils'

class PromptRetriever_Retrievers implements INode {
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
        this.label = 'Self Query Retriever'
        this.name = 'selfQueryRetriever'
        this.version = 1.0
        this.type = 'SelfQueryRetriever'
        this.icon = 'selfqueryretriever.svg'
        this.category = 'Retrievers'
        this.description = `Transform user query into a structured query for its underlying VectorStore`
        this.baseClasses = [this.type, ...getBaseClasses(SelfQueryRetriever)]
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
                label: 'Document Contents',
                name: 'documentContents',
                type: 'string',
                rows: 4,
                placeholder: `Brief summary of a movie`
            },
            {
                label: 'Attributes',
                name: 'attributes',
                type: 'string',
                description: 'Define the attributes for LLM to be able to query on',
                rows: 4,
                placeholder: `[
    {
        name: "genre",
        description: "The genre of the movie",
        type: "string or array of strings",
    },
    {
        name: "year",
        description: "The year the movie was released",
        type: "number",
    },
    {
        name: "director",
        description: "The director of the movie",
        type: "string",
    },
    {
        name: "rating",
        description: "The rating of the movie (1-10)",
        type: "number",
    },
    {
        name: "length",
        description: "The length of the movie in minutes",
        type: "number",
    },
]`
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
        const documentContents = nodeData.inputs?.documentContents as string
        const attributes = nodeData.inputs?.attributes as string
        const output = nodeData.outputs?.output as string

        let attributeInfo: AttributeInfo[] = []

        if (attributes) {
            try {
                attributeInfo = typeof attributes === 'object' ? attributes : JSON.parse(attributes)
            } catch (exception) {
                throw new Error('Invalid JSON in the SelfQueryRetriever Attributes: ' + exception)
            }
        }

        const obj = {
            llm,
            vectorStore,
            documentContents,
            attributeInfo,
            structuredQueryTranslator: new FunctionalTranslator()
        } as QueryConstructorChainOptions & Omit<SelfQueryRetrieverArgs<any>, 'llmChain'>

        const retriever = SelfQueryRetriever.fromLLM(obj)

        let model = llm
        ;(model as any).streaming = false

        retriever.llmChain.llm = model

        if (output === 'retriever') {
            return retriever
        } else if (output === 'document') {
            return await retriever.getRelevantDocuments(input)
        } else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(input)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: PromptRetriever_Retrievers }
