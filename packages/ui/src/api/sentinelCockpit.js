import { baseURL } from '@/store/constant'

export const COCKPIT_SNAPSHOT_PATH = '/sentinel-cockpit/v1/snapshot'
export const COCKPIT_PLAN_DECISION_PATH = '/sentinel-cockpit/v1/plan-decision'
export const COCKPIT_MANUAL_WORKER_PACKET_PATH = '/sentinel-cockpit/v1/manual-worker-packet'
export const COCKPIT_RESULT_REVIEW_PATH = '/sentinel-cockpit/v1/result-review'
export const SNAPSHOT_SCHEMA_VERSION = 'sentinel.cockpit_bridge.snapshot.v1'
export const PLAN_SESSION_SCHEMA_VERSION = 'sentinel.cockpit_bridge.plan_session.v1'
export const RESUME_REQUEST_KIND = 'resume'
export const GOAL_REQUEST_KIND = 'goal'
export const PLAN_DECISION_REQUEST_KIND = 'plan_decision'
export const MANUAL_PACKET_REQUEST_KIND = 'manual_worker_packet'
export const RESULT_REVIEW_REQUEST_KIND = 'result_review'
export const REQUEST_BODY_KEYS = Object.freeze(['request_kind', 'checkpoint_ref', 'displayed_prompt_ref', 'client_nonce'])
export const GOAL_REQUEST_BODY_KEYS = Object.freeze(['request_kind', 'plain_goal', 'client_nonce'])
export const PLAN_DECISION_BODY_KEYS = Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce', 'decision'])
export const PLAN_DECISION_REVISE_BODY_KEYS = Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce', 'decision', 'revision_text'])
export const MANUAL_PACKET_BODY_KEYS = Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce'])
export const RESULT_REVIEW_BODY_KEYS = Object.freeze([
    'request_kind',
    'cockpit_ref',
    'client_nonce',
    'result_text',
    'review_only_confirmation'
])
export const SNAPSHOT_KEYS = Object.freeze([
    'schema_version',
    'status',
    'snapshot_ref',
    'state',
    'plain_summary',
    'next_safe_action',
    'allowed_user_actions',
    'blocked_actions',
    'checkpoint_ref',
    'evidence_refs',
    'manual_handoff_preview',
    'worker_status',
    'result_status',
    'shield_summary',
    'accepted_state',
    'stale_doc_warning'
])
export const PLAN_SESSION_KEYS = Object.freeze([
    'schema_version',
    'status',
    'state',
    'plain_summary',
    'next_safe_action',
    'allowed_user_actions',
    'blocked_actions',
    'cockpit_ref',
    'plan_card',
    'safe_error'
])
const ROUTE_CARD_SCHEMA_VERSION = 'sentinel.qvc.route_card.v1'
const ROUTE_CARD_CATEGORIES = Object.freeze([
    'planning',
    'review',
    'audit',
    'debug_diagnose',
    'manual_coding_work',
    'result_review',
    'policy_help',
    'unclear',
    'blocked_unsafe'
])
const ROUTE_CARD_FORBIDDEN_TEXT =
    /run_[a-z0-9._:-]*|sentinel_session|session_id|decision_id|approval_id|approval_challenge|approval_challenge_hash|plan_id|task_id|task_packet|result_packet|evidence_manifest|copyable_worker_prompt|gateway|bearer|authorization|token|client_nonce|cockpit_ref|sha256:/i
const IDE_PREVIEW_KEYS = Object.freeze([
    'status_label',
    'workflow_label',
    'persona_label',
    'skill_label',
    'summary',
    'what_can_happen_next',
    'what_will_not_happen',
    'approval_copy',
    'expires_at_label'
])
const IDE_PREVIEW_FIELD_LENGTHS = Object.freeze({
    status_label: 80,
    workflow_label: 80,
    persona_label: 80,
    skill_label: 80,
    summary: 220,
    what_can_happen_next: 260,
    what_will_not_happen: 260,
    approval_copy: 160,
    expires_at_label: 80
})
const IDE_PREVIEW_FORBIDDEN_TEXT =
    /run_[a-z0-9._:-]*|sentinel_session|session_id|decision_id|approval_id|approval_challenge|approval_challenge_hash|plan_id|task_id|task_packet|result_packet|evidence_manifest|copyable_worker_prompt|gateway|bearer|authorization|token|client_nonce|cockpit_ref|sha256:|127\.0\.0\.1|localhost|:39173|provider|model|confidence|selected\s+worker|active\s+agent|agent\s+started|running\s+task|queued|launched|executing|tool\s+call|command\s*[:=]|action_inputs/i
