import axios, { AxiosRequestConfig } from 'axios'
import { omit } from 'lodash'
import { Document } from '@langchain/core/documents'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'

class API_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]

    constructor() {
        this.label = 'API Loader'
        this.name = 'apiLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'api.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from an API`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Method',
                name: 'method',
                type: 'options',
                options: [
                    {
                        label: 'GET',
                        name: 'GET'
                    },
                    {
                        label: 'POST',
                        name: 'POST'
                    }
                ]
            },
            {
                label: 'URL',
                name: 'url',
                type: 'string'
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body',
                name: 'body',
                type: 'json',
                description:
                    'JSON body for the POST request. If not specified, agent will try to figure out itself from AIPlugin if provided',
                additionalParams: true,
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
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
    }
    async init(nodeData: INodeData): Promise<any> {
        const headers = nodeData.inputs?.headers as string
        const url = nodeData.inputs?.url as string
        const body = nodeData.inputs?.body as string
        const method = nodeData.inputs?.method as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const options: ApiLoaderParams = {
            url,
            method
        }

        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(headers)
            options.headers = parsedHeaders
        }

        if (body) {
            const parsedBody = typeof body === 'object' ? body : JSON.parse(body)
            options.body = parsedBody
        }

        const loader = new ApiLoader(options)

        let docs: IDocument[] = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
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

interface ApiLoaderParams {
    url: string
    method: string
    headers?: ICommonObject
    body?: ICommonObject
}

class ApiLoader extends BaseDocumentLoader {
    public readonly url: string

    public readonly headers?: ICommonObject

    public readonly body?: ICommonObject

    public readonly method: string

    constructor({ url, headers, body, method }: ApiLoaderParams) {
        super()
        this.url = url
        this.headers = headers
        this.body = body
        this.method = method
    }

    public async load(): Promise<IDocument[]> {
        if (this.method === 'POST') {
            return this.executePostRequest(this.url, this.headers, this.body)
        } else {
            return this.executeGetRequest(this.url, this.headers)
        }
    }

    protected async executeGetRequest(url: string, headers?: ICommonObject): Promise<IDocument[]> {
        try {
            const config: AxiosRequestConfig = {}
            if (headers) {
                config.headers = headers
            }
            const response = await axios.get(url, config)
            const responseJsonString = JSON.stringify(response.data, null, 2)
            const doc = new Document({
                pageContent: responseJsonString,
                metadata: {
                    url
                }
            })
            return [doc]
        } catch (error) {
            throw new Error(`Failed to fetch ${url}: ${error}`)
        }
    }

    protected async executePostRequest(url: string, headers?: ICommonObject, body?: ICommonObject): Promise<IDocument[]> {
        try {
            const config: AxiosRequestConfig = {}
            if (headers) {
                config.headers = headers
            }
            const response = await axios.post(url, body ?? {}, config)
            const responseJsonString = JSON.stringify(response.data, null, 2)
            const doc = new Document({
                pageContent: responseJsonString,
                metadata: {
                    url
                }
            })
            return [doc]
        } catch (error) {
            throw new Error(`Failed to post ${url}: ${error}`)
        }
    }
}

module.exports = {
    nodeClass: API_DocumentLoaders
}
