import { Buffer } from 'buffer'
import { COCKPIT_SNAPSHOT_SCHEMA_VERSION, CockpitRequest, CockpitSnapshot, createStaticSnapshot } from './snapshot.static'

export const RESUME_BRIDGE_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_RESUME_BRIDGE'
export const RESUME_BRIDGE_TOKEN_ENV = 'BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN'
export const RESUME_BRIDGE_BINDINGS_ENV = 'BEZZTY_FLOWISE_SENTINEL_RESUME_BINDINGS'
export const RESUME_BRIDGE_GATEWAY_ORIGIN = 'http://127.0.0.1:39173'

export type ResumeBridgeErrorCode =
    | 'sentinel_resume_disabled'
    | 'sentinel_resume_binding_invalid'
    | 'sentinel_resume_binding_not_found'
    | 'sentinel_resume_unavailable'
    | 'sentinel_resume_malformed'

type ResumeBinding = Readonly<{
    checkpoint_ref: string
    run_id: string
    sentinel_session_id: string
    expires_at: string
}>

export type ResumeBridgeConfig = Readonly<{
    requested: boolean
    token?: string
    bindings: ResumeBinding[]
    errorCode?: ResumeBridgeErrorCode
}>

type FetchLike = (
    url: string,
    init: {
        method: 'GET'
        headers: Record<string, string>
        signal?: AbortSignal
        redirect: 'manual'
    }
) => Promise<{
    status: number
    headers: {
        get(name: string): string | null
    }
    text(): Promise<string>
}>

type ResumeBridgeOptions = Readonly<{
    config?: ResumeBridgeConfig
    fetchImpl?: FetchLike
    now?: Date
}>

type GatewayResumeBody = Record<string, unknown>

const GATEWAY_RESUME_SCHEMA_VERSION = 'sentinel.gateway.v1'
const RESPONSE_LIMIT_BYTES = 64 * 1024
const FETCH_TIMEOUT_MS = 5000
const RESUME_NEXT_SAFE_ACTIONS = Object.freeze(['accepted_complete', 'review_resume_status'])
const RESUME_RESULT_DISPLAY_STATES = Object.freeze(['accepted_work', 'not_accepted'])
const RESUME_REVIEW_STATES = Object.freeze(['accepted', 'not_reviewed'])

const defaultConfig = readResumeBridgeConfig(process.env)
delete process.env[RESUME_BRIDGE_TOKEN_ENV]

export function resumeBridgeIsRequested(): boolean {
    return defaultConfig.requested
}

export function readResumeBridgeConfig(env: NodeJS.ProcessEnv): ResumeBridgeConfig {
    if (env[RESUME_BRIDGE_FLAG_ENV] !== '1') {
        return { requested: false, bindings: [] }
    }

    const bindings = readBindings(env[RESUME_BRIDGE_BINDINGS_ENV])
    if (!bindings.ok) {
        return { requested: true, bindings: [], errorCode: 'sentinel_resume_binding_invalid' }
    }

    const token = env[RESUME_BRIDGE_TOKEN_ENV]
    if (!isSafeBearerToken(token)) {
        return { requested: true, bindings: bindings.value, errorCode: 'sentinel_resume_unavailable' }
    }

    return { requested: true, token, bindings: bindings.value }
}

export async function createResumeSnapshot(request: CockpitRequest, options: ResumeBridgeOptions = {}): Promise<CockpitSnapshot> {
    const config = options.config || defaultConfig
    if (!config.requested) {
        return createStaticSnapshot(request)
    }

    if (config.errorCode === 'sentinel_resume_binding_invalid') {
        throw resumeBridgeError(503, config.errorCode)
    }
    const binding = findCurrentBinding(config.bindings, request.checkpoint_ref, options.now || new Date())
    if (!binding) {
        throw resumeBridgeError(404, 'sentinel_resume_binding_not_found')
    }
    if (config.errorCode) {
        throw resumeBridgeError(503, config.errorCode)
    }
    if (!config.token) {
        throw resumeBridgeError(503, 'sentinel_resume_unavailable')
    }

    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw resumeBridgeError(503, 'sentinel_resume_unavailable')
    }

    const gatewayResume = await fetchGatewayResume(binding, config.token, runtimeFetch)
    assertGatewayIdentityMatches(gatewayResume, binding)
    assertGatewayResumeDto(gatewayResume)
    const snapshot = projectResumeSnapshot(request, gatewayResume)
    assertDisplaySnapshotSafe(snapshot, binding, config.token)
    return snapshot
}

