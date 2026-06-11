import {
    JungleGridClient,
    createJungleGridTools,
    normalizeJobStatusResponse,
    redactErrorMessage,
    redactSensitiveParams,
    removeUndefined
} from './core'
import { secureAxiosRequest } from '../../../src/httpSecurity'

jest.mock('../../../src/httpSecurity', () => ({
    secureAxiosRequest: jest.fn()
}))

const mockedSecureAxiosRequest = secureAxiosRequest as jest.MockedFunction<typeof secureAxiosRequest>

function mockResponse(data: unknown = { ok: true, data: { accepted: true } }, status = 200): void {
    mockedSecureAxiosRequest.mockResolvedValue({ status, data } as any)
}

function requestConfig(call = 0): any {
    return mockedSecureAxiosRequest.mock.calls[call][0]
}

describe('JungleGridClient', () => {
    beforeEach(() => {
        mockedSecureAxiosRequest.mockReset()
        mockResponse()
    })

    it('normalizes the configured base URL and applies bearer authentication', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key', baseUrl: 'https://api.example.test///' })

        await client.estimateJob({ workload_type: 'inference' })

        expect(requestConfig()).toEqual(
            expect.objectContaining({
                url: 'https://api.example.test/v1/mcp/jobs/estimate',
                method: 'POST',
                timeout: 30000,
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-key',
                    'Content-Type': 'application/json'
                })
            })
        )
    })

    it('rejects invalid base URLs and missing API keys', () => {
        expect(() => new JungleGridClient({ apiKey: '', baseUrl: 'https://api.example.test' })).toThrow('Jungle Grid API key is required')
        expect(() => new JungleGridClient({ apiKey: 'key', baseUrl: 'file:///tmp/api' })).toThrow('valid HTTP or HTTPS URL')
        expect(() => new JungleGridClient({ apiKey: 'key', baseUrl: 'https://user:pass@example.test' })).toThrow(
            'without embedded credentials'
        )
    })

    it('uses the estimate route without submitting a job', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.estimateJob({
            workload_type: 'batch',
            image: 'python:3.11',
            model_size: 2,
            routing_mode: 'cost',
            notes: 'screen only'
        })

        expect(requestConfig().url).toBe('https://api.junglegrid.dev/v1/mcp/jobs/estimate')
        expect(requestConfig().data).toEqual({
            workload_type: 'batch',
            image: 'python:3.11',
            model_size_gb: 2,
            optimize_for: 'cost',
            notes: 'screen only'
        })
        expect(mockedSecureAxiosRequest).toHaveBeenCalledTimes(1)
    })

    it('passes command arrays and current submission fields unchanged', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.submitJob({
            name: 'audio-transcription',
            workload_type: 'inference',
            image: 'python:3.11-slim',
            command: ['python', '/workspace/scripts/transcribe.py', '/workspace/inputs/audio.ogg'],
            input_files: [{ input_id: 'inp_audio' }],
            script_files: [{ input_id: 'inp_script' }],
            expected_artifacts: ['/workspace/artifacts/transcript.txt'],
            metadata: { source: 'flowise' }
        })

        expect(requestConfig()).toEqual(
            expect.objectContaining({
                url: 'https://api.junglegrid.dev/v1/mcp/jobs',
                method: 'POST',
                data: {
                    name: 'audio-transcription',
                    workload_type: 'inference',
                    image: 'python:3.11-slim',
                    command: ['python', '/workspace/scripts/transcribe.py', '/workspace/inputs/audio.ogg'],
                    input_files: [{ input_id: 'inp_audio' }],
                    script_files: [{ input_id: 'inp_script' }],
                    expected_artifacts: ['/workspace/artifacts/transcript.txt'],
                    metadata: { source: 'flowise' }
                }
            })
        )
    })

    it('preserves legacy command plus args and normalizes aliases', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.submitJob({
            name: 'legacy-job',
            workload_type: 'fine_tuning',
            image: 'python:3.11',
            command: 'python',
            args: ['-c', 'print(42)'],
            routing_mode: 'cost',
            env: { CODE: 'print(42)', SHARED: 'env-value' },
            environment: { SHARED: 'environment-value' },
            input_files: ['inp_audio'],
            script_files: ['inp_script']
        })

        expect(requestConfig().data).toEqual({
            name: 'legacy-job',
            workload_type: 'fine-tuning',
            image: 'python:3.11',
            command: 'python',
            args: ['-c', 'print(42)'],
            optimize_for: 'cost',
            environment: {
                CODE: 'print(42)',
                SHARED: 'environment-value'
            },
            input_files: [{ input_id: 'inp_audio' }],
            script_files: [{ input_id: 'inp_script' }]
        })
    })

    it('uses verified routes for inputs, events, runtime, logs, cancellation, and artifacts', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.uploadJobInput({ filename: 'audio.wav', content_type: 'audio/wav', kind: 'input' })
        await client.listJobInputs()
        await client.listJobs({ limit: 20, cursor: 'next cursor', status: 'starting' })
        await client.getJob('job/123')
        await client.getJobEvents('job/123')
        await client.getJobRuntime('job/123')
        await client.getJobLogs('job/123', { limit: 100, cursor: 42, tail: 50, stream: 'stdout' })
        await client.cancelJob('job/123', 'user requested')
        await client.listJobArtifacts('job/123')
        await client.getArtifactDownloadUrl('job/123', 'artifact/123')

        expect(mockedSecureAxiosRequest.mock.calls.map(([config]) => config.url)).toEqual([
            'https://api.junglegrid.dev/v1/job-inputs',
            'https://api.junglegrid.dev/v1/job-inputs',
            'https://api.junglegrid.dev/v1/mcp/jobs?limit=20&cursor=next+cursor&status=starting',
            'https://api.junglegrid.dev/v1/mcp/jobs/job%2F123',
            'https://api.junglegrid.dev/v1/jobs/job%2F123/events',
            'https://api.junglegrid.dev/v1/jobs/job%2F123/runtime',
            'https://api.junglegrid.dev/v1/mcp/jobs/job%2F123/logs?limit=100&cursor=42&tail=50&stream=stdout',
            'https://api.junglegrid.dev/v1/mcp/jobs/job%2F123/cancel',
            'https://api.junglegrid.dev/v1/mcp/jobs/job%2F123/artifacts',
            'https://api.junglegrid.dev/v1/mcp/jobs/job%2F123/artifacts/artifact%2F123/download'
        ])
        expect(requestConfig(0).data).toEqual({ filename: 'audio.wav', content_type: 'audio/wav', kind: 'input' })
        expect(requestConfig(7).data).toEqual({ reason: 'user requested' })
    })

    it('does not send undefined optional fields', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await client.uploadJobInput({ filename: 'script.py', content_type: undefined, kind: 'script' })

        expect(requestConfig().data).toEqual({ filename: 'script.py', kind: 'script' })
    })

    it('unwraps MCP response envelopes without discarding useful fields', async () => {
        mockResponse({
            ok: true,
            data: {
                routing: { route_status: 'available' },
                capacity: { live_capacity_available: true },
                can_submit: true
            }
        })
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await expect(client.estimateJob({ workload_type: 'training' })).resolves.toEqual({
            routing: { route_status: 'available' },
            capacity: { live_capacity_available: true },
            can_submit: true
        })
    })

    it('returns a safe unavailable result when runtime data is not ready', async () => {
        mockResponse({ error: { code: 'NOT_FOUND', message: 'job runtime not available yet' } }, 404)
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await expect(client.getJobRuntime('job_123')).resolves.toEqual({
            job_id: 'job_123',
            runtime_available: false,
            message: 'Job runtime information is not available yet.'
        })
    })

    it('handles non-JSON API errors and rate limits safely', async () => {
        mockResponse('<html>upstream unavailable</html>', 503)
        const client = new JungleGridClient({ apiKey: 'test-key' })

        await expect(client.getJob('job_123')).rejects.toThrow('<html>upstream unavailable</html>')

        mockResponse(undefined, 429)
        await expect(client.getJob('job_123')).rejects.toThrow('RATE_LIMITED')
    })

    it('handles timeouts without exposing API keys or Axios configuration', async () => {
        mockedSecureAxiosRequest.mockRejectedValue(new Error('timeout of 30000ms exceeded Authorization: Bearer jg_live_secret_fixture'))
        const client = new JungleGridClient({ apiKey: 'jg_live_secret_fixture' })

        const [tool] = createJungleGridTools(client, ['getJob'])
        const result = await (tool as any)._call({ job_id: 'job_123' })

        expect(result).toContain('request timed out')
        expect(result).not.toContain('jg_live_secret_fixture')
        expect(result).not.toContain('Authorization')
    })
})

