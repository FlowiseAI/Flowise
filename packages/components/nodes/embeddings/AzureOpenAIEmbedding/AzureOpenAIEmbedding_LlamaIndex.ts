import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { OpenAIEmbedding } from 'llamaindex'

interface AzureOpenAIConfig {
    apiKey?: string
    endpoint?: string
    apiVersion?: string
    deploymentName?: string
}

class AzureOpenAIEmbedding_LlamaIndex_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    tags: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure OpenAI Embeddings'
        this.name = 'azureOpenAIEmbeddingsLlamaIndex'
        this.version = 1.0
        this.type = 'AzureOpenAIEmbeddings'
        this.icon = 'Azure.svg'
        this.category = 'Embeddings'
        this.description = 'Azure OpenAI API embeddings specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseEmbedding_LlamaIndex', ...getBaseClasses(OpenAIEmbedding)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureOpenAIApi']
        }
        this.inputs = [
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureOpenAIApiKey = getCredentialParam('azureOpenAIApiKey', credentialData, nodeData)
        const azureOpenAIApiInstanceName = getCredentialParam('azureOpenAIApiInstanceName', credentialData, nodeData)
        const azureOpenAIApiDeploymentName = getCredentialParam('azureOpenAIApiDeploymentName', credentialData, nodeData)
        const azureOpenAIApiVersion = getCredentialParam('azureOpenAIApiVersion', credentialData, nodeData)

        const obj: Partial<OpenAIEmbedding> & { azure?: AzureOpenAIConfig } = {
            azure: {
                apiKey: azureOpenAIApiKey,
                endpoint: `https://${azureOpenAIApiInstanceName}.openai.azure.com`,
                apiVersion: azureOpenAIApiVersion,
                deploymentName: azureOpenAIApiDeploymentName
            }
        }

        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAIEmbedding(obj)
        return model
    }
}

module.exports = { nodeClass: AzureOpenAIEmbedding_LlamaIndex_Embeddings }
