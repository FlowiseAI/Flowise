import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RPATool as Summary } from './tool'

class RPA_Tool implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'RPA插件'
        this.name = 'rpa'
        this.type = 'rpa'
        this.icon = 'chaintool.svg'
        this.category = 'Tools'
        this.description = 'RPA插件'
        this.baseClasses = [this.type, ...getBaseClasses(Summary)]
        this.inputs = [
            {
                label: 'webbook地址',
                name: 'webhook',
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
            },
            {
                label: 'input参数',
                name: 'input',
                type: 'string',
                rows: 2,
                placeholder: 'This tool specifically used for when you need to handle user uploaded file'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const description = nodeData.inputs?.description as string
        const webhook = nodeData.inputs?.webhook as string
        const input = nodeData.inputs?.input as string

        const tool = new Summary({
            description,
            webhook,
            input,
            name: nodeData.inputs?.name as string
        })

        return tool
    }
}

module.exports = { nodeClass: RPA_Tool }
