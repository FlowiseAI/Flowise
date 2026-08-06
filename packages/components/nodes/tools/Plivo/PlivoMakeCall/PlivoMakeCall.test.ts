const { nodeClass: PlivoMakeCall_Tools } = require('./PlivoMakeCall')
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
        label: 'Plivo Make Call',
        name: 'plivoMakeCall',
        type: 'PlivoMakeCall',
        icon: 'plivo.png',
        version: 1.0,
        category: 'Tools',
        baseClasses: ['PlivoMakeCall', 'Tool'],
        credential: 'cred-1',
        inputs
    } as INodeData
}

const validInputs = {
    from: '+14150000002',
    to: '+14150000001',
    answerUrl: 'https://example.com/answer'
}

describe('PlivoMakeCall', () => {
    let nodeClass: any

    beforeEach(() => {
        jest.clearAllMocks()
        nodeClass = new PlivoMakeCall_Tools()
    })

    describe('init', () => {
        it('throws when the From Number is missing', async () => {
            await expect(nodeClass.init(createNodeData({ answerUrl: 'https://example.com/answer' }), '', {})).rejects.toThrow(
                'From Number is required'
            )
        })

        it('throws when the Answer URL is missing', async () => {
            await expect(nodeClass.init(createNodeData({ from: '+14150000002' }), '', {})).rejects.toThrow('Answer URL is required')
        })

        it('returns the tool when the inputs are valid', async () => {
            const tool = await nodeClass.init(createNodeData(validInputs), '', {})
            expect(tool).toBeDefined()
            expect(tool.name).toBe('plivo_make_call')
        })
    })

    describe('_call', () => {
        it('posts to the Plivo Voice API and returns the request UUID on 201', async () => {
            mockedAxios.post.mockResolvedValue({
                status: 201,
                data: { request_uuid: 'req-123', api_id: 'api-1', message: 'call fired' }
            })

            const tool = await nodeClass.init(createNodeData(validInputs), '', {})
            const result = await tool._call('+14150000009')

            expect(mockedAxios.post).toHaveBeenCalledTimes(1)
            const [url, body, config] = mockedAxios.post.mock.calls[0] as any[]
            expect(url).toBe('https://api.plivo.com/v1/Account/MATESTAUTHID/Call/')
            expect(body).toEqual({ from: '+14150000002', to: '+14150000009', answer_url: 'https://example.com/answer' })
            expect(config.auth).toEqual({ username: 'MATESTAUTHID', password: 'test_auth_token' })
            expect(result).toContain('req-123')
        })

        it('falls back to the node To Number when the tool input is empty', async () => {
            mockedAxios.post.mockResolvedValue({ status: 201, data: { request_uuid: 'req-456' } })

            const tool = await nodeClass.init(createNodeData(validInputs), '', {})
            await tool._call('')

            const [, body] = mockedAxios.post.mock.calls[0] as any[]
            expect(body.to).toBe('+14150000001')
        })

        it('returns a failure message on a non-201 response', async () => {
            mockedAxios.post.mockResolvedValue({ status: 400, data: { error: 'invalid number' } })

            const tool = await nodeClass.init(createNodeData(validInputs), '', {})
            const result = await tool._call('+14150000009')

            expect(result).toContain('Failed to place call')
        })
    })
})
