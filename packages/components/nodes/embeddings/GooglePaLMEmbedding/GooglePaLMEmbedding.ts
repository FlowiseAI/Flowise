import { GooglePaLMEmbeddings, GooglePaLMEmbeddingsParams } from '@langchain/community/embeddings/googlepalm'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

class GooglePaLMEmbedding_Embeddings implements INode {
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
        this.label = 'Google PaLM Embeddings'
        this.name = 'googlePaLMEmbeddings'
        this.version = 2.0
        this.type = 'GooglePaLMEmbeddings'
        this.icon = 'GooglePaLM.svg'
        this.category = 'Embeddings'
        this.description = 'Google MakerSuite PaLM API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(GooglePaLMEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleMakerSuite']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'models/embedding-gecko-001'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'googlePaLMEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleMakerSuiteKey = getCredentialParam('googleMakerSuiteKey', credentialData, nodeData)

        const obj: Partial<GooglePaLMEmbeddingsParams> = {
            modelName: modelName,
            apiKey: googleMakerSuiteKey
        }

        const model = new GooglePaLMEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: GooglePaLMEmbedding_Embeddings }
