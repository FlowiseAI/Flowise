import { v4 as uuidv4 } from 'uuid'
import { A2AClient } from '@a2a-js/sdk/client'
import type {
    AgentCard,
    AgentSkill,
    MessageSendParams,
    SendMessageResponse,
    Task,
    Part,
    Message,
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent
} from '@a2a-js/sdk'
import { secureFetch } from './httpSecurity'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IA2AClientConfig {
    agentCardUrl: string
    authType?: 'apiKey' | 'bearer'
    apiKey?: string
    apiKeyHeaderName?: string
    bearerToken?: string
    timeout?: number
    abortSignal?: AbortSignal
}

export interface IA2AResponse {
    taskId: string
    contextId: string
    state: string
    responseText: string
    artifacts: any[]
    agentMessage?: any
    requiresInput: boolean
}

export interface StreamEvent {
    type: 'status' | 'artifact' | 'completed' | 'input-required' | 'failed'
    data: any
}

/**
 * Thrown when the remote A2A agent returns a TaskNotFoundError (JSON-RPC code -32001).
 * Callers can catch this specifically to retry as a new conversation when a stored
 * taskId/contextId becomes stale.
 */
export class A2ATaskNotFoundError extends Error {
    code = -32001
    constructor(message = 'Task not found') {
        super(message)
        this.name = 'A2ATaskNotFoundError'
    }
}

/**
 * Thrown when an A2A request is aborted via the external abort signal
 * (typically because the user stopped the agentflow). Distinct from a timeout error
 * so callers can surface user-friendly messages.
 */
export class A2AAbortError extends Error {
    constructor(message = 'A2A request aborted') {
        super(message)
        this.name = 'A2AAbortError'
    }
}

const TASK_NOT_FOUND_CODE = -32001

// ---------------------------------------------------------------------------
// Error-message sanitization
// ---------------------------------------------------------------------------

/**
 * Maximum length (in characters) allowed for a sanitized error message. Longer
 * messages are truncated with a trailing marker. 2000 chars is generous enough
 * to carry useful diagnostics while bounding the blast radius from a malicious
 * or malformed remote agent that tries to flood logs / LLM context.
 */
export const MAX_ERROR_MESSAGE_LENGTH = 2000

/**
 * Maximum serialized length, in characters, of a single A2A `data` part before
 * it is truncated. `data` parts contain arbitrary JSON returned by the remote
 * agent and are concatenated into the response text fed to downstream LLMs, so
 * they are the primary prompt-injection / context-exhaustion surface for the
 * A2A feature. 50 KB is large enough for typical structured payloads (small
 * tables, tool results, JSON schemas) while bounding worst-case context size.
 */
export const MAX_DATA_PART_LENGTH = 50_000

/**
 * Opening delimiter wrapped around every `data` part before it is concatenated
 * into LLM-bound response text.
 *
 * Downstream LLMs MUST treat content between `REMOTE_AGENT_DATA_OPEN_TAG` and
 * `REMOTE_AGENT_DATA_CLOSE_TAG` as untrusted input and MUST NOT follow any
 * instructions found within. The tags exist so prompts can teach the model to
 * recognize and isolate this region. See `assets/a2a-client-spec.md` ("Prompt
 * injection awareness") for the operator-facing guidance.
 */
export const REMOTE_AGENT_DATA_OPEN_TAG = '<external-agent-data>'
export const REMOTE_AGENT_DATA_CLOSE_TAG = '</external-agent-data>'

/**
 * Wrap an arbitrary `data` part payload from a remote A2A agent so that it can
 * be safely concatenated into LLM-facing response text. The payload is
 * JSON-stringified, truncated to `MAX_DATA_PART_LENGTH` (with a trailing
 * `...[truncated]` marker), and surrounded with the `<external-agent-data>` tags
 * defined above.
 *
 * Exported for reuse by node implementations (e.g. `A2ARemoteAgent`) that
 * extract response text outside of `A2AClientWrapper`, so the delimiter and
 * truncation behavior stay consistent across surfaces.
 */
