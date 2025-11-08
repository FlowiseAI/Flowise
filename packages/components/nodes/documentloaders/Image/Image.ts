import { omit } from 'lodash'
import { IDocument, ICommonObject, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Document } from '@langchain/core/documents'
import { getFileFromStorage, handleDocumentLoaderMetadata, handleDocumentLoaderOutput, getCredentialData } from '../../../src'
import { UnstructuredOCRProvider } from './providers/UnstructuredOCRProvider'
import { AWSTextractOCRProvider } from './providers/AWSTextractOCRProvider'
import { GoogleVisionOCRProvider } from './providers/GoogleVisionOCRProvider'
import { IOCRProvider } from './providers/IOCRProvider'

class Image_DocumentLoaders implements INode {
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Image Loader'
        this.name = 'imageLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'image.svg'
        this.category = 'Document Loaders'
        this.description = 'Extract text from images using OCR. Supports multiple OCR providers including Unstructured, AWS Textract, and Google Vision.'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['unstructuredApi', 'awsApi', 'googleVisionApi'],
            optional: false
        }
        this.inputs = [
            {
                label: 'Image File',
                name: 'imageFile',
                type: 'file',
                description: 'Image file to extract text from using OCR',
                fileType: '.jpg, .jpeg, .png, .gif, .bmp, .webp, .tiff, .tif'
            },
            {
                label: 'OCR Provider',
                name: 'ocrProvider',
                type: 'options',
                description: 'Select the OCR service provider to use for text extraction',
                options: [
                    {
                        label: 'Unstructured',
                        name: 'unstructured',
                        description: 'Unstructured.io OCR service. <a target="_blank" href="https://unstructured.io/#get-api-key">Get API Key</a>'
                    },
                    {
                        label: 'AWS Textract',
                        name: 'aws-textract',
                        description: 'Amazon Textract OCR service. <a target="_blank" href="https://docs.aws.amazon.com/textract/latest/dg/getting-started.html">Get Started</a>'
                    },
                    {
                        label: 'Google Vision',
                        name: 'google-vision',
                        description: 'Google Cloud Vision API. <a target="_blank" href="https://cloud.google.com/vision/docs/setup">Get Started</a>'
                    }
                ],
                default: 'unstructured'
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
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys except the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
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
        const imageFileBase64 = nodeData.inputs?.imageFile as string
        const ocrProvider = (nodeData.inputs?.ocrProvider as string) || 'unstructured'
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let docs: IDocument[] = []
        let files: string[] = []

        if (!imageFileBase64) {
            throw new Error('Image file is required')
        }

        let ocrProviderInstance: IOCRProvider

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)

        const ocrProviderOptions = {
            credentialData,
            nodeData
        }

        switch (ocrProvider) {
            case 'unstructured':
                ocrProviderInstance = new UnstructuredOCRProvider(ocrProviderOptions)
                break
            case 'aws-textract':
                ocrProviderInstance = new AWSTextractOCRProvider(ocrProviderOptions)
                break
            case 'google-vision':
                ocrProviderInstance = new GoogleVisionOCRProvider(ocrProviderOptions)
                break
            default:
                throw new Error(`Unsupported OCR provider: ${ocrProvider}`)
        }

        if (imageFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = imageFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const orgId = options.orgId
            const chatflowid = options.chatflowid

            for (const file of files) {
                if (!file) continue
                const fileData = await getFileFromStorage(file, orgId, chatflowid)
                const extractedText = await ocrProviderInstance.extractText(fileData, file)
                
                if (extractedText) {
                    docs.push(
                        new Document({
                            pageContent: extractedText,
                            metadata: {
                                source: file,
                                provider: ocrProvider,
                                type: 'image'
                            }
                        })
                    )
                }
            }
        } else {
            if (imageFileBase64.startsWith('[') && imageFileBase64.endsWith(']')) {
                files = JSON.parse(imageFileBase64)
            } else {
                files = [imageFileBase64]
            }

            for (const file of files) {
                if (!file) continue
                
                const splitDataURI = file.split(',')
                const base64Data = splitDataURI.pop() || ''
                const mimePrefix = splitDataURI.pop()
                const filenameMatch = file.match(/filename:([^,]+)/)
                const filename = filenameMatch ? filenameMatch[1] : 'image.jpg'
                
                const buffer = Buffer.from(base64Data, 'base64')
                const extractedText = await ocrProviderInstance.extractText(buffer, filename)
                
                if (extractedText) {
                    docs.push(
                        new Document({
                            pageContent: extractedText,
                            metadata: {
                                source: filename,
                                provider: ocrProvider,
                                type: 'image'
                            }
                        })
                    )
                }
            }
        }

        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }

        docs = handleDocumentLoaderMetadata(docs, _omitMetadataKeys, metadata)

        return handleDocumentLoaderOutput(docs, output)
    }
}

module.exports = { nodeClass: Image_DocumentLoaders }

