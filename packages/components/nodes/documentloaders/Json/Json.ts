import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { JSONLoader } from 'langchain/document_loaders/fs/json'
import { getStoragePath } from '../../../src'
import fs from 'fs'
import path from 'path'

class Json_DocumentLoaders implements INode {
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
        this.label = 'Json File'
        this.name = 'jsonFile'
        this.version = 1.0
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const jsonFileBase64 = nodeData.inputs?.jsonFile as string
        const pointersName = nodeData.inputs?.pointersName as string
        const metadata = nodeData.inputs?.metadata

        let pointers: string[] = []
        if (pointersName) {
            const outputString = pointersName.replace(/[^a-zA-Z0-9,]+/g, ',')
            pointers = outputString.split(',').map((pointer) => '/' + pointer.trim())
        }

        let alldocs = []
        let files: string[] = []

        //FILE-STORAGE::["CONTRIBUTING.md","LICENSE.md","README.md"]
        if (jsonFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = jsonFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const chatflowid = options.chatflowid

            for (const file of files) {
                const fileInStorage = path.join(getStoragePath(), chatflowid, file)
                const fileData = fs.readFileSync(fileInStorage)
                const blob = new Blob([fileData])
                const loader = new JSONLoader(blob, pointers.length != 0 ? pointers : undefined)

                if (textSplitter) {
                    const docs = await loader.loadAndSplit(textSplitter)
                    alldocs.push(...docs)
                } else {
                    const docs = await loader.load()
                    alldocs.push(...docs)
                }
            }
        } else {
            if (jsonFileBase64.startsWith('[') && jsonFileBase64.endsWith(']')) {
                files = JSON.parse(jsonFileBase64)
            } else {
                files = [jsonFileBase64]
            }

            for (const file of files) {
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                const loader = new JSONLoader(blob, pointers.length != 0 ? pointers : undefined)

                if (textSplitter) {
                    const docs = await loader.loadAndSplit(textSplitter)
                    alldocs.push(...docs)
                } else {
                    const docs = await loader.load()
                    alldocs.push(...docs)
                }
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

module.exports = { nodeClass: Json_DocumentLoaders }
