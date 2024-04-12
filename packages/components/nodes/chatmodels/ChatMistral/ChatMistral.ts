import { ChatCompletionResponse, ToolCalls as MistralAIToolCalls } from '@mistralai/mistralai'
import { BaseCache } from '@langchain/core/caches'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { NewTokenIndices } from '@langchain/core/callbacks/base'
import { ChatGeneration, ChatGenerationChunk, ChatResult } from '@langchain/core/outputs'
import {
    MessageType,
    type BaseMessage,
    MessageContent,
    AIMessage,
    HumanMessage,
    HumanMessageChunk,
    AIMessageChunk,
    ToolMessageChunk,
    ChatMessageChunk
} from '@langchain/core/messages'
import { ChatMistralAI as LangchainChatMistralAI, ChatMistralAIInput } from '@langchain/mistralai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

interface TokenUsage {
    completionTokens?: number
    promptTokens?: number
    totalTokens?: number
}

type MistralAIInputMessage = {
    role: string
    name?: string
    content: string | string[]
    tool_calls?: MistralAIToolCalls[] | any[]
}

class ChatMistral_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatMistralAI'
        this.name = 'chatMistralAI'
        this.version = 3.0
        this.type = 'ChatMistralAI'
        this.icon = 'MistralAI.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Mistral large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatMistralAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mistralAIApi']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'mistral-tiny'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                description:
                    'What sampling temperature to use, between 0.0 and 1.0. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                description: 'The maximum number of tokens to generate in the completion.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                description:
                    'Nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Random Seed',
                name: 'randomSeed',
                type: 'number',
                description: 'The seed to use for random sampling. If set, different calls will generate deterministic results.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Safe Mode',
                name: 'safeMode',
                type: 'boolean',
                description: 'Whether to inject a safety prompt before all conversations.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Override Endpoint',
                name: 'overrideEndpoint',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatMistralAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('mistralAIAPIKey', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const safeMode = nodeData.inputs?.safeMode as boolean
        const randomSeed = nodeData.inputs?.safeMode as string
        const overrideEndpoint = nodeData.inputs?.overrideEndpoint as string
        const streaming = nodeData.inputs?.streaming as boolean
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatMistralAIInput = {
            apiKey: apiKey,
            modelName: modelName,
            streaming: streaming ?? true
        }

        if (maxOutputTokens) obj.maxTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (cache) obj.cache = cache
        if (temperature) obj.temperature = parseFloat(temperature)
        if (randomSeed) obj.randomSeed = parseFloat(randomSeed)
        if (safeMode) obj.safeMode = safeMode
        if (overrideEndpoint) obj.endpoint = overrideEndpoint

        const model = new ChatMistralAI(obj)

        return model
    }
}

class ChatMistralAI extends LangchainChatMistralAI {
    async _generate(
        messages: BaseMessage[],
        options?: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        const tokenUsage: TokenUsage = {}
        const params = this.invocationParams(options)
        const mistralMessages = this.convertMessagesToMistralMessages(messages)
        const input = {
            ...params,
            messages: mistralMessages
        }

        // Handle streaming
        if (this.streaming) {
            const stream = this._streamResponseChunks(messages, options, runManager)
            const finalChunks: Record<number, ChatGenerationChunk> = {}
            for await (const chunk of stream) {
                const index = (chunk.generationInfo as NewTokenIndices)?.completion ?? 0
                if (finalChunks[index] === undefined) {
                    finalChunks[index] = chunk
                } else {
                    finalChunks[index] = finalChunks[index].concat(chunk)
                }
            }
            const generations = Object.entries(finalChunks)
                .sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10))
                .map(([_, value]) => value)

