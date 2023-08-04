import { GoogleVertexAIEmbeddings, GoogleVertexAIEmbeddingsParams } from 'langchain/embeddings/googlevertexai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class GoogleVertexAIEmbedding_Embeddings implements INode {
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
        this.label = 'GoogleVertexAI Embeddings'
        this.name = 'googlevertexaiEmbeddings'
        this.version = 1.0
        this.type = 'GoogleVertexAIEmbeddings'
        this.icon = 'vertexai.svg'
        this.category = 'Embeddings'
        this.description = 'Google vertexAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(GoogleVertexAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)

        const authOptions = {
            keyFile: googleApplicationCredentialFilePath,
        };
        const obj: GoogleVertexAIEmbeddingsParams = {
            authOptions,

        }

        const embedding = new GoogleVertexAIEmbeddings(obj)
        return embedding
    }
}

module.exports = { nodeClass: GoogleVertexAIEmbedding_Embeddings }
