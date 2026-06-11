import { z } from 'zod/v3'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { formatToolError } from '../../../src/agents'
import { secureAxiosRequest } from '../../../src/httpSecurity'

export const DEFAULT_JUNGLE_GRID_BASE_URL = 'https://api.junglegrid.dev'

const jsonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
}

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, 'Must not be empty')
const workloadTypeSchema = z.enum(['inference', 'training', 'fine_tuning', 'fine-tuning', 'batch'])
const routingModeSchema = z.enum(['balanced', 'cost', 'speed'])
const prioritySchema = z.enum(['low', 'balanced', 'high'])
const gpuClassSchema = z.enum(['consumer', 'datacenter'])
const regionModeSchema = z.enum(['prefer', 'strict'])
const cursorSchema = z.union([z.string(), z.number()])
const commandSchema = z.union([
    nonEmptyString,
    z.array(nonEmptyString).min(1).describe('Preferred command-array form. Every entry must be a non-empty string.')
])
const environmentSchema = z.record(z.string()).describe('Environment variable values must be strings.')
const inputReferenceSchema = z.union([
    nonEmptyString,
    z
        .object({
            input_id: nonEmptyString
        })
        .strict()
])

const constraintsSchema = z
    .object({
        max_price_per_hour: z.number().optional(),
        preferred_gpu_family: nonEmptyString.optional(),
        avoid_gpu_families: z.array(nonEmptyString).optional(),
        gpu_type: nonEmptyString.optional(),
        gpu_class: gpuClassSchema.optional(),
        region_preference: nonEmptyString.optional(),
        region_mode: regionModeSchema.optional(),
        latency_priority: prioritySchema.optional(),
        cost_priority: prioritySchema.optional()
    })
    .optional()

const estimateJobSchema = z.object({
    name: nonEmptyString.optional().describe('Compatibility field for a readable estimate name.'),
    workload_type: workloadTypeSchema.describe('Workload type to estimate.'),
    image: nonEmptyString.optional().describe('Optional container image for the estimate.'),
    command: commandSchema.optional().describe('Preferred as an array; a legacy command string remains accepted.'),
    args: z.array(z.string()).optional().describe('Arguments for a legacy command string or additional container arguments.'),
    model_size_gb: z.number().positive().optional().describe('Approximate model size in GB.'),
    model_size: z.number().positive().optional().describe('Alias for model_size_gb.'),
    disk_gb: z.number().positive().optional().describe('Compatibility field for a managed local disk estimate.'),
    optimize_for: routingModeSchema.optional().describe('Routing optimization goal.'),
    routing_mode: routingModeSchema.optional().describe('Alias for optimize_for.'),
    template: nonEmptyString.optional().describe('Optional Jungle Grid template identifier.'),
    notes: nonEmptyString.optional().describe('Optional estimator notes.'),
    latency_priority: prioritySchema.optional(),
    cost_priority: prioritySchema.optional(),
    constraints: constraintsSchema
})

const submitJobSchema = estimateJobSchema.extend({
    name: nonEmptyString.describe('Readable job name. Submission may start compute and spend credits.'),
    image: nonEmptyString.describe('Container image to run.'),
    environment: environmentSchema.optional(),
    env: environmentSchema.optional().describe('Compatibility alias for environment.'),
    input_files: z.array(inputReferenceSchema).optional().describe('Uploaded inputs mounted under /workspace/inputs.'),
    script_files: z.array(inputReferenceSchema).optional().describe('Uploaded scripts mounted under /workspace/scripts.'),
    expected_artifacts: z
        .array(nonEmptyString)
        .optional()
        .describe('Expected files under /workspace/artifacts, for example /workspace/artifacts/result.json.'),
    metadata: z.record(z.unknown()).optional().describe('Structured workload metadata.'),
    huggingface_credential_id: nonEmptyString.optional(),
    callback_url: z.string().url().optional(),
    callback_auth_token: nonEmptyString.optional(),
    callback_metadata: z.record(z.string()).optional()
})

const uploadJobInputSchema = z.object({
    filename: nonEmptyString.describe('Filename used for the managed mount path.'),
    content_type: nonEmptyString.optional().describe('Optional MIME content type.'),
    kind: z.enum(['input', 'script']).optional().describe("Use 'input' or 'script'.")
})

const emptySchema = z.object({}).strict()

const jobIdSchema = z.object({
    job_id: nonEmptyString.describe('Jungle Grid job_id returned by submit_job.')
})

