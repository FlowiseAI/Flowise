import { secureAxiosRequest } from '../../../src/httpSecurity'
import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam } from '../../../src/utils'

jest.mock('../../../src/httpSecurity', () => ({
    secureAxiosRequest: jest.fn()
}))

jest.mock('../../../src/utils', () => ({
    convertMultiOptionsToStringArray: jest.fn((value) => (Array.isArray(value) ? value : value ? [value] : [])),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn((name, credentialData) => credentialData[name])
}))

const mockedSecureAxiosRequest = secureAxiosRequest as jest.MockedFunction<typeof secureAxiosRequest>
const mockedGetCredentialData = getCredentialData as jest.MockedFunction<typeof getCredentialData>
const mockedGetCredentialParam = getCredentialParam as jest.MockedFunction<typeof getCredentialParam>
const mockedConvertMultiOptionsToStringArray = convertMultiOptionsToStringArray as jest.MockedFunction<
    typeof convertMultiOptionsToStringArray
>

describe('JungleGrid_Tools', () => {
    beforeEach(() => {
        mockedSecureAxiosRequest.mockReset()
        mockedSecureAxiosRequest.mockResolvedValue({
            status: 200,
            data: { available: true }
        } as any)
        mockedGetCredentialData.mockReset()
        mockedGetCredentialParam.mockClear()
        mockedConvertMultiOptionsToStringArray.mockClear()
    })

    it('loads Jungle Grid credentials through Flowise credential helpers', async () => {
        mockedGetCredentialData.mockResolvedValue({
            apiKey: 'credential-api-key',
            baseUrl: 'https://api.example.test/'
        } as any)

        const { nodeClass } = require('./JungleGrid')
        const node = new nodeClass()
        const tools = await node.init(
            {
                credential: 'credential-id',
                inputs: {
                    actions: ['estimateJob']
                }
            } as any,
            '',
            {} as any
        )

        await tools[0]._call({ workload_type: 'batch', image: 'python:3.11' })

        expect(mockedGetCredentialData).toHaveBeenCalledWith('credential-id', {})
        expect(mockedGetCredentialParam).toHaveBeenCalledWith(
            'apiKey',
            expect.objectContaining({ apiKey: 'credential-api-key' }),
            expect.anything()
        )
        expect(mockedGetCredentialParam).toHaveBeenCalledWith(
            'baseUrl',
            expect.objectContaining({ baseUrl: 'https://api.example.test/' }),
            expect.anything()
        )
        expect(mockedSecureAxiosRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.example.test/v1/jobs/estimate',
                headers: expect.objectContaining({
                    Authorization: 'Bearer credential-api-key'
                })
            })
        )
    })
})
