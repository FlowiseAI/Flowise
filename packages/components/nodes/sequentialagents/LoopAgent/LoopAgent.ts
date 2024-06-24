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
        this.description = 'Loop back to the specified agent'
        this.inputs = [
            {
                label: 'Agent',
                name: 'agent',
                type: 'Agent',
                list: true
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
        const agents = nodeData.inputs?.agent as ISeqAgentNode[]
        const loopToAgentLabel = nodeData.inputs?.loopToAgentName as string

        if (!agents) throw new Error('Agent is required')
        if (!loopToAgentLabel) throw new Error('Loop to Agent is required')

        const loopToAgentName = loopToAgentLabel.toLowerCase().replace(/\s/g, '_').trim()

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: loopToAgentName,
            name: loopToAgentName,
            label: loopToAgentLabel,
            type: 'agent',
            predecessorAgents: agents,
            output: loopToAgentName
        }

        return returnOutput
    }
}

module.exports = { nodeClass: LoopAgent_SeqAgents }
