import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { secureFetch } from '../../../src/httpSecurity'

const TELNYX_OPENAI_BASE = 'https://api.telnyx.com/v2/ai/openai'
const TELNYX_EMBEDDINGS_MODELS_URL = 'https://api.telnyx.com/v2/ai/embeddings/models'

const fetchTelnyxModels = async (apiKey: string) => {
    const response = await secureFetch(TELNYX_EMBEDDINGS_MODELS_URL, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch Telnyx models: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    return json.data || []
}

class TelnyxEmbedding_Embeddings implements INode {
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
        this.label = 'Telnyx Embeddings'
        this.name = 'telnyxEmbeddings'
        this.version = 1.1
        this.type = 'TelnyxEmbeddings'
        this.icon = 'telnyx.png'
        this.category = 'Embeddings'
        this.description = 'Use Telnyx OpenAI-compatible embeddings as a native Flowise embeddings node'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['telnyxApi'],
            refresh: true
        }
        this.inputs = [
            { label: 'Model Name', name: 'modelName', type: 'asyncOptions', loadMethod: 'listModels', default: 'text-embedding-3-small', refresh: true },
            { label: 'Strip New Lines', name: 'stripNewLines', type: 'boolean', optional: true, additionalParams: true },
            { label: 'Batch Size', name: 'batchSize', type: 'number', optional: true, additionalParams: true },
            { label: 'Timeout', name: 'timeout', type: 'number', optional: true, additionalParams: true },
            { label: 'Dimensions', name: 'dimensions', type: 'number', optional: true, additionalParams: true },
            { label: 'Encoding Format', name: 'encodingFormat', type: 'options', options: [{ label: 'float', name: 'float' }, { label: 'base64', name: 'base64' }], optional: true, additionalParams: true }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const credentialId = nodeData.credential || nodeData.inputs?.credentialId
            if (!credentialId) {
                return [{ label: 'Select a Telnyx API credential to load models', name: 'text-embedding-3-small' }]
            }

            try {
                const credentialData = await getCredentialData(credentialId as string, options)
                const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
                const models = await fetchTelnyxModels(apiKey)

                return models
                    .map((model: any) => ({
                        label: model.id,
                        name: model.id,
                        description: [model.task, model.context_length ? `context ${model.context_length}` : '', model.tier || '']
                            .filter(Boolean)
                            .join(' • ')
                    }))
            } catch (error) {
                console.warn('Falling back to static Telnyx embeddings model list:', error)
                return [{ label: 'text-embedding-3-small', name: 'text-embedding-3-small' }]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        const modelName = nodeData.inputs?.modelName as string
        const dimensions = nodeData.inputs?.dimensions as string
        const encodingFormat = nodeData.inputs?.encodingFormat as 'float' | 'base64' | undefined

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            openAIApiKey: apiKey,
            modelName,
            configuration: {
                baseURL: TELNYX_OPENAI_BASE
            }
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (dimensions) obj.dimensions = parseInt(dimensions, 10)
        if (encodingFormat) obj.encodingFormat = encodingFormat

        return new OpenAIEmbeddings(obj)
    }
}

module.exports = { nodeClass: TelnyxEmbedding_Embeddings }
