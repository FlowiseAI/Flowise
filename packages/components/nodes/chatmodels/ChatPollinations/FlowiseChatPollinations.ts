import { BaseChatModel, BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { BaseMessage, ChatResult, MessageContent, MessageType } from '@langchain/core/messages'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { ChatGeneration, ChatGenerationChunk } from '@langchain/core/outputs'
import { IMultiModalOption, IVisionChatModal } from '../../../src'
import { getEnvironmentVariable } from '@langchain/core/utils/env'

export interface PollinationsChatInput extends BaseChatModelParams {
    modelName: string
    temperature?: number
    maxTokens?: number
    topP?: number
    streaming?: boolean
    timeout?: number
    baseUrl?: string
    private?: boolean
    seed?: number
}

export class ChatPollinations extends BaseChatModel implements IVisionChatModal {
    modelName: string
    temperature?: number
    maxTokens?: number
    topP?: number
    streaming?: boolean
    timeout?: number
    baseUrl: string
    private: boolean
    seed?: number
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: PollinationsChatInput) {
        super(fields ?? {})
        this.id = id
        this.modelName = fields?.modelName ?? 'openai'
        this.configuredModel = this.modelName
        this.temperature = fields?.temperature
        this.maxTokens = fields?.maxTokens
        this.configuredMaxToken = this.maxTokens
        this.topP = fields?.topP
        this.streaming = fields?.streaming ?? false
        this.timeout = fields?.timeout
        this.baseUrl = fields?.baseUrl ?? 'https://text.pollinations.ai'
        this.private = fields?.private ?? false
        this.seed = fields?.seed
    }

    _llmType(): string {
        return 'pollinations'
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // No specific vision model needed for Pollinations
    }

    async _generate(
        messages: BaseMessage[],
        options?: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        const url = `${this.baseUrl}/openai`
        
        const messagePayload = messages.map((message) => {
            return {
                role: message._getType(),
                content: message.content
            }
        })

        const payload = {
            model: this.modelName,
            messages: messagePayload,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            top_p: this.topP,
            stream: this.streaming,
            seed: this.seed,
            private: this.private
        }

        if (this.streaming && runManager) {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`Pollinations API error: ${error}`)
            }

            if (!response.body) {
                throw new Error('Pollinations API response body is null')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            let content = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk
                    .split('\n')
                    .filter((line) => line.trim() !== '' && line.startsWith('data:'))
                    .map((line) => line.replace('data:', '').trim())

                for (const line of lines) {
                    if (line === '[DONE]') continue
                    try {
                        const data = JSON.parse(line)
                        const chunkContent = data.choices[0]?.delta?.content || ''
                        content += chunkContent
                        
                        const chunkGeneration = new ChatGenerationChunk({
                            text: chunkContent,
                            message: {
                                content: chunkContent,
                                role: 'assistant',
                                name: undefined,
                                additional_kwargs: {}
                            }
                        })
                        
                        await runManager.handleLLMNewToken(chunkContent, {
                            chunk: chunkGeneration
                        })
                    } catch (e) {
                        console.error('Error parsing Pollinations API response chunk:', e)
                    }
                }
            }

            const generation = new ChatGeneration({
                text: content,
                message: {
                    content: content,
                    role: 'assistant',
                    name: undefined,
                    additional_kwargs: {}
                }
            })

            return {
                generations: [generation]
            }
        } else {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`Pollinations API error: ${error}`)
            }

            const data = await response.json()
            const content = data.choices[0]?.message?.content || ''

            const generation = new ChatGeneration({
                text: content,
                message: {
                    content: content,
                    role: 'assistant',
                    name: undefined,
                    additional_kwargs: {}
                }
            })

            return {
                generations: [generation]
            }
        }
    }
}
