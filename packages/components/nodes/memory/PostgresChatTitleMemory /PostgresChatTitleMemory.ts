import pg from 'pg'
import { mapStoredMessageToChatMessage, AIMessage, StoredMessage, BaseMessage } from '@langchain/core/messages'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { convertBaseMessagetoIMessage, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'

class PostgresChatTitle_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    badge: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Postgres Chat Title Memory'
        this.name = 'PostgresChatTitleMemory'
        this.version = 1.0
        this.type = 'PostgresChatTitleMemory'
        this.icon = 'postgres.svg'
        this.category = 'Memory'
        this.description = 'Generates the chat title'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.badge = 'NEW'
        this.inputs = [
            {
                label: 'Host',
                name: 'host',
                type: 'string'
            },
            {
                label: 'Database',
                name: 'database',
                type: 'string'
            },
            {
                label: 'Port',
                name: 'port',
                type: 'number',
                placeholder: '5432',
                optional: true
            },
            {
                label: 'Chat Table Name',
                name: 'chatTableName',
                type: 'string',
                placeholder: 'Chat'
            },
            {
                label: 'Messages Table Name',
                name: 'messageTableName',
                type: 'string',
                placeholder: 'Messages'
            },
            {
                label: 'Chat Id',
                name: 'chatId',
                type: 'string',
                placeholder: '111111',
                additionalParams: true
            },
            {
                label: 'User Id',
                name: 'userId',
                type: 'string',
                placeholder: 'mario',
                additionalParams: true
            },
            {
                label: 'Workspace Id',
                name: 'userId',
                type: 'string',
                placeholder: 'workspaceId',
                additionalParams: true
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['PostgresApi']
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData)
        const password = getCredentialParam('password', credentialData, nodeData)
        const chatTableName = nodeData.inputs?.chatTableName as string
        const messageTableName = nodeData.inputs?.messageTableName as string
        const userId = nodeData.inputs?.userId as string
        const chatId = nodeData.inputs?.chatId as string
        const workspaceId = nodeData.inputs?.workspaceId as string

        const poolConfig = {
            host: '127.0.0.1',
            port: 5432,
            user: 'postgres',
            password: 'postgres',
            database: 'ignite'
        }

        const memory = new BufferMemoryExtended({
            chatTableName,
            messageTableName,
            userId,
            chatId,
            workspaceId,
            poolConfig
        })
        return memory
    }
}

interface BufferMemoryExtendedInput {
    chatTableName: string
    messageTableName: string
    userId: string
    chatId: string
    workspaceId: string
    poolConfig: pg.PoolConfig
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    private chatTableName = ''
    private messageTableName = ''
    private userId = ''
    private chatId = ''
    private workspaceId = ''
    poolConfig: pg.PoolConfig

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.chatTableName = fields.chatTableName
        this.messageTableName = fields.messageTableName
        this.userId = fields.userId
        this.chatId = fields.chatId
        this.workspaceId = fields.workspaceId
        this.poolConfig = fields.poolConfig
    }

    async getChatMessages(overrideSessionId = '', returnBaseMessages = false): Promise<IMessage[] | BaseMessage[]> {
        if (!this.poolConfig) return []

        const pool = new pg.Pool(this.poolConfig)

        try {
            const query = `
                SELECT * FROM "Message"
                WHERE "conversationId" = $1
                ORDER BY "createdAt";
            `
            const values = [this.chatId]
            const res = await pool.query(query, values)

            const messages = res.rows
                .map((chat) => ({
                    type: chat.role,
                    data: {
                        content: chat.content
                    }
                }))
                .filter((x): x is StoredMessage => x.type !== undefined && x.data.content !== undefined)

            const baseMessages = messages.map(mapStoredMessageToChatMessage)
            return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
        } catch (error) {
            console.error('Postgres Error getting chat history:', error)
        } finally {
            await pool.end()
        }

        // code should never get here
        return []
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[]): Promise<void> {
        if (!this.poolConfig) return
        const pool = new pg.Pool(this.poolConfig)

        // grab the AI message and set as title
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())

            try {
                const query = `
                INSERT INTO "Conversation" ("id", "title", "workspaceId", "userId", "updatedAt")
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT ("id") DO UPDATE
                SET "title" = EXCLUDED."title";
                `
                const values = [this.chatId, messageToAdd[0].data.content, this.workspaceId, this.userId]

                await pool.query(query, values)
            } catch (error) {
                console.error('Postgres Error upserting the chat title:', error)
            } finally {
                await pool.end()
            }
        }
    }

    async clearChatMessages(): Promise<void> {
        if (!this.poolConfig) return
        const pool = new pg.Pool(this.poolConfig)

        try {
            const query = `
                DELETE FROM "Message" 
                WHERE "conversationId" = $1
            `
            const values = [this.chatId]

            await pool.query(query, values)
        } catch (error) {
            console.error('Postgres Error adding new message in chat:', error)
        } finally {
            await pool.end()
        }
    }
}

module.exports = { nodeClass: PostgresChatTitle_Memory }
