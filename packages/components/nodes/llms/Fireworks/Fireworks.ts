import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { Fireworks } from '@langchain/community/llms/fireworks'
import { BaseCache } from '@langchain/core/caches'

class Fireworks_LLMs implements INode {
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
        this.label = 'Fireworks'
        this.name = 'fireworks'
        this.version = 1.0
        this.type = 'Fireworks'
        this.icon = 'fireworks.png'
        this.category = 'LLMs'
        this.description = 'Wrapper around Fireworks API for large language models'
        this.baseClasses = [this.type, ...getBaseClasses(Fireworks)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['fireworksApi']
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
                default: 'accounts/fireworks/models/llama-v3-70b-instruct-hf',
                description: 'For more details see https://fireworks.ai/models',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const fireworksKey = getCredentialParam('fireworksApiKey', credentialData, nodeData)

        const obj: any = {
            fireworksApiKey: fireworksKey,
            modelName: modelName
        }
        if (cache) obj.cache = cache

        const fireworks = new Fireworks(obj)
        return fireworks
    }
}

module.exports = { nodeClass: Fireworks_LLMs }
