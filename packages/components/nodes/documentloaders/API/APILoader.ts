import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { Document } from 'langchain/document'
import axios, { AxiosRequestConfig } from 'axios'

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
        this.icon = 'api-loader.png'
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

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
            for (const doc of docs) {
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

    public async load(): Promise<Document[]> {
        if (this.method === 'POST') {
            return this.executePostRequest(this.url, this.headers, this.body)
        } else {
            return this.executeGetRequest(this.url, this.headers)
        }
    }

    protected async executeGetRequest(url: string, headers?: ICommonObject): Promise<Document[]> {
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

    protected async executePostRequest(url: string, headers?: ICommonObject, body?: ICommonObject): Promise<Document[]> {
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
