import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { BedrockChat as LCBedrockChat } from '@langchain/community/chat_models/bedrock'
import { BaseBedrockInput } from '@langchain/community/dist/utils/bedrock'
import { IVisionChatModal, IMultiModalOption } from '../../../src'

export class BedrockChat extends LCBedrockChat implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: BaseBedrockInput & BaseChatModelParams) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model || ''
        this.configuredMaxToken = fields?.maxTokens
    }

    revertToOriginalModel(): void {
        super.model = this.configuredModel
        super.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (!this.model.startsWith('claude-3')) {
            super.model = 'anthropic.claude-3-haiku-20240307-v1:0'
            super.maxTokens = this.configuredMaxToken ? this.configuredMaxToken : 1024
        }
    }
}
