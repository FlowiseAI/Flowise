import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { QueryEngineTool } from 'llamaindex'

class QueryEngine_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    tags: string[]
    baseClasses: string[]
    inputs?: INodeParams[]

    constructor() {
        this.label = 'QueryEngine Tool'
        this.name = 'queryEngineToolLlamaIndex'
        this.version = 2.0
        this.type = 'QueryEngineTool'
        this.icon = 'queryEngineTool.svg'
        this.category = 'Tools'
        this.tags = ['LlamaIndex']
        this.description = 'Tool used to invoke query engine'
        this.baseClasses = [this.type, 'Tool_LlamaIndex']
        this.inputs = [
            {
                label: 'Base QueryEngine',
                name: 'baseQueryEngine',
                type: 'BaseQueryEngine'
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Tool name must be small capital letter with underscore. Ex: my_tool'
            },
            {
                label: 'Tool Description',
                name: 'toolDesc',
                type: 'string',
                rows: 4
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const baseQueryEngine = nodeData.inputs?.baseQueryEngine
        const toolName = nodeData.inputs?.toolName as string
        const toolDesc = nodeData.inputs?.toolDesc as string
        const queryEngineTool = new QueryEngineTool({
            queryEngine: baseQueryEngine,
            metadata: {
                name: toolName,
                description: toolDesc
            }
        })

        return queryEngineTool
    }
}

module.exports = { nodeClass: QueryEngine_Tools }
