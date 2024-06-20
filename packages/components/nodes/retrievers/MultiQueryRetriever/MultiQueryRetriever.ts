import { PromptTemplate } from '@langchain/core/prompts'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query'

const defaultPrompt = `You are an AI language model assistant. Your task is
to generate 3 different versions of the given user
question to retrieve relevant documents from a vector database.
By generating multiple perspectives on the user question,
your goal is to help the user overcome some of the limitations
of distance-based similarity search.

Provide these alternative questions separated by newlines between XML tags. For example:

<questions>
Question 1
Question 2
Question 3
</questions>

Original question: {question}`

class MultiQueryRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Multi Query Retriever'
        this.name = 'multiQueryRetriever'
        this.version = 1.0
        this.type = 'MultiQueryRetriever'
        this.icon = 'multiQueryRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Generate multiple queries from different perspectives for a given user input query'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Prompt',
                name: 'modelPrompt',
                description:
                    'Prompt for the language model to generate alternative questions. Use {question} to refer to the original question',
                type: 'string',
                rows: 4,
                default: defaultPrompt
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const model = nodeData.inputs?.model
        const vectorStore = nodeData.inputs?.vectorStore

        let prompt = nodeData.inputs?.modelPrompt || (defaultPrompt as string)
        prompt = prompt.replaceAll('{question}', input)

        const retriever = MultiQueryRetriever.fromLLM({
            llm: model,
            retriever: vectorStore.asRetriever(),
            verbose: process.env.DEBUG === 'true',
            // @ts-ignore
            prompt: PromptTemplate.fromTemplate(prompt)
        })
        return retriever
    }
}

module.exports = { nodeClass: MultiQueryRetriever_Retrievers }
