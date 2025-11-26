import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { OpenAI } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'

class Sambanova_LLMs implements INode {
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
        this.label = 'Sambanova'
        this.name = 'sambanova'
        this.version = 1.0
        this.type = 'Sambanova'
        this.icon = 'sambanova.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around Sambanova API for large language models'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['sambanovaApi']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'Meta-Llama-3.3-70B-Instruct',
                description: 'For more details see https://docs.sambanova.ai/cloud/docs/get-started/supported-models',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const sambanovaKey = getCredentialParam('sambanovaApiKey', credentialData, nodeData)

        const obj: any = {
            model: modelName,
            configuration: {
                baseURL: 'https://api.sambanova.ai/v1',
                apiKey: sambanovaKey
            }
        }
        if (cache) obj.cache = cache

        const sambanova = new OpenAI(obj)
        return sambanova
    }
}

module.exports = { nodeClass: Sambanova_LLMs }
