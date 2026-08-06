const { nodeClass: PlivoSendSMS_Tools } = require('./PlivoSendSMS')
import axios from 'axios'
import { INodeData } from '../../../../src/Interface'

jest.mock('../../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Tool']),
    getCredentialData: jest.fn(async () => ({ authId: 'MATESTAUTHID', authToken: 'test_auth_token' })),
    getCredentialParam: jest.fn((name: string, credentialData: any) => credentialData[name])
}))

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

function createNodeData(inputs: any): INodeData {
    return {
        id: 'test-node',
        label: 'Plivo Send SMS',
        name: 'plivoSendSMS',
        type: 'PlivoSendSMS',
        icon: 'plivo.png',
        version: 1.0,
        category: 'Tools',
        baseClasses: ['PlivoSendSMS', 'Tool'],
        credential: 'cred-1',
        inputs
    } as INodeData
}

describe('PlivoSendSMS', () => {
    let nodeClass: any

    beforeEach(() => {
        jest.clearAllMocks()
        nodeClass = new PlivoSendSMS_Tools()
    })

    describe('init', () => {
        it('throws when the From Number is missing', async () => {
            await expect(nodeClass.init(createNodeData({ dst: '+14150000001' }), '', {})).rejects.toThrow('From Number is required')
        })

        it('throws when the To Number is missing', async () => {
            await expect(nodeClass.init(createNodeData({ src: '+14150000002' }), '', {})).rejects.toThrow('To Number is required')
        })

        it('returns the tool when the inputs are valid', async () => {
            const tool = await nodeClass.init(createNodeData({ src: '+14150000002', dst: '+14150000001' }), '', {})
            expect(tool).toBeDefined()
            expect(tool.name).toBe('plivo_send_sms')
        })
    })

    describe('_call', () => {
        it('posts to the Plivo Messages API and returns the message UUID on 202', async () => {
            mockedAxios.post.mockResolvedValue({
                status: 202,
                data: { message_uuid: ['abc-123'], api_id: 'api-1', message: 'message(s) queued' }
            })

            const tool = await nodeClass.init(createNodeData({ src: '+14150000002', dst: '+14150000001' }), '', {})
            const result = await tool._call('hello there')

            expect(mockedAxios.post).toHaveBeenCalledTimes(1)
            const [url, body, config] = mockedAxios.post.mock.calls[0] as any[]
            expect(url).toBe('https://api.plivo.com/v1/Account/MATESTAUTHID/Message/')
            expect(body).toEqual({ src: '+14150000002', dst: '+14150000001', text: 'hello there', type: 'sms' })
            expect(config.auth).toEqual({ username: 'MATESTAUTHID', password: 'test_auth_token' })
            expect(result).toContain('abc-123')
        })

        it('returns a failure message on a non-202 response', async () => {
            mockedAxios.post.mockResolvedValue({ status: 400, data: { error: 'invalid destination' } })

            const tool = await nodeClass.init(createNodeData({ src: '+14150000002', dst: '+14150000001' }), '', {})
            const result = await tool._call('hi')

            expect(result).toContain('Failed to send SMS')
        })

        it('does not call the API when the message text is empty', async () => {
            const tool = await nodeClass.init(createNodeData({ src: '+14150000002', dst: '+14150000001' }), '', {})
            const result = await tool._call('   ')

            expect(mockedAxios.post).not.toHaveBeenCalled()
            expect(result).toContain('message text is empty')
        })
    })
})
