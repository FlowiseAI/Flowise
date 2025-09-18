import { IVisionChatModal, IMultiModalOption } from '../../../src'
import { ChatBedrockConverse as LCBedrockChat, ChatBedrockConverseInput } from '@langchain/aws'

const DEFAULT_IMAGE_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0'
const DEFAULT_IMAGE_MAX_TOKEN = 1024

export class BedrockChat extends LCBedrockChat implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: ChatBedrockConverseInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model || ''
        this.configuredMaxToken = fields?.maxTokens
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (!this.model.includes('claude-3')) {
            this.model = DEFAULT_IMAGE_MODEL
            this.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : DEFAULT_IMAGE_MAX_TOKEN
        }
    }
}
