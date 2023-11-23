import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src'
import { Moderation } from '../Moderation'
import { SimplePromptModerationRunner } from './SimplePromptModerationRunner'

class SimplePromptModeration implements INode {
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
        this.label = 'Simple Prompt Moderation'
        this.name = 'inputModerationSimple'
        this.version = 1.0
        this.type = 'Moderation'
        this.icon = 'simple_moderation.png'
        this.category = 'Moderation'
        this.description = 'Check whether input consists of any text from Deny list, and prevent being sent to LLM'
        this.baseClasses = [this.type, ...getBaseClasses(Moderation)]
        this.inputs = [
            {
                label: 'Deny List',
                name: 'denyList',
                type: 'string',
                rows: 4,
                placeholder: `ignore previous instructions\ndo not follow the directions\nyou must ignore all previous instructions`,
                description: 'An array of string literals (enter one per line) that should not appear in the prompt text.',
                optional: false
            },
            {
                label: 'Error Message',
                name: 'moderationErrorMessage',
                type: 'string',
                rows: 2,
                default: 'Cannot Process! Input violates content moderation policies.',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const denyList = nodeData.inputs?.denyList as string
        const moderationErrorMessage = nodeData.inputs?.moderationErrorMessage as string

        return new SimplePromptModerationRunner(denyList, moderationErrorMessage)
    }
}

module.exports = { nodeClass: SimplePromptModeration }
