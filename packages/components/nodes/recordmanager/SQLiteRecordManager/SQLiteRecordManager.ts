import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getUserHome } from '../../../src/utils'
import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from '@langchain/community/indexes/base'
import { DataSource } from 'typeorm'
import path from 'path'

class SQLiteRecordManager_RecordManager implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'SQLite Record Manager'
        this.name = 'SQLiteRecordManager'
        this.version = 1.1
        this.type = 'SQLite RecordManager'
        this.icon = 'sqlite.png'
        this.category = 'Record Manager'
        this.description = 'Use SQLite to keep track of document writes into the vector databases'
        this.baseClasses = [this.type, 'RecordManager', ...getBaseClasses(SQLiteRecordManager)]
        this.inputs = [
            /*{
                label: 'Database File Path',
                name: 'databaseFilePath',
                type: 'string',
                placeholder: 'C:\\Users\\User\\.flowise\\database.sqlite'
            },*/
            {
                label: 'Additional Connection Configuration',
                name: 'additionalConfig',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string',
                placeholder: 'upsertion_records',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Namespace',
                name: 'namespace',
                type: 'string',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Cleanup',
                name: 'cleanup',
                type: 'options',
                description:
                    'Read more on the difference between different cleanup methods <a target="_blank" href="https://js.langchain.com/docs/modules/data_connection/indexing/#deletion-modes">here</a>',
                options: [
                    {
                        label: 'None',
                        name: 'none',
                        description: 'No clean up of old content'
                    },
                    {
                        label: 'Incremental',
                        name: 'incremental',
                        description:
                            'Delete previous versions of the content if content of the source document has changed. Important!! SourceId Key must be specified and document metadata must contains the specified key'
                    },
                    {
                        label: 'Full',
                        name: 'full',
                        description:
                            'Same as incremental, but if the source document has been deleted, it will be deleted from vector store as well, incremental mode will not.'
                    }
                ],
                additionalParams: true,
                default: 'none'
            },
            {
                label: 'SourceId Key',
                name: 'sourceIdKey',
                type: 'string',
                description:
                    'Key used to get the true source of document, to be compared against the record. Document metadata must contains SourceId Key',
                default: 'source',
                placeholder: 'source',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const _tableName = nodeData.inputs?.tableName as string
        const tableName = _tableName ? _tableName : 'upsertion_records'
        const additionalConfig = nodeData.inputs?.additionalConfig as string
        const _namespace = nodeData.inputs?.namespace as string
        const namespace = _namespace ? _namespace : options.chatflowid
        const cleanup = nodeData.inputs?.cleanup as string
        const _sourceIdKey = nodeData.inputs?.sourceIdKey as string
        const sourceIdKey = _sourceIdKey ? _sourceIdKey : 'source'

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
            }
        }

        const database = path.join(process.env.DATABASE_PATH ?? path.join(getUserHome(), '.flowise'), 'database.sqlite')

        const sqliteOptions = {
            database,
            ...additionalConfiguration,
            type: 'sqlite'
        }

        const args = {
            sqliteOptions,
            tableName: tableName
        }

        const recordManager = new SQLiteRecordManager(namespace, args)

        ;(recordManager as any).cleanup = cleanup
        ;(recordManager as any).sourceIdKey = sourceIdKey

        return recordManager
    }
}

type SQLiteRecordManagerOptions = {
    sqliteOptions: any
    tableName?: string
}

class SQLiteRecordManager implements RecordManagerInterface {
    lc_namespace = ['langchain', 'recordmanagers', 'sqlite']
    tableName: string
    namespace: string
    config: SQLiteRecordManagerOptions

    constructor(namespace: string, config: SQLiteRecordManagerOptions) {
        const { tableName } = config
        this.namespace = namespace
        this.tableName = tableName || 'upsertion_records'
        this.config = config
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
        const { sqliteOptions } = this.config
        if (!sqliteOptions) {
            throw new Error('No datasource options provided')
        }
        const dataSource = new DataSource(sqliteOptions)
        await dataSource.initialize()
        return dataSource
    }

    async createSchema(): Promise<void> {
        const dataSource = await this.getDataSource()
        try {
            const queryRunner = dataSource.createQueryRunner()
            const tableName = this.sanitizeTableName(this.tableName)

            await queryRunner.manager.query(`
CREATE TABLE IF NOT EXISTS "${tableName}" (
  uuid TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT NOT NULL,
  namespace TEXT NOT NULL,
  updated_at REAL NOT NULL,
  group_id TEXT,
  UNIQUE (key, namespace)
);
CREATE INDEX IF NOT EXISTS updated_at_index ON "${tableName}" (updated_at);
CREATE INDEX IF NOT EXISTS key_index ON "${tableName}" (key);
CREATE INDEX IF NOT EXISTS namespace_index ON "${tableName}" (namespace);
CREATE INDEX IF NOT EXISTS group_id_index ON "${tableName}" (group_id);`)

            // Add doc_id column if it doesn't exist (migration for existing tables)
            const checkColumn = await queryRunner.manager.query(
                `SELECT COUNT(*) as count FROM pragma_table_info('${tableName}') WHERE name='doc_id';`
            )
            if (checkColumn[0].count === 0) {
                await queryRunner.manager.query(`ALTER TABLE "${tableName}" ADD COLUMN doc_id TEXT;`)
                await queryRunner.manager.query(`CREATE INDEX IF NOT EXISTS doc_id_index ON "${tableName}" (doc_id);`)
            }

            await queryRunner.release()
        } catch (e: any) {
            // This error indicates that the table already exists
            // Due to asynchronous nature of the code, it is possible that
            // the table is created between the time we check if it exists
            // and the time we try to create it. It can be safely ignored.
            if ('code' in e && e.code === '23505') {
                return
            }
            throw e
        } finally {
            await dataSource.destroy()
        }
    }

