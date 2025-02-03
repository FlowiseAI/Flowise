import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { JinaEmbeddings } from '@langchain/community/embeddings/jina'

class JinaAIEmbedding_Embeddings implements INode {
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
        this.label = 'Jina Embeddings'
        this.name = 'jinaEmbeddings'
        this.version = 2.0
        this.type = 'JinaEmbeddings'
        this.icon = 'JinaAIEmbedding.svg'
        this.category = 'Embeddings'
        this.description = 'JinaAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(JinaEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['jinaAIApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'jina-embeddings-v2-base-en',
                description: 'Refer to <a href="https://jina.ai/embeddings/" target="_blank">JinaAI documentation</a> for available models'
            },
            {
                label: 'Dimensions',
                name: 'modelDimensions',
                type: 'number',
                default: 1024,
                description:
                    'Refer to <a href="https://jina.ai/embeddings/" target="_blank">JinaAI documentation</a> for available dimensions'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const modelDimensions = nodeData.inputs?.modelDimensions as number
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('jinaAIAPIKey', credentialData, nodeData)

        const model = new JinaEmbeddings({
            apiKey: apiKey,
            model: modelName,
            dimensions: modelDimensions
        })

        return model
    }
}

module.exports = { nodeClass: JinaAIEmbedding_Embeddings }