function readBindings(raw: unknown): { ok: true; value: ResumeBinding[] } | { ok: false } {
    if (typeof raw !== 'string' || !raw.trim()) {
        return { ok: false }
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return { ok: false }
    }
    if (!Array.isArray(parsed)) {
        return { ok: false }
    }

    const seen = new Set<string>()
    const bindings: ResumeBinding[] = []
    for (const entry of parsed) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return { ok: false }
        }
        const candidate = entry as Record<string, unknown>
        if (
            !isSafeRef(candidate.checkpoint_ref) ||
            !isSafeRunId(candidate.run_id) ||
            !isSafeInternalId(candidate.sentinel_session_id) ||
            typeof candidate.expires_at !== 'string' ||
            Number.isNaN(Date.parse(candidate.expires_at))
        ) {
            return { ok: false }
        }
        if (seen.has(candidate.checkpoint_ref)) {
            return { ok: false }
        }
        seen.add(candidate.checkpoint_ref)
        bindings.push({
            checkpoint_ref: candidate.checkpoint_ref,
            run_id: candidate.run_id,
            sentinel_session_id: candidate.sentinel_session_id,
            expires_at: candidate.expires_at
        })
    }
    return { ok: true, value: bindings }
}

function findCurrentBinding(bindings: readonly ResumeBinding[], checkpointRef: string | undefined, now: Date): ResumeBinding | null {
    if (!checkpointRef) return null
    const binding = bindings.find((candidate) => candidate.checkpoint_ref === checkpointRef)
    if (!binding) return null
    if (Date.parse(binding.expires_at) <= now.getTime()) return null
    return binding
}

