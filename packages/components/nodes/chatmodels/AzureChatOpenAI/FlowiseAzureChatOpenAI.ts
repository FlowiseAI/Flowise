import { AzureChatOpenAI as LangchainAzureChatOpenAI, OpenAIChatInput, AzureOpenAIInput, ClientOptions } from '@langchain/openai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'

export class AzureChatOpenAI extends LangchainAzureChatOpenAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    builtInTools: Record<string, any>[] = []
    id: string

    constructor(
        id: string,
        fields?: Partial<OpenAIChatInput> &
            Partial<AzureOpenAIInput> & {
                openAIApiKey?: string
                openAIApiVersion?: string
                openAIBasePath?: string
                deploymentName?: string
            } & BaseChatModelParams & {
                configuration?: ClientOptions
            }
    ) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
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
        // pass
    }

    addBuiltInTools(builtInTool: Record<string, any>): void {
        this.builtInTools.push(builtInTool)
    }
}
