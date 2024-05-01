import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'
import { getFileFromStorage } from '../../../src'

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
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const docxFileBase64 = nodeData.inputs?.docxFile as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let docs: IDocument[] = []
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
                const fileData = await getFileFromStorage(file, chatflowid)
                const blob = new Blob([fileData])
                const loader = new DocxLoader(blob)

                if (textSplitter) {
                    docs.push(...(await loader.loadAndSplit(textSplitter)))
                } else {
                    docs.push(...(await loader.load()))
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
                    docs.push(...(await loader.loadAndSplit(textSplitter)))
                } else {
                    docs.push(...(await loader.load()))
                }
            }
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata: omit(
                    {
                        ...doc.metadata,
                        ...parsedMetadata
                    },
                    omitMetadataKeys
                )
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata: omit(
                    {
                        ...doc.metadata
                    },
                    omitMetadataKeys
                )
            }))
        }

        return docs
    }
}

module.exports = { nodeClass: Docx_DocumentLoaders }
