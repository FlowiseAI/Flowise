import { GoogleVertexAIEmbeddings, GoogleVertexAIEmbeddingsParams } from 'langchain/embeddings/googlevertexai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { GoogleAuthOptions } from 'google-auth-library'

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
        this.inputs = [
            {
                label: 'Project ID',
                name: 'projectID',
                description: 'project id of GCP',
                type: 'string',
                additionalParams: true,
                optional: true
            },
            {
                label: 'location',
                name: 'location',
                description: 'location of API',
                type: 'string',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const projectID = nodeData.inputs?.projectID as string
        const location = nodeData.inputs?.location as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)
        if (!googleApplicationCredentialFilePath) throw new Error('Please specify your Google Application Credential file path')

        const authOptions: GoogleAuthOptions = {
            keyFile: googleApplicationCredentialFilePath
        }

        if (projectID) authOptions.projectId = projectID

        const obj: GoogleVertexAIEmbeddingsParams = {
            authOptions
        }
        if (location) obj.location = location

        const embedding = new GoogleVertexAIEmbeddings(obj)
        return embedding
    }
}

module.exports = { nodeClass: GoogleVertexAIEmbedding_Embeddings }
