import { ZepMemory, ZepMemoryInput } from 'langchain/memory/zep'
import { getBufferString, InputValues, MemoryVariables, OutputValues } from 'langchain/memory'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src'

class ZepMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Zep Memory'
        this.name = 'ZepMemory'
        this.version = 2.0
        this.type = 'ZepMemory'
        this.icon = 'zep.png'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in zep server'
        this.baseClasses = [this.type, ...getBaseClasses(ZepMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'Configure JWT authentication on your Zep instance (Optional)',
            credentialNames: ['zepMemoryApi']
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                default: 'http://127.0.0.1:8000'
            },
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description:
                    'If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory/long-term-memory#ui-and-embedded-chat">more</a>',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Size',
                name: 'k',
                type: 'number',
                placeholder: '10',
                description: 'Window of size k to surface the last k back-and-forth to use as memory.',
                additionalParams: true,
                optional: true
            },
            {
                label: 'AI Prefix',
                name: 'aiPrefix',
                type: 'string',
                default: 'ai',
                additionalParams: true
            },
            {
                label: 'Human Prefix',
                name: 'humanPrefix',
                type: 'string',
                default: 'human',
                additionalParams: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            },
            {
                label: 'Input Key',
                name: 'inputKey',
                type: 'string',
                default: 'input',
                additionalParams: true
            },
            {
                label: 'Output Key',
                name: 'outputKey',
                type: 'string',
                default: 'text',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return await initalizeZep(nodeData, options)
    }

    //@ts-ignore
    memoryMethods = {
        async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const zep = await initalizeZep(nodeData, options)
            const sessionId = nodeData.inputs?.sessionId as string
            const chatId = options?.chatId as string
            options.logger.info(`Clearing Zep memory session ${sessionId ? sessionId : chatId}`)
            await zep.clear()
            options.logger.info(`Successfully cleared Zep memory session ${sessionId ? sessionId : chatId}`)
        },
        async getChatMessages(nodeData: INodeData, options: ICommonObject): Promise<string> {
            const memoryKey = nodeData.inputs?.memoryKey as string
            const aiPrefix = nodeData.inputs?.aiPrefix as string
            const humanPrefix = nodeData.inputs?.humanPrefix as string
            const zep = await initalizeZep(nodeData, options)
            const key = memoryKey ?? 'chat_history'
            const memoryResult = await zep.loadMemoryVariables({})
            return getBufferString(memoryResult[key], humanPrefix, aiPrefix)
        }
    }
}

const initalizeZep = async (nodeData: INodeData, options: ICommonObject): Promise<ZepMemory> => {
    const baseURL = nodeData.inputs?.baseURL as string
    const aiPrefix = nodeData.inputs?.aiPrefix as string
    const humanPrefix = nodeData.inputs?.humanPrefix as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const inputKey = nodeData.inputs?.inputKey as string
    const k = nodeData.inputs?.k as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    let sessionId = ''

    if (!nodeData.inputs?.sessionId && chatId) {
        isSessionIdUsingChatMessageId = true
        sessionId = chatId
    } else {
        sessionId = nodeData.inputs?.sessionId
    }

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

    const obj: ZepMemoryInput & ZepMemoryExtendedInput = {
        baseURL,
        sessionId: sessionId ? sessionId : chatId,
        aiPrefix,
        humanPrefix,
        returnMessages: true,
        memoryKey,
        inputKey,
        isSessionIdUsingChatMessageId,
        k: k ? parseInt(k, 10) : undefined
    }
    if (apiKey) obj.apiKey = apiKey

    return new ZepMemoryExtended(obj)
}

interface ZepMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
    k?: number
}

class ZepMemoryExtended extends ZepMemory {
    isSessionIdUsingChatMessageId? = false
    lastN?: number

    constructor(fields: ZepMemoryInput & ZepMemoryExtendedInput) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
        this.lastN = fields.k
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        if (overrideSessionId) {
            super.sessionId = overrideSessionId
        }
        return super.loadMemoryVariables({ ...values, lastN: this.lastN })
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideSessionId = ''): Promise<void> {
        if (overrideSessionId) {
            super.sessionId = overrideSessionId
        }
        return super.saveContext(inputValues, outputValues)
    }

    async clear(overrideSessionId = ''): Promise<void> {
        if (overrideSessionId) {
            super.sessionId = overrideSessionId
        }
        return super.clear()
    }
}

module.exports = { nodeClass: ZepMemory_Memory }