async function fetchGatewayResume(binding: ResumeBinding, token: string, fetchImpl: FetchLike): Promise<GatewayResumeBody> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const response = await fetchImpl(`${RESUME_BRIDGE_GATEWAY_ORIGIN}/v1/runs/${encodeURIComponent(binding.run_id)}/resume`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            },
            redirect: 'manual',
            signal: controller.signal
        })
        const bodyText = await response.text()
        if (Buffer.byteLength(bodyText) > RESPONSE_LIMIT_BYTES) {
            throw resumeBridgeError(502, 'sentinel_resume_malformed')
        }
        if (response.status !== 200) {
            throw resumeBridgeError(response.status === 404 ? 404 : 502, 'sentinel_resume_unavailable')
        }
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            throw resumeBridgeError(502, 'sentinel_resume_malformed')
        }
        let parsed: unknown
        try {
            parsed = JSON.parse(bodyText)
        } catch {
            throw resumeBridgeError(502, 'sentinel_resume_malformed')
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw resumeBridgeError(502, 'sentinel_resume_malformed')
        }
        return parsed as GatewayResumeBody
    } catch (error) {
        if (isResumeBridgeError(error)) {
            throw error
        }
        throw resumeBridgeError(502, 'sentinel_resume_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

function assertGatewayIdentityMatches(body: GatewayResumeBody, binding: ResumeBinding) {
    if (body.run_id !== binding.run_id || body.sentinel_session_id !== binding.sentinel_session_id) {
        throw resumeBridgeError(502, 'sentinel_resume_malformed')
    }
}

function assertGatewayResumeDto(body: GatewayResumeBody) {
    if (body.schema_version !== GATEWAY_RESUME_SCHEMA_VERSION || body.status !== 'ok') {
        throw resumeBridgeError(502, 'sentinel_resume_malformed')
    }
    assertOptionalRecord(body.result_acceptance)
    assertOptionalRecord(body.latest_result_packet)
    assertOptionalRecord(body.latest_shield_review)
}

function assertOptionalRecord(value: unknown) {
    if (value !== undefined && readRecord(value) === null) {
        throw resumeBridgeError(502, 'sentinel_resume_malformed')
    }
}

function projectResumeSnapshot(request: CockpitRequest, body: GatewayResumeBody): CockpitSnapshot {
    const canDisplayAcceptedWork = readBoolean(body.result_acceptance, 'can_display_as_accepted_work')
    const nextSafeAction = readClosedStatusToken(
        body.next_safe_action,
        RESUME_NEXT_SAFE_ACTIONS,
        canDisplayAcceptedWork ? 'accepted_complete' : 'review_resume_status'
    )
    const displayState = readClosedStatusToken(
        readRecord(body.latest_result_packet)?.display_state,
        RESUME_RESULT_DISPLAY_STATES,
        canDisplayAcceptedWork ? 'accepted_work' : 'not_accepted'
    )
    const reviewState = readClosedStatusToken(readRecord(body.latest_shield_review)?.review_state, RESUME_REVIEW_STATES, 'not_reviewed')

    return {
        schema_version: COCKPIT_SNAPSHOT_SCHEMA_VERSION,
        status: 'ok',
        snapshot_ref: 'snapshot_resume_status',
        state: canDisplayAcceptedWork ? 'accepted_complete' : 'resume_status',
        plain_summary: canDisplayAcceptedWork
            ? 'Sentinel reports accepted work is available for display.'
            : 'Sentinel resume status is available for display.',
        next_safe_action: nextSafeAction,
        allowed_user_actions: ['none'],
        blocked_actions: ['This bridge reports status only and cannot perform actions.'],
        checkpoint_ref: request.checkpoint_ref || null,
        evidence_refs: [],
        manual_handoff_preview: null,
        worker_status: 'none',
        result_status: canDisplayAcceptedWork ? displayState : 'not_accepted',
        shield_summary: reviewState,
        accepted_state: canDisplayAcceptedWork ? 'accepted' : 'not_accepted',
        stale_doc_warning: 'none'
    }
}

function readRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
}

function readBoolean(value: unknown, key: string): boolean {
    const record = readRecord(value)
    return record?.[key] === true
}

function readClosedStatusToken(value: unknown, allowedValues: readonly string[], fallback: string): string {
    if (typeof value !== 'string') return fallback
    const trimmed = value.trim().toLowerCase()
    if (!/^[a-z0-9_:-]{1,64}$/.test(trimmed)) return fallback
    if (
        /(?:authorization|bearer|token|secret|approval_challenge|task_packet|result_packet|action_inputs|run_id|sentinel_session_id)/i.test(
            trimmed
        )
    ) {
        return fallback
    }
    return allowedValues.includes(trimmed) ? trimmed : fallback
}

function assertDisplaySnapshotSafe(snapshot: CockpitSnapshot, binding: ResumeBinding, token: string) {
    const serialized = JSON.stringify(snapshot).toLowerCase()
    const blockedFragments = [
        token.toLowerCase(),
        binding.run_id.toLowerCase(),
        binding.sentinel_session_id.toLowerCase(),
        'approval_challenge',
        'action_inputs',
        'decision_id',
        'approval_id',
        'task_id',
        'result_id',
        'shield_review_id',
        'task_packet',
        'result_packet',
        'evidence_manifest'
    ]
    if (blockedFragments.some((fragment) => fragment && serialized.includes(fragment))) {
        throw resumeBridgeError(502, 'sentinel_resume_malformed')
    }
}

function isSafeBearerToken(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 24 && value.length <= 512 && /^[\x21-\x7E]+$/.test(value)
}

function isSafeRef(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 1 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
}

function isSafeRunId(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 5 && value.length <= 128 && /^run_[A-Za-z0-9._:-]+$/.test(value)
}

function isSafeInternalId(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 1 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
}

function resumeBridgeError(statusCode: number, code: ResumeBridgeErrorCode) {
    const error = new Error(code) as Error & { statusCode: number; code: ResumeBridgeErrorCode }
    error.statusCode = statusCode
    error.code = code
    return error
}

function isResumeBridgeError(error: unknown): error is Error & { statusCode: number; code: ResumeBridgeErrorCode } {
    const maybe = error as { statusCode?: unknown; code?: unknown }
    return typeof maybe?.statusCode === 'number' && typeof maybe?.code === 'string' && maybe.code.startsWith('sentinel_resume_')
}