export const CLOSED_ERROR_CODES = Object.freeze([
    'sentinel_classify_unavailable',
    'sentinel_classify_malformed',
    'sentinel_resume_disabled',
    'sentinel_resume_binding_invalid',
    'sentinel_resume_binding_not_found',
    'sentinel_resume_unavailable',
    'sentinel_resume_malformed',
    'sentinel_resume_display_blocked',
    'invalid_request',
    'invalid_snapshot',
    'method_not_allowed',
    'not_found',
    'preflight_denied',
    'header_denied',
    'unsupported_media_type',
    'unsupported_content_encoding',
    'body_too_large',
    'feature_disabled',
    'plan_session_not_found',
    'plan_session_expired',
    'plan_session_consumed',
    'plan_session_owner_mismatch',
    'plan_session_nonce_mismatch',
    'plan_session_state_mismatch',
    'manual_packet_invalid_input',
    'manual_packet_not_found',
    'manual_packet_expired',
    'manual_packet_consumed',
    'manual_packet_nonce_mismatch',
    'manual_packet_state_mismatch',
    'result_review_invalid_input',
    'result_review_not_found',
    'result_review_expired',
    'result_review_consumed',
    'result_review_nonce_mismatch',
    'result_review_state_mismatch',
    'plan_decision_invalid_input',
    'gateway_unavailable',
    'gateway_rejected',
    'internal_error'
])

const RESUME_CALLER_INPUT_KEYS = Object.freeze(['checkpointRef', 'displayedPromptRef', 'clientNonce'])
const GOAL_CALLER_INPUT_KEYS = Object.freeze(['plainGoal', 'clientNonce'])
const PLAN_DECISION_CALLER_INPUT_KEYS = Object.freeze(['cockpitRef', 'clientNonce', 'decision', 'revisionText'])
const MANUAL_PACKET_CALLER_INPUT_KEYS = Object.freeze(['cockpitRef', 'clientNonce'])
const RESULT_REVIEW_CALLER_INPUT_KEYS = Object.freeze(['cockpitRef', 'clientNonce', 'resultText', 'reviewOnlyConfirmation'])
const PLAN_DECISIONS = Object.freeze(['approve_plan', 'revise_plan', 'stop'])
const FORBIDDEN_CALLER_KEYS = Object.freeze([
    'run_id',
    'runId',
    'sentinel_session_id',
    'sentinelSessionId',
    'token',
    'auth',
    'authorization',
    'cookie',
    'proxy_authorization',
    'proxyAuthorization',
    'action_inputs',
    'actionInputs',
    'approval_challenge',
    'approvalChallenge',
    'approval_challenge_hash',
    'approvalChallengeHash',
    'decision_id',
    'decisionId',
    'approval_id',
    'approvalId',
    'plan_id',
    'planId',
    'task_id',
    'taskId',
    'task_packet_hash',
    'taskPacketHash',
    'task_packet',
    'taskPacket',
    'copyable_worker_prompt',
    'copyableWorkerPrompt',
    'result_packet',
    'resultPacket',
    'result_id',
    'resultId',
    'evidence_manifest',
    'evidenceManifest',
    'gateway_url',
    'gatewayUrl',
    'gateway_origin',
    'gatewayOrigin',
    'gateway_host',
    'gatewayHost',
    'worker_type',
    'workerType',
    'command',
    'tool',
    'mcp',
    'shell',
    'path',
    'file',
    'commit',
    'publish',
    'deploy',
    'host',
    'origin',
    'url'
])
const CLOSED_ERROR_CODE_SET = new Set(CLOSED_ERROR_CODES)

export class SentinelCockpitError extends Error {
    constructor(code, status) {
        super(`Sentinel cockpit request failed: ${code}`)
        this.name = 'SentinelCockpitError'
        this.code = code
        this.status = status
    }
}

