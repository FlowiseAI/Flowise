import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class RecursiveCharacterTextSplitter_TextSplitters implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Recursive Character Text Splitter'
        this.name = 'recursiveCharacterTextSplitter'
        this.type = 'RecursiveCharacterTextSplitter'
        this.icon = 'textsplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Split documents recursively by different characters - starting with "\n\n", then "\n", then " "`
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

    async getBaseClasses(): Promise<string[]> {
        const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter')
        return getBaseClasses(RecursiveCharacterTextSplitter)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter')
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string

        const obj = {} as any

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new RecursiveCharacterTextSplitter(obj)

        return splitter
    }
}

module.exports = { nodeClass: RecursiveCharacterTextSplitter_TextSplitters }
