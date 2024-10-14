import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

import { JinaEmbeddings, JinaEmbeddingsParams } from '@langchain/community/embeddings/jina'

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
        this.version = 1.0
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
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'jina-embeddings-v2-base-en'
            },
            // {
            //     label: 'Strip New Lines',
            //     name: 'stripNewLines',
            //     type: 'boolean',
            //     optional: true,
            //     additionalParams: true
            // },
            // {
            //     label: 'Batch Size',
            //     name: 'batchSize',
            //     type: 'number',
            //     optional: true,
            //     additionalParams: true
            // },
            // {
            //     label: 'Timeout',
            //     name: 'timeout',
            //     type: 'number',
            //     optional: true,
            //     additionalParams: true
            // }
        ]
    }

    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'jinaEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        // const batchSize = nodeData.inputs?.batchSize as string
        // const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        // const overrideEndpoint = nodeData.inputs?.overrideEndpoint as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('jinaAIAPIKey', credentialData, nodeData)

        const obj: JinaEmbeddingsParams = {
            apiKey: apiKey,
            model: modelName
        }

        // if (batchSize) obj.batchSize = parseInom '../../../src/Interface'
// import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils't(batchSize, 10)
        // if (stripNewLines) obj.stripNewLines = stripNewLines
        // if (overrideEndpoint) obj.endpoint = overrideEndpoint

        const model = new JinaEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: JinaAIEmbedding_Embeddings }
