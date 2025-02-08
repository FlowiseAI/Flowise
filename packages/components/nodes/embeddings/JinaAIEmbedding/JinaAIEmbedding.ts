import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { JinaEmbeddings } from '@langchain/community/embeddings/jina'

class ExtendedJinaEmbeddings extends JinaEmbeddings {
    private late_chunking: boolean

    constructor(fields: ConstructorParameters<typeof JinaEmbeddings>[0] & { late_chunking?: boolean }) {
        const { late_chunking = false, ...restFields } = fields
        super(restFields)
        this.late_chunking = late_chunking
    }
}

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
        this.version = 3.0
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
                default: 'jina-embeddings-v3',
                description: 'Refer to <a href="https://jina.ai/embeddings/" target="_blank">JinaAI documentation</a> for available models'
            },
            {
                label: 'Dimensions',
                name: 'modelDimensions',
                type: 'number',
                default: 1024,
                description:
                    'Refer to <a href="https://jina.ai/embeddings/" target="_blank">JinaAI documentation</a> for available dimensions'
            },
            {
                label: 'Allow Late Chunking',
                name: 'allowLateChunking',
                type: 'boolean',
                description:
                    'Refer to <a href="https://jina.ai/embeddings/" target="_blank">JinaAI documentation</a> guidance on late chunking',
                default: false,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const modelDimensions = nodeData.inputs?.modelDimensions as number
        const allowLateChunking = nodeData.inputs?.modelDimensions as boolean
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('jinaAIAPIKey', credentialData, nodeData)

        const model = new ExtendedJinaEmbeddings({
            apiKey: apiKey,
            model: modelName,
            dimensions: modelDimensions,
            late_chunking: allowLateChunking
        })

        return model
    }
}

module.exports = { nodeClass: JinaAIEmbedding_Embeddings }
