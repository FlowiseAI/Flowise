import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { TwelveLabsEmbeddings, TwelveLabsEmbeddingsParams } from './core'

class TwelveLabsEmbedding_Embeddings implements INode {
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
        this.label = 'TwelveLabs Embedding'
        this.name = 'twelveLabsEmbeddings'
        this.version = 1.0
        this.type = 'TwelveLabsEmbeddings'
        this.icon = 'twelvelabs.svg'
        this.category = 'Embeddings'
        this.description = 'TwelveLabs Marengo API to generate multimodal (512-dim) embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(TwelveLabsEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['twelveLabsApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'marengo3.0',
                description:
                    'Refer to <a target="_blank" href="https://docs.twelvelabs.io/v1.3/docs/concepts/models/marengo">TwelveLabs documentation</a> for available models'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const twelveLabsApiKey = getCredentialParam('twelveLabsApiKey', credentialData, nodeData)

        const obj: Partial<TwelveLabsEmbeddingsParams> = {
            apiKey: twelveLabsApiKey
        }
        if (modelName) obj.model = modelName

        return new TwelveLabsEmbeddings(obj)
    }
}

module.exports = { nodeClass: TwelveLabsEmbedding_Embeddings }
