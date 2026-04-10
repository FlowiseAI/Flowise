import { IVisionChatModal, IMultiModalOption } from '../../../src'
import { ChatBedrockConverse as LCBedrockChat, ChatBedrockConverseInput } from '@langchain/aws'

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

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }
}
