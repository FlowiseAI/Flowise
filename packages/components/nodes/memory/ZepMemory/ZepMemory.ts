import { ZepMemory, ZepMemoryInput } from '@langchain/community/memory/zep'
import { BaseMessage } from '@langchain/core/messages'
import { InputValues, MemoryVariables, OutputValues } from 'langchain/memory'
import { IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType, ICommonObject } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'

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
        this.label = 'Zep Memory - Open Source'
        this.name = 'ZepMemory'
        this.version = 2.0
        this.type = 'ZepMemory'
        this.icon = 'zep.svg'
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
                default: '10',
                description: 'Window of size k to surface the last k back-and-forth to use as memory.',
                additionalParams: true
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
        return await initializeZep(nodeData, options)
    }
}

const initializeZep = async (nodeData: INodeData, options: ICommonObject): Promise<ZepMemory> => {
    const baseURL = nodeData.inputs?.baseURL as string
    const aiPrefix = nodeData.inputs?.aiPrefix as string
    const humanPrefix = nodeData.inputs?.humanPrefix as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const inputKey = nodeData.inputs?.inputKey as string
    const k = nodeData.inputs?.k as string
    const sessionId = nodeData.inputs?.sessionId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

    const obj: ZepMemoryInput & ZepMemoryExtendedInput = {
        baseURL,
        aiPrefix,
        humanPrefix,
        returnMessages: true,
        memoryKey,
        inputKey,
        sessionId,
        k: k ? parseInt(k, 10) : undefined
    }
    if (apiKey) obj.apiKey = apiKey

    return new ZepMemoryExtended(obj)
}

interface ZepMemoryExtendedInput {
    k?: number
}

class ZepMemoryExtended extends ZepMemory implements MemoryMethods {
    lastN?: number

    constructor(fields: ZepMemoryInput & ZepMemoryExtendedInput) {
        super(fields)
        this.lastN = fields.k
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.loadMemoryVariables({ ...values, lastN: this.lastN })
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideSessionId = ''): Promise<void> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.saveContext(inputValues, outputValues)
    }

    async clear(overrideSessionId = ''): Promise<void> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.clear()
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const memoryVariables = await this.loadMemoryVariables({}, id)
        const baseMessages = memoryVariables[this.memoryKey]
        if (prependMessages?.length) {
            baseMessages.unshift(...mapChatMessageToBaseMessage(prependMessages))
        }
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')
        const inputValues = { [this.inputKey ?? 'input']: input?.text }
        const outputValues = { output: output?.text }

        await this.saveContext(inputValues, outputValues, id)
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        await this.clear(id)
    }
}

module.exports = { nodeClass: ZepMemory_Memory }
