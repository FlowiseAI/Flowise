import { getBaseClasses, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { CustomListOutputParser as LangchainCustomListOutputParser } from 'langchain/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'

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
        this.icon = 'list.png'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
            {
                label: 'Length',
                name: 'length',
                type: 'number',
                default: 5,
                step: 1,
                description: 'Number of values to return'
            },
            {
                label: 'Separator',
                name: 'separator',
                type: 'string',
                description: 'Separator between values',
                default: ','
            }
        ]
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const separator = nodeData.inputs?.separator as string
        const lengthStr = nodeData.inputs?.length as string
        let length = 5
        if (lengthStr) length = parseInt(lengthStr, 10)
        return new LangchainCustomListOutputParser({ length: length, separator: separator })
    }
}

module.exports = { nodeClass: CustomListOutputParser }
