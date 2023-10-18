import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatGooglePaLM, GooglePaLMChatInput } from 'langchain/chat_models/googlepalm'
import { BaseCache } from 'langchain/schema'

class ChatGooglePaLM_ChatModels implements INode {
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
        this.label = 'ChatGooglePaLM'
        this.name = 'chatGooglePaLM'
        this.version = 2.0
        this.type = 'ChatGooglePaLM'
        this.icon = 'Google_PaLM_Logo.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Google MakerSuite PaLM large language models using the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGooglePaLM)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleMakerSuite']
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
                        label: 'models/chat-bison-001',
                        name: 'models/chat-bison-001'
                    }
                ],
                default: 'models/chat-bison-001',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true,
                description:
                    'Controls the randomness of the output.\n' +
                    'Values can range from [0.0,1.0], inclusive. A value closer to 1.0 ' +
                    'will produce responses that are more varied and creative, while ' +
                    'a value closer to 0.0 will typically result in more straightforward ' +
                    'responses from the model.'
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true,
                description:
                    'Top-p changes how the model selects tokens for output.\n' +
                    'Tokens are selected from most probable to least until ' +
                    'the sum of their probabilities equals the top-p value.\n' +
                    'For example, if tokens A, B, and C have a probability of .3, .2, and .1 ' +
                    'and the top-p value is .5, then the model will select either A or B ' +
                    'as the next token (using temperature).'
            },
            {
                label: 'Top-k',
                name: 'topK',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description:
                    'Top-k changes how the model selects tokens for output.\n' +
                    'A top-k of 1 means the selected token is the most probable among ' +
                    'all tokens in the model vocabulary (also called greedy decoding), ' +
                    'while a top-k of 3 means that the next token is selected from ' +
                    'among the 3 most probable tokens (using temperature).'
            }
            // 'The "examples" field should contain a list of pairs of strings to use as prior turns for this conversation.'
            // NB: While 'examples:[]' exists in langchain.ts backend, it is unlikely to be actually used there, since ChatOpenAI doesn't support it
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleMakerSuiteKey = getCredentialParam('googleMakerSuiteKey', credentialData, nodeData)

        const obj: Partial<GooglePaLMChatInput> = {
            modelName: modelName,
            temperature: parseFloat(temperature),
            apiKey: googleMakerSuiteKey
        }

        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (cache) obj.cache = cache

        const model = new ChatGooglePaLM(obj)
        return model
    }
}

module.exports = { nodeClass: ChatGooglePaLM_ChatModels }
