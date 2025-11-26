import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { S3Loader } from '@langchain/community/document_loaders/web/s3'
import {
    UnstructuredLoader,
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy,
    SkipInferTableTypes,
    HiResModelName
} from '@langchain/community/document_loaders/fs/unstructured'
import {
    getCredentialData,
    getCredentialParam,
    handleDocumentLoaderDocuments,
    handleDocumentLoaderMetadata,
    handleDocumentLoaderOutput
} from '../../../src/utils'
import { S3Client, GetObjectCommand, HeadObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3'
import { getRegions, MODEL_TYPE } from '../../../src/modelLoader'
import { Readable } from 'node:stream'
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

class S3_DocumentLoaders implements INode {
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
        this.label = 'S3'
        this.name = 'S3'
        this.version = 5.0
        this.type = 'Document'
        this.icon = 's3.svg'
        this.category = 'Document Loaders'
        this.description = 'Load Data from S3 Buckets'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'AWS Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Bucket',
                name: 'bucketName',
                type: 'string'
            },
            {
                label: 'Object Key',
                name: 'keyName',
                type: 'string',
                description: 'The object key (or key name) that uniquely identifies object in an Amazon S3 bucket',
                placeholder: 'AI-Paper.pdf'
            },
            {
                label: 'Region',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
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
                    {
                        label: 'doc',
                        name: 'doc'
                    },
                    {
                        label: 'docx',
                        name: 'docx'
                    },
                    {
                        label: 'eml',
                        name: 'eml'
                    },
                    {
                        label: 'epub',
                        name: 'epub'
                    },
                    {
                        label: 'heic',
                        name: 'heic'
                    },
                    {
                        label: 'htm',
                        name: 'htm'
                    },
                    {
                        label: 'html',
                        name: 'html'
                    },
                    {
                        label: 'jpeg',
                        name: 'jpeg'
                    },
                    {
                        label: 'jpg',
                        name: 'jpg'
                    },
                    {
                        label: 'md',
                        name: 'md'
                    },
                    {
                        label: 'msg',
                        name: 'msg'
                    },
                    {
                        label: 'odt',
                        name: 'odt'
                    },
                    {
                        label: 'pdf',
                        name: 'pdf'
                    },
                    {
                        label: 'png',
                        name: 'png'
                    },
                    {
                        label: 'ppt',
                        name: 'ppt'
                    },
                    {
                        label: 'pptx',
                        name: 'pptx'
                    },
                    {
                        label: 'rtf',
                        name: 'rtf'
                    },
                    {
                        label: 'text',
                        name: 'text'
                    },
                    {
                        label: 'txt',
                        name: 'txt'
                    },
                    {
                        label: 'xls',
                        name: 'xls'
                    },
                    {
                        label: 'xlsx',
                        name: 'xlsx'
                    }
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
                    {
                        label: 'None',
                        name: 'None'
                    },
                    {
                        label: 'By Title',
                        name: 'by_title'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: 'by_title',
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'OCR Languages',
                name: 'ocrLanguages',
                description: 'The languages to use for OCR. Note: Being depricated as languages is the new type. Pending langchain update.',
                type: 'multiOptions',
                options: [
                    {
                        label: 'English',
                        name: 'eng'
                    },
                    {
                        label: 'Spanish (Español)',
                        name: 'spa'
                    },
                    {
                        label: 'Mandarin Chinese (普通话)',
                        name: 'cmn'
                    },
                    {
                        label: 'Hindi (हिन्दी)',
                        name: 'hin'
                    },
                    {
                        label: 'Arabic (اَلْعَرَبِيَّةُ)',
                        name: 'ara'
                    },
                    {
                        label: 'Portuguese (Português)',
                        name: 'por'
                    },
                    {
                        label: 'Bengali (বাংলা)',
                        name: 'ben'
                    },
                    {
                        label: 'Russian (Русский)',
                        name: 'rus'
                    },
                    {
                        label: 'Japanese (日本語)',
                        name: 'jpn'
                    },
                    {
                        label: 'Punjabi (ਪੰਜਾਬੀ)',
                        name: 'pan'
                    },
                    {
                        label: 'German (Deutsch)',
                        name: 'deu'
                    },
                    {
                        label: 'Korean (한국어)',
                        name: 'kor'
                    },
                    {
                        label: 'French (Français)',
                        name: 'fra'
                    },
                    {
                        label: 'Italian (Italiano)',
                        name: 'ita'
                    },
                    {
                        label: 'Vietnamese (Tiếng Việt)',
                        name: 'vie'
                    }
                ],
                optional: true,
                additionalParams: true,
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
            },
            {
                label: 'Coordinates',
                name: 'coordinates',
                type: 'boolean',
                description: 'If true, return coordinates for each element. Default: false.',
                optional: true,
                additionalParams: true,
                default: false,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'XML Keep Tags',
                name: 'xmlKeepTags',
                description:
                    'If True, will retain the XML tags in the output. Otherwise it will simply extract the text from within the tags. Only applies to partition_xml.',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Include Page Breaks',
                name: 'includePageBreaks',
                description: 'When true, the output will include page break elements when the filetype supports it.',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Multi-Page Sections',
                name: 'multiPageSections',
                description: 'Whether to treat multi-page documents as separate sections.',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'Combine Under N Chars',
                name: 'combineUnderNChars',
                description:
                    "If chunking strategy is set, combine elements until a section reaches a length of n chars. Default: value of max_characters. Can't exceed value of max_characters.",
                type: 'number',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
            },
            {
                label: 'New After N Chars',
                name: 'newAfterNChars',
                description:
                    "If chunking strategy is set, cut off new sections after reaching a length of n chars (soft max). value of max_characters. Can't exceed value of max_characters.",
                type: 'number',
                optional: true,
                additionalParams: true,
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
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true,
                show: {
                    fileProcessingMethod: 'unstructured'
                }
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

    loadMethods = {
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.CHAT, 'awsChatBedrock')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const bucketName = nodeData.inputs?.bucketName as string
        const keyName = nodeData.inputs?.keyName as string
        const region = nodeData.inputs?.region as string
        const fileProcessingMethod = nodeData.inputs?.fileProcessingMethod as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let credentials: S3ClientConfig['credentials'] | undefined

        if (nodeData.credential) {
            const credentialData = await getCredentialData(nodeData.credential, options)
            const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
            const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)

            if (accessKeyId && secretAccessKey) {
                credentials = {
                    accessKeyId,
                    secretAccessKey
                }
            }
        }

        const s3Config: S3ClientConfig = {
            region,
            credentials
        }

        if (fileProcessingMethod === 'builtIn') {
            return await this.processWithBuiltInLoaders(
                bucketName,
                keyName,
                s3Config,
                textSplitter,
                metadata,
                omitMetadataKeys,
                _omitMetadataKeys,
                output
            )
        } else {
            return await this.processWithUnstructured(nodeData, options, bucketName, keyName, s3Config)
        }
    }

    private async processWithBuiltInLoaders(
        bucketName: string,
        keyName: string,
        s3Config: S3ClientConfig,
        textSplitter: TextSplitter,
        metadata: any,
        omitMetadataKeys: string[],
        _omitMetadataKeys: string,
        output: string
    ): Promise<any> {
        let docs: IDocument[] = []

        try {
            const s3Client = new S3Client(s3Config)

            // Get file metadata to determine content type
            const headCommand = new HeadObjectCommand({
                Bucket: bucketName,
                Key: keyName
            })

            const headResponse = await s3Client.send(headCommand)
            const contentType = headResponse.ContentType || this.getMimeTypeFromExtension(keyName)

            // Download the file
            const getObjectCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: keyName
            })

            const response = await s3Client.send(getObjectCommand)

            const objectData = await new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = []

                if (response.Body instanceof Readable) {
                    response.Body.on('data', (chunk: Buffer) => chunks.push(chunk))
                    response.Body.on('end', () => resolve(Buffer.concat(chunks)))
                    response.Body.on('error', reject)
                } else {
                    reject(new Error('Response body is not a readable stream.'))
                }
            })

            // Process the file based on content type
            const fileInfo = {
                id: keyName,
                name: path.basename(keyName),
                mimeType: contentType,
                size: objectData.length,
                webViewLink: `s3://${bucketName}/${keyName}`,
                bucketName: bucketName,
                key: keyName,
                lastModified: headResponse.LastModified,
                etag: headResponse.ETag
            }

            docs = await this.processFile(fileInfo, objectData)

            // Apply text splitter if provided
            if (textSplitter && docs.length > 0) {
                docs = await textSplitter.splitDocuments(docs)
            }

            // Apply metadata transformations
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
            throw new Error(`Failed to load S3 document: ${error.message}`)
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
        options: ICommonObject,
        bucketName: string,
        keyName: string,
        s3Config: S3ClientConfig
    ): Promise<any> {
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const unstructuredAPIKey = nodeData.inputs?.unstructuredAPIKey as string
        const strategy = nodeData.inputs?.strategy as UnstructuredLoaderStrategy
        const encoding = nodeData.inputs?.encoding as string
        const coordinates = nodeData.inputs?.coordinates as boolean
        const skipInferTableTypes = nodeData.inputs?.skipInferTableTypes
            ? JSON.parse(nodeData.inputs?.skipInferTableTypes as string)
            : ([] as SkipInferTableTypes[])
        const hiResModelName = nodeData.inputs?.hiResModelName as HiResModelName
        const includePageBreaks = nodeData.inputs?.includePageBreaks as boolean
        const chunkingStrategy = nodeData.inputs?.chunkingStrategy as 'None' | 'by_title'
        const metadata = nodeData.inputs?.metadata
        const sourceIdKey = (nodeData.inputs?.sourceIdKey as string) || 'source'
        const ocrLanguages = nodeData.inputs?.ocrLanguages ? JSON.parse(nodeData.inputs?.ocrLanguages as string) : ([] as string[])
        const xmlKeepTags = nodeData.inputs?.xmlKeepTags as boolean
        const multiPageSections = nodeData.inputs?.multiPageSections as boolean
        const combineUnderNChars = nodeData.inputs?.combineUnderNChars as number
        const newAfterNChars = nodeData.inputs?.newAfterNChars as number
        const maxCharacters = nodeData.inputs?.maxCharacters as number
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        const loader = new S3Loader({
            bucket: bucketName,
            key: keyName,
            s3Config,
            unstructuredAPIURL: unstructuredAPIUrl,
            unstructuredAPIKey: unstructuredAPIKey
        })

        loader.load = async () => {
            const tempDir = fsDefault.mkdtempSync(path.join(os.tmpdir(), 's3fileloader-'))

            const filePath = path.join(tempDir, keyName)

            try {
                const s3Client = new S3Client(s3Config)

                const getObjectCommand = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: keyName
                })

                const response = await s3Client.send(getObjectCommand)

                const objectData = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = []

                    if (response.Body instanceof Readable) {
                        response.Body.on('data', (chunk: Buffer) => chunks.push(chunk))
                        response.Body.on('end', () => resolve(Buffer.concat(chunks)))
                        response.Body.on('error', reject)
                    } else {
                        reject(new Error('Response body is not a readable stream.'))
                    }
                })

                fsDefault.mkdirSync(path.dirname(filePath), { recursive: true })

                fsDefault.writeFileSync(filePath, objectData)
            } catch (e: any) {
                throw new Error(`Failed to download file ${keyName} from S3 bucket ${bucketName}: ${e.message}`)
            }

            try {
                const obj: UnstructuredLoaderOptions = {
                    apiUrl: unstructuredAPIUrl,
                    strategy,
                    encoding,
                    coordinates,
                    skipInferTableTypes,
                    hiResModelName,
                    includePageBreaks,
                    chunkingStrategy,
                    ocrLanguages,
                    xmlKeepTags,
                    multiPageSections,
                    combineUnderNChars,
                    newAfterNChars,
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
                fsDefault.rmSync(path.dirname(filePath), { recursive: true })
            }
        }

        return loader.load()
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
            // Handle different file types
            if (this.isTextBasedFile(fileInfo.mimeType)) {
                // Process text files directly from buffer
                const content = buffer.toString('utf-8')

                // Create document with metadata
                return [
                    {
                        pageContent: content,
                        metadata: {
                            source: fileInfo.webViewLink,
                            fileId: fileInfo.key,
                            fileName: fileInfo.name,
                            mimeType: fileInfo.mimeType,
                            size: fileInfo.size,
                            lastModified: fileInfo.lastModified,
                            etag: fileInfo.etag,
                            bucketName: fileInfo.bucketName
                        }
                    }
                ]
            } else if (this.isSupportedBinaryFile(fileInfo.mimeType)) {
                // Process binary files using loaders
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
            // Create temporary file
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

            // Add S3 metadata to each document
            if (docs.length > 0) {
                const s3Metadata = {
                    source: fileInfo.webViewLink,
                    fileId: fileInfo.key,
                    fileName: fileInfo.name,
                    mimeType: fileInfo.mimeType,
                    size: fileInfo.size,
                    lastModified: fileInfo.lastModified,
                    etag: fileInfo.etag,
                    bucketName: fileInfo.bucketName,
                    totalPages: docs.length // Total number of pages/sheets in the file
                }

                return docs.map((doc, index) => ({
                    ...doc,
                    metadata: {
                        ...doc.metadata, // Keep original loader metadata (page numbers, etc.)
                        ...s3Metadata, // Add S3 metadata
                        pageIndex: index // Add page/sheet index
                    }
                }))
            }

            return []
        } catch (error) {
            throw new Error(`Failed to process binary file: ${error.message}`)
        } finally {
            // Clean up temporary file
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
        // Get appropriate file extension
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

        // Create temporary file
        const tempDir = os.tmpdir()
        const tempFileName = `s3_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
        const tempFilePath = path.join(tempDir, tempFileName)

        fsDefault.writeFileSync(tempFilePath, buffer)
        return tempFilePath
    }
}
module.exports = { nodeClass: S3_DocumentLoaders }
