import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class Parallel_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Parallel'
        this.name = 'parallelAgentflow'
        this.version = 1.0
        this.type = 'Parallel'
        this.category = 'Agent Flows'
        this.description = 'Run multiple branches of nodes within this block concurrently, then continue once all branches complete'
        this.baseClasses = [this.type]
        this.color = '#26A69A'
        this.inputs = []
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const state = options.agentflowRuntime?.state as ICommonObject

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: {},
            output: {},
            state
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Parallel_Agentflow }
