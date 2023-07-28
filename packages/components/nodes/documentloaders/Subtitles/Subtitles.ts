import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { SRTLoader } from 'langchain/document_loaders/fs/srt'

class Subtitles_DocumentLoaders implements INode {
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
        this.label = 'Subtitles File'
        this.name = 'subtitlesFile'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'subtitlesFile.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from subtitles files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Subtitles File',
                name: 'subtitlesFile',
                type: 'file',
                fileType: '.srt'
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
        const subtitlesFileBase64 = nodeData.inputs?.subtitlesFile as string
        const metadata = nodeData.inputs?.metadata

        let alldocs = []
        let files: string[] = []

        if (subtitlesFileBase64.startsWith('[') && subtitlesFileBase64.endsWith(']')) {
            files = JSON.parse(subtitlesFileBase64)
        } else {
            files = [subtitlesFileBase64]
        }

        for (const file of files) {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const blob = new Blob([bf])
            const loader = new SRTLoader(blob)

            if (textSplitter) {
                const docs = await loader.loadAndSplit(textSplitter)
                alldocs.push(...docs)
            } else {
                const docs = await loader.load()
                alldocs.push(...docs)
            }
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
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

module.exports = { nodeClass: Subtitles_DocumentLoaders }
