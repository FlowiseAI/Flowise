import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from '@langchain/community/indexes/base'
import { DataSource } from 'typeorm'

class MySQLRecordManager_RecordManager implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'MySQL Record Manager'
        this.name = 'MySQLRecordManager'
        this.version = 1.0
        this.type = 'MySQL RecordManager'
        this.icon = 'mysql.png'
        this.category = 'Record Manager'
        this.description = 'Use MySQL to keep track of document writes into the vector databases'
        this.baseClasses = [this.type, 'RecordManager', ...getBaseClasses(MySQLRecordManager)]
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
                placeholder: '3306',
                optional: true
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
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['MySQLApi']
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData)
        const password = getCredentialParam('password', credentialData, nodeData)
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

        const mysqlOptions = {
            ...additionalConfiguration,
            type: 'mysql',
            host: nodeData.inputs?.host as string,
            port: nodeData.inputs?.port as number,
            username: user,
            password: password,
            database: nodeData.inputs?.database as string
        }

        const args = {
            mysqlOptions,
            tableName: tableName
        }

        const recordManager = new MySQLRecordManager(namespace, args)

        ;(recordManager as any).cleanup = cleanup
        ;(recordManager as any).sourceIdKey = sourceIdKey

        return recordManager
    }
}

type MySQLRecordManagerOptions = {
    mysqlOptions: any
    tableName?: string
}

class MySQLRecordManager implements RecordManagerInterface {
    lc_namespace = ['langchain', 'recordmanagers', 'mysql']
    config: MySQLRecordManagerOptions
    tableName: string
    namespace: string

    constructor(namespace: string, config: MySQLRecordManagerOptions) {
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
        const { mysqlOptions } = this.config
        if (!mysqlOptions) {
            throw new Error('No datasource options provided')
        }
        // Prevent using default Postgres port, otherwise will throw uncaught error and crashing the app
        if (mysqlOptions.port === 5432) {
            throw new Error('Invalid port number')
        }
        const dataSource = new DataSource(mysqlOptions)
        await dataSource.initialize()
        return dataSource
    }

    async createSchema(): Promise<void> {
        const dataSource = await this.getDataSource()
        try {
            const queryRunner = dataSource.createQueryRunner()
            const tableName = this.sanitizeTableName(this.tableName)

            await queryRunner.manager.query(`create table if not exists \`${this.sanitizeTableName(tableName)}\` (
                \`uuid\` varchar(36) primary key default (UUID()),
                \`key\` varchar(255) not null,
                \`namespace\` varchar(255) not null,
                \`updated_at\` DOUBLE precision not null,
                \`group_id\` longtext,
                unique key \`unique_key_namespace\` (\`key\`,
\`namespace\`));`)

            // Add doc_id column if it doesn't exist (migration for existing tables)
            const checkColumn = await queryRunner.manager.query(
                `SELECT COUNT(1) ColumnExists FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE table_schema=DATABASE() AND table_name='${tableName}' AND column_name='doc_id';`
            )
            if (checkColumn[0].ColumnExists === 0) {
                await queryRunner.manager.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`doc_id\` longtext;`)
            }

            const columns = [`updated_at`, `key`, `namespace`, `group_id`, `doc_id`]
            for (const column of columns) {
                // MySQL does not support 'IF NOT EXISTS' function for Index
                const Check = await queryRunner.manager.query(
                    `SELECT COUNT(1) IndexIsThere FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE table_schema=DATABASE() AND table_name='${tableName}' AND index_name='${column}_index';`
                )
                if (Check[0].IndexIsThere === 0)
                    await queryRunner.manager.query(`CREATE INDEX \`${column}_index\`
        ON \`${tableName}\` (\`${column}\`);`)
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
            const res = await queryRunner.manager.query(`SELECT UNIX_TIMESTAMP(NOW()) AS epoch`)
            await queryRunner.release()
            return Number.parseFloat(res[0].epoch)
        } catch (error) {
            console.error('Error getting time in MySQLRecordManager:')
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
            INSERT INTO \`${tableName}\` (\`key\`, \`namespace\`, \`updated_at\`, \`group_id\`, \`doc_id\`)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE \`updated_at\` = VALUES(\`updated_at\`), \`doc_id\` = VALUES(\`doc_id\`)`

        // To handle multiple files upsert
        try {
            for (const record of recordsToUpsert) {
                // Consider using a transaction for batch operations
                await queryRunner.manager.query(query, record.flat())
            }

            await queryRunner.release()
        } catch (error) {
            console.error('Error updating in MySQLRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async exists(keys: string[]): Promise<boolean[]> {
        if (keys.length === 0) {
            return []
        }

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        // Prepare the placeholders and the query
        const placeholders = keys.map(() => `?`).join(', ')
        const query = `
    SELECT \`key\`
    FROM \`${tableName}\`
    WHERE \`namespace\` = ? AND \`key\` IN (${placeholders})`

        // Initialize an array to fill with the existence checks
        const existsArray = new Array(keys.length).fill(false)

        try {
            // Execute the query
            const rows = await queryRunner.manager.query(query, [this.namespace, ...keys.flat()])
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
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async listKeys(options?: ListKeyOptions & { docId?: string }): Promise<string[]> {
        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        try {
            const { before, after, limit, groupIds, docId } = options ?? {}
            let query = `SELECT \`key\` FROM \`${tableName}\` WHERE \`namespace\` = ?`
            const values: (string | number | string[])[] = [this.namespace]

            if (before) {
                query += ` AND \`updated_at\` < ?`
                values.push(before)
            }

            if (after) {
                query += ` AND \`updated_at\` > ?`
                values.push(after)
            }

            if (limit) {
                query += ` LIMIT ?`
                values.push(limit)
            }

            if (groupIds && Array.isArray(groupIds)) {
                query += ` AND \`group_id\` IN (${groupIds
                    .filter((gid) => gid !== null)
                    .map(() => '?')
                    .join(', ')})`
                values.push(...groupIds.filter((gid): gid is string => gid !== null))
            }

            if (docId) {
                query += ` AND \`doc_id\` = ?`
                values.push(docId)
            }

            query += ';'

            // Directly using try/catch with async/await for cleaner flow
            const result = await queryRunner.manager.query(query, values)
            await queryRunner.release()
            return result.map((row: { key: string }) => row.key)
        } catch (error) {
            console.error('MySQLRecordManager listKeys Error: ')
            throw error
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
        const query = `DELETE FROM \`${tableName}\` WHERE \`namespace\` = ? AND \`key\` IN (${placeholders});`
        const values = [this.namespace, ...keys].map((v) => (typeof v !== 'string' ? `${v}` : v))

        // Directly using try/catch with async/await for cleaner flow
        try {
            await queryRunner.manager.query(query, values)
            await queryRunner.release()
        } catch (error) {
            console.error('Error deleting keys')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }
}

module.exports = { nodeClass: MySQLRecordManager_RecordManager }
