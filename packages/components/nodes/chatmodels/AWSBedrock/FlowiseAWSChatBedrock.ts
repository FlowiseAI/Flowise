import { BedrockChatFields, BedrockChat as LCBedrockChat } from '@langchain/community/chat_models/bedrock'
import { IVisionChatModal, IMultiModalOption } from '../../../src'

export class BedrockChat extends LCBedrockChat implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: BedrockChatFields) {
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
        if (!this.model.startsWith('claude-3')) {
            this.model = 'anthropic.claude-3-haiku-20240307-v1:0'
            this.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : 1024
        }
    }
}
