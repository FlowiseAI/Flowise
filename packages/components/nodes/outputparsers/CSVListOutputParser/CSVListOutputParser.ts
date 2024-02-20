import { BaseOutputParser, CommaSeparatedListOutputParser } from '@langchain/core/output_parsers'
import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'
import { CATEGORY } from '../OutputParserHelpers'

class CSVListOutputParser implements INode {
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
        this.label = 'CSV Output Parser'
        this.name = 'csvOutputParser'
        this.version = 1.0
        this.type = 'CSVListOutputParser'
        this.description = 'Parse the output of an LLM call as a comma-separated list of values'
        this.icon = 'csv.svg'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
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
        const autoFix = nodeData.inputs?.autofixParser as boolean

        const commaSeparatedListOutputParser = new CommaSeparatedListOutputParser()
        Object.defineProperty(commaSeparatedListOutputParser, 'autoFix', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: autoFix
        })
        return commaSeparatedListOutputParser
    }
}

module.exports = { nodeClass: CSVListOutputParser }
