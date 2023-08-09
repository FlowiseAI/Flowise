import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { GoogleVertexAI, GoogleVertexAITextInput } from 'langchain/llms/googlevertexai'
import { GoogleAuthOptions } from 'google-auth-library'

class GoogleVertexAI_LLMs implements INode {
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
        this.label = 'GoogleVertexAI'
        this.name = 'googlevertexai'
        this.version = 1.0
        this.type = 'GoogleVertexAI'
        this.icon = 'vertexai.svg'
        this.category = 'LLMs'
        this.description = 'Wrapper around GoogleVertexAI large language models'
        this.baseClasses = [this.type, ...getBaseClasses(GoogleVertexAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'text-bison',
                        name: 'text-bison'
                    },
                    {
                        label: 'code-bison',
                        name: 'code-bison'
                    },
                    {
                        label: 'code-gecko',
                        name: 'code-gecko'
                    }
                ],
                default: 'text-bison'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)
        const googleApplicationCredential = getCredentialParam('googleApplicationCredential', credentialData, nodeData)
        const projectID = getCredentialParam('projectID', credentialData, nodeData)

        if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
            throw new Error('Please specify your Google Application Credential')
        if (googleApplicationCredentialFilePath && googleApplicationCredential)
            throw new Error('Please use either Google Application Credential File Path or Google Credential JSON Object')

        const authOptions: GoogleAuthOptions = {}
        if (googleApplicationCredentialFilePath && !googleApplicationCredential) authOptions.keyFile = googleApplicationCredentialFilePath
        else if (!googleApplicationCredentialFilePath && googleApplicationCredential)
            authOptions.credentials = JSON.parse(googleApplicationCredential)
        if (projectID) authOptions.projectId = projectID

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string

        const obj: Partial<GoogleVertexAITextInput> = {
            temperature: parseFloat(temperature),
            model: modelName,
            authOptions
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)

        const model = new GoogleVertexAI(obj)
        return model
    }
}

module.exports = { nodeClass: GoogleVertexAI_LLMs }
