import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { JSONLoader } from 'langchain/document_loaders/fs/json'

class Json_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Json File'
        this.name = 'jsonFile'
        this.type = 'Document'
        this.icon = 'json.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from JSON files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Json File',
                name: 'jsonFile',
                type: 'file',
                fileType: '.json'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Pointers Extraction (separated by commas)',
                name: 'pointersName',
                type: 'string',
                description: 'Extracting multiple pointers',
                placeholder: 'Enter pointers name',
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
        const jsonFileBase64 = nodeData.inputs?.jsonFile as string
        const pointersName = nodeData.inputs?.pointersName as string
        const metadata = nodeData.inputs?.metadata

        let pointers: string[] = []
        if (pointersName) {
            const outputString = pointersName.replace(/[^a-zA-Z0-9,]+/g, ',')
            pointers = outputString.split(',').map((pointer) => '/' + pointer.trim())
        }

        const files: string[] =
            jsonFileBase64.startsWith('[') && jsonFileBase64.endsWith(']') ? JSON.parse(jsonFileBase64) : [jsonFileBase64]

        const alldocs = files.map((file) => {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const blob = new Blob([bf])
            const loader = new JSONLoader(blob, pointers.length != 0 ? pointers : undefined)

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

module.exports = { nodeClass: Json_DocumentLoaders }
