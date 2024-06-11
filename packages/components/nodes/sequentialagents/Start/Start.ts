import { START } from '@langchain/langgraph'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { INode, INodeData, INodeParams, ISeqAgentNode } from '../../../src/Interface'
import { Moderation } from '../../moderation/Moderation'

class Start_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Start'
        this.name = 'seqStart'
        this.version = 1.0
        this.type = 'START'
        this.icon = 'start.svg'
        this.category = 'Sequential Agents'
        this.description = 'Starting point of the conversation'
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel',
                description: `Only compatible with models that are capable of function calling: ChatOpenAI, ChatMistral, ChatAnthropic, ChatGoogleGenerativeAI, ChatVertexAI, GroqChat`
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
        this.baseClasses = [this.type]
    }

    async init(nodeData: INodeData): Promise<any> {
        const moderations = (nodeData.inputs?.inputModeration as Moderation[]) ?? []
        const model = nodeData.inputs?.model as BaseChatModel

        const returnOutput: ISeqAgentNode = {
            node: START,
            name: START,
            label: START,
            type: 'start',
            output: START,
            llm: model,
            moderations
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Start_SeqAgents }
