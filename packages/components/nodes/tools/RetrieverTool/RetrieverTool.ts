import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { DynamicTool } from 'langchain/tools'
import { createRetrieverTool } from 'langchain/agents/toolkits'
import { BaseRetriever } from 'langchain/schema/retriever'

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
        this.version = 1.0
        this.type = 'RetrieverTool'
        this.icon = 'retriever-tool.png'
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
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        const retriever = nodeData.inputs?.retriever as BaseRetriever

        const tool = createRetrieverTool(retriever, {
            name,
            description
        })

        return tool
    }
}

module.exports = { nodeClass: Retriever_Tools }
