import { GigaChat as GigaChatLangchain } from 'langchain-gigachat'
import { FlowiseGigaChat } from './FlowiseChatGigaChat'

import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

const defaultBaseUrl = 'https://gigachat.devices.sberbank.ru/api/v1/'

class ChatGigaChat implements INode {
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
        this.label = 'ChatGigaChat'
        this.name = 'chatgigachat'
        this.version = 2.0
        this.type = 'ChatGigaChat'
        this.icon = 'GigaChat.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around GigaChat large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(GigaChatLangchain)]
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
                        label: 'GigaChat v2',
                        name: 'GigaChat-2',
                        description: 'The most advanced model'
                    },
                    {
                        label: 'GigaChat Pro v2',
                        name: 'GigaChat-2-Pro',
                        description: 'The most advanced model Pro'
                    },
                    {
                        label: 'GigaChat Max v2',
                        name: 'GigaChat-2-Max',
                        description: 'The most advanced model Max'
                    },
                    {
                        label: 'GigaChat Max',
                        name: 'GigaChat-Max',
                        description: 'An advanced model for complex tasks that require a high level of creativity and quality of work'
                    },
                    {
                        label: 'GigaChat Pro',
                        name: 'GigaChat-Pro',
                        description:
                            'the model follows complex instructions more effectively and can handle more sophisticated tasks: the quality of summarization, rewriting and editing texts, and answering various questions has improved significantly'
                    },
                    {
                        label: 'GigaChat Plus',
                        name: 'GigaChat-Plus',
                        description: 'Ideally suited for tasks that require sending a large amount of information in a single request.'
                    },
                    {
                        label: 'GigaChat',
                        name: 'GigaChat',
                        description:
                            'Suitable for solving simpler tasks that require maximum processing speed. At the same time, the cost of using the model is lower because it requires fewer computational resources.'
                    }
                ],
                default: 'GigaChat-2-Pro'
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'options',
                description: 'a required field in the request body that specifies which API version the request is being made to',
                options: [
                    {
                        label: 'GIGACHAT_API_PERS',
                        name: 'GIGACHAT_API_PERS',
                        description: 'access for individuals'
                    },
                    {
                        label: 'GIGACHAT_API_B2B',
                        name: 'GIGACHAT_API_B2B',
                        description: 'access for sole proprietors and legal entities through paid packages'
                    },
                    {
                        label: 'GIGACHAT_API_CORP',
                        name: 'GIGACHAT_API_CORP',
                        description: 'access for sole proprietors and legal entities on a pay-as-you-go basis'
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
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 1,
                optional: true
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
        const temperature = Number(nodeData.inputs?.temperature || 1)
        const scope = String(nodeData.inputs?.scope || 'GIGACHAT_API_PERS')
        const modelName = nodeData.inputs?.modelName as string
        const timeout = Number(nodeData.inputs?.timeout || 60000)
        const baseUrl = String(nodeData.inputs?.baseUrl || defaultBaseUrl)

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const credentials = credentialData?.accessToken

        const params: any = {
            credentials,
            model: modelName,
            scope,
            profanityCheck: false,
            timeout,
            verbose: false,
            streaming: true,
            temperature,
            baseUrl
        }

        const model = new FlowiseGigaChat(params.model, params)

        return model
    }
}

module.exports = { nodeClass: ChatGigaChat }