const listJobsSchema = z.object({
    limit: z.number().int().min(1).max(100).optional().default(20),
    cursor: nonEmptyString.optional(),
    status: nonEmptyString.optional().describe('Optional current API status filter.')
})

const getJobLogsSchema = jobIdSchema.extend({
    tail: z.number().int().min(1).max(500).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    cursor: cursorSchema.optional(),
    stream: z.enum(['stdout', 'stderr', 'all']).optional()
})

const cancelJobSchema = jobIdSchema.extend({
    reason: nonEmptyString.optional()
})

const artifactDownloadSchema = jobIdSchema.extend({
    artifact_id: nonEmptyString.describe('Artifact ID returned by list_artifacts.')
})

export interface JungleGridClientOptions {
    apiKey: string
    baseUrl?: string
}

class JungleGridApiError extends Error {
    readonly status: number
    readonly code: string

    constructor(status: number, code: string, message: string) {
        super(message)
        this.name = 'JungleGridApiError'
        this.status = status
        this.code = code
    }
}

export class JungleGridClient {
    private readonly apiKey: string
    private readonly baseUrl: string

    constructor({ apiKey, baseUrl }: JungleGridClientOptions) {
        if (!apiKey?.trim()) throw new Error('Jungle Grid API key is required')
        this.apiKey = apiKey
        this.baseUrl = normalizeBaseUrl(baseUrl)
    }

    estimateJob(input: z.infer<typeof estimateJobSchema>): Promise<unknown> {
        return this.request('POST', '/v1/mcp/jobs/estimate', normalizeJobPayload(input))
    }

    submitJob(input: z.infer<typeof submitJobSchema>): Promise<unknown> {
        return this.request('POST', '/v1/mcp/jobs', normalizeJobPayload(input))
    }

    uploadJobInput(input: z.infer<typeof uploadJobInputSchema>): Promise<unknown> {
        return this.request('POST', '/v1/job-inputs', input)
    }

    listJobInputs(): Promise<unknown> {
        return this.request('GET', '/v1/job-inputs')
    }

    listJobs(input: z.infer<typeof listJobsSchema>): Promise<unknown> {
        return this.request('GET', withQuery('/v1/mcp/jobs', input))
    }

    getJob(jobId: string): Promise<unknown> {
        return this.request('GET', `/v1/mcp/jobs/${encodeURIComponent(jobId)}`).then(normalizeJobStatusResponse)
    }

    getJobEvents(jobId: string): Promise<unknown> {
        return this.request('GET', `/v1/jobs/${encodeURIComponent(jobId)}/events`)
    }

    async getJobRuntime(jobId: string): Promise<unknown> {
        try {
            return await this.request('GET', `/v1/jobs/${encodeURIComponent(jobId)}/runtime`)
        } catch (error) {
            if (error instanceof JungleGridApiError && error.status === 404 && /runtime not available yet/i.test(error.message)) {
                return {
                    job_id: jobId,
                    runtime_available: false,
                    message: 'Job runtime information is not available yet.'
                }
            }
            throw error
        }
    }

    getJobLogs(jobId: string, input: Omit<z.infer<typeof getJobLogsSchema>, 'job_id'> = {}): Promise<unknown> {
        return this.request('GET', withQuery(`/v1/mcp/jobs/${encodeURIComponent(jobId)}/logs`, input))
    }

    cancelJob(jobId: string, reason?: string): Promise<unknown> {
        return this.request('POST', `/v1/mcp/jobs/${encodeURIComponent(jobId)}/cancel`, {
            reason: reason?.trim() || 'Cancelled via Flowise'
        })
    }

    listJobArtifacts(jobId: string): Promise<unknown> {
        return this.request('GET', `/v1/mcp/jobs/${encodeURIComponent(jobId)}/artifacts`)
    }

    getArtifactDownloadUrl(jobId: string, artifactId: string): Promise<unknown> {
        return this.request('POST', `/v1/mcp/jobs/${encodeURIComponent(jobId)}/artifacts/${encodeURIComponent(artifactId)}/download`)
    }

    private async request(method: string, path: string, body?: unknown): Promise<unknown> {
        let response: any
        try {
            response = await secureAxiosRequest({
                url: `${this.baseUrl}${path}`,
                method,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    ...jsonHeaders
                },
                data: body === undefined ? undefined : removeUndefined(body),
                timeout: 30000
            })
        } catch (error) {
            throw new Error(requestFailureMessage(error, method, path))
        }

