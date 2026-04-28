import { BaseOutputParser, CustomListOutputParser as LangchainCustomListOutputParser } from '@langchain/core/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'
import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'

class CustomListOutputParser implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Custom List Output Parser'
        this.name = 'customListOutputParser'
        this.version = 1.0
        this.type = 'CustomListOutputParser'
        this.description = 'Parse the output of an LLM call as a list of values.'
        this.icon = 'list.svg'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
            {
                label: 'Length',
                name: 'length',
                type: 'number',
                step: 1,
                description: 'Number of values to return',
                optional: true
            },
            {
                label: 'Separator',
                name: 'separator',
                type: 'string',
                description: 'Separator between values',
                default: ',',
                optional: true
            },
            {
                label: 'Autofix',
                name: 'autofixParser',
                type: 'boolean',
                optional: true,
                description: 'In the event that the first call fails, will make another call to the model to fix any errors.'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const separator = nodeData.inputs?.separator as string
        const lengthStr = nodeData.inputs?.length as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        const parser = new LangchainCustomListOutputParser({
            length: lengthStr ? parseInt(lengthStr, 10) : undefined,
            separator: separator
        })
        Object.defineProperty(parser, 'autoFix', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: autoFix
        })
        return parser
    }
}

module.exports = { nodeClass: CustomListOutputParser }
