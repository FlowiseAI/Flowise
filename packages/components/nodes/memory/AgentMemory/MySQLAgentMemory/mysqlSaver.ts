import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata } from '@langchain/langgraph'
import { RunnableConfig } from '@langchain/core/runnables'
import { BaseMessage } from '@langchain/core/messages'
import { DataSource } from 'typeorm'
import { CheckpointTuple, SaverOptions, SerializerProtocol } from '../interface'
import { IMessage, MemoryMethods } from '../../../../src/Interface'
import { mapChatMessageToBaseMessage } from '../../../../src/utils'

export class MySQLSaver extends BaseCheckpointSaver implements MemoryMethods {
    protected isSetup: boolean
    config: SaverOptions
    threadId: string
    tableName = 'checkpoints'

    constructor(config: SaverOptions, serde?: SerializerProtocol<Checkpoint>) {
        super(serde)
        this.config = config
        const { threadId } = config
        this.threadId = threadId
    }

    sanitizeTableName(tableName: string): string {
        // Trim and normalize case, turn whitespace into underscores
        tableName = tableName.trim().toLowerCase().replace(/\s+/g, '_')

        // Validate using a regex (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name')
        }

        return tableName
    }

    private async getDataSource(): Promise<DataSource> {
        const { datasourceOptions } = this.config
        if (!datasourceOptions) {
            throw new Error('No datasource options provided')
        }
        // Prevent using default Postgres port, otherwise will throw uncaught error and crashing the app
        if (datasourceOptions.port === 5432) {
            throw new Error('Invalid port number')
        }
        const dataSource = new DataSource(datasourceOptions)
        await dataSource.initialize()
        return dataSource
    }

    private async setup(dataSource: DataSource): Promise<void> {
        if (this.isSetup) return

        try {
            const queryRunner = dataSource.createQueryRunner()
            const tableName = this.sanitizeTableName(this.tableName)
            await queryRunner.manager.query(`
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    thread_id VARCHAR(255) NOT NULL,
                    checkpoint_id VARCHAR(255) NOT NULL,
                    parent_id VARCHAR(255),
                    checkpoint BLOB,
                    metadata BLOB,
                    PRIMARY KEY (thread_id, checkpoint_id)
                );`)
            await queryRunner.release()
        } catch (error) {
            console.error(`Error creating ${this.tableName} table`, error)
            throw new Error(`Error creating ${this.tableName} table`)
        }

        this.isSetup = true
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const dataSource = await this.getDataSource()
        await this.setup(dataSource)

        const thread_id = config.configurable?.thread_id || this.threadId
        const checkpoint_id = config.configurable?.checkpoint_id
        const tableName = this.sanitizeTableName(this.tableName)

        try {
            const queryRunner = dataSource.createQueryRunner()
            const sql = checkpoint_id
                ? `SELECT checkpoint, parent_id, metadata FROM ${tableName} WHERE thread_id = ? AND checkpoint_id = ?`
                : `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata FROM ${tableName} WHERE thread_id = ? ORDER BY checkpoint_id DESC LIMIT 1`

            const rows = await queryRunner.manager.query(sql, checkpoint_id ? [thread_id, checkpoint_id] : [thread_id])
            await queryRunner.release()

            if (rows && rows.length > 0) {
                const row = rows[0]
                return {
                    config: {
                        configurable: {
                            thread_id: row.thread_id || thread_id,
                            checkpoint_id: row.checkpoint_id || checkpoint_id
                        }
                    },
                    checkpoint: (await this.serde.parse(row.checkpoint.toString())) as Checkpoint,
                    metadata: (await this.serde.parse(row.metadata.toString())) as CheckpointMetadata,
                    parentConfig: row.parent_id
                        ? {
                              configurable: {
                                  thread_id,
                                  checkpoint_id: row.parent_id
                              }
                          }
                        : undefined
                }
            }
        } catch (error) {
            console.error(`Error retrieving ${this.tableName}`, error)
            throw new Error(`Error retrieving ${this.tableName}`)
        } finally {
            await dataSource.destroy()
        }
        return undefined
    }

    async *list(config: RunnableConfig, limit?: number, before?: RunnableConfig): AsyncGenerator<CheckpointTuple, void, unknown> {
        const dataSource = await this.getDataSource()
        await this.setup(dataSource)
        const queryRunner = dataSource.createQueryRunner()
        try {
            const threadId = config.configurable?.thread_id || this.threadId
            const tableName = this.sanitizeTableName(this.tableName)
            let sql = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata FROM ${tableName} WHERE thread_id = ? ${
                before ? 'AND checkpoint_id < ?' : ''
            } ORDER BY checkpoint_id DESC`
            if (limit) {
                sql += ` LIMIT ${limit}`
            }
            const args = [threadId, before?.configurable?.checkpoint_id].filter(Boolean)

            const rows = await queryRunner.manager.query(sql, args)
            await queryRunner.release()

            if (rows && rows.length > 0) {
                for (const row of rows) {
                    yield {
                        config: {
                            configurable: {
                                thread_id: row.thread_id,
                                checkpoint_id: row.checkpoint_id
                            }
                        },
                        checkpoint: (await this.serde.parse(row.checkpoint.toString())) as Checkpoint,
                        metadata: (await this.serde.parse(row.metadata.toString())) as CheckpointMetadata,
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
            console.error(`Error listing checkpoints`, error)
            throw new Error(`Error listing checkpoints`)
        } finally {
            await dataSource.destroy()
        }
    }

    async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
        const dataSource = await this.getDataSource()
        await this.setup(dataSource)

        if (!config.configurable?.checkpoint_id) return {}
        try {
            const queryRunner = dataSource.createQueryRunner()
            const row = [
                config.configurable?.thread_id || this.threadId,
                checkpoint.id,
                config.configurable?.checkpoint_id,
                Buffer.from(this.serde.stringify(checkpoint)), // Encode to binary
                Buffer.from(this.serde.stringify(metadata)) // Encode to binary
            ]
            const tableName = this.sanitizeTableName(this.tableName)

            const query = `INSERT INTO ${tableName} (thread_id, checkpoint_id, parent_id, checkpoint, metadata)
                           VALUES (?, ?, ?, ?, ?)
                           ON DUPLICATE KEY UPDATE checkpoint = VALUES(checkpoint), metadata = VALUES(metadata)`

            await queryRunner.manager.query(query, row)
            await queryRunner.release()
        } catch (error) {
            console.error('Error saving checkpoint', error)
            throw new Error('Error saving checkpoint')
        } finally {
            await dataSource.destroy()
        }

        return {
            configurable: {
                thread_id: config.configurable?.thread_id || this.threadId,
                checkpoint_id: checkpoint.id
            }
        }
    }

    async delete(threadId: string): Promise<void> {
        if (!threadId) return

        const dataSource = await this.getDataSource()
        await this.setup(dataSource)
        const tableName = this.sanitizeTableName(this.tableName)

        try {
            const queryRunner = dataSource.createQueryRunner()
            const query = `DELETE FROM ${tableName} WHERE thread_id = ?;`
            await queryRunner.manager.query(query, [threadId])
            await queryRunner.release()
        } catch (error) {
            console.error(`Error deleting thread_id ${threadId}`, error)
        } finally {
            await dataSource.destroy()
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
            return await mapChatMessageToBaseMessage(chatMessage, this.config.orgId)
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
        // Empty as it's not being used
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        if (!overrideSessionId) return
        await this.delete(overrideSessionId)
    }
}
