import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { parseJsonBody } from '../../../src/utils'

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
                label: 'Output Structure',
                name: 'iterationOutputStructure',
                type: 'options',
                description: 'How to structure the output from all iterations',
                options: [
                    {
                        label: 'Aggregated Text',
                        name: 'aggregatedText',
                        description: 'Join all iteration outputs into a single text separated by newlines'
                    },
                    {
                        label: 'JSON Array',
                        name: 'jsonArray',
                        description: 'Preserve the input array structure — output[i] corresponds to the result of processing input[i]'
                    }
                ],
                default: 'aggregatedText'
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

        const iterationOutputStructure = nodeData.inputs?.iterationOutputStructure ?? 'aggregatedText'
        const state = options.agentflowRuntime?.state as ICommonObject

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: {
                iterationInput: iterationInputArray,
                iterationOutputStructure
            },
            output: {},
            state
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Iteration_Agentflow }
