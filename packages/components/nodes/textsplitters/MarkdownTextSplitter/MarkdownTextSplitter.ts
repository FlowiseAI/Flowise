import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MarkdownTextSplitter, MarkdownTextSplitterParams } from 'langchain/text_splitter'

class MarkdownTextSplitter_TextSplitters implements INode {
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
        this.label = 'Markdown Text Splitter'
        this.name = 'markdownTextSplitter'
        this.version = 1.1
        this.type = 'MarkdownTextSplitter'
        this.icon = 'markdownTextSplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Split your content into documents based on the Markdown headers`
        this.baseClasses = [this.type, ...getBaseClasses(MarkdownTextSplitter)]
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
                label: 'Split by Headers',
                name: 'splitByHeaders',
                type: 'options',
                description: 'Split documents at specified header levels. Headers will be included with their content.',
                default: 'disabled',
                options: [
                    {
                        label: 'Disabled',
                        name: 'disabled'
                    },
                    {
                        label: '# Headers (H1)',
                        name: 'h1'
                    },
                    {
                        label: '## Headers (H2)',
                        name: 'h2'
                    },
                    {
                        label: '### Headers (H3)',
                        name: 'h3'
                    },
                    {
                        label: '#### Headers (H4)',
                        name: 'h4'
                    },
                    {
                        label: '##### Headers (H5)',
                        name: 'h5'
                    },
                    {
                        label: '###### Headers (H6)',
                        name: 'h6'
                    }
                ],
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string
        const splitByHeaders = nodeData.inputs?.splitByHeaders as string

        const obj = {} as MarkdownTextSplitterParams

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new MarkdownTextSplitter(obj)

        if (splitByHeaders && splitByHeaders !== 'disabled') {
            return {
                splitDocuments: async (documents: any[]) => {
                    const results = []

                    for (const doc of documents) {
                        const chunks = await this.splitByHeaders(doc.pageContent, splitByHeaders, splitter)
                        for (const chunk of chunks) {
                            results.push({
                                pageContent: chunk,
                                metadata: { ...doc.metadata }
                            })
                        }
                    }

                    return results
                },
                splitText: async (text: string) => {
                    return await this.splitByHeaders(text, splitByHeaders, splitter)
                }
            }
        }

        return splitter
    }

    private async splitByHeaders(text: string, headerLevel: string, fallbackSplitter: any): Promise<string[]> {
        const maxLevel = this.getHeaderLevel(headerLevel)
        if (maxLevel === 0) return await fallbackSplitter.splitText(text)

        const lines = text.split('\n')
        const sections: string[] = []
        let currentSection: string[] = []

        for (const line of lines) {
            const isHeader = line.startsWith('#') && line.match(/^#{1,6}\s/)
            const headerDepth = isHeader ? line.match(/^(#+)/)?.[1]?.length || 0 : 0

            if (isHeader && headerDepth <= maxLevel) {
                // Save previous section
                if (currentSection.length > 0) {
                    sections.push(currentSection.join('\n').trim())
                }
                // Start new section
                currentSection = [line]
            } else {
                // Add line to current section
                currentSection.push(line)
            }
        }

        // Add final section
        if (currentSection.length > 0) {
            sections.push(currentSection.join('\n').trim())
        }

        return sections
    }

    private getHeaderLevel(headerLevel: string): number {
        switch (headerLevel) {
            case 'h1':
                return 1
            case 'h2':
                return 2
            case 'h3':
                return 3
            case 'h4':
                return 4
            case 'h5':
                return 5
            case 'h6':
                return 6
            default:
                return 0
        }
    }
}

module.exports = { nodeClass: MarkdownTextSplitter_TextSplitters }
