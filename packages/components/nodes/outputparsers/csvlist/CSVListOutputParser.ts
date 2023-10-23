import { getBaseClasses, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { BaseOutputParser } from 'langchain/schema/output_parser'
import { CommaSeparatedListOutputParser } from 'langchain/output_parsers'

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
        this.icon = 'csv.png'
        this.category = 'Output Parser'
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = []
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return new CommaSeparatedListOutputParser()
    }
}

module.exports = { nodeClass: CSVListOutputParser }
