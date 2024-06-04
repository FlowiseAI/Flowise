import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from '@langchain/community/indexes/base'
import { DataSource, QueryRunner } from 'typeorm'
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
        this.version = 1.0
        this.type = 'SQLite RecordManager'
        this.icon = 'sqlite.png'
        this.category = 'Record Manager'
        this.description = 'Use SQLite to keep track of document writes into the vector databases'
        this.baseClasses = [this.type, 'RecordManager', ...getBaseClasses(SQLiteRecordManager)]
        this.badge = 'NEW'
        this.inputs = [
            {
                label: 'Database File Path',
                name: 'databaseFilePath',
                type: 'string',
                placeholder: 'C:\\Users\\User\\.flowise\\database.sqlite'
            },
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
                description: 'If not specified, chatflowid will be used',
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
        const databaseFilePath = nodeData.inputs?.databaseFilePath as string

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
            }
        }

        const sqliteOptions = {
            ...additionalConfiguration,
            type: 'sqlite',
            database: path.resolve(databaseFilePath)
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

    datasource: DataSource

    queryRunner: QueryRunner

    tableName: string

    namespace: string

    constructor(namespace: string, config: SQLiteRecordManagerOptions) {
        const { sqliteOptions, tableName } = config
        this.namespace = namespace
        this.tableName = tableName || 'upsertion_records'
        this.datasource = new DataSource(sqliteOptions)
    }

    async createSchema(): Promise<void> {
        try {
            const appDataSource = await this.datasource.initialize()

            this.queryRunner = appDataSource.createQueryRunner()

            await this.queryRunner.manager.query(`
CREATE TABLE IF NOT EXISTS "${this.tableName}" (
  uuid TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT NOT NULL,
  namespace TEXT NOT NULL,
  updated_at REAL NOT NULL,
  group_id TEXT,
  UNIQUE (key, namespace)
);
CREATE INDEX IF NOT EXISTS updated_at_index ON "${this.tableName}" (updated_at);
CREATE INDEX IF NOT EXISTS key_index ON "${this.tableName}" (key);
CREATE INDEX IF NOT EXISTS namespace_index ON "${this.tableName}" (namespace);
CREATE INDEX IF NOT EXISTS group_id_index ON "${this.tableName}" (group_id);`)
        } catch (e: any) {
            // This error indicates that the table already exists
            // Due to asynchronous nature of the code, it is possible that
            // the table is created between the time we check if it exists
            // and the time we try to create it. It can be safely ignored.
            if ('code' in e && e.code === '23505') {
                return
            }
            throw e
        }
    }

    async getTime(): Promise<number> {
        try {
            const res = await this.queryRunner.manager.query(`SELECT strftime('%s', 'now') AS epoch`)
            return Number.parseFloat(res[0].epoch)
        } catch (error) {
            console.error('Error getting time in SQLiteRecordManager:')
            throw error
        }
    }

    async update(keys: string[], updateOptions?: UpdateOptions): Promise<void> {
        if (keys.length === 0) {
            return
        }

        const updatedAt = await this.getTime()
        const { timeAtLeast, groupIds: _groupIds } = updateOptions ?? {}

        if (timeAtLeast && updatedAt < timeAtLeast) {
            throw new Error(`Time sync issue with database ${updatedAt} < ${timeAtLeast}`)
        }

        const groupIds = _groupIds ?? keys.map(() => null)

        if (groupIds.length !== keys.length) {
            throw new Error(`Number of keys (${keys.length}) does not match number of group_ids (${groupIds.length})`)
        }

        const recordsToUpsert = keys.map((key, i) => [
            key,
            this.namespace,
            updatedAt,
            groupIds[i] ?? null // Ensure groupIds[i] is null if undefined
        ])

        const query = `
        INSERT INTO "${this.tableName}" (key, namespace, updated_at, group_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (key, namespace) DO UPDATE SET updated_at = excluded.updated_at`

        // To handle multiple files upsert
        for (const record of recordsToUpsert) {
            // Consider using a transaction for batch operations
            await this.queryRunner.manager.query(query, record.flat())
        }
    }

    async exists(keys: string[]): Promise<boolean[]> {
        if (keys.length === 0) {
            return []
        }

        // Prepare the placeholders and the query
        const placeholders = keys.map(() => `?`).join(', ')
        const sql = `
    SELECT key
    FROM "${this.tableName}"
    WHERE namespace = ? AND key IN (${placeholders})`

        // Initialize an array to fill with the existence checks
        const existsArray = new Array(keys.length).fill(false)

        try {
            // Execute the query
            const rows = await this.queryRunner.manager.query(sql, [this.namespace, ...keys.flat()])
            // Create a set of existing keys for faster lookup
            const existingKeysSet = new Set(rows.map((row: { key: string }) => row.key))
            // Map the input keys to booleans indicating if they exist
            keys.forEach((key, index) => {
                existsArray[index] = existingKeysSet.has(key)
            })
            return existsArray
        } catch (error) {
            console.error('Error checking existence of keys')
            throw error // Allow the caller to handle the error
        }
    }

    async listKeys(options?: ListKeyOptions): Promise<string[]> {
        const { before, after, limit, groupIds } = options ?? {}
        let query = `SELECT key FROM "${this.tableName}" WHERE namespace = ?`
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

        query += ';'

        // Directly using try/catch with async/await for cleaner flow
        try {
            const result = await this.queryRunner.manager.query(query, values)
            return result.map((row: { key: string }) => row.key)
        } catch (error) {
            console.error('Error listing keys.')
            throw error // Re-throw the error to be handled by the caller
        }
    }

    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return
        }

        const placeholders = keys.map(() => '?').join(', ')
        const query = `DELETE FROM "${this.tableName}" WHERE namespace = ? AND key IN (${placeholders});`
        const values = [this.namespace, ...keys].map((v) => (typeof v !== 'string' ? `${v}` : v))

        // Directly using try/catch with async/await for cleaner flow
        try {
            await this.queryRunner.manager.query(query, values)
        } catch (error) {
            console.error('Error deleting keys')
            throw error // Re-throw the error to be handled by the caller
        }
    }
}

module.exports = { nodeClass: SQLiteRecordManager_RecordManager }
