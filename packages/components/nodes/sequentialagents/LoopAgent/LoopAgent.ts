import { INode, INodeData, INodeParams, ISeqAgentNode } from '../../../src/Interface'

class LoopAgent_SeqAgents implements INode {
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
        this.label = 'Loop Agent'
        this.name = 'seqLoopAgent'
        this.version = 1.0
        this.type = 'LoopAgent'
        this.icon = 'loop.svg'
        this.category = 'Sequential Agents'
        this.description = 'Loop back to a specified agent'
        this.inputs = [
            {
                label: 'Agent',
                name: 'agent',
                type: 'Agent'
            },
            {
                label: 'Loop to Agent',
                name: 'loopToAgentName',
                description: 'Name of the agent to loop back to',
                type: 'string',
                placeholder: 'agent1'
            }
        ]
        this.baseClasses = [this.type]
        this.hideOutput = true
    }

    async init(nodeData: INodeData): Promise<any> {
        const agent = nodeData.inputs?.agent as ISeqAgentNode
        const loopToAgentName = nodeData.inputs?.loopToAgentName as string

        if (!agent) throw new Error('Agent is required')
        if (!loopToAgentName) throw new Error('Loop to Agent is required')

        const returnOutput: ISeqAgentNode = {
            node: loopToAgentName,
            name: loopToAgentName,
            label: loopToAgentName,
            type: 'agent',
            predecessorAgent: agent,
            output: loopToAgentName
        }

        return returnOutput
    }
}

module.exports = { nodeClass: LoopAgent_SeqAgents }