export async function requestResumeSnapshot(input = {}, options = {}) {
    validateCallerInput(input, RESUME_CALLER_INPUT_KEYS)
    return requestSnapshot(buildResumeBody(input), options)
}

export async function requestGoalSnapshot(input = {}, options = {}) {
    validateCallerInput(input, GOAL_CALLER_INPUT_KEYS)
    return requestSnapshot(buildGoalBody(input), options, { allowIdePreview: true })
}

export async function requestPlanDecision(input = {}, options = {}) {
    validateCallerInput(input, PLAN_DECISION_CALLER_INPUT_KEYS)
    return requestPlanSession(buildPlanDecisionBody(input), options)
}

export async function requestManualWorkerPacket(input = {}, options = {}) {
    validateCallerInput(input, MANUAL_PACKET_CALLER_INPUT_KEYS)
    return requestJson(buildManualWorkerPacketUrl(), buildManualWorkerPacketBody(input), options, readPlanSessionResponse)
}

export async function requestResultReview(input = {}, options = {}) {
    validateCallerInput(input, RESULT_REVIEW_CALLER_INPUT_KEYS)
    return requestJson(buildResultReviewUrl(), buildResultReviewBody(input), options, readPlanSessionResponse)
}

async function requestSnapshot(body, options = {}, responseOptions = {}) {
    return requestJson(buildSnapshotUrl(), body, options, (response) => readSnapshotResponse(response, responseOptions))
}

async function requestPlanSession(body, options = {}) {
    return requestJson(buildPlanDecisionUrl(), body, options, readPlanSessionResponse)
}