        if (response.status < 200 || response.status >= 300) {
            const parsed = parseApiError(response.data, response.status)
            throw new JungleGridApiError(response.status, parsed.code, `${method} ${path}: ${parsed.code}: ${parsed.message}`)
        }

        if (response.status === 204 || response.data === undefined || response.data === null || response.data === '') {
            return { ok: true }
        }

        const data = unwrapResponseEnvelope(response.data)
        if (isPlainObject(response.data) && response.data.ok === false) {
            const parsed = parseApiError(response.data, response.status)
            throw new JungleGridApiError(response.status, parsed.code, `${method} ${path}: ${parsed.code}: ${parsed.message}`)
        }
        return data
    }
}

export type JungleGridAction =
    | 'estimateJob'
    | 'submitJob'
    | 'uploadJobInput'
    | 'listJobInputs'
    | 'listJobs'
    | 'getJob'
    | 'getJobEvents'
    | 'getJobRuntime'
    | 'getJobLogs'
    | 'cancelJob'
    | 'listArtifacts'
    | 'getArtifact'

export function createJungleGridTools(client: JungleGridClient, actions: JungleGridAction[]): DynamicStructuredTool[] {
    const selectedActions = actions.length > 0 ? actions : (Object.keys(toolFactories) as JungleGridAction[])
    return selectedActions.map((action) => toolFactories[action](client))
}

class JungleGridTool extends DynamicStructuredTool {
    private readonly handler: (input: any) => Promise<string>
    private readonly inputSchema: any

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
        this.inputSchema = args.schema
    }

    async _call(input: any): Promise<string> {
        try {
            const parsedInput = this.inputSchema.parse(input ?? {})
            return this.handler(parsedInput)
        } catch (error) {
            return formatToolError(`${this.name} failed: ${formatErrorMessage(error)}`, redactSensitiveParams(input))
        }
    }
}

const toolFactories: Record<JungleGridAction, (client: JungleGridClient) => DynamicStructuredTool> = {
    estimateJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_estimate_job',
            description:
                'Estimate routing, screening, capacity source, expected cost, and submission eligibility without submitting or starting compute. Availability is not a guarantee of immediate runtime startup.',
            schema: estimateJobSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_estimate_job', input, () => client.estimateJob(input))
        }),
    submitJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_submit_job',
            description:
                'Submit an asynchronous Jungle Grid workload. This may start managed compute and spend credits. Prefer a command array; legacy command plus args remains supported. Monitor the returned job_id with status, events, runtime, and logs.',
            schema: submitJobSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_submit_job', input, () => client.submitJob(input))
        }),
    uploadJobInput: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_upload_job_input',
            description:
                'Create a managed upload slot for an input or script. This does not upload file bytes. Upload bytes to upload_url with the returned method and headers, call complete_url, then pass input_id to submit_job. Do not expose temporary URLs or tokens in logs.',
            schema: uploadJobInputSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_upload_job_input', input, () => client.uploadJobInput(input))
        }),
    listJobInputs: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_list_job_inputs',
            description: 'List uploaded Jungle Grid inputs and scripts, including readiness and managed mount paths.',
            schema: emptySchema,
            handler: (input) => safeJsonToolCall('jungle_grid_list_job_inputs', input, () => client.listJobInputs())
        }),
    listJobs: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_list_jobs',
            description: 'List recent Jungle Grid jobs with limit, cursor, and optional status filtering.',
            schema: listJobsSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_list_jobs', input, () => client.listJobs(input))
        }),
    getJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job',
            description:
                'Get current job status, execution phase, stable phase timing, scheduling delay, routing, cost, failure, and artifact readiness when available. A supported estimate does not guarantee immediate startup.',
            schema: jobIdSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_get_job', input, () => client.getJob(input.job_id))
        }),
    getJobEvents: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job_events',
            description:
                'Get platform lifecycle events for scheduling, capacity lookup, provisioning, input preparation, and startup. Events can exist before workload output; they are not workload logs.',
            schema: jobIdSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_get_job_events', input, () => client.getJobEvents(input.job_id))
        }),
    getJobRuntime: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job_runtime',
            description:
                'Get separate runtime diagnostics, output tails, exit code, timeout state, and field availability. Runtime data may be unavailable while a job is waiting or starting.',
            schema: jobIdSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_get_job_runtime', input, () => client.getJobRuntime(input.job_id))
        }),
    getJobLogs: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_job_logs',
            description:
                'Poll paginated persisted logs. Logs may be empty while queued or starting; use get_job_events for platform progress. Polling is not true streaming, and lifecycle events are not fetched through this action.',
            schema: getJobLogsSchema,
            handler: (input) =>
                safeJsonToolCall('jungle_grid_get_job_logs', input, () =>
                    client.getJobLogs(input.job_id, {
                        tail: input.tail,
                        limit: input.limit,
                        cursor: input.cursor,
                        stream: input.stream
                    })
                )
        }),
    cancelJob: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_cancel_job',
            description: 'Request cancellation of a Jungle Grid job. This may stop active execution and prevent further outputs.',
            schema: cancelJobSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_cancel_job', input, () => client.cancelJob(input.job_id, input.reason))
        }),
    listArtifacts: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_list_artifacts',
            description: 'List managed output artifacts for a job, including artifact IDs, readiness, size, and MIME type.',
            schema: jobIdSchema,
            handler: (input) => safeJsonToolCall('jungle_grid_list_artifacts', input, () => client.listJobArtifacts(input.job_id))
        }),
    getArtifact: (client) =>
        new JungleGridTool({
            name: 'jungle_grid_get_artifact',
            description:
                'Get temporary download information for an artifact ID. The response may contain a short-lived signed URL; it does not permanently embed the file in Flowise.',
            schema: artifactDownloadSchema,
            handler: (input) =>
                safeJsonToolCall('jungle_grid_get_artifact', input, () => client.getArtifactDownloadUrl(input.job_id, input.artifact_id))
        })
}

