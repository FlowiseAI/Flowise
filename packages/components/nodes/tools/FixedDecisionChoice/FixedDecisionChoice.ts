import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { FixedDecisionChoice } from '../FixedDecision/FixedDecisionChoice'

class FixedDecisionChoiceNode implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Fixed Decision Choice'
        this.name = 'fixedDecisionChoice'
        this.version = 1.0
        this.type = 'FixedDecisionChoice'
        this.icon = 'fixedDecisionChoice.svg'
        this.category = 'Tools'
        this.description = 'Use choice(s) with Fixed Decision Tool to created a fixed decision flow'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Input',
                name: 'input',
                type: 'string',
                rows: 5,
                description: "This will be compared to the tool's input using an inclusive matching method",
                placeholder: 'What is love?'
            },
            {
                label: 'Response',
                name: 'response',
                type: 'string',
                rows: 5,
                placeholder: "Baby don't hurt me."
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        return new FixedDecisionChoice(nodeData.inputs?.input, nodeData.inputs?.response)
    }
}

module.exports = { nodeClass: FixedDecisionChoiceNode }
