import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitterParams } from 'langchain/text_splitter'

class RecursiveCharacterTextSplitter_TextSplitters implements INode {
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
        this.label = 'Recursive Character Text Splitter'
        this.name = 'recursiveCharacterTextSplitter'
        this.version = 1.0
        this.type = 'RecursiveCharacterTextSplitter'
        this.icon = 'textsplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Split documents recursively by different characters - starting with "\\n\\n", then "\\n", then " "`
        this.baseClasses = [this.type, ...getBaseClasses(RecursiveCharacterTextSplitter)]
        this.inputs = [
            {
                label: 'Chunk Size',
                name: 'chunkSize',
                type: 'number',
                default: 1000,
                optional: true
            },
            {
                label: 'Chunk Overlap',
                name: 'chunkOverlap',
                type: 'number',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string

        const obj = {} as RecursiveCharacterTextSplitterParams

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new RecursiveCharacterTextSplitter(obj)

        return splitter
    }
}

module.exports = { nodeClass: RecursiveCharacterTextSplitter_TextSplitters }
