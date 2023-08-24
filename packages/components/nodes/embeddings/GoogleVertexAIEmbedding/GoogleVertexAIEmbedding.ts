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
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)
        const googleApplicationCredential = getCredentialParam('googleApplicationCredential', credentialData, nodeData)
        const projectID = getCredentialParam('projectID', credentialData, nodeData)
        const skipExtraCredentialFile = getCredentialParam('skipExtraCredentialFile', credentialData, nodeData)

        if (!skipExtraCredentialFile && !googleApplicationCredentialFilePath && !googleApplicationCredential)
            throw new Error('Please specify your Google Application Credential')

        const inputs = [
            googleApplicationCredentialFilePath, 
            googleApplicationCredential, 
            skipExtraCredentialFile
        ];
        
        if (inputs.filter(Boolean).length > 1) {
            throw new Error('Error: More than one component has been inputted. Please use only one of the following: Google Application Credential File Path, Google Credential JSON Object, or Skip Extra Credential File.')
        }

        const authOptions: GoogleAuthOptions = {}
        if (!skipExtraCredentialFile){
            if (googleApplicationCredentialFilePath && !googleApplicationCredential) authOptions.keyFile = googleApplicationCredentialFilePath
            else if (!googleApplicationCredentialFilePath && googleApplicationCredential)
                authOptions.credentials = JSON.parse(googleApplicationCredential)

            if (projectID) authOptions.projectId = projectID
        }

        const obj: GoogleVertexAIEmbeddingsParams = {}
        if (authOptions) obj.authOptions = authOptions

        const model = new GoogleVertexAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: GoogleVertexAIEmbedding_Embeddings }
