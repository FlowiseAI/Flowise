import { getCredentialData, getCredentialParam, type ICommonObject, type INodeData } from '.'
import type { ChatVertexAIInput, VertexAIInput } from '@langchain/google-vertexai'

type SupportedAuthOptions = ChatVertexAIInput['authOptions'] | VertexAIInput['authOptions']

export const buildGoogleCredentials = async (nodeData: INodeData, options: ICommonObject): Promise<SupportedAuthOptions | null> => {
    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)
    const googleApplicationCredential = getCredentialParam('googleApplicationCredential', credentialData, nodeData)
    const projectID = getCredentialParam('projectID', credentialData, nodeData)

    const authOptions: any = {}
    if (Object.keys(credentialData).length !== 0) {
        if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
            throw new Error('Please specify your Google Application Credential')
        if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
            throw new Error(
                'Error: More than one component has been inputted. Please use only one of the following: Google Application Credential File Path or Google Credential JSON Object'
            )

        if (googleApplicationCredentialFilePath && !googleApplicationCredential) authOptions.keyFile = googleApplicationCredentialFilePath
        else if (!googleApplicationCredentialFilePath && googleApplicationCredential)
            authOptions.credentials = JSON.parse(googleApplicationCredential)

        if (projectID) authOptions.projectId = projectID
    }

    return authOptions
}
