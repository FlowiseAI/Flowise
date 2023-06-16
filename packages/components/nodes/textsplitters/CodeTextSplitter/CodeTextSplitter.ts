import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import {
    RecursiveCharacterTextSplitter,
    RecursiveCharacterTextSplitterParams,
    SupportedTextSplitterLanguage
} from 'langchain/text_splitter'

class CodeTextSplitter_TextSplitters implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    constructor() {
        this.label = 'Code Text Splitter'
        this.name = 'codeTextSplitter'
        this.type = 'CodeTextSplitter'
        this.icon = 'codeTextSplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Split documents based on language-specific syntax`
        this.baseClasses = [this.type, ...getBaseClasses(RecursiveCharacterTextSplitter)]
        this.inputs = [
            {
                label: 'Language',
                name: 'language',
                type: 'options',
                options: [
                    {
                        label: 'cpp',
                        name: 'cpp'
                    },
                    {
                        label: 'go',
                        name: 'go'
                    },
                    {
                        label: 'java',
                        name: 'java'
                    },
                    {
                        label: 'js',
                        name: 'js'
                    },
                    {
                        label: 'php',
                        name: 'php'
                    },
                    {
                        label: 'proto',
                        name: 'proto'
                    },
                    {
                        label: 'python',
                        name: 'python'
                    },
                    {
                        label: 'rst',
                        name: 'rst'
                    },
                    {
                        label: 'ruby',
                        name: 'ruby'
                    },
                    {
                        label: 'rust',
                        name: 'rust'
                    },
                    {
                        label: 'scala',
                        name: 'scala'
                    },
                    {
                        label: 'swift',
                        name: 'swift'
                    },
                    {
                        label: 'markdown',
                        name: 'markdown'
                    },
                    {
                        label: 'latex',
                        name: 'latex'
                    },
                    {
                        label: 'html',
                        name: 'html'
                    },
                    {
                        label: 'sol',
                        name: 'sol'
                    }
                ]
            },
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
        const language = nodeData.inputs?.language as SupportedTextSplitterLanguage

        const obj = {} as RecursiveCharacterTextSplitterParams

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = RecursiveCharacterTextSplitter.fromLanguage(language, obj)

        return splitter
    }
}
module.exports = { nodeClass: CodeTextSplitter_TextSplitters }
