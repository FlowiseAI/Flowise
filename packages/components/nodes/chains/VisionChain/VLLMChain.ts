import { OpenAI as OpenAIClient, ClientOptions } from 'openai'
import { BaseChain, ChainInputs } from 'langchain/chains'
import { ChainValues } from 'langchain/schema'
import { BasePromptTemplate, ChatPromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'
import { ChatOpenAI } from 'langchain/chat_models/openai'

/**
 * Interface for the input parameters of the OpenAIVisionChain class.
 */
export interface OpenAIVisionChainInput extends ChainInputs {
    openAIApiKey?: string
    openAIOrganization?: string
    throwError?: boolean
    prompt?: BasePromptTemplate
    configuration?: ClientOptions
    imageUrls?: []
    imageResolution?: string
    openAIModel: ChatOpenAI
}

/**
 * Class representing a chain for generating text from an image using the OpenAI
 * Vision API. It extends the BaseChain class and implements the
 * OpenAIVisionChainInput interface.
 */
export class VLLMChain extends BaseChain implements OpenAIVisionChainInput {
    static lc_name() {
        return 'VLLMChain'
    }

    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            openAIApiKey: 'OPENAI_API_KEY'
        }
    }
    prompt: BasePromptTemplate | undefined

    inputKey = 'input'
    outputKey = 'text'
    imageUrls?: []
    imageResolution: string = 'low'
    openAIApiKey?: string
    openAIOrganization?: string
    openAIModel: ChatOpenAI
    clientConfig: ClientOptions
    client: OpenAIClient
    throwError: boolean

    constructor(fields: OpenAIVisionChainInput) {
        super(fields)
        this.throwError = fields?.throwError ?? false
        this.imageResolution = fields?.imageResolution ?? 'low'
        this.openAIApiKey = fields?.openAIApiKey
        this.prompt = fields?.prompt
        this.imageUrls = fields?.imageUrls ?? []
        if (!this.openAIApiKey) {
            throw new Error('OpenAI API key not found')
        }

        this.openAIOrganization = fields?.openAIOrganization
        this.openAIModel = fields.openAIModel

        this.clientConfig = {
            ...fields?.configuration,
            apiKey: this.openAIApiKey,
            organization: this.openAIOrganization
        }

        this.client = new OpenAIClient(this.clientConfig)
    }

    async _call(values: ChainValues): Promise<ChainValues> {
        const userInput = values[this.inputKey]

        const vRequest: any = {
            model: 'gpt-4-vision-preview',
            temperature: this.openAIModel.temperature,
            top_p: this.openAIModel.topP,
            messages: []
        }
        if (this.openAIModel.maxTokens) vRequest.max_tokens = this.openAIModel.maxTokens
        else vRequest.max_tokens = 1024

        const userRole: any = { role: 'user' }
        userRole.content = []
        userRole.content.push({
            type: 'text',
            text: userInput
        })
        if (this.imageUrls && this.imageUrls.length > 0) {
            this.imageUrls.forEach((imageUrl: any) => {
                userRole.content.push({
                    type: 'image_url',
                    image_url: {
                        url: imageUrl?.data,
                        detail: this.imageResolution
                    }
                })
            })
        }
        vRequest.messages.push(userRole)
        if (this.prompt && this.prompt instanceof ChatPromptTemplate) {
            let chatPrompt = this.prompt as ChatPromptTemplate
            chatPrompt.promptMessages.forEach((message: any) => {
                if (message instanceof SystemMessagePromptTemplate) {
                    vRequest.messages.push({
                        role: 'system',
                        content: [
                            {
                                type: 'text',
                                text: (message.prompt as any).template
                            }
                        ]
                    })
                }
            })
        }

        let response
        try {
            // @ts-ignore
            response = await this.client.chat.completions.create(vRequest)
        } catch (error) {
            if (error instanceof Error) {
                throw error
            } else {
                throw new Error(error as string)
            }
        }
        const output = response.choices[0]
        return {
            [this.outputKey]: output.message.content
        }
    }

    _chainType() {
        return 'vision_chain'
    }

    get inputKeys() {
        return this.prompt?.inputVariables ?? [this.inputKey]
    }

    get outputKeys(): string[] {
        return [this.outputKey]
    }
}
