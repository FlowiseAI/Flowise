import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from '@langchain/community/indexes/base'
import { DataSource, QueryRunner } from 'typeorm'
import { getHost } from '../../vectorstores/Postgres/utils'
import { getDatabase, getPort, getTableName } from './utils'

const serverCredentialsExists = !!process.env.POSTGRES_RECORDMANAGER_USER && !!process.env.POSTGRES_RECORDMANAGER_PASSWORD

class PostgresRecordManager_RecordManager implements INode {
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
        this.label = 'Postgres Record Manager'
        this.name = 'postgresRecordManager'
        this.version = 1.0
        this.type = 'Postgres RecordManager'
        this.icon = 'postgres.svg'
        this.category = 'Record Manager'
        this.description = 'Use Postgres to keep track of document writes into the vector databases'
        this.baseClasses = [this.type, 'RecordManager', ...getBaseClasses(PostgresRecordManager)]
        this.inputs = [
            {
                label: 'Host',
                name: 'host',
                type: 'string',
                placeholder: getHost(),
                optional: !!getHost()
            },
            {
                label: 'Database',
                name: 'database',
                type: 'string',
                placeholder: getDatabase(),
                optional: !!getDatabase()
            },
            {
                label: 'Port',
                name: 'port',
                type: 'number',
                placeholder: getPort(),
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
                placeholder: getTableName(),
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
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['PostgresApi'],
            optional: serverCredentialsExists
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData, process.env.POSTGRES_RECORDMANAGER_USER)
        const password = getCredentialParam('password', credentialData, nodeData, process.env.POSTGRES_RECORDMANAGER_PASSWORD)
        const tableName = getTableName(nodeData)
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

        const postgresConnectionOptions = {
            ...additionalConfiguration,
            type: 'postgres',
            host: getHost(nodeData),
            port: getPort(nodeData),
            username: user,
            password: password,
            database: getDatabase(nodeData)
        }

        const args = {
            postgresConnectionOptions: postgresConnectionOptions,
            tableName: tableName
        }

        const recordManager = new PostgresRecordManager(namespace, args)

        ;(recordManager as any).cleanup = cleanup
        ;(recordManager as any).sourceIdKey = sourceIdKey

        return recordManager
    }
}

type PostgresRecordManagerOptions = {
    postgresConnectionOptions: any
    tableName: string
}

class PostgresRecordManager implements RecordManagerInterface {
    lc_namespace = ['langchain', 'recordmanagers', 'postgres']

    datasource: DataSource

    queryRunner: QueryRunner

    tableName: string

    namespace: string

    constructor(namespace: string, config: PostgresRecordManagerOptions) {
        const { postgresConnectionOptions, tableName } = config
        this.namespace = namespace
        this.datasource = new DataSource(postgresConnectionOptions)
        this.tableName = tableName
    }

    async createSchema(): Promise<void> {
        try {
            const appDataSource = await this.datasource.initialize()

            this.queryRunner = appDataSource.createQueryRunner()

            await this.queryRunner.manager.query(`
  CREATE TABLE IF NOT EXISTS "${this.tableName}" (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    namespace TEXT NOT NULL,
    updated_at Double PRECISION NOT NULL,
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
        const res = await this.queryRunner.manager.query('SELECT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)')
        return Number.parseFloat(res[0].extract)
    }

    /**
     * Generates the SQL placeholders for a specific row at the provided index.
     *
     * @param index - The index of the row for which placeholders need to be generated.
     * @param numOfColumns - The number of columns we are inserting data into.
     * @returns The SQL placeholders for the row values.
     */
    private generatePlaceholderForRowAt(index: number, numOfColumns: number): string {
        const placeholders = []
        for (let i = 0; i < numOfColumns; i += 1) {
            placeholders.push(`$${index * numOfColumns + i + 1}`)
        }
        return `(${placeholders.join(', ')})`
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
            throw new Error(`Number of keys (${keys.length}) does not match number of group_ids ${groupIds.length})`)
        }

        const recordsToUpsert = keys.map((key, i) => [key, this.namespace, updatedAt, groupIds[i]])

        const valuesPlaceholders = recordsToUpsert.map((_, j) => this.generatePlaceholderForRowAt(j, recordsToUpsert[0].length)).join(', ')

        const query = `INSERT INTO "${this.tableName}" (key, namespace, updated_at, group_id) VALUES ${valuesPlaceholders} ON CONFLICT (key, namespace) DO UPDATE SET updated_at = EXCLUDED.updated_at;`
        await this.queryRunner.manager.query(query, recordsToUpsert.flat())
    }

    async exists(keys: string[]): Promise<boolean[]> {
        if (keys.length === 0) {
            return []
        }

        const startIndex = 2
        const arrayPlaceholders = keys.map((_, i) => `$${i + startIndex}`).join(', ')

        const query = `
        SELECT k, (key is not null) ex from unnest(ARRAY[${arrayPlaceholders}]) k left join "${this.tableName}" on k=key and namespace = $1;
        `
        const res = await this.queryRunner.manager.query(query, [this.namespace, ...keys.flat()])
        return res.map((row: { ex: boolean }) => row.ex)
    }

    async listKeys(options?: ListKeyOptions): Promise<string[]> {
        const { before, after, limit, groupIds } = options ?? {}
        let query = `SELECT key FROM "${this.tableName}" WHERE namespace = $1`
        const values: (string | number | (string | null)[])[] = [this.namespace]

        let index = 2
        if (before) {
            values.push(before)
            query += ` AND updated_at < $${index}`
            index += 1
        }

        if (after) {
            values.push(after)
            query += ` AND updated_at > $${index}`
            index += 1
        }

        if (limit) {
            values.push(limit)
            query += ` LIMIT $${index}`
            index += 1
        }

        if (groupIds) {
            values.push(groupIds)
            query += ` AND group_id = ANY($${index})`
            index += 1
        }

        query += ';'
        const res = await this.queryRunner.manager.query(query, values)
        return res.map((row: { key: string }) => row.key)
    }

    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return
        }

        const query = `DELETE FROM "${this.tableName}" WHERE namespace = $1 AND key = ANY($2);`
        await this.queryRunner.manager.query(query, [this.namespace, keys])
    }

    /**
     * Terminates the connection pool.
     * @returns {Promise<void>}
     */
    async end(): Promise<void> {
        if (this.datasource && this.datasource.isInitialized) await this.datasource.destroy()
    }
}

module.exports = { nodeClass: PostgresRecordManager_RecordManager }
