import { Moderation } from '../Moderation'
import { OpenAIModerationRunner } from './OpenAIModerationRunner'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'

class OpenAIModeration implements INode {
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
        this.label = 'OpenAI Moderation'
        this.name = 'inputModerationOpenAI'
        this.version = 1.0
        this.type = 'Moderation'
        this.icon = 'openai.svg'
        this.category = 'Moderation'
        this.description = 'Check whether content complies with OpenAI usage policies.'
        this.baseClasses = [this.type, ...getBaseClasses(Moderation)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const runner = new OpenAIModerationRunner(openAIApiKey)
        const moderationErrorMessage = nodeData.inputs?.moderationErrorMessage as string
        if (moderationErrorMessage) runner.setErrorMessage(moderationErrorMessage)
        return runner
    }
}

module.exports = { nodeClass: OpenAIModeration }
