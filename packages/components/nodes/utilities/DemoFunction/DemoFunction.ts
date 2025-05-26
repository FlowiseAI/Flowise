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
                type: 'number',
                description: 'Input number for calculation',
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
                baseClasses: ['number', 'string'],
                description: 'Result of the arithmetic operation'
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const inputValue = (nodeData.inputs?.inputValue as number) || 1
        const operation = nodeData.inputs?.operation as string
        const secondValue = (nodeData.inputs?.secondValue as number) || 1

        let result: number

        switch (operation) {
            case 'add':
                result = inputValue + secondValue
                break
            case 'subtract':
                result = inputValue - secondValue
                break
            case 'multiply':
                result = inputValue * secondValue
                break
            case 'divide':
                if (secondValue === 0) {
                    throw new Error('Cannot divide by zero')
                }
                result = inputValue / secondValue
                break
            default:
                result = inputValue
        }

        return {
            result: result
        }
    }
}

module.exports = { nodeClass: DemoFunction_Utilities }
