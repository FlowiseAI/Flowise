import { ChatCloudflareWorkersAI, type CloudflareWorkersAIInput } from '@langchain/cloudflare'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatCloudflareWorkersAI_ChatModels implements INode {
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
        this.label = 'ChatCloudflareWorkersAI'
        this.name = 'chatCloudflareWorkersAI'
        this.version = 1.0
        this.type = 'ChatCloudflareWorkersAI'
        this.icon = 'cloudflare.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Cloudflare Workers AI chat models'
        this.baseClasses = [this.type, ...getBaseClasses(ChatCloudflareWorkersAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cloudflareApi']
        }
        this.inputs = [
            {
                label: 'Model',
                name: 'model',
                type: 'string',
                default: '@cf/meta/llama-3.1-8b-instruct-fast',
                description: 'Model to use, e.g. @cf/meta/llama-3.1-8b-instruct-fast'
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                description: 'Base URL for Cloudflare Workers AI. Defaults to https://api.cloudflare.com/client/v4/accounts',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<ChatCloudflareWorkersAI> {
        const model = nodeData.inputs?.model as string
        const baseUrl = nodeData.inputs?.baseUrl as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cloudflareAccountId = getCredentialParam('cloudflareAccountId', credentialData, nodeData)
        if (!cloudflareAccountId) {
            throw new Error('Cloudflare Account ID is missing in credential.')
        }

        const cloudflareApiToken = getCredentialParam('cloudflareApiToken', credentialData, nodeData)
        if (!cloudflareApiToken) {
            throw new Error('Cloudflare API Token is missing in credential.')
        }

        const obj: CloudflareWorkersAIInput = {
            cloudflareAccountId,
            cloudflareApiToken,
            model
        }

        if (baseUrl) {
            obj.baseUrl = baseUrl
        }

        const chatModel = new ChatCloudflareWorkersAI(obj)
        return chatModel
    }
}

module.exports = { nodeClass: ChatCloudflareWorkersAI_ChatModels }
