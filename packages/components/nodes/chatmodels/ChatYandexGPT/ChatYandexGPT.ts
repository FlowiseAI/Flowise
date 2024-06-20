import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BaseCache } from 'langchain/schema'
import { ChatYandexGPT } from '@langchain/yandex/chat_models'

class ChatYandexGPT_ChatModels implements INode {
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
        this.label = 'ChatYandexGPT'
        this.name = 'chatYandexGPT'
        this.version = 1.0
        this.type = 'ChatYandexGPT'
        this.icon = 'ChatYandexGPT.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Chat YandexGPT large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatYandexGPT)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['chatYandexGPT'],
            optional: false,
            description: 'YandexGPT credential.'
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
                type: 'options',
                options: [
                    {
                        label: 'yandexgpt-lite/rc',
                        name: 'yandexgpt-lite/rc'
                    },
                    {
                        label: 'yandexgpt/latest',
                        name: 'yandexgpt/latest'
                    }
                ],
                default: 'yandexgpt-lite/rc'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('chatYandexGptApiKey', credentialData, nodeData)
        const iamToken = getCredentialParam('chatYandexGptIamToken', credentialData, nodeData)
        const modelURI = getCredentialParam('chatYandexGptModelURI', credentialData, nodeData)
        const folderID = getCredentialParam('chatYandexGptFolderID', credentialData, nodeData)
        const modelVersion = getCredentialParam('chatYandexGptModelVersion', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const cache = nodeData.inputs?.cache as BaseCache

        const obj = {
            temperature: parseFloat(temperature),
            apiKey: apiKey,
            modelName: modelName,
            maxOutputTokens: 2048,
            folderID: folderID,
            // b1ge56thls78bimqn81e
            modelURI: modelURI,
            // gpt://b1ge56thls78bimqn81e/yandexgpt/latest
            modelVersion: modelVersion,
            streaming: true,
            iamToken: iamToken
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)

        const model = new ChatYandexGPT(obj)
        if (cache) model.cache = cache
        // if (temperature) model.temperature = parseFloat(temperature)
        return model
    }
}

module.exports = { nodeClass: ChatYandexGPT_ChatModels }
