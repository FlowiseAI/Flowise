import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'

class DemoFunction_Utilities implements INode {
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
    result: any

    constructor() {
        this.label = 'Demo Function'
        this.name = 'demoFunction'
        this.version = 1.0
        this.type = 'DemoFunction'
        this.icon = 'demo.svg'
        this.category = 'Utilities'
        this.description = 'Basic arithmetic operations with input value'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities', 'Math']
        this.inputs = [
            {
                label: 'Input Value',
                name: 'inputValue',
                type: 'string | number | json | array | file',
                description: 'Input value for calculation',
                default: 1,
                acceptVariable: true
            },
            {
                label: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        label: 'Addition (+)',
                        name: 'add'
                    },
                    {
                        label: 'Subtraction (-)',
                        name: 'subtract'
                    },
                    {
                        label: 'Multiplication (*)',
                        name: 'multiply'
                    },
                    {
                        label: 'Division (/)',
                        name: 'divide'
                    }
                ],
                default: 'add'
            },
            {
                label: 'Second Value',
                name: 'secondValue',
                type: 'number',
                description: 'Second number for calculation',
                default: 1,
                acceptVariable: true
            }
        ]
        this.outputs = [
            {
                label: 'Result',
                name: 'result',
                baseClasses: ['number'],
                description: 'Result of the arithmetic operation'
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        let prevResult = nodeData.previousResult || nodeData.inputs || null

        // 从前一个节点获取结果，如果没有则使用输入值
        const rawInputValue = prevResult?.inputValue ?? prevResult?.inputValue ?? 1
        const operation = nodeData.inputs?.operation as string
        const secondValue = Number(nodeData.inputs?.secondValue ?? 1)

        // 处理不同类型的输入值，包括变量引用
        let numericInputValue: number

        // 检查是否是变量引用格式
        if (typeof rawInputValue === 'string' && rawInputValue.match(/^\{\{.*\}\}$/)) {
            // 如果是变量引用，尝试使用默认值或0
            numericInputValue = 0
        } else if (typeof rawInputValue === 'number') {
            numericInputValue = rawInputValue
        } else if (typeof rawInputValue === 'string') {
            numericInputValue = Number(rawInputValue)
        } else if (Array.isArray(rawInputValue)) {
            // 如果是数组，取其长度
            numericInputValue = rawInputValue.length
        } else if (typeof rawInputValue === 'object' && rawInputValue !== null) {
            // 如果是对象（包括文件），取其键的数量
            numericInputValue = Object.keys(rawInputValue).length
        } else {
            numericInputValue = 0
        }

        if (isNaN(numericInputValue)) {
            // 如果无法转换为数字，使用默认值0而不是抛出错误
            numericInputValue = 0
            console.warn(`Warning: Could not convert input value to number: ${rawInputValue}, using 0 instead`)
        }

        let result: number
        switch (operation) {
            case 'add':
                result = numericInputValue + secondValue
                break
            case 'subtract':
                result = numericInputValue - secondValue
                break
            case 'multiply':
                result = numericInputValue * secondValue
                break
            case 'divide':
                if (secondValue === 0) {
                    throw new Error('Cannot divide by zero')
                }
                result = numericInputValue / secondValue
                break
            default:
                result = numericInputValue
        }

        // 确保返回正确的格式并保存到节点实例
        const finalResult = { inputValue: Number(result) }

        // 保存结果到多个位置以确保传递
        nodeData.instance = finalResult
        this.result = finalResult

        // 将结果保存到节点的输出中
        if (!nodeData.outputs) {
            nodeData.outputs = {}
        }
        nodeData.outputs.result = finalResult

        // 保存到节点的输入中，供下一个节点使用
        if (!nodeData.inputs) {
            nodeData.inputs = {}
        }
        nodeData.inputs.input = finalResult.inputValue
        // console.log('DEBUG: finalResult', finalResult)
        return finalResult
    }
}

module.exports = { nodeClass: DemoFunction_Utilities }
