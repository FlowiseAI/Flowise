jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: ChatOpenAICustom } = require('./ChatOpenAICustom')

describe('ChatOpenAICustom', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            openAIApiKey: 'sk-test'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])
    })

    it('passes stop from BaseOptions as a model option instead of a default header', async () => {
        const node = new ChatOpenAICustom()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'custom-model',
                    temperature: '0.2',
                    streaming: false,
                    baseOptions: {
                        stop: ['<|im_end|>']
                    }
                }
            },
            '',
            {}
        )

        expect(model.fields.stop).toEqual(['<|im_end|>'])
        expect(model.fields.configuration?.defaultHeaders).toBeUndefined()
    })

    it('keeps explicit client configuration in BaseOptions under configuration', async () => {
        const node = new ChatOpenAICustom()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'custom-model',
                    temperature: '0.2',
                    baseOptions: {
                        baseURL: 'https://example.test/v1',
                        defaultHeaders: {
                            'x-flowise-test': 'yes'
                        },
                        stop: ['DONE']
                    }
                }
            },
            '',
            {}
        )

        expect(model.fields.stop).toEqual(['DONE'])
        expect(model.fields.configuration).toEqual({
            baseURL: 'https://example.test/v1',
            defaultHeaders: {
                'x-flowise-test': 'yes'
            }
        })
    })
})
