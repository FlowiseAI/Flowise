import { IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'
import { ZepMemory, ZepMemoryInput } from '@getzep/zep-cloud/langchain'

import { ICommonObject } from '../../../src'
import { InputValues, MemoryVariables, OutputValues } from 'langchain/memory'
import { BaseMessage } from 'langchain/schema'

class ZepMemoryCloud_Memory implements INode {
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
        this.label = 'Zep Memory - Cloud'
        this.name = 'ZepMemoryCloud'
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
                label: 'Memory Type',
                name: 'memoryType',
                type: 'string',
                default: 'perpetual',
                description: 'Zep Memory Type, can be perpetual or message_window',
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
    const aiPrefix = nodeData.inputs?.aiPrefix as string
    const humanPrefix = nodeData.inputs?.humanPrefix as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const inputKey = nodeData.inputs?.inputKey as string

    const memoryType = nodeData.inputs?.memoryType as 'perpetual' | 'message_window'
    const sessionId = nodeData.inputs?.sessionId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
    const obj: ZepMemoryInput & ZepMemoryExtendedInput = {
        apiKey,
        aiPrefix,
        humanPrefix,
        memoryKey,
        sessionId,
        inputKey,
        memoryType: memoryType,
        returnMessages: true
    }

    return new ZepMemoryExtended(obj)
}

interface ZepMemoryExtendedInput {
    memoryType?: 'perpetual' | 'message_window'
}

class ZepMemoryExtended extends ZepMemory implements MemoryMethods {
    memoryType: 'perpetual' | 'message_window'

    constructor(fields: ZepMemoryInput & ZepMemoryExtendedInput) {
        super(fields)
        this.memoryType = fields.memoryType ?? 'perpetual'
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.loadMemoryVariables({ ...values, memoryType: this.memoryType })
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

module.exports = { nodeClass: ZepMemoryCloud_Memory }
