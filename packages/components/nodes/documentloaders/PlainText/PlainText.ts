import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import { handleEscapeCharacters } from '../../../src'

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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Plain Text'
        this.name = 'plainText'
        this.version = 2.0
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
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                baseClasses: this.baseClasses
            },
            {
                label: 'Text',
                name: 'text',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const text = nodeData.inputs?.text as string
        const metadata = nodeData.inputs?.metadata
        const output = nodeData.outputs?.output as string

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

        let finaldocs: Document<Record<string, any>>[] = []
        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
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
        } else {
            finaldocs = alldocs
        }

        if (output === 'document') {
            return finaldocs
        } else {
            let finaltext = ''
            for (const doc of finaldocs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: PlainText_DocumentLoaders }
