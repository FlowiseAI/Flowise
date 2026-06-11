import { secureAxiosRequest } from '../../../src/httpSecurity'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

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

describe('JungleGrid_Tools', () => {
    beforeEach(() => {
        mockedSecureAxiosRequest.mockReset()
        mockedSecureAxiosRequest.mockResolvedValue({ status: 200, data: { ok: true, data: { available: true } } } as any)
        mockedGetCredentialData.mockReset()
        mockedGetCredentialParam.mockClear()
    })

    it('loads credentials through Flowise helpers and uses the configured base URL', async () => {
        mockedGetCredentialData.mockResolvedValue({
            apiKey: 'credential-api-key',
            baseUrl: 'https://api.example.test/'
        } as any)
        const { nodeClass } = require('./JungleGrid')
        const node = new nodeClass()

        const tools = await node.init(
            {
                credential: 'credential-id',
                inputs: { actions: ['estimateJob'] }
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
        expect(mockedSecureAxiosRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.example.test/v1/mcp/jobs/estimate',
                headers: expect.objectContaining({ Authorization: 'Bearer credential-api-key' })
            })
        )
    })

    it('lists all production actions in the requested order', () => {
        const { nodeClass } = require('./JungleGrid')
        const node = new nodeClass()

        expect(node.inputs[0].options.map((option: any) => option.label)).toEqual([
            'Estimate Job',
            'Submit Job',
            'Create Job Input Upload',
            'List Job Inputs',
            'List Jobs',
            'Get Job',
            'Get Job Events',
            'Get Job Runtime',
            'Get Job Logs',
            'Cancel Job',
            'List Artifacts',
            'Get Artifact'
        ])
        expect(node.inputs[0].default).not.toContain('uploadJobInput')
        expect(node.inputs[0].default).not.toContain('cancelJob')
    })

    it('creates selected tools only', async () => {
        mockedGetCredentialData.mockResolvedValue({
            apiKey: 'credential-api-key',
            baseUrl: 'https://api.junglegrid.dev'
        } as any)
        const { nodeClass } = require('./JungleGrid')
        const node = new nodeClass()

        const tools = await node.init(
            {
                credential: 'credential-id',
                inputs: { actions: ['uploadJobInput', 'listJobInputs', 'getJobEvents'] }
            } as any,
            '',
            {} as any
        )

        expect(tools.map((tool: any) => tool.name)).toEqual([
            'jungle_grid_upload_job_input',
            'jungle_grid_list_job_inputs',
            'jungle_grid_get_job_events'
        ])
    })
})
