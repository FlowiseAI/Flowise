import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { SqlDatabaseChain, SqlDatabaseChainInput } from 'langchain/chains'
import { getBaseClasses } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { SqlDatabase } from 'langchain/sql_db'
import { BaseLLM } from 'langchain/llms/base'

class SqlDatabaseChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Sql Database Chain'
        this.name = 'sqlDatabaseChain'
        this.type = 'SqlDatabaseChain'
        this.icon = 'sqlchain.svg'
        this.category = 'Chains'
        this.description = 'Answer questions over a SQL database'
        this.baseClasses = [this.type, ...getBaseClasses(SqlDatabaseChain)]
        this.inputs = [
            {
                label: 'LLM',
                name: 'llm',
                type: 'BaseLLM'
            },
            {
                label: 'Database',
                name: 'database',
                type: 'options',
                options: [
                    {
                        label: 'SQlite',
                        name: 'sqlite'
                    }
                ],
                default: 'sqlite'
            },
            {
                label: 'Database File Path',
                name: 'dbFilePath',
                type: 'string',
                placeholder: 'C:/Users/chinook.db'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const databaseType = nodeData.inputs?.database as 'sqlite'
        const llm = nodeData.inputs?.llm as BaseLLM
        const dbFilePath = nodeData.inputs?.dbFilePath

        const chain = await getSQLDBChain(databaseType, dbFilePath, llm)
        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const databaseType = nodeData.inputs?.database as 'sqlite'
        const llm = nodeData.inputs?.llm as BaseLLM
        const dbFilePath = nodeData.inputs?.dbFilePath

        const chain = await getSQLDBChain(databaseType, dbFilePath, llm)
        const res = await chain.run(input)
        return res
    }
}

const getSQLDBChain = async (databaseType: 'sqlite', dbFilePath: string, llm: BaseLLM) => {
    const datasource = new DataSource({
        type: databaseType,
        database: dbFilePath
    })

    const db = await SqlDatabase.fromDataSourceParams({
        appDataSource: datasource
    })

    const obj: SqlDatabaseChainInput = {
        llm,
        database: db
    }

    const chain = new SqlDatabaseChain(obj)
    return chain
}

module.exports = { nodeClass: SqlDatabaseChain_Chains }
