import { ChatGoogleGenerativeAI as LangchainChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from '@langchain/google-genai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export class ChatGoogleGenerativeAI extends LangchainChatGoogleGenerativeAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: GoogleGenerativeAIChatInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? ''
        this.configuredMaxToken = fields?.maxOutputTokens
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }
}
