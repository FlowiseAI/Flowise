import { z } from 'zod/v3'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { formatToolError } from '../../../src/agents'
import { secureAxiosRequest } from '../../../src/httpSecurity'

export const DEFAULT_JUNGLE_GRID_BASE_URL = 'https://api.junglegrid.dev'

const jsonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
}

const workloadTypeSchema = z.enum(['inference', 'training', 'fine-tuning', 'batch'])
const optimizeForSchema = z.enum(['balanced', 'cost', 'speed'])
const prioritySchema = z.enum(['low', 'balanced', 'high'])
const gpuClassSchema = z.enum(['consumer', 'datacenter'])
const regionModeSchema = z.enum(['prefer', 'strict'])
const jobStatusSchema = z.enum(['pending', 'queued', 'assigned', 'running', 'completed', 'failed', 'rejected', 'cancelled'])

const constraintsSchema = z
    .object({
        max_price_per_hour: z.number().optional().describe('Optional maximum hourly price in USD, as documented by Jungle Grid.'),
        preferred_gpu_family: z.string().optional().describe('Optional preferred GPU family, such as l4.'),
        avoid_gpu_families: z.array(z.string()).optional().describe('Optional GPU families to avoid.'),
        gpu_type: z.string().optional().describe('Optional exact GPU override verified by the official Jungle Grid MCP package.'),
        gpu_class: gpuClassSchema.optional().describe('Optional GPU class preference verified by the official Jungle Grid MCP package.'),
        region_preference: z.string().optional().describe('Optional preferred region such as us-east or eu-west.'),
        region_mode: regionModeSchema.optional().describe('Whether the region preference is preferred or strict.'),
        latency_priority: prioritySchema.optional().describe("Latency sensitivity: 'low', 'balanced', or 'high'."),
        cost_priority: prioritySchema.optional().describe("Cost sensitivity: 'low', 'balanced', or 'high'.")
    })
    .optional()

const estimateJobSchema = z.object({
    name: z.string().optional().describe('Optional readable job name for the draft workload.'),
    workload_type: workloadTypeSchema.describe('Type of workload to estimate.'),
    image: z.string().min(1).describe('Docker image to run.'),
    command: z.string().optional().describe('Optional container command to include in the estimate draft, for example python.'),
    args: z.array(z.string()).optional().describe('Optional arguments passed to the command.'),
    model_size_gb: z.number().optional().describe('Approximate model size in GB.'),
    disk_gb: z.number().optional().describe('Optional managed-provider local disk override in GB.'),
    optimize_for: optimizeForSchema.optional().describe("Scheduling optimization goal: 'balanced', 'cost', or 'speed'."),
    latency_priority: prioritySchema.optional().describe("Latency sensitivity: 'low', 'balanced', or 'high'."),
    cost_priority: prioritySchema.optional().describe("Cost sensitivity: 'low', 'balanced', or 'high'."),
    constraints: constraintsSchema.describe('Optional routing constraints.')
})

const submitJobSchema = estimateJobSchema.extend({
    command: z.string().min(1).describe('Container command to run, for example python. Submit Job starts asynchronous remote work.'),
    environment: z
        .record(z.string())
        .optional()
        .describe('Environment variables injected into the container. Do not include secrets unless the user explicitly approves.'),
    huggingface_credential_id: z.string().optional().describe('Optional saved Hugging Face credential id.'),
    webhook_url: z.string().optional().describe('Optional HTTPS URL to receive signed lifecycle event callbacks.'),
    callback_url: z.string().optional().describe('Optional documented callback URL for lifecycle events.'),
    callback_auth_token: z.string().optional().describe('Optional callback authentication token. Never use this for unrelated secrets.'),
    callback_metadata: z.record(z.any()).optional().describe('Optional metadata included with callbacks.')
})

const jobIdSchema = z.object({
    job_id: z.string().min(1).describe('Jungle Grid job_id returned by submit_job.')
})

const listJobsSchema = z.object({
    limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of jobs to return. The official MCP package defaults to 20 and documents max 100.'),
    status: jobStatusSchema.optional().describe('Optional status filter.')
})

const cancelJobSchema = jobIdSchema.extend({
    reason: z.string().optional().describe('Optional cancellation reason.')
})

const artifactDownloadSchema = jobIdSchema.extend({
    artifact_id: z.string().min(1).describe('Artifact ID returned by list_job_artifacts.')
})

export interface JungleGridClientOptions {
    apiKey: string
    baseUrl?: string
}

export class JungleGridClient {
    private readonly apiKey: string
    private readonly baseUrl: string

