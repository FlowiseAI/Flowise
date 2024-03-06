import { MistralAIEmbeddings, MistralAIEmbeddingsParams } from '@langchain/mistralai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class MistralEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'MistralAI Embeddings'
        this.name = 'mistralAI Embeddings'
        this.version = 1.0
        this.type = 'MistralAIEmbeddings'
        this.icon = 'MistralAI.svg'
        this.category = 'Embeddings'
        this.description = 'MistralAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(MistralAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mistralAIApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'mistral-embed',
                        name: 'mistral-embed'
                    }
                ],
                default: 'mistral-embed'
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                step: 1,
                default: 512,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Override Endpoint',
                name: 'overrideEndpoint',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const batchSize = nodeData.inputs?.batchSize as string
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const overrideEndpoint = nodeData.inputs?.overrideEndpoint as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('mistralAIAPIKey', credentialData, nodeData)

        const obj: MistralAIEmbeddingsParams = {
            apiKey: apiKey,
            modelName: modelName
        }

        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (overrideEndpoint) obj.endpoint = overrideEndpoint

        const model = new MistralAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: MistralEmbedding_Embeddings }
