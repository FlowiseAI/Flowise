import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import { DynamicTool } from '@langchain/core/tools'
import { BaseRetriever } from '@langchain/core/retrievers'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { SOURCE_DOCUMENTS_PREFIX } from '../../../src/agents'

class FlowAwareDynamicStructuredTool<T extends z.ZodObject<any, any, any, any>> extends DynamicStructuredTool<T> {
    private flowObj: any

    setFlowObject(flow: any) {
        this.flowObj = flow
    }

    getFlowObject() {
        return this.flowObj
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
        this.version = 2.1
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
                label: 'Filter Property',
                name: 'filterProperty',
                optional: true,
                type: 'string',
                description: 'State property that will be used to filter the documents'
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
            }
        ]
    }

    private populateFilterFromState(tool: FlowAwareDynamicStructuredTool<any>, filterProperty: string, retriever: BaseRetriever) {
        const flowState = tool.getFlowObject().state
        if (!flowState[filterProperty]) {
            throw new Error(`Property '${filterProperty}' is not defined in the state`)
        }

        const vectorStore = (retriever as VectorStoreRetriever<any>).vectorStore
        if (vectorStore.filter && Object.keys(vectorStore.filter).length > 0) {
            throw new Error(`Default VectorStore filter is not empty: ${JSON.stringify(vectorStore.filter)}`)
        }

        const filter = flowState[filterProperty]
        if (!filter || typeof filter !== 'object') {
            throw new Error(`Filter property '${filterProperty}' must be an object, but it is ${typeof filter}`)
        }

        vectorStore.filter = filter
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const filterProperty = nodeData.inputs?.filterProperty as string
        const retriever = nodeData.inputs?.retriever as BaseRetriever
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean

        const input = {
            name,
            description
        }
        let tool: FlowAwareDynamicStructuredTool<any>

        const func = async ({ input }: { input: string }, runManager?: CallbackManagerForToolRun) => {
            if (filterProperty) {
                // tool has a filter property set - populate the filter from the state
                this.populateFilterFromState(tool, filterProperty, retriever)
            }

            const docs = await retriever.getRelevantDocuments(input, runManager?.getChild('retriever'))
            const content = docs.map((doc) => doc.pageContent).join('\n\n')
            const sourceDocuments = JSON.stringify(docs)
            return returnSourceDocuments ? content + SOURCE_DOCUMENTS_PREFIX + sourceDocuments : content
        }

        const schema = z.object({
            input: z.string().describe('input to look up in retriever')
        }) as any

        tool = new FlowAwareDynamicStructuredTool({ ...input, func, schema })
        return tool
    }
}

module.exports = { nodeClass: Retriever_Tools }
