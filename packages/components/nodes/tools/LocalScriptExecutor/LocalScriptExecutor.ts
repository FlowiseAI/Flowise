import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { SummarizationTool as Summary } from './tool'

class LocalScriptExecutor_Tool implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = '本地脚本执行器'
        this.name = 'localScriptExecutor'
        this.type = 'localScriptExecutor'
        this.icon = 'chaintool.svg'
        this.category = 'Tools'
        this.description = '本地脚本执行器'
        this.baseClasses = [this.type, ...getBaseClasses(Summary)]
        this.inputs = [
            // {
            //   label: 'shell脚本',
            //   name: 'shellFile',
            //   type: 'file',
            //   fileType: '.py'
            //  },
            {
                label: 'shell脚本',
                name: 'shellFile',
                placeholder: `/Users/ding/shell/cool.py`,
                type: 'string'
            },
            {
                label: 'name',
                name: 'name',
                type: 'string'
            },
            {
                label: '什么时候使用',
                name: 'description',
                type: 'string',
                rows: 2,
                placeholder: 'This tool specifically used for when you need to handle user uploaded file'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const description = nodeData.inputs?.description as string
        const shellFile = nodeData.inputs?.shellFile as string

        const tool = new Summary({
            description,
            shellFile,
            name: nodeData.inputs?.name as string
        })

        return tool
    }
}

module.exports = { nodeClass: LocalScriptExecutor_Tool }
