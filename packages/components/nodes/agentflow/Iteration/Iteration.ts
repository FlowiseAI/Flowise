import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src/utils'

class Iteration_Agentflow implements INode {
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
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Iteration'
        this.name = 'iterationAgentflow'
        this.version = 1.0
        this.type = 'Iteration'
        this.category = 'Agent Flows'
        this.description = 'Execute the nodes within the iteration block through N iterations'
        this.baseClasses = [this.type]
        this.color = '#9C89B8'
        this.inputs = [
            {
                label: 'Array Input',
                name: 'iterationInput',
                type: 'string',
                description: 'The input array to iterate over',
                acceptVariable: true,
                rows: 4
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iterationInput = nodeData.inputs?.iterationInput

        // Helper function to clean JSON strings with redundant backslashes
        const cleanJsonString = (str: string): string => {
            return str.replace(/\\(["'\[\]{}])/g, '$1')
        }

        // Try robust parsing using handleEscapeCharacters
        let iterationInputArray
        if (typeof iterationInput === 'string' && iterationInput !== '') {
            let cleaned = cleanJsonString(iterationInput)
            try {
                iterationInputArray = JSON.parse(handleEscapeCharacters(cleaned, true))
            } catch (e) {
                // fallback to previous logic if parsing fails
                iterationInputArray = JSON.parse(cleaned)
            }
        } else {
            iterationInputArray = iterationInput
        }

        if (!iterationInputArray || !Array.isArray(iterationInputArray)) {
            throw new Error('Invalid input array')
        }

        const state = options.agentflowRuntime?.state as ICommonObject

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: {
                iterationInput: iterationInputArray
            },
            output: {},
            state
        }

        return returnOutput
    }
}

export const nodeClass = Iteration_Agentflow;
