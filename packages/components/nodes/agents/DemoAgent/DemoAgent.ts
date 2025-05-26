import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DemoAgent_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Demo Agent'
        this.name = 'demoAgent'
        this.version = 1.0
        this.type = 'DemoAgent'
        this.icon = 'demo.svg'
        this.category = 'Agent Flows'
        this.description = 'A demo agent for testing workflows'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Input Text',
                name: 'inputText',
                type: 'string',
                description: 'Text input for the demo agent',
                placeholder: 'Enter your text here',
                optional: true
            },
            {
                label: 'Operation Type',
                name: 'operationType',
                type: 'options',
                options: [
                    {
                        label: 'Echo Input',
                        name: 'echo'
                    },
                    {
                        label: 'Uppercase',
                        name: 'uppercase'
                    },
                    {
                        label: 'Lowercase',
                        name: 'lowercase'
                    }
                ],
                default: 'echo'
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const inputText = (nodeData.inputs?.inputText as string) || input
        const operationType = nodeData.inputs?.operationType as string

        let processedText = inputText
        switch (operationType) {
            case 'uppercase':
                processedText = inputText.toUpperCase()
                break
            case 'lowercase':
                processedText = inputText.toLowerCase()
                break
            default:
                // echo - do nothing
                break
        }

        return {
            output: {
                message: `DemoAgent processed your input: ${processedText}`,
                originalInput: inputText,
                operationType: operationType,
                timestamp: new Date().toISOString()
            }
        }
    }
}

module.exports = { nodeClass: DemoAgent_Agents }
