import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { VoyageEmbeddings, VoyageEmbeddingsParams } from '@langchain/community/embeddings/voyage'

class VoyageAIEmbedding_Embeddings implements INode {
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
        this.label = 'VoyageAI Embeddings'
        this.name = 'voyageAIEmbeddings'
        this.version = 2.0
        this.type = 'VoyageAIEmbeddings'
        this.icon = 'voyageai.png'
        this.category = 'Embeddings'
        this.description = 'Voyage AI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(VoyageEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['voyageAIApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'voyage-2'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'voyageAIEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const voyageAiApiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const voyageAiEndpoint = getCredentialParam('endpoint', credentialData, nodeData)

        const obj: Partial<VoyageEmbeddingsParams> & { apiKey?: string } = {
            apiKey: voyageAiApiKey
        }

        if (modelName) obj.modelName = modelName

        const model = new VoyageEmbeddings(obj)
        if (voyageAiEndpoint) model.apiUrl = voyageAiEndpoint
        return model
    }
}

module.exports = { nodeClass: VoyageAIEmbedding_Embeddings }
