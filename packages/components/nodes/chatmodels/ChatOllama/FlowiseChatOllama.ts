import { ChatOllama as LCChatOllama, ChatOllamaInput } from '@langchain/ollama'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export class ChatOllama extends LCChatOllama implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: ChatOllamaInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? ''
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }
}
