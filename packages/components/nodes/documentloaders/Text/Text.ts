import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { TextLoader } from 'langchain/document_loaders/fs/text'

class Text_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Text File'
        this.name = 'textFile'
        this.type = 'Document'
        this.icon = 'textFile.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from text files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Txt File',
                name: 'txtFile',
                type: 'file',
                fileType: '.txt'
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
        const txtFileBase64 = nodeData.inputs?.txtFile as string
        const metadata = nodeData.inputs?.metadata

        const files: string[] = txtFileBase64.startsWith('[') && txtFileBase64.endsWith(']') ? JSON.parse(txtFileBase64) : [txtFileBase64]
        const alldocs = files.map((file) => {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const blob = new Blob([bf])
            const loader = new TextLoader(blob)

            return textSplitter ? loader.loadAndSplit(textSplitter) : loader.load()
        })

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            return alldocs.map((doc) => {
                return {
                    ...doc,
                    metadata: {
                        // @ts-ignore-next-line
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
            })
        }
        return alldocs
    }
}

module.exports = { nodeClass: Text_DocumentLoaders }
