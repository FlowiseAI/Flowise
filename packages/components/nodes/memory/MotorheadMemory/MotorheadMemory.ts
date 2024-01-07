import { IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { MotorheadMemory, MotorheadMemoryInput, InputValues, MemoryVariables, OutputValues, getBufferString } from 'langchain/memory'
import fetch from 'node-fetch'
import { BaseMessage } from 'langchain/schema'

class MotorMemory_Memory implements INode {
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
        this.label = 'Motorhead Memory'
        this.name = 'motorheadMemory'
        this.version = 1.0
        this.type = 'MotorheadMemory'
        this.icon = 'motorhead.svg'
        this.category = 'Memory'
        this.description = 'Use Motorhead Memory to store chat conversations'
        this.baseClasses = [this.type, ...getBaseClasses(MotorheadMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'Only needed when using hosted solution - https://getmetal.io',
            credentialNames: ['motorheadMemoryApi']
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                optional: true,
                description: 'To use the online version, leave the URL blank. More details at https://getmetal.io.'
            },
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description: 'If not specified, the first CHAT_MESSAGE_ID will be used as sessionId',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initalizeMotorhead(nodeData, options)
    }

    //@ts-ignore
    memoryMethods = {
        async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const motorhead = await initalizeMotorhead(nodeData, options)
            const sessionId = nodeData.inputs?.sessionId as string
            const chatId = options?.chatId as string
            options.logger.info(`Clearing Motorhead memory session ${sessionId ? sessionId : chatId}`)
            await motorhead.clear()
            options.logger.info(`Successfully cleared Motorhead memory session ${sessionId ? sessionId : chatId}`)
        },
        async getChatMessages(nodeData: INodeData, options: ICommonObject): Promise<string> {
            const memoryKey = nodeData.inputs?.memoryKey as string
            const motorhead = await initalizeMotorhead(nodeData, options)
            const key = memoryKey ?? 'chat_history'
            const memoryResult = await motorhead.loadMemoryVariables({})
            return getBufferString(memoryResult[key])
        }
    }
}

const initalizeMotorhead = async (nodeData: INodeData, options: ICommonObject): Promise<MotorheadMemory> => {
    const memoryKey = nodeData.inputs?.memoryKey as string
    const baseURL = nodeData.inputs?.baseURL as string
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
    const clientId = getCredentialParam('clientId', credentialData, nodeData)

    let obj: MotorheadMemoryInput & MotorheadMemoryExtendedInput = {
        returnMessages: true,
        isSessionIdUsingChatMessageId,
        sessionId,
        memoryKey
    }

    if (baseURL) {
        obj = {
            ...obj,
            url: baseURL
        }
    } else {
        obj = {
            ...obj,
            apiKey,
            clientId
        }
    }

    const motorheadMemory = new MotorheadMemoryExtended(obj)

    // Get messages from sessionId
    await motorheadMemory.init()

    return motorheadMemory
}

interface MotorheadMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
}

class MotorheadMemoryExtended extends MotorheadMemory implements MemoryMethods {
    isSessionIdUsingChatMessageId? = false

    constructor(fields: MotorheadMemoryInput & MotorheadMemoryExtendedInput) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.loadMemoryVariables({ values })
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
        try {
            await this.caller.call(fetch, `${this.url}/sessions/${this.sessionId}/memory`, {
                //@ts-ignore
                signal: this.timeout ? AbortSignal.timeout(this.timeout) : undefined,
                headers: this._getHeaders() as ICommonObject,
                method: 'DELETE'
            })
        } catch (error) {
            console.error('Error deleting session: ', error)
        }

        // Clear the superclass's chat history
        await this.chatHistory.clear()
        await super.clear()
    }

    async getChatMessages(overrideSessionId = '', returnBaseMessages = false): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ?? this.sessionId
        const memoryVariables = await this.loadMemoryVariables({}, id)
        const baseMessages = memoryVariables[this.memoryKey]
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ?? this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')
        const inputValues = { [this.inputKey ?? 'input']: input?.text }
        const outputValues = { output: output?.text }

        await this.saveContext(inputValues, outputValues, id)
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ?? this.sessionId
        await this.clear(id)
    }
}

module.exports = { nodeClass: MotorMemory_Memory }
