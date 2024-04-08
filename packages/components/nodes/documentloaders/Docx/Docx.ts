import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'
import path from 'path'
import { getStoragePath } from '../../../src'
import fs from 'fs'

class Docx_DocumentLoaders implements INode {
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
        this.label = 'Docx File'
        this.name = 'docxFile'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'docx.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from DOCX files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Docx File',
                name: 'docxFile',
                type: 'file',
                fileType: '.docx'
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const docxFileBase64 = nodeData.inputs?.docxFile as string
        const metadata = nodeData.inputs?.metadata

        let alldocs = []
        let files: string[] = []

        if (docxFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = docxFileBase64.replace('FILE-STORAGE::', '')
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
                const loader = new DocxLoader(blob)

                if (textSplitter) {
                    const docs = await loader.loadAndSplit(textSplitter)
                    alldocs.push(...docs)
                } else {
                    const docs = await loader.load()
                    alldocs.push(...docs)
                }
            }
        } else {
            if (docxFileBase64.startsWith('[') && docxFileBase64.endsWith(']')) {
                files = JSON.parse(docxFileBase64)
            } else {
                files = [docxFileBase64]
            }

            for (const file of files) {
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                const loader = new DocxLoader(blob)

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

module.exports = { nodeClass: Docx_DocumentLoaders }
