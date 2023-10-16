import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { UpstashRedisCache as LangchainUpstashRedisCache } from 'langchain/cache/upstash_redis'

class UpstashRedisCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Upstash Redis Cache'
        this.name = 'upstashRedisCache'
        this.version = 1.0
        this.type = 'UpstashRedisCache'
        this.description = 'Cache LLM response in Upstash Redis, serverless data for Redis and Kafka'
        this.icon = 'upstash.png'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainUpstashRedisCache)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['upstashRedisApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const upstashConnectionUrl = getCredentialParam('upstashConnectionUrl', credentialData, nodeData)
        const upstashToken = getCredentialParam('upstashConnectionToken', credentialData, nodeData)

        const cache = new LangchainUpstashRedisCache({
            config: {
                url: upstashConnectionUrl,
                token: upstashToken
            }
        })
        return cache
    }
}

module.exports = { nodeClass: UpstashRedisCache }
