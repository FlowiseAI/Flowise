import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { HuggingFaceInferenceEmbeddings, HuggingFaceInferenceEmbeddingsParams } from './core'

class HuggingFaceInferenceEmbedding_Embeddings implements INode {
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
        this.label = 'HuggingFace Inference Embeddings'
        this.name = 'huggingFaceInferenceEmbeddings'
        this.version = 1.0
        this.type = 'HuggingFaceInferenceEmbeddings'
        this.icon = 'huggingface.png'
        this.category = 'Embeddings'
        this.description = 'HuggingFace Inference API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(HuggingFaceInferenceEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['huggingFaceApi']
        }
        this.inputs = [
            {
                label: 'Model',
                name: 'modelName',
                type: 'string',
                description: 'If using own inference endpoint, leave this blank',
                placeholder: 'sentence-transformers/distilbert-base-nli-mean-tokens',
                optional: true
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/sentence-transformers/all-MiniLM-L6-v2',
                description: 'Using your own inference endpoint',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const endpoint = nodeData.inputs?.endpoint as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const huggingFaceApiKey = getCredentialParam('huggingFaceApiKey', credentialData, nodeData)

        const obj: Partial<HuggingFaceInferenceEmbeddingsParams> = {
            apiKey: huggingFaceApiKey
        }

        if (modelName) obj.model = modelName
        if (endpoint) obj.endpoint = endpoint

        const model = new HuggingFaceInferenceEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: HuggingFaceInferenceEmbedding_Embeddings }
