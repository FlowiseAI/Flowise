import { AzureOpenAIInput } from 'langchain/chat_models/openai'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { OpenAIEmbeddings, OpenAIEmbeddingsParams } from 'langchain/embeddings/openai'

class AzureOpenAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure OpenAI Embeddings'
        this.name = 'azureOpenAIEmbeddings'
        this.type = 'AzureOpenAIEmbeddings'
        this.icon = 'Azure.svg'
        this.category = 'Embeddings'
        this.description = 'Azure OpenAI API to generate embeddings for a given text'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.inputs = [
            {
                label: 'Azure OpenAI Api Key',
                name: 'azureOpenAIApiKey',
                type: 'password'
            },
            {
                label: 'Azure OpenAI Api Instance Name',
                name: 'azureOpenAIApiInstanceName',
                type: 'string',
                placeholder: 'YOUR-INSTANCE-NAME'
            },
            {
                label: 'Azure OpenAI Api Deployment Name',
                name: 'azureOpenAIApiDeploymentName',
                type: 'string',
                placeholder: 'YOUR-DEPLOYMENT-NAME'
            },
            {
                label: 'Azure OpenAI Api Version',
                name: 'azureOpenAIApiVersion',
                type: 'string',
                placeholder: 'YOUR-API-VERSION',
                description:
                    'Description of Supported API Versions. Please refer <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#embeddings">examples</a>'
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                default: '1',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const azureOpenAIApiKey = nodeData.inputs?.azureOpenAIApiKey as string
        const azureOpenAIApiInstanceName = nodeData.inputs?.azureOpenAIApiInstanceName as string
        const azureOpenAIApiDeploymentName = nodeData.inputs?.azureOpenAIApiDeploymentName as string
        const azureOpenAIApiVersion = nodeData.inputs?.azureOpenAIApiVersion as string
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string

        const obj: Partial<OpenAIEmbeddingsParams> & Partial<AzureOpenAIInput> = {
            azureOpenAIApiKey,
            azureOpenAIApiInstanceName,
            azureOpenAIApiDeploymentName,
            azureOpenAIApiVersion
        }

        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: AzureOpenAIEmbedding_Embeddings }
