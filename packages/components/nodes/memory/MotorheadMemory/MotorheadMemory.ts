import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { MotorheadMemory, MotorheadMemoryInput } from 'langchain/memory'
import fetch from 'node-fetch'

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
        this.icon = 'motorhead.png'
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

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const motorhead = await initalizeMotorhead(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing Motorhead memory session ${sessionId ? sessionId : chatId}`)
        await motorhead.clear()
        options.logger.info(`Successfully cleared Motorhead memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initalizeMotorhead = async (nodeData: INodeData, options: ICommonObject): Promise<MotorheadMemory> => {
    const memoryKey = nodeData.inputs?.memoryKey as string
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
    const clientId = getCredentialParam('clientId', credentialData, nodeData)

    let obj: MotorheadMemoryInput & Partial<MotorheadMemoryExtendedInput> = {
        returnMessages: true,
        sessionId: sessionId ? sessionId : chatId,
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

    if (isSessionIdUsingChatMessageId) obj.isSessionIdUsingChatMessageId = true

    const motorheadMemory = new MotorheadMemoryExtended(obj)

    // Get messages from sessionId
    await motorheadMemory.init()

    return motorheadMemory
}

interface MotorheadMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
}

class MotorheadMemoryExtended extends MotorheadMemory {
    isSessionIdUsingChatMessageId? = false

    constructor(fields: MotorheadMemoryInput & Partial<MotorheadMemoryExtendedInput>) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
    }

    async clear(): Promise<void> {
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
}

module.exports = { nodeClass: MotorMemory_Memory }