async function requestJson(url, body, options = {}, responseReader) {
    const fetchImpl = options.fetchImpl || globalThis.fetch
    if (typeof fetchImpl !== 'function') {
        throw new SentinelCockpitError('sentinel_resume_unavailable')
    }

    const controller = new AbortController()
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 5000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetchImpl(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
            signal: controller.signal
        })

        return await responseReader(response)
    } catch (error) {
        if (error instanceof SentinelCockpitError) throw error
        throw new SentinelCockpitError('sentinel_resume_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

export function buildSnapshotUrl() {
    return `${String(baseURL).replace(/\/+$/, '')}${COCKPIT_SNAPSHOT_PATH}`
}

export function buildPlanDecisionUrl() {
    return `${String(baseURL).replace(/\/+$/, '')}${COCKPIT_PLAN_DECISION_PATH}`
}

export function buildManualWorkerPacketUrl() {
    return `${String(baseURL).replace(/\/+$/, '')}${COCKPIT_MANUAL_WORKER_PACKET_PATH}`
}

export function buildResultReviewUrl() {
    return `${String(baseURL).replace(/\/+$/, '')}${COCKPIT_RESULT_REVIEW_PATH}`
}

export function buildResumeBody(input = {}) {
    const body = { request_kind: RESUME_REQUEST_KIND }
    const checkpointRef = readOptionalString(input.checkpointRef)
    const displayedPromptRef = readOptionalString(input.displayedPromptRef)
    const clientNonce = readOptionalString(input.clientNonce)
    if (checkpointRef !== undefined) body.checkpoint_ref = checkpointRef
    if (displayedPromptRef !== undefined) body.displayed_prompt_ref = displayedPromptRef
    if (clientNonce !== undefined) body.client_nonce = clientNonce
    return body
}

export function buildGoalBody(input = {}) {
    const body = { request_kind: GOAL_REQUEST_KIND }
    body.plain_goal = readRequiredString(input.plainGoal)
    const clientNonce = readOptionalString(input.clientNonce)
    if (clientNonce !== undefined) body.client_nonce = clientNonce
    return body
}

export function buildPlanDecisionBody(input = {}) {
    const decision = readRequiredString(input.decision)
    if (!PLAN_DECISIONS.includes(decision)) throw new SentinelCockpitError('invalid_request')
    const body = {
        request_kind: PLAN_DECISION_REQUEST_KIND,
        cockpit_ref: readRequiredString(input.cockpitRef),
        client_nonce: readRequiredString(input.clientNonce),
        decision
    }
    if (decision === 'revise_plan') {
        body.revision_text = readRequiredString(input.revisionText)
    } else if (input.revisionText !== undefined) {
        throw new SentinelCockpitError('invalid_request')
    }
    return body
}

export function buildManualWorkerPacketBody(input = {}) {
    return {
        request_kind: MANUAL_PACKET_REQUEST_KIND,
        cockpit_ref: readRequiredString(input.cockpitRef),
        client_nonce: readRequiredString(input.clientNonce)
    }
}

export function buildResultReviewBody(input = {}) {
    if (input.reviewOnlyConfirmation !== true) throw new SentinelCockpitError('invalid_request')
    return {
        request_kind: RESULT_REVIEW_REQUEST_KIND,
        cockpit_ref: readRequiredString(input.cockpitRef),
        client_nonce: readRequiredString(input.clientNonce),
        result_text: readRequiredString(input.resultText),
        review_only_confirmation: true
    }
}

function validateCallerInput(input, allowedKeys) {
    if (!isPlainRecord(input)) {
        throw new SentinelCockpitError('invalid_request')
    }

    for (const key of Object.keys(input)) {
        if (FORBIDDEN_CALLER_KEYS.includes(key) || !allowedKeys.includes(key)) {
            throw new SentinelCockpitError('invalid_request')
        }
    }
}

function readRequiredString(value) {
    const trimmed = readOptionalString(value)
    if (trimmed === undefined) throw new SentinelCockpitError('invalid_request')
    return trimmed
}

function readOptionalString(value) {
    if (value === undefined || value === null) return undefined
    if (typeof value !== 'string') throw new SentinelCockpitError('invalid_request')
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

async function readSnapshotResponse(response, options = {}) {
    if (!response || typeof response.ok !== 'boolean') {
        throw new SentinelCockpitError('sentinel_resume_unavailable')
    }

    let body
    try {
        body = await response.json()
    } catch (_error) {
        throw new SentinelCockpitError('sentinel_resume_malformed', response.status)
    }

    if (!response.ok) {
        throw new SentinelCockpitError(readClosedErrorCode(body), response.status)
    }

    if (body?.schema_version === PLAN_SESSION_SCHEMA_VERSION) {
        return narrowPlanSession(body)
    }
    return narrowSnapshot(body, options)
}

async function readPlanSessionResponse(response) {
    if (!response || typeof response.ok !== 'boolean') {
        throw new SentinelCockpitError('sentinel_resume_unavailable')
    }

    let body
    try {
        body = await response.json()
    } catch (_error) {
        throw new SentinelCockpitError('sentinel_resume_malformed', response.status)
    }

    if (!response.ok) {
        throw new SentinelCockpitError(readClosedErrorCode(body), response.status)
    }

    return narrowPlanSession(body)
}

function narrowSnapshot(body, options = {}) {
    if (!isPlainRecord(body)) {
        throw new SentinelCockpitError('sentinel_resume_malformed')
    }
    if (body.schema_version !== SNAPSHOT_SCHEMA_VERSION || body.status !== 'ok') {
        throw new SentinelCockpitError('sentinel_resume_malformed')
    }
    for (const key of SNAPSHOT_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(body, key)) {
            throw new SentinelCockpitError('sentinel_resume_malformed')
        }
    }
    if (!Array.isArray(body.allowed_user_actions) || body.allowed_user_actions.length !== 1 || body.allowed_user_actions[0] !== 'none') {
        throw new SentinelCockpitError('sentinel_resume_display_blocked')
    }

    const narrowed = Object.fromEntries(SNAPSHOT_KEYS.map((key) => [key, body[key]]))
    const routeCard = narrowRouteCard(body.route_card)
    if (routeCard) narrowed.route_card = routeCard
    if (options.allowIdePreview === true) {
        const idePreview = narrowIdePreview(body.ide_preview)
        if (idePreview) narrowed.ide_preview = idePreview
    }
    return narrowed
}

function narrowPlanSession(body) {
    if (!isPlainRecord(body)) {
        throw new SentinelCockpitError('sentinel_resume_malformed')
    }
    if (body.schema_version !== PLAN_SESSION_SCHEMA_VERSION || body.status !== 'ok') {
        throw new SentinelCockpitError('sentinel_resume_malformed')
    }
    for (const key of PLAN_SESSION_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(body, key)) {
            throw new SentinelCockpitError('sentinel_resume_malformed')
        }
    }
    if (!Array.isArray(body.allowed_user_actions)) {
        throw new SentinelCockpitError('sentinel_resume_display_blocked')
    }
    if (body.state === 'plan_decision_required') {
        if (body.allowed_user_actions.join(',') !== 'approve_plan,revise_plan,stop' || typeof body.cockpit_ref !== 'string') {
            throw new SentinelCockpitError('sentinel_resume_display_blocked')
        }
    } else if (body.state === 'manual_packet_preparation_required') {
        if (body.allowed_user_actions.join(',') !== 'prepare_manual_worker_packet' || typeof body.cockpit_ref !== 'string') {
            throw new SentinelCockpitError('sentinel_resume_display_blocked')
        }
    } else if (body.state === 'result_review_required') {
        if (body.allowed_user_actions.join(',') !== 'submit_result_review' || typeof body.cockpit_ref !== 'string') {
            throw new SentinelCockpitError('sentinel_resume_display_blocked')
        }
    } else if (body.allowed_user_actions.length !== 1 || body.allowed_user_actions[0] !== 'none' || body.cockpit_ref !== null) {
        throw new SentinelCockpitError('sentinel_resume_display_blocked')
    }

    const narrowed = Object.fromEntries(PLAN_SESSION_KEYS.map((key) => [key, body[key]]))
    const routeCard = narrowRouteCard(body.route_card)
    if (routeCard) narrowed.route_card = routeCard
    return narrowed
}

function narrowRouteCard(value) {
    if (!isPlainRecord(value)) return null
    if (value.schema_version !== ROUTE_CARD_SCHEMA_VERSION || !ROUTE_CARD_CATEGORIES.includes(value.category)) return null

    const title = readRouteCardString(value.title, 80)
    const summary = readRouteCardString(value.summary, 220)
    const whatCanHappenNext = readRouteCardString(value.what_can_happen_next, 260)
    const whatWillNotHappen = readRouteCardString(value.what_will_not_happen, 260)
    const clarificationQuestion = value.clarification_question === null ? null : readRouteCardString(value.clarification_question, 220)
    const blockedReason = value.blocked_reason === null ? null : readRouteCardString(value.blocked_reason, 220)

    if (!title || !summary || !whatCanHappenNext || !whatWillNotHappen) return null
    if (value.clarification_question !== null && !clarificationQuestion) return null
    if (value.blocked_reason !== null && !blockedReason) return null

    const routeCard = {
        schema_version: ROUTE_CARD_SCHEMA_VERSION,
        category: value.category,
        title,
        summary,
        what_can_happen_next: whatCanHappenNext,
        what_will_not_happen: whatWillNotHappen,
        needs_clarification: value.needs_clarification === true,
        clarification_question: clarificationQuestion,
        blocked_reason: blockedReason
    }
    return ROUTE_CARD_FORBIDDEN_TEXT.test(JSON.stringify(routeCard)) ? null : routeCard
}

function narrowIdePreview(value) {
    if (!isPlainRecord(value)) return null

    const keys = Object.keys(value)
    if (keys.length !== IDE_PREVIEW_KEYS.length || keys.some((key) => !IDE_PREVIEW_KEYS.includes(key))) return null

    const preview = {}
    for (const key of IDE_PREVIEW_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) return null
        const text = readIdePreviewString(value[key], IDE_PREVIEW_FIELD_LENGTHS[key])
        if (!text) return null
        preview[key] = text
    }

    return IDE_PREVIEW_FORBIDDEN_TEXT.test(JSON.stringify(preview)) ? null : preview
}

function readIdePreviewString(value, maxLength) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, ' ')
    if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/.test(trimmed)) return null
    return trimmed
}

function readRouteCardString(value, maxLength) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, ' ')
    if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/.test(trimmed)) return null
    return trimmed
}

function readClosedErrorCode(body) {
    const candidates = [body?.error?.code, body?.code]
    for (const code of candidates) {
        if (typeof code === 'string' && CLOSED_ERROR_CODE_SET.has(code)) {
            return code
        }
    }
    return 'sentinel_resume_unavailable'
}

function isPlainRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}
