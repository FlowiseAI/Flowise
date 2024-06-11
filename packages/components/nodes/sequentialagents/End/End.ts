import { END } from '@langchain/langgraph'
import { INode, INodeData, INodeParams, ISeqAgentNode } from '../../../src/Interface'

class End_SeqAgents implements INode {
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
    hideOutput: boolean

    constructor() {
        this.label = 'End'
        this.name = 'seqEnd'
        this.version = 1.0
        this.type = 'END'
        this.icon = 'end.svg'
        this.category = 'Sequential Agents'
        this.description = 'End conversation'
        this.inputs = [
            {
                label: 'Agent/End',
                name: 'agentOrEnd',
                type: 'Agent | END'
            }
        ]
        this.baseClasses = [this.type]
        this.hideOutput = true
    }

    async init(nodeData: INodeData): Promise<any> {
        const agentOrEnd = nodeData.inputs?.agentOrEnd as ISeqAgentNode

        const returnOutput: ISeqAgentNode = {
            node: END,
            name: END,
            label: END,
            type: 'end',
            output: END,
            predecessorAgent: agentOrEnd
        }

        return returnOutput
    }
}

module.exports = { nodeClass: End_SeqAgents }