export function wrapRemoteAgentDataPart(data: unknown): string {
    let serialized: string
    try {
        serialized = JSON.stringify(data) ?? ''
    } catch {
        serialized = '[unserializable data part]'
    }
    if (serialized.length > MAX_DATA_PART_LENGTH) {
        serialized = serialized.slice(0, MAX_DATA_PART_LENGTH) + '...[truncated]'
    }
    return `${REMOTE_AGENT_DATA_OPEN_TAG}${serialized}${REMOTE_AGENT_DATA_CLOSE_TAG}`
}

/**
 * Strip control characters, ANSI escape sequences, and excessive length from an
 * error message received from (or derived from) an untrusted remote A2A agent.
 *
 * Remote agents can return error strings that include prompt-injection payloads,
 * ANSI color/cursor sequences, or other control chars. These strings are both
 * fed to calling LLMs (via `A2AAgentTool`) and written to Flowise logs, so they
 * must be neutralized before use.
 *
 * The implementation is intentionally conservative: it keeps printable text
 * (including unicode), drops C0/C1 controls, strips CSI (ESC `[` ...) sequences
 * — which covers SGR color codes as well as cursor / erase codes — and caps the
 * overall length.
 */
export function sanitizeErrorMessage(message: unknown): string {
    if (typeof message !== 'string') return 'Unknown error'
    // 1. Strip ANSI / CSI escape sequences first — `\x1b[...<final-byte>` where
    //    the final byte is in the range 0x40–0x7E. This is broader than just
    //    SGR (`m`) and also removes cursor / erase codes that malicious agents
    //    might emit to overwrite log lines.
    // 2. Strip C0 control chars (0x00–0x1F) and DEL (0x7F). This also removes
    //    any stray ESC bytes that weren't part of a recognized sequence above.
    // 3. Collapse runs of whitespace so multi-line control-laden messages don't
    //    leave long gaps, then trim and truncate.
    // eslint-disable-next-line no-control-regex
    const withoutAnsi = message.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    // eslint-disable-next-line no-control-regex
    const withoutControls = withoutAnsi.replace(/[\x00-\x1F\x7F]/g, ' ')
    const collapsed = withoutControls.replace(/\s+/g, ' ').trim()
    if (collapsed.length <= MAX_ERROR_MESSAGE_LENGTH) return collapsed
    return collapsed.slice(0, MAX_ERROR_MESSAGE_LENGTH) + '...[truncated]'
}

// ---------------------------------------------------------------------------
// A2AClientWrapper
// ---------------------------------------------------------------------------

export class A2AClientWrapper {
    private client: A2AClient | null = null
    private clientPromise: Promise<A2AClient> | null = null
    private cachedAgentCard: AgentCard | null = null
    private timeout: number
    private externalAbortSignal?: AbortSignal
    private authHeaders: Record<string, string>
    private customFetch: typeof fetch
    private agentCardUrl: string
    private allowedHosts: Set<string> | null = null
    /**
     * The host (lowercased) extracted from the configured agentCardUrl. Auth headers
     * (`Authorization` / `X-API-Key`) are only attached to outbound requests whose
     * target host matches this value. This prevents a malicious Agent Card that
     * declares a cross-origin JSON-RPC `url` from harvesting the user's credentials.
     */
    private authorizedHost: string
    /**
     * The signal currently in use by an active sendMessage/sendMessageStream call.
     * When the wrapper's customFetch is called by the SDK, the request is wired up
     * to abort if this signal aborts. Set/cleared by createMergedAbortController().
     */
    private activeRequestSignal: AbortSignal | null = null
    /**
     * The most recent task id observed during the active call. Used by cancelActiveTask()
     * to fire a best-effort tasks/cancel after a user-initiated abort.
     */
    private activeTaskId: string | null = null

