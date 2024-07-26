import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class GetVariable_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Get Variable'
        this.name = 'getVariable'
        this.version = 1.0
        this.type = 'GetVariable'
        this.icon = 'getvar.svg'
        this.category = 'Utilities'
        this.description = `Get variable that was saved using Set Variable node`
        this.baseClasses = [this.type, 'Utilities']
        this.inputs = [
            {
                label: 'Variable Name',
                name: 'variableName',
                type: 'string',
                placeholder: 'var1'
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const variableName = nodeData.inputs?.variableName as string
        const dynamicVars = options.dynamicVariables as Record<string, unknown>

        if (Object.prototype.hasOwnProperty.call(dynamicVars, variableName)) {
            return dynamicVars[variableName]
        }
        return undefined
    }
}

module.exports = { nodeClass: GetVariable_Utilities }
