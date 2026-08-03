import { BaiduQianfanEmbeddings, BaiduQianfanEmbeddingsParams } from '@langchain/baidu-qianfan'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class BaiduQianfanEmbedding_Embeddings implements INode {
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
        this.label = 'Baidu Qianfan Embedding'
        this.name = 'baiduQianfanEmbeddings'
        this.version = 1.0
        this.type = 'BaiduQianfanEmbeddings'
        this.icon = 'baiduwenxin.svg'
        this.category = 'Embeddings'
        this.description = 'Baidu Qianfan API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(BaiduQianfanEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['baiduQianfanApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'Embedding-V1'
            },
            {
                label: 'Custom Model Name',
                name: 'customModelName',
                type: 'string',
                placeholder: 'Qwen3-Embedding-4B',
                description: 'Custom model name to use. If provided, it will override the selected model.',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                description: 'Remove new lines from input text before embedding to reduce token count'
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                optional: true,
                default: 1,
                additionalParams: true,
                description: 'Number of texts sent in each embedding request',
                warning:
                    'Qianfan has stricter limits on individual text length. If you encounter a length error, reduce chunk size to 500 and set Batch Size to 1.'
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true,
                description: 'Request timeout in milliseconds'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'baiduQianfanEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as BaiduQianfanEmbeddingsParams['modelName']
        const customModelName = nodeData.inputs?.customModelName as string
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const qianfanAccessKey = getCredentialParam('qianfanAccessKey', credentialData, nodeData)
        const qianfanSecretKey = getCredentialParam('qianfanSecretKey', credentialData, nodeData)

        const obj: Partial<BaiduQianfanEmbeddingsParams> & {
            qianfanAccessKey?: string
            qianfanSecretKey?: string
        } = {
            modelName: (customModelName || modelName) as BaiduQianfanEmbeddingsParams['modelName'],
            qianfanAccessKey,
            qianfanSecretKey
        }

        if (typeof stripNewLines === 'boolean') obj.stripNewLines = stripNewLines
        if (batchSize !== undefined && batchSize !== null && batchSize !== '') obj.batchSize = parseInt(batchSize, 10)
        if (timeout !== undefined && timeout !== null && timeout !== '') obj.timeout = parseInt(timeout, 10)

        const model = new BaiduQianfanEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: BaiduQianfanEmbedding_Embeddings }
