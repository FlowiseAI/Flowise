import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MakeWebhookTool } from './core'

class MakeWebhook_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Make.com Webhook'
        this.name = 'makeWebhook'
        this.type = 'MakeWebhook'
        this.icon = 'make.png'
        this.category = 'Tools'
        this.description = 'Execute webhook calls on Make.com'
        this.inputs = [
            {
                label: 'Webhook Url',
                name: 'url',
                type: 'string',
                placeholder: 'https://hook.eu1.make.com/abcdefg'
            },
            {
                label: 'Tool Description',
                name: 'desc',
                type: 'string',
                rows: 4,
                placeholder: 'Useful when need to send message to Discord'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(MakeWebhookTool)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const url = nodeData.inputs?.url as string
        const desc = nodeData.inputs?.desc as string

        return new MakeWebhookTool(url, desc, 'GET')
    }
}

module.exports = { nodeClass: MakeWebhook_Tools }
