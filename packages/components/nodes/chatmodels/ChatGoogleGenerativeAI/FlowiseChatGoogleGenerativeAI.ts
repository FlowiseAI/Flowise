import { ChatGoogleGenerativeAI as LangchainChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from '@langchain/google-genai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export class ChatGoogleGenerativeAI extends LangchainChatGoogleGenerativeAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: GoogleGenerativeAIChatInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
        this.configuredMaxToken = fields?.maxOutputTokens
    }

    revertToOriginalModel(): void {
        super.modelName = this.configuredModel
        super.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (this.modelName !== 'gemini-pro-vision' && this.modelName !== 'gemini-1.5-pro-latest') {
            super.modelName = 'gemini-1.5-pro-latest'
            super.maxOutputTokens = this.configuredMaxToken ? this.configuredMaxToken : 8192
        }
    }
}
