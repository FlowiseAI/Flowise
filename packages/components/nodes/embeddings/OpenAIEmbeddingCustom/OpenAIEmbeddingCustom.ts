import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

/**
 * Decodes OpenAI base64 embeddings into `number[]`.
 * Required because LangChain returns the raw base64 string,
 * while vector stores expect a numeric embedding array.
 */
function decodeBase64Embedding(base64String: string): number[] {
    const binaryBuffer = Buffer.from(base64String, 'base64')
    const arrayBuffer = binaryBuffer.buffer.slice(binaryBuffer.byteOffset, binaryBuffer.byteOffset + binaryBuffer.byteLength)
    const float32Array = new Float32Array(arrayBuffer)
    return Array.from(float32Array)
}

class OpenAIEmbeddingCustom_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Custom Embedding'
        this.name = 'openAIEmbeddingsCustom'
        this.version = 3.0
        this.type = 'OpenAIEmbeddingsCustom'
        this.icon = 'openai.svg'
        this.category = 'Embeddings'
        this.description = 'OpenAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base Path',
                name: 'basepath',
                type: 'string',
                optional: true,
                description: 'Override the default base URL for the API, e.g., "https://api.example.com/v2/',
                additionalParams: true
            },
            {
                label: 'Base Options',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                description: 'Default headers to include with every request to the API.',
                additionalParams: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                optional: true
            },
            {
                label: 'Dimensions',
                name: 'dimensions',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Encoding Format',
                name: 'encodingFormat',
                type: 'options',
                options: [
                    {
                        label: 'float',
                        name: 'float'
                    },
                    {
                        label: 'base64',
                        name: 'base64'
                    }
                ],
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basepath as string
        const modelName = nodeData.inputs?.modelName as string
        const dimensions = nodeData.inputs?.dimensions as string
        const baseOptions = nodeData.inputs?.baseOptions
        const encodingFormat = nodeData.inputs?.encodingFormat as 'float' | 'base64' | undefined

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            openAIApiKey
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (modelName) obj.modelName = modelName
        if (dimensions) obj.dimensions = parseInt(dimensions, 10)
        if (encodingFormat) obj.encodingFormat = encodingFormat

        let parsedBaseOptions: any | undefined = undefined
        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatOpenAI's BaseOptions: " + exception)
            }
        }

        if (basePath || parsedBaseOptions) {
            obj.configuration = {
                baseURL: basePath,
                defaultHeaders: parsedBaseOptions
            }
        }

        const model = new OpenAIEmbeddings(obj)

        // If encoding format is base64, wrap the embedding methods to decode base64 responses
        // into proper number[] arrays. LangChain's OpenAIEmbeddings does not handle this —
        // it passes raw base64 strings through, causing vector stores to crash.
        if (encodingFormat === 'base64') {
            const originalEmbedDocuments = model.embedDocuments.bind(model)
            model.embedDocuments = async (texts: string[]): Promise<number[][]> => {
                const results = await originalEmbedDocuments(texts)
                return results.map((embedding: any) => (typeof embedding === 'string' ? decodeBase64Embedding(embedding) : embedding))
            }

            const originalEmbedQuery = model.embedQuery.bind(model)
            model.embedQuery = async (text: string): Promise<number[]> => {
                const result = await originalEmbedQuery(text)
                return typeof result === 'string' ? decodeBase64Embedding(result as any) : result
            }
        }

        return model
    }
}

module.exports = { nodeClass: OpenAIEmbeddingCustom_Embeddings }
