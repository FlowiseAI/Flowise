import { INode, INodeData, INodeParams, ISeqAgentNode } from '../../../src/Interface'

class Loop_SeqAgents implements INode {
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
        this.label = 'Loop'
        this.name = 'seqLoop'
        this.version = 1.0
        this.type = 'Loop'
        this.icon = 'loop.svg'
        this.category = 'Sequential Agents'
        this.description = 'Loop back to the specific sequential node'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Start | Agent | LLM | Tool Node',
                name: 'sequentialNode',
                type: 'Start | Agent | LLMNode | ToolNode',
                list: true
            },
            {
                label: 'Loop To',
                name: 'loopToName',
                description: 'Name of the agent to loop back to',
                type: 'string',
                placeholder: 'agent1'
            }
        ]
        this.hideOutput = true
    }

    async init(nodeData: INodeData): Promise<any> {
        const sequentialNodes = nodeData.inputs?.sequentialNode as ISeqAgentNode[]
        const loopToNameLabel = nodeData.inputs?.loopToName as string

        if (!sequentialNodes || !sequentialNodes.length) throw new Error('Loop must have a predecessor!')
        if (!loopToNameLabel) throw new Error('Loop to name is required')

        const loopToName = loopToNameLabel.toLowerCase().replace(/\s/g, '_').trim()

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: loopToName,
            name: loopToName,
            label: loopToNameLabel,
            type: 'agent',
            predecessorAgents: sequentialNodes,
            output: loopToName
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Loop_SeqAgents }
