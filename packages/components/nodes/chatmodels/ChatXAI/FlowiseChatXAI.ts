import { ChatXAI as LCChatXAI, ChatXAIInput } from '@langchain/xai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export class ChatXAI extends LCChatXAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: ChatXAIInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? ''
        this.configuredMaxToken = fields?.maxTokens
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }
}
