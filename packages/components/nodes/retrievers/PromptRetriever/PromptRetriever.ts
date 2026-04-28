import { transformBracesWithColon } from '../../../src'
import { INode, INodeData, INodeParams, PromptRetriever, PromptRetrieverInput } from '../../../src/Interface'

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

    constructor() {
        this.label = 'Prompt Retriever'
        this.name = 'promptRetriever'
        this.version = 1.0
        this.type = 'PromptRetriever'
        this.icon = 'promptretriever.svg'
        this.category = 'Retrievers'
        this.description = 'Store prompt template with name & description to be later queried by MultiPromptChain'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Prompt Name',
                name: 'name',
                type: 'string',
                placeholder: 'physics-qa'
            },
            {
                label: 'Prompt Description',
                name: 'description',
                type: 'string',
                rows: 3,
                description: 'Description of what the prompt does and when it should be used',
                placeholder: 'Good for answering questions about physics'
            },
            {
                label: 'Prompt System Message',
                name: 'systemMessage',
                type: 'string',
                rows: 4,
                placeholder: `You are a very smart physics professor. You are great at answering questions about physics in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.`
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        let systemMessage = nodeData.inputs?.systemMessage as string
        systemMessage = transformBracesWithColon(systemMessage)

        const obj = {
            name,
            description,
            systemMessage
        } as PromptRetrieverInput

        const retriever = new PromptRetriever(obj)
        return retriever
    }
}

module.exports = { nodeClass: PromptRetriever_Retrievers }
