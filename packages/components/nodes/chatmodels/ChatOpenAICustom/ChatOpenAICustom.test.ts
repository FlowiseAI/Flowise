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
        ;(getCredentialData as jest.Mock).mockResolvedValue({ openAIApiKey: 'test-api-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])
    })

    it('exposes stopSequence as an additional parameter', () => {
        const node = new ChatOpenAICustom()

        expect(node.inputs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'Stop Sequence',
                    name: 'stopSequence',
                    additionalParams: true
                })
            ])
        )
    })

    it('passes comma-separated stop sequences to ChatOpenAI', async () => {
        const node = new ChatOpenAICustom()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'custom-model',
                    temperature: '0.3',
                    stopSequence: '<|im_end|>, END',
                    streaming: false
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            modelName: 'custom-model',
            openAIApiKey: 'test-api-key',
            apiKey: 'test-api-key',
            temperature: 0.3,
            streaming: false,
            stop: ['<|im_end|>', 'END']
        })
    })

    it('ignores empty stop sequence entries', async () => {
        const node = new ChatOpenAICustom()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'custom-model',
                    temperature: '0.3',
                    stopSequence: 'foo,, bar, ',
                    streaming: false
                }
            },
            '',
            {}
        )

        expect(model.fields.stop).toEqual(['foo', 'bar'])
    })
})
