import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import {
    UnstructuredDirectoryLoader,
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy,
    SkipInferTableTypes,
    HiResModelName
} from 'langchain/document_loaders/fs/unstructured'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class UnstructuredFolder_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Unstructured Folder Loader'
        this.name = 'unstructuredFolderLoader'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'unstructured-folder.svg'
        this.category = 'Document Loaders'
        this.description =
            'Use Unstructured.io to load data from a folder. Note: Currently does not support .png and .heic until langchain is updated in flowise.'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['unstructuredApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Folder Path',
                name: 'folderPath',
                type: 'string',
                placeholder: ''
            },
            {
                label: 'Unstructured API URL',
                name: 'unstructuredAPIUrl',
                description:
                    'Unstructured API URL. Read <a target="_blank" href="https://unstructured-io.github.io/unstructured/introduction.html#getting-started">more</a> on how to get started',
                type: 'string',
                default: 'http://localhost:8000/general/v0/general'
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
                default: 'auto'
            },
            {
                label: 'Encoding',
                name: 'encoding',
                description: 'The encoding method used to decode the text input. Default: utf-8.',
                type: 'string',
                optional: true,
                additionalParams: true,
                default: 'utf-8'
            },
            {
                label: 'Skip Infer Table Types',
                name: 'skipInferTableTypes',
                description: 'The document types that you want to skip table extraction with. Default: pdf, jpg, png, heic.',
                type: 'multiOptions',
                options: [
                    {
                        label: 'txt',
                        name: 'txt'
                    },
                    {
                        label: 'text',
                        name: 'text'
                    },
                    {
                        label: 'pdf',
                        name: 'pdf'
                    },
                    {
                        label: 'docx',
                        name: 'docx'
                    },
                    {
                        label: 'doc',
                        name: 'doc'
                    },
                    {
                        label: 'jpg',
                        name: 'jpg'
                    },
                    {
                        label: 'jpeg',
                        name: 'jpeg'
                    },
                    {
                        label: 'eml',
                        name: 'eml'
                    },
                    {
                        label: 'heic',
                        name: 'heic'
                    },
                    {
                        label: 'html',
                        name: 'html'
                    },
                    {
                        label: 'htm',
                        name: 'htm'
                    },
                    {
                        label: 'md',
                        name: 'md'
                    },
                    {
                        label: 'pptx',
                        name: 'pptx'
                    },
                    {
                        label: 'ppt',
                        name: 'ppt'
                    },
                    {
                        label: 'msg',
                        name: 'msg'
                    },
                    {
                        label: 'rtf',
                        name: 'rtf'
                    },
                    {
                        label: 'xlsx',
                        name: 'xlsx'
                    },
                    {
                        label: 'xls',
                        name: 'xls'
                    },
                    {
                        label: 'odt',
                        name: 'odt'
                    },
                    {
                        label: 'epub',
                        name: 'epub'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: ['pdf', 'jpg', 'png', 'heic']
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
                            '(beta version): the Chipper model is Unstructured in-house image-to-text model based on transformer-based Visual Document Understanding (VDU) models.'
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
                default: 'detectron2_onnx'
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
                default: 'by_title'
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
                additionalParams: true
            },
            {
                label: 'Coordinates',
                name: 'coordinates',
                type: 'boolean',
                description: 'If true, return coordinates for each element. Default: false.',
                optional: true,
                additionalParams: true,
                default: false
            },
            {
                label: 'Include Page Breaks',
                name: 'includePageBreaks',
                description: 'When true, the output will include page break elements when the filetype supports it.',
                type: 'boolean',
                optional: true,
                additionalParams: true
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
        const folderPath = nodeData.inputs?.folderPath as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const strategy = nodeData.inputs?.strategy as UnstructuredLoaderStrategy
        const encoding = nodeData.inputs?.encoding as string
        const coordinates = nodeData.inputs?.coordinates as boolean
        const skipInferTableTypes = nodeData.inputs?.skipInferTableTypes as SkipInferTableTypes[]
        const hiResModelName = nodeData.inputs?.hiResModelName as HiResModelName
        const includePageBreaks = nodeData.inputs?.includePageBreaks as boolean
        const chunkingStrategy = nodeData.inputs?.chunkingStrategy as 'None' | 'by_title'
        const metadata = nodeData.inputs?.metadata
        const sourceIdKey = (nodeData.inputs?.sourceIdKey as string) || 'source'

        const obj: UnstructuredLoaderOptions = {
            apiUrl: unstructuredAPIUrl,
            strategy,
            encoding,
            coordinates,
            skipInferTableTypes,
            hiResModelName,
            includePageBreaks,
            chunkingStrategy
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const unstructuredAPIKey = getCredentialParam('unstructuredAPIKey', credentialData, nodeData)
        if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

        const loader = new UnstructuredDirectoryLoader(folderPath, obj)
        let docs = await loader.load()

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata: {
                    ...doc.metadata,
                    ...parsedMetadata,
                    [sourceIdKey]: doc.metadata[sourceIdKey] || sourceIdKey
                }
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata: {
                    ...doc.metadata,
                    [sourceIdKey]: doc.metadata[sourceIdKey] || sourceIdKey
                }
            }))
        }

        return docs
    }
}

module.exports = { nodeClass: UnstructuredFolder_DocumentLoaders }
