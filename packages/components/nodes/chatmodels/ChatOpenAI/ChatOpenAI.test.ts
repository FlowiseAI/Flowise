jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn(),
    ChatOpenAIFields: {}
}))

jest.mock('undici', () => ({
    ProxyAgent: jest.fn().mockImplementation((url) => ({ proxyUrl: url }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    isReasoningModelOpenAI: jest.fn().mockReturnValue(false)
}))

jest.mock('../../../src/modelLoader', () => ({
    MODEL_TYPE: { CHAT: 'chat' },
    getModels: jest.fn()
}))

jest.mock('./FlowiseChatOpenAI', () => ({
    ChatOpenAI: jest.fn().mockImplementation((id, fields) => ({
        id,
        fields,
        setMultiModalOption: jest.fn()
    }))
}))

import { ProxyAgent } from 'undici'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { ChatOpenAI } = require('./FlowiseChatOpenAI')
const { nodeClass: ChatOpenAINode } = require('./ChatOpenAI')

describe('ChatOpenAI node', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('passes proxyUrl to the OpenAI client fetch dispatcher', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ openAIApiKey: 'sk-test' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatOpenAINode()
        const nodeData = {
            credential: 'cred-1',
            inputs: {
                modelName: 'gpt-4o-mini',
                temperature: '0.2',
                proxyUrl: 'http://corporate-proxy.example.com:3128',
                baseOptions: {
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        }

        await node.init(
            {
                ...nodeData,
                id: 'chatOpenAI_0'
            },
            '',
            {}
        )
        await node.init(
            {
                ...nodeData,
                id: 'chatOpenAI_1'
            },
            '',
            {}
        )

        expect(ProxyAgent).toHaveBeenCalledWith('http://corporate-proxy.example.com:3128')
        expect(ProxyAgent).toHaveBeenCalledTimes(1)
        expect(ChatOpenAI).toHaveBeenCalledWith(
            'chatOpenAI_0',
            expect.objectContaining({
                configuration: {
                    defaultHeaders: {
                        'OpenAI-Beta': 'assistants=v2'
                    },
                    fetchOptions: {
                        dispatcher: { proxyUrl: 'http://corporate-proxy.example.com:3128' }
                    }
                }
            })
        )
    })
})
