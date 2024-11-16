import { z } from 'zod'
import { CallbackManager, CallbackManagerForToolRun, Callbacks, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { BaseDynamicToolInput, DynamicTool, StructuredTool, ToolInputParsingException } from '@langchain/core/tools'
import { BaseRetriever } from '@langchain/core/retrievers'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { SOURCE_DOCUMENTS_PREFIX } from '../../../src/agents'
import { RunnableConfig } from '@langchain/core/runnables'
import { customGet } from '../../sequentialagents/commonUtils'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'

const howToUse = `Add additional filters to vector store. You can also filter with flow config, including the current "state":
- \`$flow.sessionId\`
- \`$flow.chatId\`
- \`$flow.chatflowId\`
- \`$flow.input\`
- \`$flow.state\`
`

type ZodObjectAny = z.ZodObject<any, any, any, any>
type IFlowConfig = { sessionId?: string; chatId?: string; input?: string; state?: ICommonObject }
interface DynamicStructuredToolInput<T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>>
    extends BaseDynamicToolInput {
    func?: (input: z.infer<T>, runManager?: CallbackManagerForToolRun, flowConfig?: IFlowConfig) => Promise<string>
    schema: T
}

class DynamicStructuredTool<T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>> extends StructuredTool<
    T extends ZodObjectAny ? T : ZodObjectAny
> {
    static lc_name() {
        return 'DynamicStructuredTool'
    }

    name: string

    description: string

    func: DynamicStructuredToolInput['func']

    // @ts-ignore
    schema: T

    private flowObj: any

    constructor(fields: DynamicStructuredToolInput<T>) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.func = fields.func
        this.returnDirect = fields.returnDirect ?? this.returnDirect
        this.schema = fields.schema
    }

    async call(arg: any, configArg?: RunnableConfig | Callbacks, tags?: string[], flowConfig?: IFlowConfig): Promise<string> {
        const config = parseCallbackConfigArg(configArg)
        if (config.runName === undefined) {
            config.runName = this.name
        }
        let parsed
        try {
            parsed = await this.schema.parseAsync(arg)
        } catch (e) {
            throw new ToolInputParsingException(`Received tool input did not match expected schema`, JSON.stringify(arg))
        }
        const callbackManager_ = await CallbackManager.configure(
            config.callbacks,
            this.callbacks,
            config.tags || tags,
            this.tags,
            config.metadata,
            this.metadata,
            { verbose: this.verbose }
        )
        const runManager = await callbackManager_?.handleToolStart(
            this.toJSON(),
            typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
            undefined,
            undefined,
            undefined,
            undefined,
            config.runName
        )
        let result
        try {
            result = await this._call(parsed, runManager, flowConfig)
        } catch (e) {
            await runManager?.handleToolError(e)
            throw e
        }
        if (result && typeof result !== 'string') {
            result = JSON.stringify(result)
        }
        await runManager?.handleToolEnd(result)
        return result
    }

    // @ts-ignore
    protected _call(arg: any, runManager?: CallbackManagerForToolRun, flowConfig?: IFlowConfig): Promise<string> {
        let flowConfiguration: ICommonObject = {}
        if (typeof arg === 'object' && Object.keys(arg).length) {
            for (const item in arg) {
                flowConfiguration[`$${item}`] = arg[item]
            }
        }

        // inject flow properties
        if (this.flowObj) {
            flowConfiguration['$flow'] = { ...this.flowObj, ...flowConfig }
        }

        return this.func!(arg as any, runManager, flowConfiguration)
    }

    setFlowObject(flow: any) {
        this.flowObj = flow
    }
}

class Retriever_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Retriever Tool'
        this.name = 'retrieverTool'
        this.version = 3.0
        this.type = 'RetrieverTool'
        this.icon = 'retrievertool.svg'
        this.category = 'Tools'
        this.description = 'Use a retriever as allowed tool for agent'
        this.baseClasses = [this.type, 'DynamicTool', ...getBaseClasses(DynamicTool)]
        this.inputs = [
            {
                label: 'Retriever Name',
                name: 'name',
                type: 'string',
                placeholder: 'search_state_of_union'
            },
            {
                label: 'Retriever Description',
                name: 'description',
                type: 'string',
                description: 'When should agent uses to retrieve documents',
                rows: 3,
                placeholder: 'Searches and returns documents regarding the state-of-the-union.'
            },
            {
                label: 'Retriever',
                name: 'retriever',
                type: 'BaseRetriever'
            },
            {
                label: 'Return Source Documents',
                name: 'returnSourceDocuments',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Additional Metadata Filter',
                name: 'retrieverToolMetadataFilter',
                type: 'json',
                description: 'Add additional metadata filter on top of the existing filter from vector store',
                optional: true,
                additionalParams: true,
                hint: {
                    label: 'What can you filter?',
                    value: howToUse
                }
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const retriever = nodeData.inputs?.retriever as BaseRetriever
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const retrieverToolMetadataFilter = nodeData.inputs?.retrieverToolMetadataFilter

        const input = {
            name,
            description
        }

        const flow = { chatflowId: options.chatflowid }

        const func = async ({ input }: { input: string }, _?: CallbackManagerForToolRun, flowConfig?: IFlowConfig) => {
            if (retrieverToolMetadataFilter) {
                const flowObj = flowConfig

                const metadatafilter =
                    typeof retrieverToolMetadataFilter === 'object' ? retrieverToolMetadataFilter : JSON.parse(retrieverToolMetadataFilter)
                const newMetadataFilter: any = {}
                for (const key in metadatafilter) {
                    let value = metadatafilter[key]
                    if (value.startsWith('$flow')) {
                        value = customGet(flowObj, value)
                    }
                    newMetadataFilter[key] = value
                }

                const vectorStore = (retriever as VectorStoreRetriever<any>).vectorStore
                vectorStore.filter = newMetadataFilter
            }
            const docs = await retriever.invoke(input)
            const content = docs.map((doc) => doc.pageContent).join('\n\n')
            const sourceDocuments = JSON.stringify(docs)
            return returnSourceDocuments ? content + SOURCE_DOCUMENTS_PREFIX + sourceDocuments : content
        }

        const schema = z.object({
            input: z.string().describe('input to look up in retriever')
        }) as any

        const tool = new DynamicStructuredTool({ ...input, func, schema })
        tool.setFlowObject(flow)
        return tool
    }
}

module.exports = { nodeClass: Retriever_Tools }