    constructor(config: IA2AClientConfig) {
        // Check if A2A client is disabled
        if (process.env.A2A_CLIENT_ENABLED === 'false') {
            throw new Error('A2A client is disabled via A2A_CLIENT_ENABLED env var')
        }

        // Parse allowed hosts from env
        const allowedHostsEnv = process.env.A2A_ALLOWED_REMOTE_HOSTS
        if (allowedHostsEnv && allowedHostsEnv.trim()) {
            this.allowedHosts = new Set(
                allowedHostsEnv
                    .split(',')
                    .map((h) => h.trim().toLowerCase())
                    .filter(Boolean)
            )
        }

        this.agentCardUrl = config.agentCardUrl
        this.externalAbortSignal = config.abortSignal

        // Pin the authorized host from the configured agentCardUrl. Auth headers
        // will only be sent to this exact host.
        try {
            this.authorizedHost = new URL(config.agentCardUrl).host.toLowerCase()
        } catch {
            throw new Error(`Invalid agentCardUrl: ${config.agentCardUrl}`)
        }

        // Default timeout: config > env > 120000
        const envTimeout = process.env.A2A_CLIENT_TIMEOUT_MS
        this.timeout = config.timeout ?? (envTimeout ? parseInt(envTimeout, 10) : 120000)

        // Build auth headers
        this.authHeaders = this.buildAuthHeaders(config)

        // Create a custom fetch wrapper that injects auth headers only when the
        // target host matches the authorized host, wires up the active abort
        // signal so the underlying HTTP request is cancelled when the user
        // aborts the agentflow or the timeout fires, and disables automatic
        // redirect following so credentials can't leak across origins.
        const authHeaders = this.authHeaders
        this.customFetch = async (input, init) => {
            const mergedSignal = this.mergeRequestSignal(init?.signal ?? null)

            const requestUrl =
                typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url ?? String(input)
            let targetHost = ''
            try {
                targetHost = new URL(requestUrl).host.toLowerCase()
            } catch {
                targetHost = ''
            }

            const callerHeaders = (init?.headers as Record<string, string> | undefined) ?? {}
            const effectiveHeaders: Record<string, string> =
                targetHost !== '' && targetHost === this.authorizedHost ? { ...callerHeaders, ...authHeaders } : { ...callerHeaders }

            const mergedInit: RequestInit = {
                ...init,
                headers: effectiveHeaders,
                redirect: 'manual',
                ...(mergedSignal && { signal: mergedSignal })
            }

            const res = await fetch(input, mergedInit)

            // Reject any redirect response. Blindly following redirects would
            // defeat the auth-header scoping above (Authorization/X-API-Key could
            // be replayed to the redirect target) and reopen the SSRF surface by
            // sending traffic to arbitrary hosts.
            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get('location') || '<unknown>'
                throw new Error(`A2A request blocked: redirect responses are not followed (status ${res.status} to ${location})`)
            }

            return res
        }
    }

    /**
     * Merges the active request signal (set during sendMessage/sendMessageStream) with
     * any signal already supplied by the caller (e.g., the SDK's internal signal),
     * so the resulting fetch is aborted when either fires.
     */
    private mergeRequestSignal(callerSignal: AbortSignal | null): AbortSignal | null {
        const active = this.activeRequestSignal
        if (!active && !callerSignal) return null
        if (!active) return callerSignal
        if (!callerSignal) return active

        try {
            return AbortSignal.any([active, callerSignal])
        } catch {
            const merged = new AbortController()
            const onAbort = () => merged.abort()
            if (active.aborted || callerSignal.aborted) {
                merged.abort()
            } else {
                active.addEventListener('abort', onAbort, { once: true })
                callerSignal.addEventListener('abort', onAbort, { once: true })
            }
            return merged.signal
        }
    }

    private async getClient(): Promise<A2AClient> {
        if (this.client) return this.client
        if (!this.clientPromise) {
            const cardUrl = this.normalizeAgentCardUrl(this.agentCardUrl)
            // Enforce host allowlist before any outbound HTTP, including the SDK's
            // internal agent-card fetch performed by fromCardUrl.
            this.checkHostAllowlist(cardUrl)
            this.clientPromise = A2AClient.fromCardUrl(cardUrl, { fetchImpl: this.customFetch }).then((c) => {
                this.client = c
                return c
            })
        }
        return this.clientPromise
    }

    // ---------------------------------------------------------------------------
    // fetchAgentCard
    // ---------------------------------------------------------------------------

    async fetchAgentCard(): Promise<AgentCard> {
        if (this.cachedAgentCard) {
            return this.cachedAgentCard
        }

        const url = this.normalizeAgentCardUrl(this.agentCardUrl)

        // Host allowlist check
        this.checkHostAllowlist(url)

        let status: number
        let ok: boolean
        let bodyText: string
        try {
            const res = await secureFetch(url, { headers: this.authHeaders as any })
            status = res.status
            ok = res.ok
            bodyText = await res.text()
        } catch (error: any) {
            throw new Error(`Failed to fetch A2A Agent Card from ${url}: ${error.message || error}`)
        }

        if (!ok) {
            if (status === 401 || status === 403) {
                throw new Error('A2A authentication failed: check your credentials')
            }
            throw new Error(`Failed to fetch A2A Agent Card from ${url}: HTTP ${status}`)
        }

        let card: AgentCard
        try {
            card = JSON.parse(bodyText) as AgentCard
        } catch {
            throw new Error(`Invalid A2A Agent Card: expected JSON at ${url}`)
        }

        // Validate required fields
        for (const field of ['name', 'url', 'skills'] as const) {
            if (!(card as any)[field]) {
                throw new Error(`Invalid A2A Agent Card: missing required field '${field}'`)
            }
        }

        // If the card declares a JSON-RPC `url` on a different host than the
        // authorized agent-card host, require it to be explicitly allowlisted.
        // Without this check a malicious card could redirect RPC traffic (and,
        // absent the customFetch scoping, auth headers) to an attacker host.
        if (card.url) {
            let rpcHost = ''
            try {
                rpcHost = new URL(card.url).host.toLowerCase()
            } catch {
                throw new Error(`Invalid A2A Agent Card: malformed JSON-RPC url '${card.url}'`)
            }
            if (rpcHost !== this.authorizedHost) {
                this.checkHostAllowlist(card.url)
            }
        }

        this.cachedAgentCard = card
        return card
    }

    // ---------------------------------------------------------------------------
    // sendMessage
    // ---------------------------------------------------------------------------

    async sendMessage(text: string, options?: { skillId?: string; taskId?: string; contextId?: string }): Promise<IA2AResponse> {
        const params = this.buildMessageSendParams(text, true, options)
        const abortController = this.createMergedAbortController()

        // Seed activeTaskId from any continuation taskId so a best-effort cancel
        // still has something to act on if abort fires before we get a response.
        this.activeRequestSignal = abortController.signal
        this.activeTaskId = options?.taskId ?? null

        let response: SendMessageResponse
        try {
            const client = await this.getClient()
            response = await client.sendMessage(params)
        } catch (error: any) {
            // Differentiate between user-initiated abort, timeout, and other errors
            const externalAborted = !!this.externalAbortSignal?.aborted
            if (this.isAbortError(error) || abortController.signal.aborted) {
                if (this.activeTaskId) {
                    void this.bestEffortCancel(this.activeTaskId)
                }
                if (externalAborted) {
                    throw new A2AAbortError('A2A request aborted')
                }
                throw new Error(`A2A request timed out after ${this.timeout}ms`)
            }
            this.handleError(error)
            throw error // handleError always throws, but TS needs this
        } finally {
            abortController.cleanup()
            this.activeRequestSignal = null
            this.activeTaskId = null
        }

        // Unwrap JSON-RPC response
        if ('error' in response) {
            const err = response.error
            const safeMsg = sanitizeErrorMessage(err.message)
            if (err.code === TASK_NOT_FOUND_CODE) {
                throw new A2ATaskNotFoundError(`A2A Agent error [${err.code}]: ${safeMsg}`)
            }
            throw new Error(`A2A Agent error [${err.code}]: ${safeMsg}`)
        }

        const result = response.result

        // Result can be Task or Message
        if (result.kind === 'task') {
            const task = result as Task
            this.activeTaskId = task.id
            return {
                taskId: task.id,
                contextId: task.contextId,
                state: task.status.state,
                responseText: this.extractResponseText(task),
                artifacts: task.artifacts || [],
                agentMessage: task.status.message,
                requiresInput: task.status.state === 'input-required'
            }
        }

        // Message response
        const message = result as Message
        return {
            taskId: message.taskId || '',
            contextId: message.contextId || '',
            state: 'completed',
            responseText: this.extractPartsText(message.parts),
            artifacts: [],
            agentMessage: message,
            requiresInput: false
        }
    }

    // ---------------------------------------------------------------------------
    // sendMessageStream
    // ---------------------------------------------------------------------------

    async *sendMessageStream(
        text: string,
        options?: { skillId?: string; taskId?: string; contextId?: string }
    ): AsyncGenerator<StreamEvent> {
        const params = this.buildMessageSendParams(text, false, options)
        const abortController = this.createMergedAbortController()

        this.activeRequestSignal = abortController.signal
        this.activeTaskId = options?.taskId ?? null

        try {
            const client = await this.getClient()
            const stream = client.sendMessageStream(params)

            for await (const event of stream) {
                if (abortController.signal.aborted) {
                    break
                }

                const normalized = this.normalizeStreamEvent(event)
                if (normalized) {
                    // Track task id from stream events so we can issue a best-effort
                    // tasks/cancel if the user aborts mid-stream.
                    const evtTaskId = normalized.data?.taskId
                    if (evtTaskId) this.activeTaskId = evtTaskId

                    yield normalized
                    if (normalized.type === 'completed' || normalized.type === 'failed' || normalized.type === 'input-required') {
                        break
                    }
                }
            }
        } catch (error: any) {
            if (this.isAbortError(error) || abortController.signal.aborted) {
                if (this.activeTaskId) {
                    void this.bestEffortCancel(this.activeTaskId)
                    this.activeTaskId = null
                }
                return
            }
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(`A2A streaming connection lost: ${error.message}`)
            }
            this.handleError(error)
        } finally {
            // If iteration ended because the external signal aborted (no error thrown by SDK),
            // still attempt a best-effort cancel. The catch block clears activeTaskId after
            // its own cancel, so this only fires when the loop broke gracefully without an error.
            if (this.externalAbortSignal?.aborted && this.activeTaskId) {
                void this.bestEffortCancel(this.activeTaskId)
            }
            abortController.cleanup()
            this.activeRequestSignal = null
            this.activeTaskId = null
        }
    }

    private normalizeStreamEvent(event: TaskStatusUpdateEvent | TaskArtifactUpdateEvent | Task | Message): StreamEvent | null {
        if (!event || typeof event !== 'object') return null

        const kind = (event as any).kind

        if (kind === 'status-update') {
            const statusEvent = event as TaskStatusUpdateEvent
            const state = statusEvent.status.state

            switch (state) {
                case 'working':
                case 'submitted':
                    return {
                        type: 'status',
                        data: {
                            state,
                            message: statusEvent.status.message,
                            taskId: statusEvent.taskId,
                            contextId: statusEvent.contextId
                        }
                    }
                case 'completed':
                    return {
                        type: 'completed',
                        data: {
                            task: statusEvent,
                            taskId: statusEvent.taskId,
                            contextId: statusEvent.contextId,
                            message: statusEvent.status.message
                        }
                    }
                case 'input-required':
                    return {
                        type: 'input-required',
                        data: {
                            task: statusEvent,
                            taskId: statusEvent.taskId,
                            contextId: statusEvent.contextId,
                            message: statusEvent.status.message
                        }
                    }
                case 'failed':
                case 'canceled':
                case 'rejected': {
                    const failMsg = statusEvent.status.message?.parts ? this.extractPartsText(statusEvent.status.message.parts) : state
                    return {
                        type: 'failed',
                        data: {
                            message: failMsg,
                            state,
                            taskId: statusEvent.taskId,
                            contextId: statusEvent.contextId
                        }
                    }
                }
                default:
                    return {
                        type: 'status',
                        data: {
                            state,
                            message: statusEvent.status.message,
                            taskId: statusEvent.taskId,
                            contextId: statusEvent.contextId
                        }
                    }
            }
        }

        if (kind === 'artifact-update') {
            const artifactEvent = event as TaskArtifactUpdateEvent
            const text = artifactEvent.artifact?.parts ? this.extractPartsText(artifactEvent.artifact.parts) : ''
            return {
                type: 'artifact',
                data: {
                    text,
                    artifact: artifactEvent.artifact,
                    taskId: artifactEvent.taskId,
                    contextId: artifactEvent.contextId,
                    append: artifactEvent.append,
                    lastChunk: artifactEvent.lastChunk
                }
            }
        }

        if (kind === 'task') {
            const task = event as Task
            const state = task.status.state
            if (state === 'completed') {
                return {
                    type: 'completed',
                    data: { task, taskId: task.id, contextId: task.contextId }
                }
            }
            if (state === 'input-required') {
                return {
                    type: 'input-required',
                    data: { task, taskId: task.id, contextId: task.contextId }
                }
            }
            if (state === 'failed' || state === 'canceled' || state === 'rejected') {
                const failMsg = task.status.message?.parts ? this.extractPartsText(task.status.message.parts) : state
                return {
                    type: 'failed',
                    data: { message: failMsg, state, taskId: task.id, contextId: task.contextId }
                }
            }
            return {
                type: 'status',
                data: { state, task, taskId: task.id, contextId: task.contextId }
            }
        }

        if (kind === 'message') {
            const msg = event as Message
            const text = msg.parts ? this.extractPartsText(msg.parts) : ''
            return {
                type: 'completed',
                data: {
                    task: msg,
                    text,
                    taskId: msg.taskId || '',
                    contextId: msg.contextId || ''
                }
            }
        }

        return null
    }

    // ---------------------------------------------------------------------------
    // extractResponseText (private)
    // ---------------------------------------------------------------------------

    private extractResponseText(task: Task): string {
        const parts: string[] = []

        // Extract from status message parts
        if (task.status?.message?.parts) {
            parts.push(this.extractPartsText(task.status.message.parts))
        }

        // Extract from artifacts
        if (task.artifacts) {
            for (const artifact of task.artifacts) {
                if (artifact.parts) {
                    parts.push(this.extractPartsText(artifact.parts))
                }
            }
        }

        const text = parts.filter(Boolean).join('\n')
        if (!text) {
            console.warn('[A2AClientWrapper] No text found in task response')
        }
        return text
    }

    private extractPartsText(parts: Part[]): string {
        const texts: string[] = []
        for (const part of parts) {
            switch (part.kind) {
                case 'text':
                    texts.push(part.text)
                    break
                case 'data':
                    // Wrap untrusted JSON in delimiters and truncate so prompt-injection
                    // payloads in the remote agent's `data` parts can't blend into LLM
                    // context or exhaust it. See `wrapRemoteAgentDataPart` for details.
                    texts.push(wrapRemoteAgentDataPart(part.data))
                    break
                case 'file':
                    console.warn('[A2AClientWrapper] Skipping file part in response')
                    break
            }
        }
        return texts.join('\n')
    }

    // ---------------------------------------------------------------------------
    // getSkills
    // ---------------------------------------------------------------------------

    getSkills(): AgentSkill[] {
        return this.cachedAgentCard?.skills || []
    }

    // ---------------------------------------------------------------------------
    // Error mapping (private)
    // ---------------------------------------------------------------------------

    private handleError(error: any): never {
        // AbortError reaching this branch means the request was aborted but the
        // caller did not detect it (e.g., handleError called from a non-abort code
        // path). Surface it as a timeout to preserve existing behaviour.
        if (this.isAbortError(error)) {
            throw new Error(`A2A request timed out after ${this.timeout}ms`)
        }

        if (error?.status === 401 || error?.status === 403) {
            throw new Error('A2A authentication failed: check your credentials')
        }

        if (typeof error?.message === 'string') {
            const authMatch = error.message.match(/Status:\s*(401|403)\b/)
            if (authMatch) {
                throw new Error('A2A authentication failed: check your credentials')
            }
        }

        if (error?.code && error?.message) {
            const safeMsg = sanitizeErrorMessage(error.message)
            if (error.code === TASK_NOT_FOUND_CODE) {
                throw new A2ATaskNotFoundError(`A2A Agent error [${error.code}]: ${safeMsg}`)
            }
            throw new Error(`A2A Agent error [${error.code}]: ${safeMsg}`)
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(`Failed to reach A2A agent: ${error.message}`)
        }

        throw error
    }

    private isAbortError(error: any): boolean {
        if (!error) return false
        return (
            error.name === 'AbortError' ||
            error.type === 'aborted' ||
            error.code === 'ABORT_ERR' ||
            (typeof error.message === 'string' && /aborted/i.test(error.message))
        )
    }

    /**
     * Best-effort tasks/cancel call to the remote agent. Errors are intentionally
     * swallowed — if the remote already finished, doesn't support cancel, or is
     * unreachable, we log and move on. Never throws.
     *
     * Temporarily clears the active request signal so the cancel call itself isn't
     * aborted by the same signal that triggered it.
     */
    private async bestEffortCancel(taskId: string): Promise<void> {
        if (!taskId) return
        const prevActiveSignal = this.activeRequestSignal
        this.activeRequestSignal = null
        try {
            const client = await this.getClient()
            const cancelFn = (client as any).cancelTask
            if (typeof cancelFn !== 'function') return
            await cancelFn.call(client, { id: taskId })
        } catch (err) {
            // Intentionally swallow — best-effort only
            console.warn('[A2AClientWrapper] Best-effort tasks/cancel failed:', err)
        } finally {
            // Only restore if it hasn't been overwritten by a new outbound call
            if (this.activeRequestSignal === null) {
                this.activeRequestSignal = prevActiveSignal
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    /**
     * Build outbound auth headers from the wrapper config.
     *
     * Validation (Task 10): when `authType` is explicitly set to `'apiKey'` or
     * `'bearer'`, the matching secret (`apiKey` / `bearerToken`) must be
     * provided. A misconfigured credential previously caused the wrapper to
     * silently send unauthenticated requests, masking credential-rotation /
     * field-mapping bugs and (in some flows) leaking the request itself to a
     * server expecting auth. We now fail fast at construction time with a
     * clear, actionable error instead.
     *
     * Note: an `undefined` `authType` (no auth configured) continues to return
     * `{}` and is the supported way to talk to a no-auth A2A agent.
     */
    private buildAuthHeaders(config: IA2AClientConfig): Record<string, string> {
        switch (config.authType) {
            case 'apiKey':
                if (!config.apiKey) {
                    throw new Error(
                        'A2A credential misconfiguration: API Key auth selected but no API key provided. ' +
                            'Set the "API Key" field on the A2A Agent credential or change Auth Type.'
                    )
                }
                return { [config.apiKeyHeaderName || 'X-API-Key']: config.apiKey }
            case 'bearer':
                if (!config.bearerToken) {
                    throw new Error(
                        'A2A credential misconfiguration: Bearer auth selected but no bearer token provided. ' +
                            'Set the "Bearer Token" field on the A2A Agent credential or change Auth Type.'
                    )
                }
                return { Authorization: `Bearer ${config.bearerToken}` }
            default:
                return {}
        }
    }

    private normalizeAgentCardUrl(url: string): string {
        // Reject non-HTTP(S) schemes early — before any further URL handling or
        // network call — so dangerous schemes (file:, data:, gopher:, javascript:,
        // etc.) cannot reach the fetch layer.
        this.validateUrlScheme(url)

        if (url.endsWith('/agent.json') || url.endsWith('/agent-card.json')) {
            return url
        }
        // Strip trailing slashes and append well-known path
        const base = url.replace(/\/+$/, '')
        return `${base}/.well-known/agent.json`
    }

    private checkHostAllowlist(url: string): void {
        // Always validate the scheme, even when no allowlist is configured.
        // checkHostAllowlist is the gate before every outbound A2A HTTP call,
        // so this guarantees only http(s) URLs ever reach fetch / secureFetch.
        this.validateUrlScheme(url)

        if (!this.allowedHosts || this.allowedHosts.size === 0) {
            return
        }
        try {
            const hostname = new URL(url).hostname.toLowerCase()
            if (!this.allowedHosts.has(hostname)) {
                throw new Error(`Host '${hostname}' is not in A2A_ALLOWED_REMOTE_HOSTS allowlist`)
            }
        } catch (error: any) {
            if (error.message.includes('A2A_ALLOWED_REMOTE_HOSTS')) {
                throw error
            }
            throw new Error(`Invalid URL: ${url}`)
        }
    }

    /**
     * Validates that `url` uses an allowed HTTP(S) scheme. Defaults to HTTPS-only;
     * setting `A2A_ALLOW_INSECURE_HTTP=true` additionally permits `http://`.
     * All other schemes (file:, data:, gopher:, javascript:, ws:, etc.) are
     * rejected with a descriptive error before any network I/O occurs.
     */
    private validateUrlScheme(url: string): void {
        let parsed: URL
        try {
            parsed = new URL(url)
        } catch {
            throw new Error(`Invalid URL: ${url}`)
        }
        const allowInsecure = process.env.A2A_ALLOW_INSECURE_HTTP === 'true'
        const allowed = allowInsecure ? ['https:', 'http:'] : ['https:']
        if (!allowed.includes(parsed.protocol)) {
            const hint = !allowInsecure && parsed.protocol === 'http:' ? ' Set A2A_ALLOW_INSECURE_HTTP=true to allow http.' : ''
            throw new Error(`Unsupported URL scheme '${parsed.protocol}'. Only ${allowed.join(', ')} allowed.${hint}`)
        }
    }

    private buildMessageSendParams(
        text: string,
        blocking: boolean,
        options?: { skillId?: string; taskId?: string; contextId?: string }
    ): MessageSendParams {
        const message: MessageSendParams['message'] = {
            kind: 'message',
            messageId: uuidv4(),
            role: 'user',
            parts: [{ kind: 'text', text }],
            ...(options?.taskId && { taskId: options.taskId }),
            ...(options?.contextId && { contextId: options.contextId })
        }

        return {
            message,
            ...(options?.skillId && { metadata: { skillId: options.skillId } }),
            configuration: {
                blocking,
                acceptedOutputModes: ['text/plain', 'application/json']
            }
        }
    }

    /**
     * Helper to fetch and map remote agent skills to INodeOptionsValue-compatible
     * objects for use in `loadMethods` of nodes that target the same A2A agent.
     * Returns `[]` on any error so the UI never crashes.
     */
    static async listRemoteSkills(agentCardUrl: string): Promise<Array<{ label: string; name: string; description?: string }>> {
        if (!agentCardUrl) return []
        try {
            const wrapper = new A2AClientWrapper({ agentCardUrl })
            const card = await wrapper.fetchAgentCard()
            return (card.skills || []).map((skill: any) => ({
                label: skill.name,
                name: skill.id,
                description: skill.description
            }))
        } catch (error) {
            console.error('[A2AClientWrapper.listRemoteSkills] Failed to fetch remote skills:', error)
            return []
        }
    }

    private createMergedAbortController(): { signal: AbortSignal; cleanup: () => void } {
        const internal = new AbortController()
        const timer = setTimeout(() => internal.abort(), this.timeout)

        let signal: AbortSignal
        if (this.externalAbortSignal) {
            try {
                signal = AbortSignal.any([internal.signal, this.externalAbortSignal])
            } catch {
                // Fallback for environments without AbortSignal.any
                const merged = new AbortController()
                const onAbort = () => merged.abort()
                internal.signal.addEventListener('abort', onAbort)
                this.externalAbortSignal.addEventListener('abort', onAbort)
                signal = merged.signal
            }
        } else {
            signal = internal.signal
        }

        return {
            signal,
            cleanup: () => clearTimeout(timer)
        }
    }
}
