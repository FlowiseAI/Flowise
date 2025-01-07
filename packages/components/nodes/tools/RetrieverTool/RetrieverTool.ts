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
import axios from 'axios'

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
  score?: Number
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

  score?: Number

  constructor(fields: DynamicStructuredToolInput<T>) {
    super(fields)
    this.name = fields.name
    this.description = fields.description
    this.func = fields.func
    this.returnDirect = fields.returnDirect ?? this.returnDirect
    this.schema = fields.schema
    this.score = fields.score
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
  score: number

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
        label: 'Return Full Document Content',
        name: 'returnFullContent',
        type: 'boolean',
        description: 'Whether to return the full content of retrieved documents',
        optional: true,
        default: false
      },
      {
        label: 'Return Raw Document',
        name: 'returnRawDocument',
        type: 'boolean',
        description: 'Whether to return the raw document object from the retriever',
        optional: true,
        default: false
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
      },
      {
        label: 'Score',
        name: 'score',
        type: 'number',
        optional: true,
        default: 0
      }
    ]
  }

  async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
    const name = nodeData.inputs?.name as string
    const description = nodeData.inputs?.description as string
    const retriever = nodeData.inputs?.retriever as BaseRetriever
    const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
    const retrieverToolMetadataFilter = nodeData.inputs?.retrieverToolMetadataFilter
    const score = +nodeData.inputs?.score
    const input = {
      name,
      description,
      score
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

      if (nodeData.inputs?.returnFullContent) {
        // Extract prefixes from docs
        const prefixes = docs
          .map((doc) => doc.metadata?.source?.replace('s3://cts-llm-docs-bucket/', ''))
          .filter((prefix): prefix is string => typeof prefix === 'string')

        if (prefixes.length > 0) {
          try {
            // Call API to get full content
            const response = await axios.post(
              `${process.env.PDF_KNOWLEDGE_BASE_API_URL || 'http://3.231.34.3:8001'}/knowledge_base/get_pdf_content`,
              {
                prefix_list: prefixes
              }
            )

            interface ContentItem {
              content: string
              prefix: string
            }

            const result = response.data as { data: ContentItem[] }

            // Create prefix -> content mapping
            const contentMap = new Map<string, string>()
            const updatedDocs = new Set<string>() // Track which docs were updated from API
            result.data.forEach((item: ContentItem) => {
              contentMap.set(item.prefix, item.content)
            })

            // Replace doc content with full content from API and track updated docs
            docs.forEach((doc) => {
              const prefix = doc.metadata?.source?.replace('s3://cts-llm-docs-bucket/', '')
              if (typeof prefix === 'string' && contentMap.has(prefix)) {
                doc.pageContent = contentMap.get(prefix) as string
                updatedDocs.add(doc.metadata?.source)
              }
            })

            // Deduplicate docs that were updated from API based on source
            const uniqueSources = new Map()
            const uniqueDocs = docs.filter((doc) => {
              if (!updatedDocs.has(doc.metadata?.source)) {
                return true // Keep docs not updated from API
              }
              if (!uniqueSources.has(doc.metadata?.source)) {
                uniqueSources.set(doc.metadata?.source, true)
                return true
              }
              return false
            })

            // Update original array in place
            docs.splice(0, docs.length, ...uniqueDocs)
          } catch (error) {
            console.error('Error fetching full content:', error)
          }
        }
      }

      // Filter documents based on score threshold
      const filteredDocs = docs.filter((doc) => {
        // If score is not a number, include the document
        if (isNaN(+doc.metadata?.score)) return true
        // If score threshold is set (>= 0), only include docs that meet or exceed it
        if (score >= 0) return doc.metadata.score >= score
        // Include all docs if no valid score threshold
        return true
      })

      const content = nodeData.inputs?.returnRawDocument
        ? JSON.stringify(
            filteredDocs.map((doc) => ({
              pageContent: doc.pageContent,
              metadata: {
                score: doc.metadata.score,
                sub_cate_1: doc.metadata?.sub_cate_1
              }
            })),
            null,
            2
          )
        : filteredDocs.map((doc) => doc.pageContent).join('\n\n')

      const sourceDocuments = JSON.stringify(filteredDocs)

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
