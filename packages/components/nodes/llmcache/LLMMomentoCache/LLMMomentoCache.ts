import {
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    ICommonObject,
    INode,
    INodeData,
    INodeOutputsValue,
    INodeParams
} from '../../../src'
import { MomentoCache } from 'langchain/cache/momento'
import { CacheClient, Configurations, CredentialProvider } from '@gomomento/sdk'

class LLMMomentoCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    credential: INodeParams

    constructor() {
        this.label = 'Momento Cache'
        this.name = 'momentoCache'
        this.version = 1.0
        this.type = 'LLMCache'
        this.icon = 'momento.png'
        this.category = 'LLM Cache'
        this.baseClasses = [this.type, 'LLMCacheBase']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['momentoCacheApi']
        }
        this.inputs = []
        this.outputs = [
            {
                label: 'LLM Cache',
                name: 'cache',
                baseClasses: [this.type, ...getBaseClasses(MomentoCache)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('momentoApiKey', credentialData, nodeData)
        const cacheName = getCredentialParam('momentoCache', credentialData, nodeData)
        const endPoint = getCredentialParam('momentoEndpoint', credentialData, nodeData)

        // See https://github.com/momentohq/client-sdk-javascript for connection options
        const client = new CacheClient({
            configuration: Configurations.Laptop.v1(),
            credentialProvider: CredentialProvider.fromString({
                apiKey: apiKey
            }),
            defaultTtlSeconds: 60 * 60 * 24
        })

        let momentoCache = await MomentoCache.fromProps({
            client,
            cacheName: cacheName
        })
        return momentoCache
    }
}

module.exports = { nodeClass: LLMMomentoCache }
