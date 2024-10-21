import { omit } from 'lodash'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { JSONLinesLoader, JSONLoader } from 'langchain/document_loaders/fs/json'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { Document } from '@langchain/core/documents'
import { getFileFromStorage } from '../../../src/storageUtils'
import { mapMimeTypeToExt } from '../../../src/utils'

class File_DocumentLoaders implements INode {
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
        this.label = 'File Loader'
        this.name = 'fileLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'file.svg'
        this.category = 'Document Loaders'
        this.description = `A generic file loader that can load txt, json, csv, docx, pdf, and other files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'File',
                name: 'file',
                type: 'file',
                fileType: '*'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Pdf Usage',
                name: 'pdfUsage',
                type: 'options',
                description: 'Only when loading PDF files',
                options: [
                    {
                        label: 'One document per page',
                        name: 'perPage'
                    },
                    {
                        label: 'One document per file',
                        name: 'perFile'
                    }
                ],
                default: 'perPage',
                optional: true,
                additionalParams: true
            },
            {
                label: 'JSONL Pointer Extraction',
                name: 'pointerName',
                type: 'string',
                description: 'Only when loading JSONL files',
                placeholder: '<pointerName>',
                optional: true,
                additionalParams: true
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
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const fileBase64 = nodeData.inputs?.file as string
        const metadata = nodeData.inputs?.metadata
        const pdfUsage = nodeData.inputs?.pdfUsage
        const pointerName = nodeData.inputs?.pointerName as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let files: string[] = []
        const fileBlobs: { blob: Blob; ext: string }[] = []

        //FILE-STORAGE::["CONTRIBUTING.md","LICENSE.md","README.md"]
        const totalFiles = getOverrideFileInputs(nodeData) || fileBase64
        if (totalFiles.startsWith('FILE-STORAGE::')) {
            const fileName = totalFiles.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const chatflowid = options.chatflowid

            // specific to createAttachment to get files from chatId
            const retrieveAttachmentChatId = options.retrieveAttachmentChatId
            if (retrieveAttachmentChatId) {
                for (const file of files) {
                    if (!file) continue
                    const fileData = await getFileFromStorage(file, chatflowid, options.chatId)
                    const blob = new Blob([fileData])
                    fileBlobs.push({ blob, ext: file.split('.').pop() || '' })
                }
            } else {
                for (const file of files) {
                    if (!file) continue
                    const fileData = await getFileFromStorage(file, chatflowid)
                    const blob = new Blob([fileData])
                    fileBlobs.push({ blob, ext: file.split('.').pop() || '' })
                }
            }
        } else {
            if (totalFiles.startsWith('[') && totalFiles.endsWith(']')) {
                files = JSON.parse(totalFiles)
            } else {
                files = [totalFiles]
            }

            for (const file of files) {
                if (!file) continue
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])

                let extension = ''
                // eslint-disable-next-line no-useless-escape
                const match = file.match(/^data:([A-Za-z-+\/]+);base64,/)

                if (!match) {
                    fileBlobs.push({
                        blob,
                        ext: extension
                    })
                } else {
                    const mimeType = match[1]
                    fileBlobs.push({
                        blob,
                        ext: mapMimeTypeToExt(mimeType)
                    })
                }
            }
        }

        const loader = new MultiFileLoader(fileBlobs, {
            json: (blob) => new JSONLoader(blob),
            jsonl: (blob) => new JSONLinesLoader(blob, '/' + pointerName.trim()),
            txt: (blob) => new TextLoader(blob),
            csv: (blob) => new CSVLoader(blob),
            xls: (blob) => new CSVLoader(blob),
            xlsx: (blob) => new CSVLoader(blob),
            docx: (blob) => new DocxLoader(blob),
            doc: (blob) => new DocxLoader(blob),
            pdf: (blob) =>
                pdfUsage === 'perFile'
                    ? // @ts-ignore
                      new PDFLoader(blob, { splitPages: false, pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') })
                    : // @ts-ignore
                      new PDFLoader(blob, { pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') }),
            '': (blob) => new TextLoader(blob)
        })
        let docs = []

        if (textSplitter) {
            docs = await loader.load()
            docs = await textSplitter.splitDocuments(docs)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {
                              ...parsedMetadata
                          }
                        : omit(
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
                metadata:
                    _omitMetadataKeys === '*'
                        ? {}
                        : omit(
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

const getOverrideFileInputs = (nodeData: INodeData) => {
    const txtFileBase64 = nodeData.inputs?.txtFile as string
    const pdfFileBase64 = nodeData.inputs?.pdfFile as string
    const jsonFileBase64 = nodeData.inputs?.jsonFile as string
    const csvFileBase64 = nodeData.inputs?.csvFile as string
    const jsonlinesFileBase64 = nodeData.inputs?.jsonlinesFile as string
    const docxFileBase64 = nodeData.inputs?.docxFile as string
    const yamlFileBase64 = nodeData.inputs?.yamlFile as string

    const removePrefix = (storageFile: string): string[] => {
        const fileName = storageFile.replace('FILE-STORAGE::', '')
        if (fileName.startsWith('[') && fileName.endsWith(']')) {
            return JSON.parse(fileName)
        }
        return [fileName]
    }

    // If exists, combine all file inputs into an array
    const files: string[] = []
    if (txtFileBase64) {
        files.push(...removePrefix(txtFileBase64))
    }
    if (pdfFileBase64) {
        files.push(...removePrefix(pdfFileBase64))
    }
    if (jsonFileBase64) {
        files.push(...removePrefix(jsonFileBase64))
    }
    if (csvFileBase64) {
        files.push(...removePrefix(csvFileBase64))
    }
    if (jsonlinesFileBase64) {
        files.push(...removePrefix(jsonlinesFileBase64))
    }
    if (docxFileBase64) {
        files.push(...removePrefix(docxFileBase64))
    }
    if (yamlFileBase64) {
        files.push(...removePrefix(yamlFileBase64))
    }

    return files.length ? `FILE-STORAGE::${JSON.stringify(files)}` : ''
}

interface LoadersMapping {
    [extension: string]: (blob: Blob) => BaseDocumentLoader
}

class MultiFileLoader extends BaseDocumentLoader {
    constructor(public fileBlobs: { blob: Blob; ext: string }[], public loaders: LoadersMapping) {
        super()

        if (Object.keys(loaders).length === 0) {
            throw new Error('Must provide at least one loader')
        }
    }

    public async load(): Promise<Document[]> {
        const documents: Document[] = []

        for (const fileBlob of this.fileBlobs) {
            const loaderFactory = this.loaders[fileBlob.ext]
            if (loaderFactory) {
                const loader = loaderFactory(fileBlob.blob)
                documents.push(...(await loader.load()))
            } else {
                const loader = new TextLoader(fileBlob.blob)
                try {
                    documents.push(...(await loader.load()))
                } catch (error) {
                    throw new Error(`Error loading file`)
                }
            }
        }

        return documents
    }
}

module.exports = { nodeClass: File_DocumentLoaders }
