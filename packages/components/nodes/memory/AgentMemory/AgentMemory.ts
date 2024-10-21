import path from 'path'
import { getBaseClasses, getUserHome } from '../../../src/utils'
import { SaverOptions } from './interface'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams } from '../../../src/Interface'
import { SqliteSaver } from './sqliteSaver'
import { DataSource } from 'typeorm'

class AgentMemory_Memory implements INode {
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
        this.label = 'Agent Memory'
        this.name = 'agentMemory'
        this.version = 1.0
        this.type = 'AgentMemory'
        this.icon = 'agentmemory.svg'
        this.category = 'Memory'
        this.description = 'Memory for agentflow to remember the state of the conversation'
        this.baseClasses = [this.type, ...getBaseClasses(SqliteSaver)]
        this.inputs = [
            {
                label: 'Database',
                name: 'databaseType',
                type: 'options',
                options: [
                    {
                        label: 'SQLite',
                        name: 'sqlite'
                    }
                ],
                default: 'sqlite'
            },
            {
                label: 'Database File Path',
                name: 'databaseFilePath',
                type: 'string',
                placeholder: 'C:\\Users\\User\\.flowise\\database.sqlite',
                description:
                    'If SQLite is selected, provide the path to the SQLite database file. Leave empty to use default application database',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Additional Connection Configuration',
                name: 'additionalConfig',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const additionalConfig = nodeData.inputs?.additionalConfig as string
        const databaseFilePath = nodeData.inputs?.databaseFilePath as string
        const databaseType = nodeData.inputs?.databaseType as string
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string
        const appDataSource = options.appDataSource as DataSource

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
            }
        }

        const threadId = options.sessionId || options.chatId

        const datasourceOptions: ICommonObject = {
            ...additionalConfiguration,
            type: databaseType
        }

        if (databaseType === 'sqlite') {
            datasourceOptions.database = databaseFilePath
                ? path.resolve(databaseFilePath)
                : path.join(process.env.DATABASE_PATH ?? path.join(getUserHome(), '.flowise'), 'database.sqlite')
            const args: SaverOptions = {
                datasourceOptions,
                threadId,
                appDataSource,
                databaseEntities,
                chatflowid
            }
            const recordManager = new SqliteSaver(args)
            return recordManager
        }

        return undefined
    }
}

module.exports = { nodeClass: AgentMemory_Memory }
