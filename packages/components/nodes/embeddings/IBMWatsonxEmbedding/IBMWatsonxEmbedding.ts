import { WatsonxEmbeddings, WatsonxInputEmbeddings } from '@langchain/community/embeddings/ibm'
import { WatsonxAuth } from '@langchain/community/dist/types/ibm'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class IBMWatsonx_Embeddings implements INode {
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
        this.label = 'IBM Watsonx Embeddings'
        this.name = 'ibmEmbedding'
        this.version = 1.0
        this.type = 'WatsonxEmbeddings'
        this.icon = 'ibm.png'
        this.category = 'Embeddings'
        this.description = 'Generate embeddings for a given text using open source model on IBM Watsonx'
        this.baseClasses = [this.type, ...getBaseClasses(WatsonxEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['ibmWatsonx']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'ibm/slate-30m-english-rtrvr'
            },
            {
                label: 'Truncate Input Tokens',
                name: 'truncateInputTokens',
                type: 'number',
                description: 'Truncate the input tokens.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Retries',
                name: 'maxRetries',
                type: 'number',
                description: 'The maximum number of retries.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Concurrency',
                name: 'maxConcurrency',
                type: 'number',
                description: 'The maximum number of concurrencies.',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const truncateInputTokens = nodeData.inputs?.truncateInputTokens as string
        const maxRetries = nodeData.inputs?.maxRetries as string
        const maxConcurrency = nodeData.inputs?.maxConcurrency as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const version = getCredentialParam('version', credentialData, nodeData)
        const serviceUrl = getCredentialParam('serviceUrl', credentialData, nodeData)
        const projectId = getCredentialParam('projectId', credentialData, nodeData)
        const watsonxAIAuthType = getCredentialParam('watsonxAIAuthType', credentialData, nodeData)
        const watsonxAIApikey = getCredentialParam('watsonxAIApikey', credentialData, nodeData)
        const watsonxAIBearerToken = getCredentialParam('watsonxAIBearerToken', credentialData, nodeData)

        const auth = {
            version,
            serviceUrl,
            projectId,
            watsonxAIAuthType,
            watsonxAIApikey,
            watsonxAIBearerToken
        }

        const obj: WatsonxInputEmbeddings & WatsonxAuth = {
            ...auth,
            model: modelName
        }

        if (truncateInputTokens) obj.truncateInputTokens = parseInt(truncateInputTokens, 10)
        if (maxRetries) obj.maxRetries = parseInt(maxRetries, 10)
        if (maxConcurrency) obj.maxConcurrency = parseInt(maxConcurrency, 10)

        const model = new WatsonxEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: IBMWatsonx_Embeddings }