    async getTime(): Promise<number> {
        const dataSource = await this.getDataSource()
        try {
            const queryRunner = dataSource.createQueryRunner()
            const res = await queryRunner.manager.query(`SELECT strftime('%s', 'now') AS epoch`)
            await queryRunner.release()
            return Number.parseFloat(res[0].epoch)
        } catch (error) {
            console.error('Error getting time in SQLiteRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async update(keys: Array<{ uid: string; docId: string }> | string[], updateOptions?: UpdateOptions): Promise<void> {
        if (keys.length === 0) {
            return
        }
        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        const updatedAt = await this.getTime()
        const { timeAtLeast, groupIds: _groupIds } = updateOptions ?? {}

        if (timeAtLeast && updatedAt < timeAtLeast) {
            throw new Error(`Time sync issue with database ${updatedAt} < ${timeAtLeast}`)
        }

        // Handle both new format (objects with uid and docId) and old format (strings)
        const isNewFormat = keys.length > 0 && typeof keys[0] === 'object' && 'uid' in keys[0]
        const keyStrings = isNewFormat ? (keys as Array<{ uid: string; docId: string }>).map((k) => k.uid) : (keys as string[])
        const docIds = isNewFormat ? (keys as Array<{ uid: string; docId: string }>).map((k) => k.docId) : keys.map(() => null)

        const groupIds = _groupIds ?? keyStrings.map(() => null)

        if (groupIds.length !== keyStrings.length) {
            throw new Error(`Number of keys (${keyStrings.length}) does not match number of group_ids (${groupIds.length})`)
        }

        const recordsToUpsert = keyStrings.map((key, i) => [key, this.namespace, updatedAt, groupIds[i] ?? null, docIds[i] ?? null])

        const query = `
        INSERT INTO "${tableName}" (key, namespace, updated_at, group_id, doc_id)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (key, namespace) DO UPDATE SET updated_at = excluded.updated_at, doc_id = excluded.doc_id`

        try {
            // To handle multiple files upsert
            for (const record of recordsToUpsert) {
                // Consider using a transaction for batch operations
                await queryRunner.manager.query(query, record.flat())
            }
            await queryRunner.release()
        } catch (error) {
            console.error('Error updating in SQLiteRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async exists(keys: string[]): Promise<boolean[]> {
        if (keys.length === 0) {
            return []
        }
        const tableName = this.sanitizeTableName(this.tableName)

        // Prepare the placeholders and the query
        const placeholders = keys.map(() => `?`).join(', ')
        const sql = `
    SELECT key
    FROM "${tableName}"
    WHERE namespace = ? AND key IN (${placeholders})`

        // Initialize an array to fill with the existence checks
        const existsArray = new Array(keys.length).fill(false)

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()

        try {
            // Execute the query
            const rows = await queryRunner.manager.query(sql, [this.namespace, ...keys.flat()])
            // Create a set of existing keys for faster lookup
            const existingKeysSet = new Set(rows.map((row: { key: string }) => row.key))
            // Map the input keys to booleans indicating if they exist
            keys.forEach((key, index) => {
                existsArray[index] = existingKeysSet.has(key)
            })
            await queryRunner.release()
            return existsArray
        } catch (error) {
            console.error('Error checking existence of keys')
            throw error // Allow the caller to handle the error
        } finally {
            await dataSource.destroy()
        }
    }

    async listKeys(options?: ListKeyOptions & { docId?: string }): Promise<string[]> {
        const { before, after, limit, groupIds, docId } = options ?? {}
        const tableName = this.sanitizeTableName(this.tableName)

        let query = `SELECT key FROM "${tableName}" WHERE namespace = ?`
        const values: (string | number | string[])[] = [this.namespace]

        if (before) {
            query += ` AND updated_at < ?`
            values.push(before)
        }

        if (after) {
            query += ` AND updated_at > ?`
            values.push(after)
        }

        if (limit) {
            query += ` LIMIT ?`
            values.push(limit)
        }

        if (groupIds && Array.isArray(groupIds)) {
            query += ` AND group_id IN (${groupIds
                .filter((gid) => gid !== null)
                .map(() => '?')
                .join(', ')})`
            values.push(...groupIds.filter((gid): gid is string => gid !== null))
        }

        if (docId) {
            query += ` AND doc_id = ?`
            values.push(docId)
        }

        query += ';'

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()

        // Directly using try/catch with async/await for cleaner flow
        try {
            const result = await queryRunner.manager.query(query, values)
            await queryRunner.release()
            return result.map((row: { key: string }) => row.key)
        } catch (error) {
            console.error('Error listing keys.')
            throw error // Re-throw the error to be handled by the caller
        } finally {
            await dataSource.destroy()
        }
    }

    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return
        }

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        const placeholders = keys.map(() => '?').join(', ')
        const query = `DELETE FROM "${tableName}" WHERE namespace = ? AND key IN (${placeholders});`
        const values = [this.namespace, ...keys].map((v) => (typeof v !== 'string' ? `${v}` : v))

        // Directly using try/catch with async/await for cleaner flow
        try {
            await queryRunner.manager.query(query, values)
            await queryRunner.release()
        } catch (error) {
            console.error('Error deleting keys')
            throw error // Re-throw the error to be handled by the caller
        } finally {
            await dataSource.destroy()
        }
    }
}

module.exports = { nodeClass: SQLiteRecordManager_RecordManager }
