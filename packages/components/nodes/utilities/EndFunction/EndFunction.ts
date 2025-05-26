import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class EndFunction_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = '结束'
        this.name = 'endFunction'
        this.version = 1.0
        this.type = 'EndFunction'
        this.icon = 'end.svg'
        this.category = 'Utilities'
        this.description = '工作流的结束节点，标记流程结束'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
        this.inputs = [
            {
                label: '输入',
                name: 'input',
                type: 'string',
                description: '上游节点的输出数据',
                optional: true,
                acceptVariable: true,
                list: false
            }
        ]
    }

    async init(_nodeData: INodeData, input: string, _options: ICommonObject): Promise<any> {
        // 直接返回输入数据，作为最终结果
        return input
    }
}

module.exports = { nodeClass: EndFunction_Utilities }
