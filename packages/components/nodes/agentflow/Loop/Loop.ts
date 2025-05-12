import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'

class Loop_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideOutput: boolean
    hint: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Loop'
        this.name = 'loopAgentflow'
        this.version = 1.0
        this.type = 'Loop'
        this.category = 'Agent Flows'
        this.description = 'Loop back to a previous node'
        this.baseClasses = [this.type]
        this.color = '#FFA07A'
        this.hint = 'Make sure to have memory enabled in the LLM/Agent node to retain the chat history'
        this.hideOutput = true
        this.inputs = [
            {
                label: 'Loop Back To',
                name: 'loopBackToNode',
                type: 'asyncOptions',
                loadMethod: 'listPreviousNodes',
                freeSolo: true
            },
            {
                label: 'Max Loop Count',
                name: 'maxLoopCount',
                type: 'number',
                default: 5
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listPreviousNodes(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]

            const returnOptions: INodeOptionsValue[] = []
            for (const node of previousNodes) {
                returnOptions.push({
                    label: node.label,
                    name: `${node.id}-${node.label}`,
                    description: node.id
                })
            }
            return returnOptions
        }
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const loopBackToNode = nodeData.inputs?.loopBackToNode as string
        const _maxLoopCount = nodeData.inputs?.maxLoopCount as string

        const state = options.agentflowRuntime?.state as ICommonObject

        const loopBackToNodeId = loopBackToNode.split('-')[0]
        const loopBackToNodeLabel = loopBackToNode.split('-')[1]

        const data = {
            nodeID: loopBackToNodeId,
            maxLoopCount: _maxLoopCount ? parseInt(_maxLoopCount) : 5
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: data,
            output: {
                content: 'Loop back to ' + `${loopBackToNodeLabel} (${loopBackToNodeId})`,
                nodeID: loopBackToNodeId,
                maxLoopCount: _maxLoopCount ? parseInt(_maxLoopCount) : 5
            },
            state
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Loop_Agentflow }
