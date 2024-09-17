import { z } from 'zod'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { FixedDecisionChoice } from './FixedDecisionChoice'
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { getBaseClasses } from '../../../src'

class FixedDecision_Tools implements INode {
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

    constructor() {
        this.label = 'Fixed Decision Tool'
        this.name = 'fixedDecisionTool'
        this.version = 1.0
        this.type = 'FixedDecisionTool'
        this.icon = 'fixedDecisionTool.svg'
        this.category = 'Tools'
        this.description = 'Use as tool for agent that needs to run simple fixed defined flows'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicStructuredTool)]
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'name',
                type: 'string',
                placeholder: 'fixed_decision'
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'When the agent should use it for fixed decision(s)',
                rows: 3,
                placeholder: 'Returns the matching choice for the prompt'
            },
            {
                label: 'Choices',
                name: 'choices',
                type: 'FixedDecisionChoice',
                list: true
            },
            {
                label: 'Return Direct',
                name: 'returnDirect',
                type: 'boolean',
                description: 'Leave it switched on for exact response from the matched choice',
                default: true,
                optional: true
            },
            {
                label: 'Fallback Response',
                name: 'fallbackResponse',
                type: 'string',
                description: 'This is returned when no matching input is found',
                rows: 4,
                default: 'No matching input found.',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const choices = nodeData.inputs?.choices as FixedDecisionChoice[]
        const returnDirect = nodeData.inputs?.returnDirect as boolean
        const fallbackResponse = nodeData.inputs?.fallbackResponse as string

        const input = {
            name,
            description
        } as any

        if (returnDirect) input.returnDirect = returnDirect

        const func = async ({ input }: { input: string }, _: CallbackManagerForToolRun) => {
            // uses `includes` for more permissive matching
            const choice = choices.filter((choice) => choice.input.toLowerCase().includes(input.toLowerCase()))

            return choice?.[0]?.response ?? fallbackResponse
        }

        const schema = z.object({
            input: z.string().describe('query to look up in tool')
        })

        return new DynamicStructuredTool({ ...input, func, schema })
    }
}

module.exports = { nodeClass: FixedDecision_Tools }
