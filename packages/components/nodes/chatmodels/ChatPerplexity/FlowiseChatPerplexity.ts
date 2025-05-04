import { ChatPerplexity as LangchainChatPerplexity, type PerplexityChatInput } from '@langchain/community/chat_models/perplexity'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

// Extend the Langchain ChatPerplexity class to include Flowise-specific properties and methods
export class ChatPerplexity extends LangchainChatPerplexity implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: PerplexityChatInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? '' // Use model from fields
        this.configuredMaxToken = fields?.maxTokens
    }

    // Method to revert to the original model configuration
    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    // Method to set multimodal options
    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }
}
