import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import {
    getCredentialData,
    getCredentialParam,
    handleDocumentLoaderDocuments,
    handleDocumentLoaderMetadata,
    handleDocumentLoaderOutput
} from '../../../src/utils'
import {
    UnstructuredLoader,
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy,
    SkipInferTableTypes,
    HiResModelName
} from '@langchain/community/document_loaders/fs/unstructured'
import {
    BlobServiceClient,
    StorageSharedKeyCredential as AzureStorageSharedKeyCredential
} from '@azure/storage-blob'
import * as fsDefault from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { LoadOfSheet } from '../MicrosoftExcel/ExcelLoader'
import { PowerpointLoader } from '../MicrosoftPowerpoint/PowerpointLoader'
import { TextSplitter } from 'langchain/text_splitter'
import { IDocument } from '../../../src/Interface'
import { omit } from 'lodash'
import { handleEscapeCharacters } from '../../../src'

class AzureBlobFile_DocumentLoaders implements INode {
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Azure Blob Storage'
        this.name = 'azureBlobFile'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'azureBlobStorage.svg'
        this.category = 'Document Loaders'
        this.description = 'Load Data from Azure Blob Storage'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Azure Blob Storage Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureBlobStorageApi']
        }
        this.inputs = [
            {
                label: 'Container Name',
                name: 'containerName',
                type: 'string',
                description: 'The name of the Azure Blob Storage container'
            },
            {
                label: 'Blob Name',
                name: 'blobName',
                type: 'string',
                description: 'The name (path) of the blob within the container',
                placeholder: 'documents/AI-Paper.pdf'
            },
            {
                label: 'File Processing Method',
                name: 'fileProcessingMethod',
                type: 'options',
                options: [
                    {
                        label: 'Built In Loaders',
                        name: 'builtIn',
                        description: 'Use the built in loaders to process the file.'
                    },
                    {
                        label: 'Unstructured',
                        name: 'unstructured',
                        description: 'Use the Unstructured API to process the file.'
                    }
                ],
                default: 'builtIn'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true,
                show: {
                    fileProcessingMethod: 'builtIn'
                }
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
            },
            {
                label: 'Unstructured API URL',
                name: 'unstructuredAPIUrl',
                description:
                    'Your Unstructured.io URL. Read <a target="_blank" href="https://unstructured-io.github.io/unstructured/introduction.html#getting-started">more</a> on how to get started',
                type: 'string',
                placeholder: process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000/general/v0/general',
                optional: !!process.env.UNSTRUCTURED_API_URL,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Unstructured API KEY',
                name: 'unstructuredAPIKey',
                type: 'password',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Strategy',
                name: 'strategy',
                description: 'The strategy to use for partitioning PDF/image. Options are fast, hi_res, auto. Default: auto.',
                type: 'options',
                options: [
                    {
                        label: 'Hi-Res',
                        name: 'hi_res'
                    },
                    {
                        label: 'Fast',
                        name: 'fast'
                    },
                    {
                        label: 'OCR Only',
                        name: 'ocr_only'
                    },
                    {
                        label: 'Auto',
                        name: 'auto'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: 'auto',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Encoding',
                name: 'encoding',
                description: 'The encoding method used to decode the text input. Default: utf-8.',
                type: 'string',
                optional: true,
                additionalParams: true,
                default: 'utf-8',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Skip Infer Table Types',
                name: 'skipInferTableTypes',
                description: 'The document types that you want to skip table extraction with. Default: pdf, jpg, png.',
                type: 'multiOptions',
                options: [
                    { label: 'doc', name: 'doc' },
                    { label: 'docx', name: 'docx' },
                    { label: 'eml', name: 'eml' },
                    { label: 'epub', name: 'epub' },
                    { label: 'htm', name: 'htm' },
                    { label: 'html', name: 'html' },
                    { label: 'jpeg', name: 'jpeg' },
                    { label: 'jpg', name: 'jpg' },
                    { label: 'md', name: 'md' },
                    { label: 'msg', name: 'msg' },
                    { label: 'odt', name: 'odt' },
                    { label: 'pdf', name: 'pdf' },
                    { label: 'png', name: 'png' },
                    { label: 'ppt', name: 'ppt' },
                    { label: 'pptx', name: 'pptx' },
                    { label: 'rtf', name: 'rtf' },
                    { label: 'text', name: 'text' },
                    { label: 'txt', name: 'txt' },
                    { label: 'xls', name: 'xls' },
                    { label: 'xlsx', name: 'xlsx' }
                ],
                optional: true,
                additionalParams: true,
                default: '["pdf", "jpg", "png"]',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Hi-Res Model Name',
                name: 'hiResModelName',
                description: 'The name of the inference model used when strategy is hi_res. Default: detectron2_onnx.',
                type: 'options',
                options: [
                    {
                        label: 'chipper',
                        name: 'chipper',
                        description:
                            'Exlusive to Unstructured hosted API. The Chipper model is Unstructured in-house image-to-text model based on transformer-based Visual Document Understanding (VDU) models.'
                    },
                    {
                        label: 'detectron2_onnx',
                        name: 'detectron2_onnx',
                        description:
                            'A Computer Vision model by Facebook AI that provides object detection and segmentation algorithms with ONNX Runtime. It is the fastest model with the hi_res strategy.'
                    },
                    {
                        label: 'yolox',
                        name: 'yolox',
                        description: 'A single-stage real-time object detector that modifies YOLOv3 with a DarkNet53 backbone.'
                    },
                    {
                        label: 'yolox_quantized',
                        name: 'yolox_quantized',
                        description: 'Runs faster than YoloX and its speed is closer to Detectron2.'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: 'detectron2_onnx',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Chunking Strategy',
                name: 'chunkingStrategy',
                description:
                    'Use one of the supported strategies to chunk the returned elements. When omitted, no chunking is performed and any other chunking parameters provided are ignored. Default: by_title',
                type: 'options',
                options: [
                    { label: 'None', name: 'None' },
                    { label: 'By Title', name: 'by_title' }
                ],
                optional: true,
                additionalParams: true,
                default: 'by_title',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Max Characters',
                name: 'maxCharacters',
                description:
                    'If chunking strategy is set, cut off new sections after reaching a length of n chars (hard max). Default: 500',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: '500',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Source ID Key',
                name: 'sourceIdKey',
                type: 'string',
                description:
                    'Key used to get the true source of document, to be compared against the record. Document metadata must contain the Source ID Key.',
                default: 'source',
                placeholder: 'source',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const containerName = nodeData.inputs?.containerName as string
        const blobName = nodeData.inputs?.blobName as string
        const fileProcessingMethod = nodeData.inputs?.fileProcessingMethod as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const connectionString = getCredentialParam('connectionString', credentialData, nodeData)
        const storageAccountName = getCredentialParam('storageAccountName', credentialData, nodeData)
        const accessKey = getCredentialParam('accessKey', credentialData, nodeData)

        let blobServiceClient: BlobServiceClient

        if (connectionString) {
            blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        } else if (storageAccountName && accessKey) {
            const sharedKeyCredential = new AzureStorageSharedKeyCredential(storageAccountName, accessKey)
            blobServiceClient = new BlobServiceClient(
                `https://${storageAccountName}.blob.core.windows.net`,
                sharedKeyCredential
            )
        } else {
            throw new Error(
                'Azure Blob Storage credentials are required. Provide either a Connection String or both Storage Account Name and Access Key.'
            )
        }

        const containerClient = blobServiceClient.getContainerClient(containerName)

        if (fileProcessingMethod === 'builtIn') {
            return await this.processWithBuiltInLoaders(
                containerClient,
                containerName,
                blobName,
                textSplitter,
                metadata,
                omitMetadataKeys,
                _omitMetadataKeys,
                output
            )
        } else {
            return await this.processWithUnstructured(nodeData, containerClient, containerName, blobName)
        }
    }

    private async processWithBuiltInLoaders(
        containerClient: InstanceType<typeof import('@azure/storage-blob').ContainerClient>,
        containerName: string,
        blobName: string,
        textSplitter: TextSplitter,
        metadata: any,
        omitMetadataKeys: string[],
        _omitMetadataKeys: string,
        output: string
    ): Promise<any> {
        let docs: IDocument[] = []

        try {
            const blockBlobClient = containerClient.getBlockBlobClient(blobName)
            const properties = await blockBlobClient.getProperties()
            const contentType = properties.contentType || this.getMimeTypeFromExtension(blobName)

            const downloadResponse = await blockBlobClient.download(0)
            const chunks: Buffer[] = []
            if (downloadResponse.readableStreamBody) {
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                }
            }
            const objectData = Buffer.concat(chunks)

            const fileInfo = {
                id: blobName,
                name: path.basename(blobName),
                mimeType: contentType,
                size: objectData.length,
                webViewLink: `azure://${containerName}/${blobName}`,
                containerName: containerName,
                blobName: blobName,
                lastModified: properties.lastModified,
                etag: properties.etag
            }

            docs = await this.processFile(fileInfo, objectData)

            if (textSplitter && docs.length > 0) {
                docs = await textSplitter.splitDocuments(docs)
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
        } catch (error) {
            throw new Error(`Failed to load Azure Blob document: ${error.message}`)
        }

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }

    private async processWithUnstructured(
        nodeData: INodeData,
        containerClient: InstanceType<typeof import('@azure/storage-blob').ContainerClient>,
        containerName: string,
        blobName: string
    ): Promise<any> {
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const unstructuredAPIKey = nodeData.inputs?.unstructuredAPIKey as string
        const strategy = nodeData.inputs?.strategy as UnstructuredLoaderStrategy
        const encoding = nodeData.inputs?.encoding as string
        const skipInferTableTypes = nodeData.inputs?.skipInferTableTypes
            ? JSON.parse(nodeData.inputs?.skipInferTableTypes as string)
            : ([] as SkipInferTableTypes[])
        const hiResModelName = nodeData.inputs?.hiResModelName as HiResModelName
        const chunkingStrategy = nodeData.inputs?.chunkingStrategy as 'None' | 'by_title'
        const metadata = nodeData.inputs?.metadata
        const sourceIdKey = (nodeData.inputs?.sourceIdKey as string) || 'source'
        const maxCharacters = nodeData.inputs?.maxCharacters as number
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        const tempDir = fsDefault.mkdtempSync(path.join(os.tmpdir(), 'azureblobloader-'))
        const filePath = path.join(tempDir, path.basename(blobName))

        try {
            const blockBlobClient = containerClient.getBlockBlobClient(blobName)
            const downloadResponse = await blockBlobClient.download(0)

            const chunks: Buffer[] = []
            if (downloadResponse.readableStreamBody) {
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                }
            }
            const objectData = Buffer.concat(chunks)

            fsDefault.mkdirSync(path.dirname(filePath), { recursive: true })
            fsDefault.writeFileSync(filePath, objectData)
        } catch (e: any) {
            throw new Error(`Failed to download blob ${blobName} from container ${containerName}: ${e.message}`)
        }

        try {
            const obj: UnstructuredLoaderOptions = {
                apiUrl: unstructuredAPIUrl,
                strategy,
                encoding,
                skipInferTableTypes,
                hiResModelName,
                chunkingStrategy,
                maxCharacters
            }

            if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

            const unstructuredLoader = new UnstructuredLoader(filePath, obj)

            let docs = await handleDocumentLoaderDocuments(unstructuredLoader)

            docs = handleDocumentLoaderMetadata(docs, _omitMetadataKeys, metadata, sourceIdKey)

            return handleDocumentLoaderOutput(docs, output)
        } catch {
            throw new Error(`Failed to load file ${filePath} using unstructured loader.`)
        } finally {
            fsDefault.rmSync(tempDir, { recursive: true })
        }
    }

    private getMimeTypeFromExtension(fileName: string): string {
        const extension = path.extname(fileName).toLowerCase()
        const mimeTypeMap: { [key: string]: string } = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.md': 'text/markdown'
        }
        return mimeTypeMap[extension] || 'application/octet-stream'
    }

    private async processFile(fileInfo: any, buffer: Buffer): Promise<IDocument[]> {
        try {
            if (this.isTextBasedFile(fileInfo.mimeType)) {
                const content = buffer.toString('utf-8')
                return [
                    {
                        pageContent: content,
                        metadata: {
                            source: fileInfo.webViewLink,
                            blobName: fileInfo.blobName,
                            fileName: fileInfo.name,
                            mimeType: fileInfo.mimeType,
                            size: fileInfo.size,
                            lastModified: fileInfo.lastModified,
                            etag: fileInfo.etag,
                            containerName: fileInfo.containerName
                        }
                    }
                ]
            } else if (this.isSupportedBinaryFile(fileInfo.mimeType)) {
                return await this.processBinaryFile(fileInfo, buffer)
            } else {
                console.warn(`Unsupported file type ${fileInfo.mimeType} for file ${fileInfo.name}`)
                return []
            }
        } catch (error) {
            console.warn(`Failed to process file ${fileInfo.name}: ${error.message}`)
            return []
        }
    }

    private isTextBasedFile(mimeType: string): boolean {
        const textBasedMimeTypes = [
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'text/csv',
            'text/xml',
            'application/json',
            'application/xml',
            'text/markdown',
            'text/x-markdown'
        ]
        return textBasedMimeTypes.includes(mimeType)
    }

    private isSupportedBinaryFile(mimeType: string): boolean {
        const supportedBinaryTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint'
        ]
        return supportedBinaryTypes.includes(mimeType)
    }

    private async processBinaryFile(fileInfo: any, buffer: Buffer): Promise<IDocument[]> {
        let tempFilePath: string | null = null

        try {
            tempFilePath = await this.createTempFile(buffer, fileInfo.name, fileInfo.mimeType)

            let docs: IDocument[] = []
            const mimeType = fileInfo.mimeType.toLowerCase()

            switch (mimeType) {
                case 'application/pdf': {
                    const pdfLoader = new PDFLoader(tempFilePath, {
                        // @ts-ignore
                        pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
                    })
                    docs = await pdfLoader.load()
                    break
                }
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                case 'application/msword': {
                    const docxLoader = new DocxLoader(tempFilePath)
                    docs = await docxLoader.load()
                    break
                }
                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                case 'application/vnd.ms-excel': {
                    const excelLoader = new LoadOfSheet(tempFilePath)
                    docs = await excelLoader.load()
                    break
                }
                case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                case 'application/vnd.ms-powerpoint': {
                    const pptxLoader = new PowerpointLoader(tempFilePath)
                    docs = await pptxLoader.load()
                    break
                }
                case 'text/csv': {
                    const csvLoader = new CSVLoader(tempFilePath)
                    docs = await csvLoader.load()
                    break
                }
                default:
                    throw new Error(`Unsupported binary file type: ${mimeType}`)
            }

            if (docs.length > 0) {
                const azureMetadata = {
                    source: fileInfo.webViewLink,
                    blobName: fileInfo.blobName,
                    fileName: fileInfo.name,
                    mimeType: fileInfo.mimeType,
                    size: fileInfo.size,
                    lastModified: fileInfo.lastModified,
                    etag: fileInfo.etag,
                    containerName: fileInfo.containerName,
                    totalPages: docs.length
                }

                return docs.map((doc, index) => ({
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...azureMetadata,
                        pageIndex: index
                    }
                }))
            }

            return []
        } catch (error) {
            throw new Error(`Failed to process binary file: ${error.message}`)
        } finally {
            if (tempFilePath && fsDefault.existsSync(tempFilePath)) {
                try {
                    fsDefault.unlinkSync(tempFilePath)
                } catch (e) {
                    console.warn(`Failed to delete temporary file: ${tempFilePath}`)
                }
            }
        }
    }

    private async createTempFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        let extension = path.extname(fileName)
        if (!extension) {
            const extensionMap: { [key: string]: string } = {
                'application/pdf': '.pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                'application/vnd.ms-powerpoint': '.ppt',
                'text/csv': '.csv'
            }
            extension = extensionMap[mimeType] || '.tmp'
        }

        const tempDir = os.tmpdir()
        const tempFileName = `azure_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
        const tempFilePath = path.join(tempDir, tempFileName)

        fsDefault.writeFileSync(tempFilePath, buffer)
        return tempFilePath
    }
}
module.exports = { nodeClass: AzureBlobFile_DocumentLoaders }
