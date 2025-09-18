import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { CharacterTextSplitter, CharacterTextSplitterParams } from 'langchain/text_splitter'

class CharacterTextSplitter_TextSplitters implements INode {
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
        this.label = 'Character Text Splitter'
        this.name = 'characterTextSplitter'
        this.version = 1.0
        this.type = 'CharacterTextSplitter'
        this.icon = 'textsplitter.svg'
        this.category = 'Text Splitters'
        this.description = `splits only on one type of character (defaults to "\\n\\n").`
        this.baseClasses = [this.type, ...getBaseClasses(CharacterTextSplitter)]
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
                label: 'Custom Separator',
                name: 'separator',
                type: 'string',
                placeholder: `" "`,
                description: 'Separator to determine when to split the text, will override the default separator',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const separator = nodeData.inputs?.separator as string
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string

        const obj = {} as CharacterTextSplitterParams

        if (separator) obj.separator = separator
        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new CharacterTextSplitter(obj)

        return splitter
    }
}

module.exports = { nodeClass: CharacterTextSplitter_TextSplitters }
