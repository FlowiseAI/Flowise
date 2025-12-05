import https from 'node:https'
import { GigaChatEmbeddings as GCEmbeddings } from 'langchain-gigachat'

import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData } from '../../../src/utils'

const defaultBaseUrl = 'https://gigachat.devices.sberbank.ru/api/v1/'
class GigaChatEmbedding implements INode {
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
        this.label = 'GigaChatEmbedding'
        this.name = 'gigachatembedding'
        this.version = 2.0
        this.type = 'GigaChatEmbedding'
        this.icon = 'GigaChat.svg'
        this.category = 'Embeddings'
        this.description = 'Wrapper around GigaChat large language models'
        this.baseClasses = [this.type, 'BaseEmbedding_LlamaIndex', ...getBaseClasses(GCEmbeddings)]
        this.credential = {
            label: 'Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['gigaChatApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'Embeddings',
                        name: 'Embeddings',
                        description: 'basic model, available by default for vector representation of texts'
                    },
                    {
                        label: 'Embeddings 2',
                        name: 'Embeddings-2',
                        description: 'an improved model with better quality embeddings'
                    },
                    {
                        label: 'EmbeddingsGigaR',
                        name: 'EmbeddingsGigaR',
                        description: 'an advanced model with a large context'
                    }
                ],
                default: 'Embeddings'
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'options',
                description: 'a required field in the request body that indicates which API version the request is being made to',
                options: [
                    {
                        label: 'GIGACHAT_API_PERS',
                        name: 'GIGACHAT_API_PERS',
                        description: 'personal access for individuals'
                    },
                    {
                        label: 'GIGACHAT_API_B2B',
                        name: 'GIGACHAT_API_B2B',
                        description: 'business access for self-employed individuals'
                    },
                    {
                        label: 'GIGACHAT_API_CORP',
                        name: 'GIGACHAT_API_CORP',
                        description: 'for corporate clients pay-as-you-go'
                    }
                ],
                default: 'GIGACHAT_API_PERS'
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: defaultBaseUrl,
                description: 'API URL',
                optional: false
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                default: 60000,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const timeout = Number(nodeData.inputs?.timeout || 60000)
        const baseUrl = String(nodeData.inputs?.baseUrl || defaultBaseUrl)
        const scope = String(nodeData.inputs?.scope || 'GIGACHAT_API_PERS')
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const credentials = credentialData?.accessToken

        const params: any = {
            credentials,
            scope,
            timeout,
            verbose: false,
            baseUrl,
            model: modelName
        }

        const model = new GCEmbeddings(params)

        return model
    }
}

module.exports = { nodeClass: GigaChatEmbedding }
