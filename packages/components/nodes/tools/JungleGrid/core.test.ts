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
                timeout: 30000,
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-key',
                    'Content-Type': 'application/json'
                }),
                data: {
                    workload_type: 'inference',
                    image: 'python:3.11'
                }
            })
        )
    })

    it('normalizes agent-friendly aliases before submit', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.submitJob({
            name: 'flowise-job',
            workload_type: 'fine_tuning',
            image: 'python:3.11-slim',
            routing_mode: 'cost',
            command: 'python',
            args: ['-c', 'print(42)'],
            env: { CODE: 'print(42)', SHARED: 'env-value' },
            environment: { SHARED: 'environment-value' }
        })

        expect(mockedSecureAxiosRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api.junglegrid.dev/v1/jobs',
                data: {
                    name: 'flowise-job',
                    workload_type: 'fine-tuning',
                    image: 'python:3.11-slim',
                    optimize_for: 'cost',
                    command: 'python',
                    args: ['-c', 'print(42)'],
                    environment: {
                        CODE: 'print(42)',
                        SHARED: 'environment-value'
                    }
                }
            })
        )
    })

    it('uses documented production routes for lifecycle, logs, and artifacts', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.listJobs({ limit: 20, cursor: 42, status: 'running' })
        await client.getJob('job_123')
        await client.getJobRuntime('job_123')
        await client.getJobLogs('job_123', { tail: 100, cursor: 42, stream: 'stdout' })
        await client.cancelJob('job_123', 'test')
        await client.listJobArtifacts('job_123')
        await client.getArtifactDownloadUrl('job_123', 'artifact_123')

        const urls = mockedSecureAxiosRequest.mock.calls.map(([config]) => config.url)
        expect(urls).toEqual([
            'https://api.junglegrid.dev/v1/jobs?limit=20&cursor=42&status=running',
            'https://api.junglegrid.dev/v1/jobs/job_123',
            'https://api.junglegrid.dev/v1/jobs/job_123/runtime',
            'https://api.junglegrid.dev/v1/jobs/job_123/logs?tail=100&cursor=42&stream=stdout',
            'https://api.junglegrid.dev/v1/jobs/job_123/cancel',
            'https://api.junglegrid.dev/v1/jobs/job_123/artifacts',
            'https://api.junglegrid.dev/v1/jobs/job_123/artifacts/artifact_123/download'
        ])
    })

    it('formats API errors with Jungle Grid code and message', async () => {
        mockedSecureAxiosRequest.mockResolvedValueOnce({
            status: 403,
            data: {
                error: {
                    code: 'FORBIDDEN',
                    message: 'The token is not authorized for this Jungle Grid action.'
                }
            }
        } as any)
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await expect(client.getJob('job_123')).rejects.toThrow(
            'GET /v1/jobs/job_123 failed with status 403: FORBIDDEN: The token is not authorized for this Jungle Grid action.'
        )
    })
})

describe('createJungleGridTools', () => {
    beforeEach(() => {
        mockedSecureAxiosRequest.mockReset()
        mockedSecureAxiosRequest.mockResolvedValue({
            status: 200,
            data: { ok: true }
        } as any)
    })

    it('creates agent-facing tools with async job guidance and current artifact names', () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const tools = createJungleGridTools(client, ['estimateJob', 'submitJob', 'getJobLogs', 'listArtifacts', 'getArtifact'])

        expect(tools.map((tool) => tool.name)).toEqual([
            'jungle_grid_estimate_job',
            'jungle_grid_submit_job',
            'jungle_grid_get_job_logs',
            'jungle_grid_list_artifacts',
            'jungle_grid_get_artifact'
        ])
        expect(tools[1].description).toContain('returns a job_id immediately')
        expect(tools[1].description).toContain('does not mean the job has finished')
    })

    it('validates missing required fields before submit', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const result = await (submitTool as any)._call({ workload_type: 'batch' })

        expect(result).toContain('jungle_grid_submit_job failed')
        expect(result).toContain('name: Required')
        expect(result).toContain('image: Required')
        expect(mockedSecureAxiosRequest).not.toHaveBeenCalled()
    })

    it('runs estimate and submit flows through tool calls', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [estimateTool, submitTool] = createJungleGridTools(client, ['estimateJob', 'submitJob'])

        await (estimateTool as any)._call({ workload_type: 'inference', image: 'python:3.11', model_size_gb: 1 })
        await (submitTool as any)._call({
            name: 'flowise-smoke',
            workload_type: 'batch',
            image: 'python:3.11',
            command: 'python',
            args: ['-c', 'print(42)']
        })

        expect(mockedSecureAxiosRequest).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ url: expect.stringContaining('/v1/jobs/estimate') })
        )
        expect(mockedSecureAxiosRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: expect.stringContaining('/v1/jobs') }))
    })

    it('redacts callback tokens from tool errors and echoed params', async () => {
        mockedSecureAxiosRequest.mockResolvedValueOnce({
            status: 400,
            data: {
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'callback_auth_token "callback-secret-fixture" is invalid; Authorization: Bearer api-key-fixture'
                }
            }
        } as any)
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const result = await (submitTool as any)._call({
            name: 'flowise-smoke',
            workload_type: 'batch',
            image: 'python:3.11',
            callback_auth_token: 'super-secret-callback-token'
        })

        expect(result).toContain('INVALID_REQUEST')
        expect(result).toContain('Bearer [REDACTED]')
        expect(result).toContain('"callback_auth_token":"[REDACTED]"')
        expect(result).not.toContain('super-secret-callback-token')
        expect(result).not.toContain('callback-secret-fixture')
        expect(result).not.toContain('api-key-fixture')
    })
})
