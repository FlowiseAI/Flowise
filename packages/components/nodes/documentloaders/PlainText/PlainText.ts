import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'

class PlainText_DocumentLoaders implements INode {
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
        this.label = 'Plain Text'
        this.name = 'plainText'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'plaintext.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from plain text`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Text',
                name: 'text',
                type: 'string',
                rows: 4,
                placeholder:
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const text = nodeData.inputs?.text as string
        const metadata = nodeData.inputs?.metadata

        let alldocs: Document<Record<string, any>>[] = []

        if (textSplitter) {
            const docs = await textSplitter.createDocuments([text])
            alldocs.push(...docs)
        } else {
            alldocs.push(
                new Document({
                    pageContent: text
                })
            )
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs: Document<Record<string, any>>[] = []
            for (const doc of alldocs) {
                const newdoc = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
                finaldocs.push(newdoc)
            }
            return finaldocs
        }

        return alldocs
    }
}

module.exports = { nodeClass: PlainText_DocumentLoaders }