async function safeJsonToolCall(toolName: string, params: unknown, call: () => Promise<unknown>): Promise<string> {
    try {
        return JSON.stringify(await call())
    } catch (error) {
        return formatToolError(`${toolName} failed: ${formatErrorMessage(error)}`, redactSensitiveParams(params))
    }
}

function normalizeJobPayload(input: any): any {
    const payload = removeUndefined(input)

    if (payload.workload_type === 'fine_tuning') payload.workload_type = 'fine-tuning'

    if (payload.model_size !== undefined) {
        if (payload.model_size_gb !== undefined && payload.model_size_gb !== payload.model_size) {
            throw new Error('model_size and model_size_gb must match when both are provided')
        }
        payload.model_size_gb = payload.model_size
        delete payload.model_size
    }

    if (payload.routing_mode !== undefined) {
        if (payload.optimize_for !== undefined && payload.optimize_for !== payload.routing_mode) {
            throw new Error('optimize_for and routing_mode must match when both are provided')
        }
        payload.optimize_for = payload.routing_mode
        delete payload.routing_mode
    }

    if (payload.env !== undefined) {
        payload.environment = {
            ...payload.env,
            ...(payload.environment ?? {})
        }
        delete payload.env
    }

    for (const key of ['input_files', 'script_files']) {
        if (payload[key] !== undefined) {
            payload[key] = payload[key].map((item: string | { input_id: string }) => ({
                input_id: (typeof item === 'string' ? item : item.input_id).trim()
            }))
        }
    }

    return payload
}

export function normalizeBaseUrl(baseUrl?: string): string {
    const raw = (baseUrl || DEFAULT_JUNGLE_GRID_BASE_URL).trim() || DEFAULT_JUNGLE_GRID_BASE_URL
    let parsed: URL
    try {
        parsed = new URL(raw)
    } catch {
        throw new Error('Jungle Grid API base URL must be a valid HTTP or HTTPS URL')
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error('Jungle Grid API base URL must be a valid HTTP or HTTPS URL without embedded credentials')
    }
    return raw.replace(/\/+$/, '')
}

