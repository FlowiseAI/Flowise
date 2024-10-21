import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata } from '@langchain/langgraph'
import { RunnableConfig } from '@langchain/core/runnables'
import { BaseMessage } from '@langchain/core/messages'
import { DataSource, QueryRunner } from 'typeorm'
import { CheckpointTuple, SaverOptions, SerializerProtocol } from './interface'
import { IMessage, MemoryMethods } from '../../../src/Interface'
import { mapChatMessageToBaseMessage } from '../../../src/utils'

export class SqliteSaver extends BaseCheckpointSaver implements MemoryMethods {
    protected isSetup: boolean

    datasource: DataSource

    queryRunner: QueryRunner

    config: SaverOptions

    threadId: string

    tableName = 'checkpoints'

    constructor(config: SaverOptions, serde?: SerializerProtocol<Checkpoint>) {
        super(serde)
        this.config = config
        const { datasourceOptions, threadId } = config
        this.threadId = threadId
        this.datasource = new DataSource(datasourceOptions)
    }

    private async setup(): Promise<void> {
        if (this.isSetup) {
            return
        }

        try {
            const appDataSource = await this.datasource.initialize()

            this.queryRunner = appDataSource.createQueryRunner()
            await this.queryRunner.manager.query(`
CREATE TABLE IF NOT EXISTS ${this.tableName} (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_id TEXT,
    checkpoint BLOB,
    metadata BLOB,
    PRIMARY KEY (thread_id, checkpoint_id));`)
        } catch (error) {
            console.error(`Error creating ${this.tableName} table`, error)
            throw new Error(`Error creating ${this.tableName} table`)
        }

        this.isSetup = true
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        await this.setup()
        const thread_id = config.configurable?.thread_id || this.threadId
        const checkpoint_id = config.configurable?.checkpoint_id

        if (checkpoint_id) {
            try {
                const keys = [thread_id, checkpoint_id]
                const sql = `SELECT checkpoint, parent_id, metadata FROM ${this.tableName} WHERE thread_id = ? AND checkpoint_id = ?`

                const rows = await this.queryRunner.manager.query(sql, [...keys])

                if (rows && rows.length > 0) {
                    return {
                        config,
                        checkpoint: (await this.serde.parse(rows[0].checkpoint)) as Checkpoint,
                        metadata: (await this.serde.parse(rows[0].metadata)) as CheckpointMetadata,
                        parentConfig: rows[0].parent_id
                            ? {
                                  configurable: {
                                      thread_id,
                                      checkpoint_id: rows[0].parent_id
                                  }
                              }
                            : undefined
                    }
                }
            } catch (error) {
                console.error(`Error retrieving ${this.tableName}`, error)
                throw new Error(`Error retrieving ${this.tableName}`)
            }
        } else {
            const keys = [thread_id]
            const sql = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata FROM ${this.tableName} WHERE thread_id = ? ORDER BY checkpoint_id DESC LIMIT 1`

            const rows = await this.queryRunner.manager.query(sql, [...keys])

            if (rows && rows.length > 0) {
                return {
                    config: {
                        configurable: {
                            thread_id: rows[0].thread_id,
                            checkpoint_id: rows[0].checkpoint_id
                        }
                    },
                    checkpoint: (await this.serde.parse(rows[0].checkpoint)) as Checkpoint,
                    metadata: (await this.serde.parse(rows[0].metadata)) as CheckpointMetadata,
                    parentConfig: rows[0].parent_id
                        ? {
                              configurable: {
                                  thread_id: rows[0].thread_id,
                                  checkpoint_id: rows[0].parent_id
                              }
                          }
                        : undefined
                }
            }
        }
        return undefined
    }

    async *list(config: RunnableConfig, limit?: number, before?: RunnableConfig): AsyncGenerator<CheckpointTuple> {
        await this.setup()
        const thread_id = config.configurable?.thread_id || this.threadId
        let sql = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata FROM ${this.tableName} WHERE thread_id = ? ${
            before ? 'AND checkpoint_id < ?' : ''
        } ORDER BY checkpoint_id DESC`
        if (limit) {
            sql += ` LIMIT ${limit}`
        }
        const args = [thread_id, before?.configurable?.checkpoint_id].filter(Boolean)

        try {
            const rows = await this.queryRunner.manager.query(sql, [...args])

            if (rows && rows.length > 0) {
                for (const row of rows) {
                    yield {
                        config: {
                            configurable: {
                                thread_id: row.thread_id,
                                checkpoint_id: row.checkpoint_id
                            }
                        },
                        checkpoint: (await this.serde.parse(row.checkpoint)) as Checkpoint,
                        metadata: (await this.serde.parse(row.metadata)) as CheckpointMetadata,
                        parentConfig: row.parent_id
                            ? {
                                  configurable: {
                                      thread_id: row.thread_id,
                                      checkpoint_id: row.parent_id
                                  }
                              }
                            : undefined
                    }
                }
            }
        } catch (error) {
            console.error(`Error listing ${this.tableName}`, error)
            throw new Error(`Error listing ${this.tableName}`)
        }
    }

    async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
        await this.setup()
        if (!config.configurable?.checkpoint_id) return {}
        try {
            const row = [
                config.configurable?.thread_id || this.threadId,
                checkpoint.id,
                config.configurable?.checkpoint_id,
                this.serde.stringify(checkpoint),
                this.serde.stringify(metadata)
            ]

            const query = `INSERT OR REPLACE INTO ${this.tableName} (thread_id, checkpoint_id, parent_id, checkpoint, metadata) VALUES (?, ?, ?, ?, ?)`

            await this.queryRunner.manager.query(query, row)
        } catch (error) {
            console.error('Error saving checkpoint', error)
            throw new Error('Error saving checkpoint')
        }

        return {
            configurable: {
                thread_id: config.configurable?.thread_id || this.threadId,
                checkpoint_id: checkpoint.id
            }
        }
    }

    async delete(threadId: string): Promise<void> {
        if (!threadId) {
            return
        }
        await this.setup()
        const query = `DELETE FROM "${this.tableName}" WHERE thread_id = ?;`

        try {
            await this.queryRunner.manager.query(query, [threadId])
        } catch (error) {
            console.error(`Error deleting thread_id ${threadId}`, error)
        }
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        if (!overrideSessionId) return []

        const chatMessage = await this.config.appDataSource.getRepository(this.config.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: overrideSessionId,
                chatflowid: this.config.chatflowid
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
        // Empty as its not being used
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        await this.delete(overrideSessionId)
    }
}
