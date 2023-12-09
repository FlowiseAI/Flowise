import { OpenAI as OpenAIClient, ClientOptions } from 'openai'
import { BaseChain, ChainInputs } from 'langchain/chains'
import { ChainValues } from 'langchain/schema'
import { BasePromptTemplate, ChatPromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'
import path from 'path'
import { getUserHome } from '../../../src/utils'
import fs from 'fs'

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
    temperature?: number
    modelName?: string
    maxTokens?: number
    topP?: number
    whisperConfig?: any
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
    prompt: BasePromptTemplate | undefined

    inputKey = 'input'
    outputKey = 'text'
    imageUrls?: []
    imageResolution: string = 'low'
    openAIApiKey?: string
    openAIOrganization?: string
    clientConfig: ClientOptions
    client: OpenAIClient
    throwError: boolean
    temperature?: number
    modelName?: string
    maxTokens?: number
    topP?: number

    whisperConfig?: any

    constructor(fields: OpenAIVisionChainInput) {
        super(fields)
        this.throwError = fields?.throwError ?? false
        this.imageResolution = fields?.imageResolution ?? 'low'
        this.openAIApiKey = fields?.openAIApiKey
        this.prompt = fields?.prompt
        this.temperature = fields?.temperature
        this.modelName = fields?.modelName
        this.maxTokens = fields?.maxTokens
        this.topP = fields?.topP
        this.imageUrls = fields?.imageUrls ?? []
        this.whisperConfig = fields?.whisperConfig ?? {}
        if (!this.openAIApiKey) {
            throw new Error('OpenAI API key not found')
        }

        this.openAIOrganization = fields?.openAIOrganization

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
            model: this.modelName,
            temperature: this.temperature,
            top_p: this.topP,
            messages: []
        }
        if (this.maxTokens) vRequest.max_tokens = this.maxTokens
        else vRequest.max_tokens = 1024

        const userRole: any = { role: 'user' }
        userRole.content = []
        userRole.content.push({
            type: 'text',
            text: userInput
        })
        if (this.whisperConfig && this.imageUrls && this.imageUrls.length > 0) {
            const audioUploads = this.getAudioUploads(this.imageUrls)
            for (const url of audioUploads) {
                const filePath = path.join(getUserHome(), '.flowise', 'gptvision', url.data, url.name)

                // as the image is stored in the server, read the file and convert it to base64
                const audio_file = fs.createReadStream(filePath)
                if (this.whisperConfig.purpose === 'transcription') {
                    const transcription = await this.client.audio.transcriptions.create({
                        file: audio_file,
                        model: 'whisper-1'
                    })
                    userRole.content.push({
                        type: 'text',
                        text: transcription.text
                    })
                } else if (this.whisperConfig.purpose === 'translation') {
                    const translation = await this.client.audio.translations.create({
                        file: audio_file,
                        model: 'whisper-1'
                    })
                    userRole.content.push({
                        type: 'text',
                        text: translation.text
                    })
                }
            }
        }
        if (this.imageUrls && this.imageUrls.length > 0) {
            const imageUploads = this.getImageUploads(this.imageUrls)
            for (const url of imageUploads) {
                let bf = url.data
                if (url.type == 'stored-file') {
                    const filePath = path.join(getUserHome(), '.flowise', 'gptvision', url.data, url.name)

                    // as the image is stored in the server, read the file and convert it to base64
                    const contents = fs.readFileSync(filePath)
                    bf = 'data:' + url.mime + ';base64,' + contents.toString('base64')
                }
                userRole.content.push({
                    type: 'image_url',
                    image_url: {
                        url: bf,
                        detail: this.imageResolution
                    }
                })
            }
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

    getAudioUploads = (urls: any[]) => {
        return urls.filter((url: any) => url.mime.startsWith('audio/'))
    }

    getImageUploads = (urls: any[]) => {
        return urls.filter((url: any) => url.mime.startsWith('image/'))
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