describe('Jungle Grid tools', () => {
    beforeEach(() => {
        mockedSecureAxiosRequest.mockReset()
        mockResponse()
    })

    it('creates every selected action and does not expose unselected actions', () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const actions = [
            'estimateJob',
            'submitJob',
            'uploadJobInput',
            'listJobInputs',
            'listJobs',
            'getJob',
            'getJobEvents',
            'getJobRuntime',
            'getJobLogs',
            'cancelJob',
            'listArtifacts',
            'getArtifact'
        ] as const

        expect(createJungleGridTools(client, [...actions]).map((tool) => tool.name)).toEqual([
            'jungle_grid_estimate_job',
            'jungle_grid_submit_job',
            'jungle_grid_upload_job_input',
            'jungle_grid_list_job_inputs',
            'jungle_grid_list_jobs',
            'jungle_grid_get_job',
            'jungle_grid_get_job_events',
            'jungle_grid_get_job_runtime',
            'jungle_grid_get_job_logs',
            'jungle_grid_cancel_job',
            'jungle_grid_list_artifacts',
            'jungle_grid_get_artifact'
        ])
        expect(createJungleGridTools(client, ['getJob']).map((tool) => tool.name)).toEqual(['jungle_grid_get_job'])
    })

    it('validates workload types and required submission fields before requests', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const result = await (submitTool as any)._call({ workload_type: 'unsupported' })

        expect(result).toContain('jungle_grid_submit_job failed')
        expect(result).toContain('Invalid enum value')
        expect(mockedSecureAxiosRequest).not.toHaveBeenCalled()
    })

    it('rejects empty command-array entries', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const result = await (submitTool as any)._call({
            name: 'bad-command',
            workload_type: 'batch',
            image: 'python:3.11',
            command: ['python', ' ']
        })

        expect(result).toContain('command.1: Must not be empty')
        expect(mockedSecureAxiosRequest).not.toHaveBeenCalled()
    })

    it('rejects malformed environment values without echoing values', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const result = await (submitTool as any)._call({
            name: 'bad-env',
            workload_type: 'batch',
            image: 'python:3.11',
            env: { SECRET_VALUE: 42 }
        })

        expect(result).toContain('env.SECRET_VALUE')
        expect(result).not.toContain('42')
        expect(mockedSecureAxiosRequest).not.toHaveBeenCalled()
    })

    it('rejects malformed input references and expected artifacts', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const badInput = await (submitTool as any)._call({
            name: 'bad-input',
            workload_type: 'batch',
            image: 'python:3.11',
            input_files: [{ input_id: '' }]
        })
        const badArtifact = await (submitTool as any)._call({
            name: 'bad-artifact',
            workload_type: 'batch',
            image: 'python:3.11',
            expected_artifacts: ['']
        })

        expect(badInput).toContain('input_files.0.input_id')
        expect(badArtifact).toContain('expected_artifacts.0')
        expect(mockedSecureAxiosRequest).not.toHaveBeenCalled()
    })

    it('validates upload kind and creates only an upload slot', async () => {
        mockResponse({
            upload: {
                input_id: 'inp_123',
                filename: 'audio.wav',
                method: 'PUT',
                upload_url: 'https://signed.example/upload',
                complete_url: 'https://api.junglegrid.dev/v1/job-inputs/inp_123/complete'
            }
        })
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [uploadTool] = createJungleGridTools(client, ['uploadJobInput'])

        const invalid = await (uploadTool as any)._call({ filename: 'audio.wav', kind: 'artifact' })
        expect(invalid).toContain('Invalid enum value')
        expect(mockedSecureAxiosRequest).not.toHaveBeenCalled()

        const valid = await (uploadTool as any)._call({ filename: 'audio.wav', kind: 'input' })
        expect(valid).toContain('"input_id":"inp_123"')
        expect(uploadTool.description).toContain('does not upload file bytes')
        expect(mockedSecureAxiosRequest).toHaveBeenCalledTimes(1)
    })

    it('keeps events separate from logs', async () => {
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [eventsTool, logsTool] = createJungleGridTools(client, ['getJobEvents', 'getJobLogs'])

        await (eventsTool as any)._call({ job_id: 'job_123' })
        await (logsTool as any)._call({ job_id: 'job_123', limit: 50 })

        expect(requestConfig(0).url).toBe('https://api.junglegrid.dev/v1/jobs/job_123/events')
        expect(requestConfig(0).url).not.toContain('/logs')
        expect(requestConfig(1).url).toBe('https://api.junglegrid.dev/v1/mcp/jobs/job_123/logs?limit=50')
        expect(logsTool.description).toContain('may be empty')
    })

    it('redacts callback tokens, bearer tokens, and signed URLs from tool errors', async () => {
        mockResponse(
            {
                error: {
                    code: 'INVALID_REQUEST',
                    message:
                        'callback_auth_token "callback-secret-fixture"; Bearer api-key-fixture; https://storage.test/file?X-Amz-Signature=signed-secret'
                }
            },
            400
        )
        const client = new JungleGridClient({ apiKey: 'test-key' })
        const [submitTool] = createJungleGridTools(client, ['submitJob'])

        const result = await (submitTool as any)._call({
            name: 'flowise-smoke',
            workload_type: 'batch',
            image: 'python:3.11',
            callback_auth_token: 'super-secret-callback-token'
        })

        expect(result).toContain('INVALID_REQUEST')
        expect(result).toContain('[REDACTED]')
        expect(result).not.toContain('super-secret-callback-token')
        expect(result).not.toContain('callback-secret-fixture')
        expect(result).not.toContain('api-key-fixture')
        expect(result).not.toContain('signed-secret')
    })
})

