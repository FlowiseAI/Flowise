import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

class AAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    tags: string[]

    constructor() {
        this.label = 'AAI Embeddings'
        this.name = 'AAIEmbeddings'
        this.tags = ['AAI']
        this.version = 1.0
        this.type = 'AAIEmbeddings'
        this.icon = 'answerai-square-black.png'
        this.category = 'Embeddings'
        this.description = 'Answer Agent API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'text-embedding-ada-002'
            },
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
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Dimensions',
                name: 'dimensions',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'openAIEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basepath as string
        const modelName = nodeData.inputs?.modelName as string
        const dimensions = nodeData.inputs?.dimensions as string

        // Get OpenAI API key from environment variable
        const openAIApiKey = process.env.AAI_DEFAULT_OPENAI_API_KEY

        if (!openAIApiKey) {
            throw new Error('AAI_DEFAULT_OPENAI_API_KEY environment variable is not set')
        }

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            openAIApiKey,
            modelName
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = Number.parseInt(batchSize, 10)
        if (timeout) obj.timeout = Number.parseInt(timeout, 10)
        if (dimensions) obj.dimensions = Number.parseInt(dimensions, 10)

        if (basePath) {
            obj.configuration = {
                baseURL: basePath
            }
        }

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: AAIEmbedding_Embeddings }