function withQuery(path: string, values: Record<string, unknown>): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    }
    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function isPlainObject(value: unknown): value is Record<string, any> {
    if (value === null || typeof value !== 'object') return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

export function removeUndefined(value: any, seen = new WeakMap<object, any>()): any {
    if (Array.isArray(value)) {
        if (seen.has(value)) return seen.get(value)
        const output: any[] = []
        seen.set(value, output)
        for (const item of value) output.push(removeUndefined(item, seen))
        return output
    }
    if (isPlainObject(value)) {
        if (seen.has(value)) return seen.get(value)
        const output: Record<string, any> = {}
        seen.set(value, output)
        for (const [key, child] of Object.entries(value)) {
            if (child !== undefined) output[key] = removeUndefined(child, seen)
        }
        return output
    }
    return value
}

export function redactSensitiveParams(value: any, seen = new WeakSet<object>()): any {
    if (value === null || typeof value !== 'object') return value
    if (!Array.isArray(value) && !isPlainObject(value)) return value
    if (seen.has(value)) return '[Circular]'
    seen.add(value)
    if (Array.isArray(value)) return value.map((item) => redactSensitiveParams(item, seen))

    const output: Record<string, any> = {}
    for (const [key, child] of Object.entries(value)) {
        output[key] = /token|secret|password|api[_-]?key|authorization|upload_url|download_url|complete_url|signed_url/i.test(key)
            ? '[REDACTED]'
            : redactSensitiveParams(child, seen)
    }
    return output
}

export function normalizeJobStatusResponse(data: unknown): unknown {
    if (!isPlainObject(data)) return data
    const normalized: Record<string, unknown> = { ...data }
    delete normalized.total_spent_usd

    if (isPlainObject(data.billing)) {
        const billing: Record<string, unknown> = { ...data.billing }
        delete billing.total_spent_usd
        if (typeof billing.actual_cost_usd !== 'number') {
            if (typeof billing.final_cost_usd === 'number') billing.actual_cost_usd = billing.final_cost_usd
            else if (typeof billing.cost_usd === 'number') billing.actual_cost_usd = billing.cost_usd
        }
        delete billing.cost_usd
        normalized.billing = billing
        if (typeof normalized.actual_cost_usd !== 'number') {
            normalized.actual_cost_usd = typeof billing.actual_cost_usd === 'number' ? billing.actual_cost_usd : null
        }
    } else if (!Object.prototype.hasOwnProperty.call(normalized, 'actual_cost_usd')) {
        normalized.actual_cost_usd = null
    }
    return normalized
}

function unwrapResponseEnvelope(data: unknown): unknown {
    if (isPlainObject(data) && data.ok === true && Object.prototype.hasOwnProperty.call(data, 'data')) return data.data
    return data
}

function parseApiError(data: unknown, status: number): { code: string; message: string } {
    const fallback = statusError(status)
    if (!isPlainObject(data)) {
        const text = typeof data === 'string' ? data.trim() : ''
        return { code: fallback.code, message: text ? redactErrorMessage(text) : fallback.message }
    }
    const source = isPlainObject(data.error) ? data.error : data
    const code = cleanString(source.code) || fallback.code
    const message = cleanString(source.message) || fallback.message
    return { code, message: redactErrorMessage(message) }
}

function statusError(status: number): { code: string; message: string } {
    if (status === 401) return { code: 'UNAUTHORIZED', message: 'Authentication is required or the API key is invalid.' }
    if (status === 403) return { code: 'FORBIDDEN', message: 'The API key is not authorized for this action.' }
    if (status === 404) return { code: 'NOT_FOUND', message: 'The requested Jungle Grid resource was not found.' }
    if (status === 429) return { code: 'RATE_LIMITED', message: 'Jungle Grid API rate limit exceeded.' }
    if (status >= 500) return { code: 'UPSTREAM_ERROR', message: 'Jungle Grid API is temporarily unavailable.' }
    return { code: 'API_ERROR', message: `Jungle Grid API request failed with status ${status}.` }
}

function requestFailureMessage(error: unknown, method: string, path: string): string {
    const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Network request failed'
    const timeout = /timeout|timed out|ECONNABORTED/i.test(raw)
    return `${method} ${path} failed: ${timeout ? 'Jungle Grid API request timed out' : redactErrorMessage(raw)}`
}

function formatErrorMessage(error: any): string {
    if (Array.isArray(error?.issues)) {
        return error.issues
            .map((issue: any) => {
                const path = Array.isArray(issue.path) && issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
                return `${path}${issue.message}`
            })
            .join('; ')
    }
    if (error instanceof Error) return redactErrorMessage(error.message)
    if (typeof error === 'string') return redactErrorMessage(error)
    return 'Unknown Jungle Grid API error'
}

export function redactErrorMessage(message: string): string {
    return message
        .replace(/https?:\/\/[^\s"'<>]+(?:[?&](?:X-Amz-[^=\s]+|token|signature|sig)=[^\s"'<>]*)+/gi, '[REDACTED_URL]')
        .replace(/jg_[A-Za-z0-9._-]+/g, 'jg_[REDACTED]')
        .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
        .replace(
            /("(?:callback_auth_token|apiKey|api_key|token|secret|password|upload_url|download_url|complete_url)"\s*:\s*")([^"]+)(")/gi,
            '$1[REDACTED]$3'
        )
        .replace(/((?:callback_auth_token|apiKey|api_key|token|secret|password)\s*[:=]?\s*["'])([^"']+)(["'])/gi, '$1[REDACTED]$3')
}

function cleanString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed || undefined
}
