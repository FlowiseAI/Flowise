import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { Document } from 'langchain/document'
const { YoutubeTranscript } = require('youtube-transcript')

class Youtube_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]

    constructor() {
        this.label = 'Youtube Transcripts'
        this.name = 'youtube'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'youtube.png'
        this.category = 'Document Loaders'
        this.description = `Memorize, summarize, and chat with Youtube transcripts`
        this.baseClasses = [this.type]
        // this.credential = {
        //     label: 'Connect Credential',
        //     name: 'credential',
        //     type: 'credential',
        //     credentialNames: ['YoutubeApi'] // This should be changed to the correct credential name
        // }
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Youtube Video ID',
                name: 'videoId',
                type: 'string'
            }
        ]
    }
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter

        const videoId = nodeData.inputs?.videoId as string

        const loader = new YoutubeLoader({ videoId })

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        return docs
    }
}

interface YoutubeLoaderParams {
    videoId: string
}

class YoutubeLoader extends BaseDocumentLoader {
    public readonly videoId: string
    public readonly metadata?: ICommonObject

    constructor({ videoId }: YoutubeLoaderParams) {
        super()
        this.videoId = videoId
    }

    public async load(): Promise<Document[]> {
        return this.fetchTranscript()
    }

    private async fetchTranscript() {
        const youtubeUrl = `https://www.youtube.com/watch?v=${this.videoId}`
        const transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl)
        const concatenatedText = transcript.map((entry: any) => entry.text).join(' ')
        // console.log(concatenatedText)
        console.log('Video ID:', this.videoId)
        return [
            new Document({
                pageContent: concatenatedText,
                metadata: {
                    source: this.videoId,
                    doctype: 'youtube'
                }
            })
        ]
    }
}

module.exports = {
    nodeClass: Youtube_DocumentLoaders
}
