import {
    FlowiseMemory,
    IDatabaseEntity,
    ICommonObject,
    IMessage,
    INode,
    INodeData,
    INodeParams,
    MemoryMethods
} from '../../../src/Interface'
import { getBaseClasses, mapChatMessageToBaseMessage } from '../../../src/utils'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { BaseMessage } from '@langchain/core/messages'
import { DataSource } from 'typeorm'

class BufferMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Buffer Memory'
        this.name = 'bufferMemory'
        this.version = 2.0
        this.type = 'BufferMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Retrieve chat messages stored in database'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.inputs = [
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description:
                    'If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory#ui-and-embedded-chat">more</a>',
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
        const sessionId = nodeData.inputs?.sessionId as string
        const memoryKey = (nodeData.inputs?.memoryKey as string) ?? 'chat_history'

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string

        return new BufferMemoryExtended({
            returnMessages: true,
            memoryKey,
            sessionId,
            appDataSource,
            databaseEntities,
            chatflowid
        })
    }
}

interface BufferMemoryExtendedInput {
    sessionId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    sessionId = ''

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        if (!id) return []

        const chatMessage = await this.appDataSource.getRepository(this.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: id,
                chatflowid: this.chatflowid
            },
            order: {
                createdDate: 'ASC'
            }
        })

        if (prependMessages?.length) {
            chatMessage.unshift(...prependMessages)
        }

        if (returnBaseMessages) {
            return await mapChatMessageToBaseMessage(chatMessage)
        }

        let returnIMessages: IMessage[] = []
        for (const m of chatMessage) {
            returnIMessages.push({
                message: m.content as string,
                type: m.role
            })
        }

        return returnIMessages
    }

    async addChatMessages(): Promise<void> {
        // adding chat messages is done on server level
        return
    }

    async clearChatMessages(): Promise<void> {
        // clearing chat messages is done on server level
        return
    }
}

module.exports = { nodeClass: BufferMemory_Memory }
