jest.mock('@langchain/baidu-qianfan', () => ({
    ChatBaiduQianfan: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('../../../src/modelLoader', () => ({
    MODEL_TYPE: { CHAT: 'chat' },
    getModels: jest.fn()
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels } from '../../../src/modelLoader'

const { nodeClass: ChatBaiduWenxin } = require('./ChatBaiduWenxin')

describe('ChatBaiduWenxin', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('loads model options from the shared model loader', async () => {
        ;(getModels as jest.Mock).mockResolvedValue([{ label: 'ernie-4.5-8k-preview', name: 'ernie-4.5-8k-preview' }])

        const node = new ChatBaiduWenxin()
        const models = await node.loadMethods.listModels()

        expect(getModels).toHaveBeenCalledWith('chat', 'chatBaiduWenxin')
        expect(models).toEqual([{ label: 'ernie-4.5-8k-preview', name: 'ernie-4.5-8k-preview' }])
    })

    it('passes advanced settings and custom model names to ChatBaiduQianfan', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatBaiduWenxin()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'ernie-4.0-8k',
                    customModelName: 'ernie-speed-128k',
                    temperature: '0.2',
                    streaming: false,
                    topP: '0.8',
                    penaltyScore: '1.4',
                    userId: 'user-123'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key',
            modelName: 'ernie-speed-128k',
            temperature: 0.2,
            streaming: false,
            topP: 0.8,
            penaltyScore: 1.4,
            userId: 'user-123'
        })
    })
})