    constructor({ apiKey, baseUrl }: JungleGridClientOptions) {
        if (!apiKey) throw new Error('Jungle Grid API key is required')
        this.apiKey = apiKey
        this.baseUrl = normalizeBaseUrl(baseUrl)
    }

    estimateJob(input: z.infer<typeof estimateJobSchema>): Promise<any> {
        return this.request('POST', '/v1/jobs/estimate', input)
    }

    submitJob(input: z.infer<typeof submitJobSchema>): Promise<any> {
        return this.request('POST', '/v1/jobs', input)
    }

    listJobs(input: z.infer<typeof listJobsSchema>): Promise<any> {
        const params = new URLSearchParams()
        if (input.limit !== undefined) params.set('limit', String(input.limit))
        if (input.status) params.set('status', input.status)
        const query = params.toString()
        return this.request('GET', query ? `/v1/jobs?${query}` : '/v1/jobs')
    }

    getJob(jobId: string): Promise<any> {
        return this.request('GET', `/v1/jobs/${encodeURIComponent(jobId)}`)
    }

    getJobRuntime(jobId: string): Promise<any> {
        return this.request('GET', `/v1/jobs/${encodeURIComponent(jobId)}/runtime`)
    }

    cancelJob(jobId: string, reason?: string): Promise<any> {
        return this.request('POST', `/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
            reason: reason ?? 'Cancelled via Flowise'
        })
    }

    listJobArtifacts(jobId: string): Promise<any> {
        return this.request('GET', `/v1/jobs/${encodeURIComponent(jobId)}/artifacts`)
    }

    getArtifactDownloadUrl(jobId: string, artifactId: string): Promise<any> {
        return this.request('POST', `/v1/jobs/${encodeURIComponent(jobId)}/artifacts/${encodeURIComponent(artifactId)}/download`)
    }

    private async request(method: string, path: string, body?: any): Promise<any> {
        const response = await secureAxiosRequest({
            url: `${this.baseUrl}${path}`,
            method,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                ...jsonHeaders
            },
            data: body !== undefined ? removeUndefined(body) : undefined
        })

        if (response.status < 200 || response.status >= 300) {
            throw new Error(responseErrorMessage(response, method, path))
        }

        if (response.status === 204) return { ok: true }

        if (response.data === undefined || response.data === null || response.data === '') return { ok: true }
        return response.data
    }
}

export type JungleGridAction =
    | 'estimateJob'
    | 'submitJob'
    | 'listJobs'
    | 'getJob'
    | 'getJobRuntime'
    | 'cancelJob'
    | 'getJobLogs'
    | 'listJobArtifacts'
    | 'getArtifactDownloadUrl'

export function createJungleGridTools(client: JungleGridClient, actions: JungleGridAction[]): DynamicStructuredTool[] {
    const selectedActions = actions.length > 0 ? actions : (Object.keys(toolFactories) as JungleGridAction[])
    return selectedActions.map((action) => toolFactories[action](client))
}

class JungleGridTool extends DynamicStructuredTool {
    private readonly handler: (input: any) => Promise<string>

    constructor(args: { name: string; description: string; schema: any; handler: (input: any) => Promise<string> }) {
        super({
            name: args.name,
            description: args.description,
            schema: args.schema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        })
        this.handler = args.handler
    }

    async _call(input: any): Promise<string> {
        return this.handler(input)
    }
}

const toolFactories: Record<JungleGridAction, (_client: JungleGridClient) => DynamicStructuredTool> = {
    estimateJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_estimate_job',
            description:
                'Estimate a Jungle Grid workload before submission when cost, capacity, routing, or GPU tier matters. Accepts the same verified draft workload fields as submit_job and returns the real production estimate response, including hourly rate/range, runtime, queue/start window, route/capacity, and constraint-relaxation fields when available. Use this before jungle_grid_submit_job if spending credits or capacity selection matters.',
            schema: estimateJobSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_estimate_job', input, () => client.estimateJob(input))
        }),
    submitJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_submit_job',
            description:
                'Submit an asynchronous Jungle Grid workload. This starts remote work and returns a job_id immediately; a returned job_id does not mean the job has finished. Poll jungle_grid_get_job and use jungle_grid_get_job_runtime or jungle_grid_get_job_logs until a terminal status is reached. Never put untrusted secrets in environment variables, command, or args without explicit user permission.',
            schema: submitJobSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_submit_job', input, () => client.submitJob(input))
        }),
    listJobs: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_list_jobs',
            description: 'List recent Jungle Grid jobs for the authenticated account. Use this to find job IDs and recent statuses.',
            schema: listJobsSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_list_jobs', input, () => client.listJobs(input))
        }),
    getJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job',
            description:
                "Get current Jungle Grid job status and details by job_id. Poll this after submit_job until the job reaches a terminal status such as 'completed', 'failed', 'cancelled', or 'rejected'.",
            schema: jobIdSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_get_job', input, () => client.getJob(input.job_id))
        }),
    getJobRuntime: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job_runtime',
            description:
                'Retrieve runtime tails, exit code, timeout flag, diagnostics, and runtime availability for a Jungle Grid job. Use this to monitor or diagnose running, failed, or completed work.',
            schema: jobIdSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_get_job_runtime', input, () => client.getJobRuntime(input.job_id))
        }),
    cancelJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_cancel_job',
            description:
                'Cancel a pending, queued, assigned, or running Jungle Grid job. This uses the verified production cancel route and has no useful effect on already terminal jobs.',
            schema: cancelJobSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_cancel_job', input, () => client.cancelJob(input.job_id, input.reason))
        }),
    getJobLogs: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job_logs',
            description:
                'Retrieve available stdout/stderr tails and exit information for a Jungle Grid job. The official MCP package verifies this as the same production runtime endpoint used by get_job_runtime. Use it after submit_job while polling or after terminal status for diagnostics.',
            schema: jobIdSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_get_job_logs', input, () => client.getJobRuntime(input.job_id))
        }),
    listJobArtifacts: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_list_job_artifacts',
            description:
                'List managed artifacts uploaded by a Jungle Grid job. Retrieve artifacts after successful completion unless the API response explicitly shows partial outputs are available. Managed jobs upload regular files written under /workspace/artifacts.',
            schema: jobIdSchema,
            handler: async (input) => safeJsonToolCall('jungle_grid_list_job_artifacts', input, () => client.listJobArtifacts(input.job_id))
        }),
    getArtifactDownloadUrl: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_artifact_download_url',
            description:
                'Create a temporary signed download URL for a managed Jungle Grid artifact. Call jungle_grid_list_job_artifacts first and use an artifact_id from that response.',
            schema: artifactDownloadSchema,
            handler: async (input) =>
                safeJsonToolCall('jungle_grid_get_artifact_download_url', input, () =>
                    client.getArtifactDownloadUrl(input.job_id, input.artifact_id)
                )
        })
}

async function safeJsonToolCall(toolName: string, params: any, call: () => Promise<any>): Promise<string> {
    try {
        const result = await call()
        return JSON.stringify(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown Jungle Grid API error'
        return formatToolError(`${toolName} failed: ${message}`, redactSensitiveParams(params))
    }
}

function normalizeBaseUrl(baseUrl?: string): string {
    const raw = (baseUrl || DEFAULT_JUNGLE_GRID_BASE_URL).trim()
    if (!raw) return DEFAULT_JUNGLE_GRID_BASE_URL
    return raw.replace(/\/+$/, '')
}

function removeUndefined(value: any): any {
    if (Array.isArray(value)) {
        return value.map(removeUndefined)
    }
    if (value != null && typeof value === 'object' && (value.constructor === Object || Object.getPrototypeOf(value) === null)) {
        const output: Record<string, any> = {}
        for (const [key, child] of Object.entries(value)) {
            if (child !== undefined) output[key] = removeUndefined(child)
        }
        return output
    }
    return value
}

function redactSensitiveParams(params: any): any {
    if (!params || typeof params !== 'object') return params
    const output: Record<string, any> = {}
    for (const [key, value] of Object.entries(params)) {
        if (/token|secret|password|api[_-]?key/i.test(key)) {
            output[key] = '[REDACTED]'
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            output[key] = redactSensitiveParams(value)
        } else {
            output[key] = value
        }
    }
    return output
}

function responseErrorMessage(response: any, method: string, path: string): string {
    const fallback = `${method} ${path} failed with status ${response.status}`
    const payload = response.data
    if (payload === undefined || payload === null || payload === '') return fallback
    if (typeof payload === 'string') {
        const trimmed = payload.trim()
        return trimmed ? `${fallback}: ${trimmed}` : fallback
    }

    const detail = formatApiError(payload)
    return detail ? `${fallback}: ${detail}` : fallback
}

function formatApiError(payload: any): string | undefined {
    if (!payload || typeof payload !== 'object') return undefined
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim()
    if (payload.error && typeof payload.error === 'object') {
        const code = stringField(payload.error.code)
        const message = stringField(payload.error.message)
        if (code && message) return `${code}: ${message}`
        return message ?? code
    }

    const code = stringField(payload.code)
    const message = stringField(payload.message)
    if (code && message) return `${code}: ${message}`
    return message ?? code
}

function stringField(value: any): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed || undefined
}
