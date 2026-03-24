import { AzureChatOpenAI as LangchainAzureChatOpenAI } from '@langchain/openai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export type AzureChatOpenAIConstructorFields = ConstructorParameters<typeof LangchainAzureChatOpenAI>[0]

export class AzureChatOpenAI extends LangchainAzureChatOpenAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    builtInTools: Record<string, any>[] = []
    id: string

    constructor(id: string, fields?: AzureChatOpenAIConstructorFields) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
        this.configuredMaxToken = fields?.maxTokens
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    addBuiltInTools(builtInTool: Record<string, any>): void {
        this.builtInTools.push(builtInTool)
    }
}
