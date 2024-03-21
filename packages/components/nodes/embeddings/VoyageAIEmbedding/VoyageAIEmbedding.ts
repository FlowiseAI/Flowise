import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { VoyageEmbeddings } from 'langchain/embeddings/voyage'

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
        this.description = 'Voyage API to generate embeddings for a given text'
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
                type: 'options',
                options: [
                    {
                        label: 'voyage-2',
                        name: 'voyage-2',
                        description: 'Base generalist embedding model optimized for both latency and quality'
                    },
                    {
                        label: 'voyage-code-2',
                        name: 'voyage-code-2',
                        description: 'Optimized for code retrieval'
                    },
                    {
                        label: 'voyage-large-2',
                        name: 'voyage-large-2',
                        description: 'Powerful generalist embedding model'
                    },
                    {
                        label: 'voyage-lite-02-instruct',
                        name: 'voyage-lite-02-instruct',
                        description: 'Instruction-tuned for classification, clustering, and sentence textual similarity tasks'
                    }
                ],
                default: 'voyage-2',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('voyageAIApi', credentialData, nodeData)
        const modelName = nodeData.inputs?.modelName as string

        const model = new VoyageEmbeddings({ apiKey: apiKey, modelName: modelName })
        return model
    }
}

module.exports = { nodeClass: VoyageAIEmbedding_Embeddings }
