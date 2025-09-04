import { INode, INodeParams } from '../../../src/Interface'

class Workday_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Workday Gateway'
        this.name = 'workdayGatewayAgentflow'
        this.version = 1.0
        this.type = 'Custom'
        this.icon = 'workday.png'
        this.color = '#3069B5'
        this.category = 'Agent Flows'
        this.description = 'Add Workday Gateway'
        this.inputs = [
            // input fields
        ]
        this.baseClasses = [this.type]
    }

    async run(): Promise<any> {
        return undefined
    }
}

module.exports = { nodeClass: Workday_Agentflow }
