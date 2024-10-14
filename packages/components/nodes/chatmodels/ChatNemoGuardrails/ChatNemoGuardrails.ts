import { BaseChatModel, type BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { AIMessageChunk, BaseMessage } from '@langchain/core/messages'
import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models'
import { NemoClient } from './NemoClient'
import { CallbackManager, CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { ChatResult } from '@langchain/core/outputs'
import { FailedAttemptHandler } from '@langchain/core/utils/async_caller'
import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'

export interface ChatNemoGuardrailsCallOptions extends BaseChatModelCallOptions {
    /**
     * An array of strings to stop on.
     */
    stop?: string[]
}

export interface ChatNemoGuardrailsInput extends BaseChatModelParams {
    configurationId?: string
    /**
     * The host URL of the Nemo server.
     * @default "http://localhost:8000"
     */
    baseUrl?: string
}

class ChatNemoGuardrailsModel extends BaseChatModel<ChatNemoGuardrailsCallOptions, AIMessageChunk> implements ChatNemoGuardrailsInput {
    configurationId: string
    id: string
    baseUrl: string
    callbackManager?: CallbackManager | undefined
    maxConcurrency?: number | undefined
    maxRetries?: number | undefined
    onFailedAttempt?: FailedAttemptHandler | undefined
    client: NemoClient

    _llmType(): string {
        return 'nemo-guardrails'
    }

    _generate(messages: BaseMessage[], options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
        const generate = async (messages: BaseMessage[], client: NemoClient): Promise<ChatResult> => {
            const chatMessages = await client.chat(messages)
            const generations = chatMessages.map((message) => {
                return {
                    text: message.content?.toString() ?? '',
                    message
                }
            })

            await runManager?.handleLLMNewToken(generations.length ? generations[0].text : '')

            return {
                generations
            }
        }
        return generate(messages, this.client)
    }

    constructor({ id, fields }: { id: string; fields: Partial<ChatNemoGuardrailsInput> & BaseChatModelParams }) {
        super(fields)
        this.id = id
        this.configurationId = fields.configurationId ?? ''
        this.baseUrl = fields.baseUrl ?? ''
        this.callbackManager = fields.callbackManager
        this.maxConcurrency = fields.maxConcurrency
        this.maxRetries = fields.maxRetries
        this.onFailedAttempt = fields.onFailedAttempt
        this.client = new NemoClient(this.baseUrl, this.configurationId)
    }
}

class ChatNemoGuardrailsChatModel implements INode {
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
        this.label = 'Chat Nemo Guardrails'
        this.name = 'chatNemoGuardrails'
        this.version = 1.0
        this.type = 'ChatNemoGuardrails'
        this.icon = 'nemo.svg'
        this.category = 'Chat Models'
        this.description = 'Access models through the Nemo Guardrails API'
        this.baseClasses = [this.type, ...getBaseClasses(ChatNemoGuardrailsModel)]
        this.inputs = [
            {
                label: 'Configuration ID',
                name: 'configurationId',
                type: 'string',
                optional: false
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                optional: false
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const configurationId = nodeData.inputs?.configurationId
        const baseUrl = nodeData.inputs?.baseUrl
        const obj: Partial<ChatNemoGuardrailsInput> = {
            configurationId: configurationId,
            baseUrl: baseUrl
        }
        const model = new ChatNemoGuardrailsModel({ id: nodeData.id, fields: obj })
        return model
    }
}

module.exports = { nodeClass: ChatNemoGuardrailsChatModel }
