import { DataSourceOptions } from 'typeorm/data-source'
import { DataSource } from 'typeorm'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { PromptTemplate, PromptTemplateInput } from '@langchain/core/prompts'
import { SqlDatabaseChain, SqlDatabaseChainInput, DEFAULT_SQL_DATABASE_PROMPT } from 'langchain/chains/sql_db'
import { SqlDatabase } from 'langchain/sql_db'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { getBaseClasses, getInputVariables, transformBracesWithColon } from '../../../src/utils'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

type DatabaseType = 'sqlite' | 'postgres' | 'mssql' | 'mysql'

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
        this.version = 5.0
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
                placeholder: '127.0.0.1:5432/chinook'
            },
            {
                label: 'Include Tables',
                name: 'includesTables',
                type: 'string',
                description: 'Tables to include for queries, separated by comma. Can only use Include Tables or Ignore Tables',
                placeholder: 'table1, table2',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Ignore Tables',
                name: 'ignoreTables',
                type: 'string',
                description: 'Tables to ignore for queries, separated by comma. Can only use Ignore Tables or Include Tables',
                placeholder: 'table1, table2',
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
                placeholder: DEFAULT_SQL_DATABASE_PROMPT.template + DEFAULT_SQL_DATABASE_PROMPT.templateFormat,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
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

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
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
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the Sql Database Chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }

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
        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId, 2)

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
        customPrompt = transformBracesWithColon(customPrompt)
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
