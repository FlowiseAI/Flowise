import { JungleGridClient, createJungleGridTools } from './core'
import { secureAxiosRequest } from '../../../src/httpSecurity'

jest.mock('../../../src/httpSecurity', () => ({
    secureAxiosRequest: jest.fn()
}))

const mockedSecureAxiosRequest = secureAxiosRequest as jest.MockedFunction<typeof secureAxiosRequest>

describe('JungleGridClient', () => {
    beforeEach(() => {
        mockedSecureAxiosRequest.mockReset()
        mockedSecureAxiosRequest.mockResolvedValue({
            status: 200,
            data: { ok: true }
        } as any)
    })

    it('uses bearer authentication and the documented estimate route', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key', baseUrl: 'https://api.junglegrid.dev/' })

        await client.estimateJob({ workload_type: 'inference', image: 'python:3.11' })

        expect(mockedSecureAxiosRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.junglegrid.dev/v1/jobs/estimate',
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-key',
                    'Content-Type': 'application/json'
                })
            })
        )
    })

    it('uses verified production routes for lifecycle and artifact operations', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.submitJob({ workload_type: 'batch', image: 'python:3.11', command: 'python', args: ['-c', 'print(42)'] })
        await client.listJobs({ limit: 20, status: 'running' })
        await client.getJob('job_123')
        await client.getJobRuntime('job_123')
        await client.cancelJob('job_123', 'test')
        await client.listJobArtifacts('job_123')
        await client.getArtifactDownloadUrl('job_123', 'artifact_123')

        const urls = mockedSecureAxiosRequest.mock.calls.map(([config]) => config.url)
        expect(urls).toEqual([
            'https://api.junglegrid.dev/v1/jobs',
            'https://api.junglegrid.dev/v1/jobs?limit=20&status=running',
            'https://api.junglegrid.dev/v1/jobs/job_123',
            'https://api.junglegrid.dev/v1/jobs/job_123/runtime',
            'https://api.junglegrid.dev/v1/jobs/job_123/cancel',
            'https://api.junglegrid.dev/v1/jobs/job_123/artifacts',
            'https://api.junglegrid.dev/v1/jobs/job_123/artifacts/artifact_123/download'
        ])
    })
})

describe('createJungleGridTools', () => {
    it('creates agent-facing tools with async job guidance', () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const tools = createJungleGridTools(client, ['estimateJob', 'submitJob', 'getJob'])

        expect(tools.map((tool) => tool.name)).toEqual(['jungle_grid_estimate_job', 'jungle_grid_submit_job', 'jungle_grid_get_job'])
        expect(tools[1].description).toContain('returns a job_id immediately')
        expect(tools[1].description).toContain('does not mean the job has finished')
    })
})
