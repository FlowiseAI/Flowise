import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { parseJsonBody } from '../../../src/utils'

const MAX_ITERATION_CONCURRENCY = 20

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
        this.version = 1.1
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
            },
            {
                label: 'Concurrency',
                name: 'iterationConcurrency',
                type: 'number',
                description: `How many items to process in parallel. Set to 1 for sequential execution (default), up to a maximum of ${MAX_ITERATION_CONCURRENCY}. Higher values speed up independent tasks but multiply load on model/tool providers. Avoid values > 1 when the iteration body updates Flow State, as concurrent merges become nondeterministic.`,
                default: 1,
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iterationInput = nodeData.inputs?.iterationInput

        // Helper function to clean JSON strings with redundant backslashes
        const safeParseJson = (str: string): string => {
            try {
                return parseJsonBody(str)
            } catch {
                // Try parsing after cleaning
                return parseJsonBody(str.replace(/\\(["'[\]{}])/g, '$1'))
            }
        }

        const iterationInputArray =
            typeof iterationInput === 'string' && iterationInput !== '' ? safeParseJson(iterationInput) : iterationInput

        if (!iterationInputArray || !Array.isArray(iterationInputArray)) {
            throw new Error('Invalid input array')
        }

        const state = options.agentflowRuntime?.state as ICommonObject

        const parsedConcurrency = parseInt(nodeData.inputs?.iterationConcurrency)
        const iterationConcurrency = Number.isNaN(parsedConcurrency)
            ? 1
            : Math.min(MAX_ITERATION_CONCURRENCY, Math.max(1, parsedConcurrency))

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: {
                iterationInput: iterationInputArray,
                iterationConcurrency
            },
            output: {},
            state
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Iteration_Agentflow }
