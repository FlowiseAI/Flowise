import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { SqlDatabaseChain, SqlDatabaseChainInput } from 'langchain/chains/sql_db'
import { getBaseClasses, getInputVariables } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { SqlDatabase } from 'langchain/sql_db'
import { BaseLanguageModel } from 'langchain/base_language'
import { PromptTemplate, PromptTemplateInput } from 'langchain/prompts'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
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
        this.version = 3.0
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
                label: 'Include Tables',
                name: 'includesTables',
                type: 'string',
                description: 'Tables to include for queries.',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Ignore Tables',
                name: 'ignoreTables',
                type: 'string',
                description: 'Tables to ignore for queries.',
                additionalParams: true,
                optional: true
            },
            {
                label: "Sample table's rows info",
                name: 'sampleRowsInTableInfo',
                type: 'number',
                description: 'Number of sample row for tables to load for info.',
                placeholder: '3',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top Keys',
                name: 'topK',
                type: 'number',
                description:
                    'If you are querying for several rows of a table you can select the maximum number of results you want to get by using the "top_k" parameter (default is 10). This is useful for avoiding query results that exceed the prompt max length or consume tokens unnecessarily.',
                placeholder: '10',
                additionalParams: true,
                optional: true
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
        const url = nodeData.inputs?.url as string
        const includesTables = nodeData.inputs?.includesTables
        const splittedIncludesTables = includesTables == '' ? undefined : includesTables?.split(',')
        const ignoreTables = nodeData.inputs?.ignoreTables
        const splittedIgnoreTables = ignoreTables == '' ? undefined : ignoreTables?.split(',')
        const sampleRowsInTableInfo = nodeData.inputs?.sampleRowsInTableInfo as number
        const topK = nodeData.inputs?.topK as number
        const customPrompt = nodeData.inputs?.customPrompt as string

        const chain = await getSQLDBChain(
            databaseType,
            url,
            model,
            splittedIncludesTables,
            splittedIgnoreTables,
            sampleRowsInTableInfo,
            topK,
            customPrompt
        )
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const databaseType = nodeData.inputs?.database as DatabaseType
        const model = nodeData.inputs?.model as BaseLanguageModel
        const url = nodeData.inputs?.url as string
        const includesTables = nodeData.inputs?.includesTables
        const splittedIncludesTables = includesTables == '' ? undefined : includesTables?.split(',')
        const ignoreTables = nodeData.inputs?.ignoreTables
        const splittedIgnoreTables = ignoreTables == '' ? undefined : ignoreTables?.split(',')
        const sampleRowsInTableInfo = nodeData.inputs?.sampleRowsInTableInfo as number
        const topK = nodeData.inputs?.topK as number
        const customPrompt = nodeData.inputs?.customPrompt as string

        const chain = await getSQLDBChain(
            databaseType,
            url,
            model,
            splittedIncludesTables,
            splittedIgnoreTables,
            sampleRowsInTableInfo,
            topK,
            customPrompt
        )
        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId, 2)
            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return res
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return res
        }
    }
}

const getSQLDBChain = async (
    databaseType: DatabaseType,
    url: string,
    llm: BaseLanguageModel,
    includesTables?: string[],
    ignoreTables?: string[],
    sampleRowsInTableInfo?: number,
    topK?: number,
    customPrompt?: string
) => {
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
        appDataSource: datasource,
        includesTables: includesTables,
        ignoreTables: ignoreTables,
        sampleRowsInTableInfo: sampleRowsInTableInfo
    })

    const obj: SqlDatabaseChainInput = {
        llm,
        database: db,
        verbose: process.env.DEBUG === 'true' ? true : false,
        topK: topK
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
