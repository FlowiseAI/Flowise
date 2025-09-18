import { AzureOpenAIInput, ClientOptions, AzureOpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const serverCredentialsExists =
    !!process.env.AZURE_OPENAI_API_KEY &&
    !!process.env.AZURE_OPENAI_API_INSTANCE_NAME &&
    (!!process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME || !!process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME) &&
    !!process.env.AZURE_OPENAI_API_VERSION

class AzureOpenAIEmbedding_Embeddings implements INode {
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
        this.label = 'Azure OpenAI Embeddings'
        this.name = 'azureOpenAIEmbeddings'
        this.version = 2.0
        this.type = 'AzureOpenAIEmbeddings'
        this.icon = 'Azure.svg'
        this.category = 'Embeddings'
        this.description = 'Azure OpenAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(AzureOpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureOpenAIApi'],
            optional: serverCredentialsExists
        }
        this.inputs = [
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                default: '100',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'BaseOptions',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basepath as string
        const baseOptions = nodeData.inputs?.baseOptions

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureOpenAIApiKey = getCredentialParam('azureOpenAIApiKey', credentialData, nodeData)
        const azureOpenAIApiInstanceName = getCredentialParam('azureOpenAIApiInstanceName', credentialData, nodeData)
        const azureOpenAIApiDeploymentName = getCredentialParam('azureOpenAIApiDeploymentName', credentialData, nodeData)
        const azureOpenAIApiVersion = getCredentialParam('azureOpenAIApiVersion', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & Partial<AzureOpenAIInput> & { configuration?: ClientOptions } = {
            azureOpenAIApiKey,
            azureOpenAIApiInstanceName,
            azureOpenAIApiDeploymentName,
            azureOpenAIApiVersion,
            azureOpenAIBasePath: basePath || undefined
        }

        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (baseOptions) {
            try {
                const parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                obj.configuration = {
                    defaultHeaders: parsedBaseOptions
                }
            } catch (exception) {
                console.error('Error parsing base options', exception)
            }
        }

        const model = new AzureOpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: AzureOpenAIEmbedding_Embeddings }
