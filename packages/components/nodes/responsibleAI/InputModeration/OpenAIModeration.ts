import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src'
import { Moderation } from '../ResponsibleAI'
import { OpenAIModerationRunner } from './OpenAIModerationRunner'

class OpenAIModeration implements INode {
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
        this.label = 'OpenAI Moderation'
        this.name = 'inputModerationOpenAI'
        this.version = 1.0
        this.type = 'Moderation'
        this.icon = 'openai-moderation.png'
        this.category = 'Responsible AI'
        this.description = 'Check whether content complies with OpenAI usage policies.'
        this.baseClasses = [this.type, ...getBaseClasses(Moderation)]
        this.inputs = [
            {
                label: 'Error Message',
                name: 'moderationErrorMessage',
                type: 'string',
                rows: 2,
                default: "Cannot Process! Input violates OpenAI's content moderation policies.",
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const runner = new OpenAIModerationRunner()
        const moderationErrorMessage = nodeData.inputs?.moderationErrorMessage as string
        if (moderationErrorMessage) runner.setErrorMessage(moderationErrorMessage)
        return runner
    }
}

module.exports = { nodeClass: OpenAIModeration }
