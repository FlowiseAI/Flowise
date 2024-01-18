import { OpenAI as OpenAIClient, ClientOptions, OpenAI } from 'openai'
import { BaseChain, ChainInputs } from 'langchain/chains'
import { ChainValues } from 'langchain/schema'
import { BasePromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'
import path from 'path'
import { getUserHome } from '../../../src/utils'
import fs from 'fs'
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/src/resources/chat/completions'
import ChatCompletionCreateParamsNonStreaming = OpenAI.ChatCompletionCreateParamsNonStreaming
import { IFileUpload } from '../../../src'

/**
 * Interface for the input parameters of the OpenAIVisionChain class.
 */
export interface OpenAIMultiModalChainInput extends ChainInputs {
    openAIApiKey?: string
    openAIOrganization?: string
    throwError?: boolean
    prompt?: BasePromptTemplate
    configuration?: ClientOptions
    uploads?: IFileUpload[]
    imageResolution?: 'auto' | 'low' | 'high'
    temperature?: number
    modelName?: string
    maxTokens?: number
    topP?: number
    speechToTextMode?: string
}

/**
 * Class representing a chain for generating text from an image using the OpenAI
 * Vision API. It extends the BaseChain class and implements the
 * OpenAIVisionChainInput interface.
 */
export class VLLMChain extends BaseChain implements OpenAIMultiModalChainInput {
    static lc_name() {
        return 'VLLMChain'
    }
    prompt: BasePromptTemplate | undefined

    inputKey = 'input'
    outputKey = 'text'
    uploads?: IFileUpload[]
    imageResolution: 'auto' | 'low' | 'high'
    openAIApiKey?: string
    openAIOrganization?: string
    clientConfig: ClientOptions
    client: OpenAIClient
    throwError: boolean
    temperature?: number
    modelName?: string
    maxTokens?: number
    topP?: number

    speechToTextMode?: any

    constructor(fields: OpenAIMultiModalChainInput) {
        super(fields)
        this.throwError = fields?.throwError ?? false
        this.imageResolution = fields?.imageResolution ?? 'low'
        this.openAIApiKey = fields?.openAIApiKey
        this.prompt = fields?.prompt
        this.temperature = fields?.temperature
        this.modelName = fields?.modelName
        this.maxTokens = fields?.maxTokens
        this.topP = fields?.topP
        this.uploads = fields?.uploads ?? []
        this.speechToTextMode = fields?.speechToTextMode ?? {}
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

        const vRequest: ChatCompletionCreateParamsNonStreaming = {
            model: 'gpt-4-vision-preview',
            temperature: this.temperature,
            top_p: this.topP,
            messages: []
        }
        if (this.maxTokens) vRequest.max_tokens = this.maxTokens
        else vRequest.max_tokens = 1024

        const chatMessages: ChatCompletionContentPart[] = []
        const userRole: ChatCompletionMessageParam = { role: 'user', content: [] }
        chatMessages.push({
            type: 'text',
            text: userInput
        })
        if (this.speechToTextMode && this.uploads && this.uploads.length > 0) {
            const audioUploads = this.getAudioUploads(this.uploads)
            for (const upload of audioUploads) {
                await this.processAudioWithWisper(upload, chatMessages)
            }
        }
        if (this.uploads && this.uploads.length > 0) {
            const imageUploads = this.getImageUploads(this.uploads)
            for (const upload of imageUploads) {
                let bf = upload.data
                if (upload.type == 'stored-file') {
                    const filePath = path.join(getUserHome(), '.flowise', 'gptvision', upload.data, upload.name)

                    // as the image is stored in the server, read the file and convert it to base64
                    const contents = fs.readFileSync(filePath)
                    bf = 'data:' + upload.mime + ';base64,' + contents.toString('base64')
                }
                chatMessages.push({
                    type: 'image_url',
                    image_url: {
                        url: bf,
                        detail: this.imageResolution
                    }
                })
            }
        }
        userRole.content = chatMessages
        vRequest.messages.push(userRole)
        if (this.prompt && this.prompt instanceof ChatPromptTemplate) {
            let chatPrompt = this.prompt as ChatPromptTemplate
            chatPrompt.promptMessages.forEach((message: any) => {
                if (message instanceof SystemMessagePromptTemplate) {
                    vRequest.messages.push({
                        role: 'system',
                        content: (message.prompt as any).template
                    })
                } else if (message instanceof HumanMessagePromptTemplate) {
                    vRequest.messages.push({
                        role: 'user',
                        content: (message.prompt as any).template
                    })
                }
            })
        }

        let response
        try {
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

    public async processAudioWithWisper(upload: IFileUpload, chatMessages: ChatCompletionContentPart[] | undefined): Promise<string> {
        const filePath = path.join(getUserHome(), '.flowise', 'gptvision', upload.data, upload.name)

        // as the image is stored in the server, read the file and convert it to base64
        const audio_file = fs.createReadStream(filePath)
        if (this.speechToTextMode === 'transcriptions') {
            const transcription = await this.client.audio.transcriptions.create({
                file: audio_file,
                model: 'whisper-1'
            })
            if (chatMessages) {
                chatMessages.push({
                    type: 'text',
                    text: transcription.text
                })
            }
            return transcription.text
        } else if (this.speechToTextMode === 'translations') {
            const translation = await this.client.audio.translations.create({
                file: audio_file,
                model: 'whisper-1'
            })
            if (chatMessages) {
                chatMessages.push({
                    type: 'text',
                    text: translation.text
                })
            }
            return translation.text
        }
        //should never get here
        return ''
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
