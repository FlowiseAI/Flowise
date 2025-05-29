import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'

class LoopInput_Utilities implements INode {
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Loop Input'
        this.name = 'loopInput'
        this.version = 1.0
        this.type = 'LoopInput'
        this.icon = 'loopinput.svg'
        this.category = 'Utilities'
        this.description = '循环输入节点，用于接收默认输入和循环组件的输入'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities', 'Loop', 'Flow Control']
        this.inputs = [
            {
                label: 'Default Input',
                name: 'defaultInput',
                type: 'string | number | json | array | file | any',
                description: '默认输入数据',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Loop Input',
                name: 'loopInput',
                type: 'string | number | json | array | file | any',
                description: '来自循环组件的输入数据',
                optional: true,
                acceptVariable: true
            }
        ]
        this.outputs = [
            {
                label: 'Output',
                name: 'output',
                baseClasses: ['string', 'number', 'json', 'array', 'file', 'any'],
                description: '输出数据'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const previousResult = nodeData.previousResult || null

        // 检查输入值
        let defaultInputValue = undefined
        let loopInputValue = undefined

        if (previousResult) {
            const isLoop = previousResult?.isLoop
            if (isLoop) {
                defaultInputValue = previousResult?.failure?.inputValue || previousResult?.inputValue
            } else {
                loopInputValue = previousResult?.inputValue
            }
        }

        // console.log('DEBUG: loopInputValue', loopInputValue)
        // console.log('DEBUG: defaultInputValue', defaultInputValue)
        // 确定最终输出值
        let outputValue = null
        if (loopInputValue !== undefined) {
            outputValue = loopInputValue
        } else if (defaultInputValue !== undefined) {
            outputValue = defaultInputValue
        }

        return { inputValue: outputValue }
    }
}

module.exports = { nodeClass: LoopInput_Utilities }