describe('Jungle Grid utilities', () => {
    it('preserves arrays and non-plain objects while removing nested undefined values', () => {
        const date = new Date('2026-06-11T00:00:00Z')
        const value = {
            keep: [1, undefined, { remove: undefined, keep: 'yes' }],
            date,
            remove: undefined
        }

        const result = removeUndefined(value)

        expect(result).toEqual({ keep: [1, undefined, { keep: 'yes' }], date })
        expect(result.date).toBe(date)
    })

    it('handles circular plain data without infinite recursion', () => {
        const value: any = { name: 'root' }
        value.self = value

        const result = removeUndefined(value)

        expect(result.self).toBe(result)
    })

    it('redacts nested secrets, secrets in arrays, URLs, and circular data', () => {
        const value: any = {
            nested: [{ api_key: 'secret-key' }, { authorization: 'Bearer abc' }],
            upload_url: 'https://signed.example/upload',
            public: 'visible'
        }
        value.self = value

        expect(redactSensitiveParams(value)).toEqual({
            nested: [{ api_key: '[REDACTED]' }, { authorization: '[REDACTED]' }],
            upload_url: '[REDACTED]',
            public: 'visible',
            self: '[Circular]'
        })
    })

    it('redacts bearer tokens and temporary signed URLs in strings', () => {
        const message = 'Bearer abc.def-123 https://storage.test/file?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=secret'
        const redacted = redactErrorMessage(message)

        expect(redacted).toContain('Bearer [REDACTED]')
        expect(redacted).toContain('[REDACTED_URL]')
        expect(redacted).not.toContain('secret')
    })

    it('normalizes per-job billing without presenting lifetime totals as job cost', () => {
        expect(
            normalizeJobStatusResponse({
                job_id: 'job_123',
                delayed_start: true,
                phase_started_at: '2026-06-11T10:00:00Z',
                total_spent_usd: 900,
                account_billing: { lifetime_total_spent_usd: 900 },
                billing: { cost_usd: 1.25, total_spent_usd: 900 }
            })
        ).toEqual({
            job_id: 'job_123',
            delayed_start: true,
            phase_started_at: '2026-06-11T10:00:00Z',
            account_billing: { lifetime_total_spent_usd: 900 },
            billing: { actual_cost_usd: 1.25 },
            actual_cost_usd: 1.25
        })
    })
})
