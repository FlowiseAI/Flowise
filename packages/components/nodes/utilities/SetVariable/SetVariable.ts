import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class SetVariable_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Set Variable'
        this.name = 'setVariable'
        this.version = 2.1
        this.type = 'SetVariable'
        this.icon = 'setvar.svg'
        this.category = 'Utilities'
        this.description = `Set variable which can be retrieved at a later stage. Variable is only available during runtime.`
        this.tags = ['Utilities']
        this.baseClasses = [this.type, 'Utilities']
        this.inputs = [
            {
                label: 'Input',
                name: 'input',
                type: 'string | number | boolean | json | array',
                optional: true,
                list: true
            },
            {
                label: 'Variable Name',
                name: 'variableName',
                type: 'string',
                placeholder: 'var1'
            },
            {
                label: 'Show Output',
                name: 'showOutput',
                description: 'Show the output result in the Prediction API response',
                type: 'boolean',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Output',
                name: 'output',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array']
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        let inputRaw = nodeData.inputs?.input
        const variableName = nodeData.inputs?.variableName as string

        if (Array.isArray(inputRaw) && inputRaw.length === 1) {
            inputRaw = inputRaw[0]
        }

        return { output: inputRaw, dynamicVariables: { [variableName]: inputRaw } }
    }
}

module.exports = { nodeClass: SetVariable_Utilities }
