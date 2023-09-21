import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { SqlDatabaseChain, SqlDatabaseChainInput } from 'langchain/chains/sql_db'
import { getBaseClasses, getInputVariables } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { SqlDatabase } from 'langchain/sql_db'
import { BaseLanguageModel } from 'langchain/base_language'
import { PromptTemplate, PromptTemplateInput } from 'langchain/prompts'
import { ConsoleCallbackHandler, CustomChainHandler } from '../../../src/handler'
import { DataSourceOptions } from 'typeorm/data-source'

type DatabaseType = 'sqlite' | 'postgres' | 'mssql' | 'mysql'

const defaultPrompt = `Given an input question, first create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer. Unless the user specifies in his question a specific number of examples he wishes to obtain, always limit your query to at most {top_k} results. You can order the results by a relevant column to return the most interesting examples in the database.

Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.

Pay attention to use only the column names that you can see in the schema description. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

Use the following format:

Question: "Question here"
SQLQuery: "SQL Query to run"
SQLResult: "Result of the SQLQuery"
Answer: "Final answer here"

Only use the tables listed below.

{table_info}

Question: {input}`

class SqlDatabaseChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Sql Database Chain'
        this.name = 'sqlDatabaseChain'
        this.version = 2.0
        this.type = 'SqlDatabaseChain'
        this.icon = 'sqlchain.svg'
        this.category = 'Chains'
        this.description = 'Answer questions over a SQL database'
        this.baseClasses = [this.type, ...getBaseClasses(SqlDatabaseChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Database',
                name: 'database',
                type: 'options',
                options: [
                    {
                        label: 'SQLite',
                        name: 'sqlite'
                    },
                    {
                        label: 'PostgreSQL',
                        name: 'postgres'
                    },
                    {
                        label: 'MSSQL',
                        name: 'mssql'
                    },
                    {
                        label: 'MySQL',
                        name: 'mysql'
                    }
                ],
                default: 'sqlite'
            },
            {
                label: 'Connection string or file path (sqlite only)',
                name: 'url',
                type: 'string',
                placeholder: '1270.0.0.1:5432/chinook'
            },
            {
                label: 'Custom Prompt',
                name: 'customPrompt',
                type: 'string',
                description:
                    'You can provide custom prompt to the chain. This will override the existing default prompt used. See <a target="_blank" href="https://python.langchain.com/docs/integrations/tools/sqlite#customize-prompt">guide</a>',
                warning:
                    'Prompt must include 3 input variables: {input}, {dialect}, {table_info}. You can refer to official guide from description above',
                rows: 4,
                placeholder: defaultPrompt,
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const databaseType = nodeData.inputs?.database as DatabaseType
        const model = nodeData.inputs?.model as BaseLanguageModel
        const url = nodeData.inputs?.url
        const customPrompt = nodeData.inputs?.customPrompt as string

        const chain = await getSQLDBChain(databaseType, url, model, customPrompt)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const databaseType = nodeData.inputs?.database as DatabaseType
        const model = nodeData.inputs?.model as BaseLanguageModel
        const url = nodeData.inputs?.url
        const customPrompt = nodeData.inputs?.customPrompt as string

        const chain = await getSQLDBChain(databaseType, url, model, customPrompt)
        const loggerHandler = new ConsoleCallbackHandler(options.logger)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId, 2)
            const res = await chain.run(input, [loggerHandler, handler])
            return res
        } else {
            const res = await chain.run(input, [loggerHandler])
            return res
        }
    }
}

const getSQLDBChain = async (databaseType: DatabaseType, url: string, llm: BaseLanguageModel, customPrompt?: string) => {
    const datasource = new DataSource(
        databaseType === 'sqlite'
            ? {
                  type: databaseType,
                  database: url
              }
            : ({
                  type: databaseType,
                  url: url
              } as DataSourceOptions)
    )

    const db = await SqlDatabase.fromDataSourceParams({
        appDataSource: datasource
    })

    const obj: SqlDatabaseChainInput = {
        llm,
        database: db,
        verbose: process.env.DEBUG === 'true' ? true : false
    }

    if (customPrompt) {
        const options: PromptTemplateInput = {
            template: customPrompt,
            inputVariables: getInputVariables(customPrompt)
        }
        obj.prompt = new PromptTemplate(options)
    }

    const chain = new SqlDatabaseChain(obj)
    return chain
}

module.exports = { nodeClass: SqlDatabaseChain_Chains }
