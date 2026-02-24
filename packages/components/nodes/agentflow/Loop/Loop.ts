import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { updateFlowState } from '../utils'

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
        this.version = 1.2
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
            },
            {
                label: 'Fallback Message',
                name: 'fallbackMessage',
                type: 'string',
                description: 'Message to display if the loop count is exceeded',
                placeholder: 'Enter your fallback message here',
                rows: 4,
                acceptVariable: true,
                optional: true
            },
            {
                label: 'Update Flow State',
                name: 'loopUpdateState',
                description: 'Update runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'asyncOptions',
                        loadMethod: 'listRuntimeStateKeys'
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        acceptVariable: true,
                        acceptNodeOutputAsVariable: true
                    }
                ]
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
        },
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const loopBackToNode = nodeData.inputs?.loopBackToNode as string
        const _maxLoopCount = nodeData.inputs?.maxLoopCount as string
        const fallbackMessage = nodeData.inputs?.fallbackMessage as string
        const _loopUpdateState = nodeData.inputs?.loopUpdateState

        const state = options.agentflowRuntime?.state as ICommonObject

        const loopBackToNodeId = loopBackToNode.split('-')[0]
        const loopBackToNodeLabel = loopBackToNode.split('-')[1]

        const data = {
            nodeID: loopBackToNodeId,
            maxLoopCount: _maxLoopCount ? parseInt(_maxLoopCount) : 5
        }

        const finalOutput = 'Loop back to ' + `${loopBackToNodeLabel} (${loopBackToNodeId})`

        // Update flow state if needed
        let newState = { ...state }
        if (_loopUpdateState && Array.isArray(_loopUpdateState) && _loopUpdateState.length > 0) {
            newState = updateFlowState(state, _loopUpdateState)
        }

        // Process template variables in state
        if (newState && Object.keys(newState).length > 0) {
            for (const key in newState) {
                if (newState[key].toString().includes('{{ output }}')) {
                    newState[key] = finalOutput
                }
            }
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: data,
            output: {
                content: finalOutput,
                nodeID: loopBackToNodeId,
                maxLoopCount: _maxLoopCount ? parseInt(_maxLoopCount) : 5,
                fallbackMessage
            },
            state: newState
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Loop_Agentflow }
