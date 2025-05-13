import { getBaseClasses } from '../../../../src/utils'
import type { SaverOptions } from '../interface'
import type { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams } from '../../../../src/Interface'
import type { DataSource } from 'typeorm'
import { PostgresSaver } from './pgSaver'

class PostgresAgentMemory_Memory implements INode {
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
    credential: INodeParams
    tags: string[]
    constructor() {
        this.label = 'Answer Agent Memory'
        this.name = 'answerAiAgentMemory'
        this.tags = ['AAI']
        this.version = 1.0
        this.type = 'AgentMemory'
        this.icon = 'answerai-square-black.png'
        this.category = 'Memory'
        this.description = 'Memory for agentflow to remember the state of the conversation using Answer AI database'
        this.baseClasses = [this.type, ...getBaseClasses(PostgresSaver)]
        this.inputs = [
            {
                label: 'Additional Connection Configuration',
                name: 'additionalConfig',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<PostgresSaver> {
        const additionalConfig = nodeData.inputs?.additionalConfig as string
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string
        const appDataSource = options.appDataSource as DataSource

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error(`Invalid JSON in the Additional Configuration: ${exception}`)
            }
        }

        const threadId = options.sessionId || options.chatId

        let datasourceOptions: ICommonObject = {
            ...additionalConfiguration,
            type: 'postgres'
        }

        const user = process.env.AAI_DEFAULT_POSTGRES_AGENTMEMORY_USER
        const password = process.env.AAI_DEFAULT_POSTGRES_AGENTMEMORY_PASSWORD
        const _port = process.env.AAI_DEFAULT_POSTGRES_AGENTMEMORY_PORT || '5432'
        const port = Number.parseInt(_port)
        datasourceOptions = {
            ...datasourceOptions,
            host: process.env.AAI_DEFAULT_POSTGRES_AGENTMEMORY_HOST,
            port,
            database: process.env.AAI_DEFAULT_POSTGRES_AGENTMEMORY_DATABASE,
            username: user,
            user: user,
            password: password
        }
        const args: SaverOptions = {
            datasourceOptions,
            threadId,
            appDataSource,
            databaseEntities,
            chatflowid
        }
        const recordManager = new PostgresSaver(args)
        return recordManager
    }
}

module.exports = { nodeClass: PostgresAgentMemory_Memory }
