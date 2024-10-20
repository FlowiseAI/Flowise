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
        this.version = 2.0
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
                description: 'Number of characters in each chunk. Default is 1000.',
                default: 1000,
                optional: true
            },
            {
                label: 'Chunk Overlap',
                name: 'chunkOverlap',
                type: 'number',
                description: 'Number of characters to overlap between chunks. Default is 200.',
                default: 200,
                optional: true
            },
            {
                label: 'Custom Separators',
                name: 'separators',
                type: 'string',
                rows: 4,
                description: 'Array of custom separators to determine when to split the text, will override the default separators',
                placeholder: `["|", "##", ">", "-"]`,
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string
        const separators = nodeData.inputs?.separators

        const obj = {} as RecursiveCharacterTextSplitterParams

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)
        if (separators) {
            try {
                obj.separators = typeof separators === 'object' ? separators : JSON.parse(separators)
            } catch (e) {
                throw new Error(e)
            }
        }

        const splitter = new RecursiveCharacterTextSplitter(obj)

        return splitter
    }
}

module.exports = { nodeClass: RecursiveCharacterTextSplitter_TextSplitters }