            return { generations, llmOutput: { estimatedTokenUsage: tokenUsage } }
        }

        // Not streaming, so we can just call the API once.
        const response = await this.completionWithRetry(input, false)

        const { completion_tokens: completionTokens, prompt_tokens: promptTokens, total_tokens: totalTokens } = response?.usage ?? {}

        if (completionTokens) {
            tokenUsage.completionTokens = (tokenUsage.completionTokens ?? 0) + completionTokens
        }

        if (promptTokens) {
            tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + promptTokens
        }

        if (totalTokens) {
            tokenUsage.totalTokens = (tokenUsage.totalTokens ?? 0) + totalTokens
        }

        const generations: ChatGeneration[] = []
        for (const part of response?.choices ?? []) {
            if ('delta' in part) {
                throw new Error('Delta not supported in non-streaming mode.')
            }
            if (!('message' in part)) {
                throw new Error('No message found in the choice.')
            }
            const text = part.message?.content ?? ''
            const generation: ChatGeneration = {
                text,
                message: this.mistralAIResponseToChatMessage(part)
            }
            if (part.finish_reason) {
                generation.generationInfo = { finish_reason: part.finish_reason }
            }
            generations.push(generation)
        }
        return {
            generations,
            llmOutput: { tokenUsage }
        }
    }

    async *_streamResponseChunks(
        messages: BaseMessage[],
        options?: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const mistralMessages = this.convertMessagesToMistralMessages(messages)
        const params = this.invocationParams(options)
        const input = {
            ...params,
            messages: mistralMessages
        }

        const streamIterable = await this.completionWithRetry(input, true)
        for await (const data of streamIterable) {
            const choice = data?.choices[0]
            if (!choice || !('delta' in choice)) {
                continue
            }

            const { delta } = choice
            if (!delta) {
                continue
            }
            const newTokenIndices = {
                prompt: 0,
                completion: choice.index ?? 0
            }
            const message = this._convertDeltaToMessageChunk(delta)
            if (message === null) {
                // Do not yield a chunk if the message is empty
                continue
            }
            const generationChunk = new ChatGenerationChunk({
                message,
                text: delta.content ?? '',
                generationInfo: newTokenIndices
            })
            yield generationChunk

            void runManager?.handleLLMNewToken(generationChunk.text ?? '', newTokenIndices, undefined, undefined, undefined, {
                chunk: generationChunk
            })
        }
        if (options?.signal?.aborted) {
            throw new Error('AbortError')
        }
    }

    _convertDeltaToMessageChunk(delta: {
        role?: string | undefined
        content?: string | undefined
        tool_calls?: MistralAIToolCalls[] | undefined
    }) {
        if (!delta.content && !delta.tool_calls) {
            return null
        }
        // Our merge additional kwargs util function will throw unless there
        // is an index key in each tool object (as seen in OpenAI's) so we
        // need to insert it here.
        const toolCallsWithIndex = delta.tool_calls?.length
            ? delta.tool_calls?.map((toolCall, index) => ({
                  ...toolCall,
                  index
              }))
            : undefined

        let role = 'assistant'
        if (delta.role) {
            role = delta.role
        } else if (toolCallsWithIndex) {
            role = 'tool'
        }
        const content = delta.content ?? ''
        let additional_kwargs
        if (toolCallsWithIndex) {
            additional_kwargs = {
                tool_calls: toolCallsWithIndex
            }
        } else {
            additional_kwargs = {}
        }

        if (role === 'user') {
            return new HumanMessageChunk({ content })
        } else if (role === 'assistant') {
            return new AIMessageChunk({ content, additional_kwargs })
        } else if (role === 'tool') {
            return new ToolMessageChunk({
                content,
                additional_kwargs,
                tool_call_id: toolCallsWithIndex?.[0].id ?? ''
            })
        } else {
            return new ChatMessageChunk({ content, role })
        }
    }

    convertMessagesToMistralMessages(messages: Array<BaseMessage>): Array<MistralAIInputMessage> {
        const getRole = (role: MessageType) => {
            switch (role) {
                case 'human':
                    return 'user'
                case 'ai':
                    return 'assistant'
                case 'tool':
                    return 'tool'
                case 'function':
                    return 'function'
                case 'system':
                    return 'system'
                default:
                    throw new Error(`Unknown message type: ${role}`)
            }
        }

        const getContent = (content: MessageContent): string => {
            if (typeof content === 'string') {
                return content
            }
            throw new Error(`ChatMistralAI does not support non text message content. Received: ${JSON.stringify(content, null, 2)}`)
        }

        const mistralMessages = []
        for (const msg of messages) {
            const msgObj: MistralAIInputMessage = {
                role: getRole(msg._getType()),
                content: getContent(msg.content)
            }
            if (getRole(msg._getType()) === 'tool') {
                msgObj.role = 'assistant'
                msgObj.tool_calls = msg.additional_kwargs?.tool_calls ?? []
            } else if (getRole(msg._getType()) === 'function') {
                msgObj.role = 'tool'
                msgObj.name = msg.name
            }

            mistralMessages.push(msgObj)
        }

        return mistralMessages
    }

    mistralAIResponseToChatMessage(choice: ChatCompletionResponse['choices'][0]): BaseMessage {
        const { message } = choice
        // MistralAI SDK does not include tool_calls in the non
        // streaming return type, so we need to extract it like this
        // to satisfy typescript.
        let toolCalls: MistralAIToolCalls[] = []
        if ('tool_calls' in message) {
            toolCalls = message.tool_calls as MistralAIToolCalls[]
        }
        switch (message.role) {
            case 'assistant':
                return new AIMessage({
                    content: message.content ?? '',
                    additional_kwargs: {
                        tool_calls: toolCalls
                    }
                })
            default:
                return new HumanMessage(message.content ?? '')
        }
    }
}

module.exports = { nodeClass: ChatMistral_ChatModels }
