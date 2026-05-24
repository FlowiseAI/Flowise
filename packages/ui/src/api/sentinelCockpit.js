import { baseURL } from '@/store/constant'

export const COCKPIT_SNAPSHOT_PATH = '/sentinel-cockpit/v1/snapshot'
export const COCKPIT_PLAN_DECISION_PATH = '/sentinel-cockpit/v1/plan-decision'
export const COCKPIT_MANUAL_WORKER_PACKET_PATH = '/sentinel-cockpit/v1/manual-worker-packet'
export const COCKPIT_RESULT_REVIEW_PATH = '/sentinel-cockpit/v1/result-review'
export const COCKPIT_IDE_WORK_ACTION_PATH = '/sentinel-cockpit/v1/ide-work-action'
export const COCKPIT_IDE_WORK_STATUS_PATH = '/sentinel-cockpit/v1/ide-work-status'
export const SNAPSHOT_SCHEMA_VERSION = 'sentinel.cockpit_bridge.snapshot.v1'
export const PLAN_SESSION_SCHEMA_VERSION = 'sentinel.cockpit_bridge.plan_session.v1'
export const RESUME_REQUEST_KIND = 'resume'
export const GOAL_REQUEST_KIND = 'goal'
export const PLAN_DECISION_REQUEST_KIND = 'plan_decision'
export const MANUAL_PACKET_REQUEST_KIND = 'manual_worker_packet'
export const RESULT_REVIEW_REQUEST_KIND = 'result_review'
export const IDE_WORK_ACTION_REQUEST_KIND = 'ide_work_action'
export const IDE_WORK_STATUS_REQUEST_KIND = 'ide_work_status'
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
export const IDE_WORK_ACTION_BODY_KEYS = Object.freeze(['request_kind', 'action'])
export const IDE_WORK_STATUS_BODY_KEYS = Object.freeze(['request_kind'])
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
const IDE_WORK_KEYS = Object.freeze([
    'schema_version',
    'status',
    'state',
    'status_label',
    'workflow_label',
    'persona_label',
    'skill_label',
    'short_summary',
    'current_safe_step',
    'what_can_happen_next',
    'what_will_not_happen',
    'approval_available',
    'cancel_available',
    'review_required_note',
    'terminal_note',
    'allowed_user_actions',
    'blocked_actions',
    'patch_review_packet',
    'safe_error'
])
const IDE_WORK_PATCH_REVIEW_PACKET_KEYS = Object.freeze([
    'schema_version',
    'review_mode',
    'packet_retained',
    'review_packet_status',
    'changed_file_count',
    'added_line_count',
    'deleted_line_count',
    'diff_bytes',
    'retention_label'
])
const IDE_WORK_PATCH_MAX_CHANGED_FILES = 3
const IDE_WORK_PATCH_MAX_CHANGED_LINES = 50
const IDE_WORK_PATCH_MAX_DIFF_BYTES = 10 * 1024
const IDE_WORK_PATCH_REVIEW_PACKET_RETENTION_LABEL = 'Retained briefly for review only.'
const IDE_WORK_SCHEMA_VERSIONS = Object.freeze([
    'sentinel.qvc.ide_work_approval.v1',
    'sentinel.qvc.ide_work_progress.v1',
    'sentinel.qvc.ide_work_result_review_required.v1',
    'sentinel.qvc.ide_work_result_patch_review_required.v1'
])
const IDE_WORK_STATES = Object.freeze([
    'disabled',
    'approval_unavailable',
    'approval_pending',
    'starting',
    'mock_in_progress',
    'cancel_requested',
    'cancelled',
    'timed_out',
    'failed_closed',
    'review_required',
    'patch_review_required',
    'expired'
])
const IDE_WORK_ALLOWED_ACTIONS = Object.freeze([
    'approve_mock_backend_work',
    'cancel_mock_backend_work',
    'request_read_only_review',
    'request_patch_proposal',
    'none'
])
const IDE_WORK_FORBIDDEN_TEXT =
    /run_[a-z0-9._:-]*|sentinel_session|session_id|decision_id|approval_id|approval_challenge|approval_challenge_hash|plan_id|task_id|task_packet|result_packet|evidence_manifest|copyable_worker_prompt|gateway|bearer|authorization|token|client_nonce|cockpit_ref|sha256:|127\.0\.0\.1|localhost|:39173|provider|model|confidence|selected\s+worker|active\s+agent|agent\s+started|running\s+task|tool\s+call|command\s*[:=]|action_inputs|adapter|argv|nonce|hash|path|diff|raw\s+output|stdout|stderr|source\s+code|source\s+snippet/i
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
    'ide_work_invalid_input',
    'ide_work_unavailable',
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
const IDE_WORK_ACTION_CALLER_INPUT_KEYS = Object.freeze(['action'])
const IDE_WORK_STATUS_CALLER_INPUT_KEYS = Object.freeze([])
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
const DEFAULT_REQUEST_TIMEOUT_MS = 5000
const IDE_WORK_ACTION_TIMEOUT_MS = 70000

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

export async function requestIdeWorkAction(input = {}, options = {}) {
    validateCallerInput(input, IDE_WORK_ACTION_CALLER_INPUT_KEYS)
    return requestJson(
        buildIdeWorkActionUrl(),
        buildIdeWorkActionBody(input),
        { timeoutMs: IDE_WORK_ACTION_TIMEOUT_MS, ...options },
        readIdeWorkResponse
    )
}

export async function requestIdeWorkStatus(input = {}, options = {}) {
    validateCallerInput(input, IDE_WORK_STATUS_CALLER_INPUT_KEYS)
    return requestJson(buildIdeWorkStatusUrl(), buildIdeWorkStatusBody(input), options, readIdeWorkResponse)
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
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS
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

export function buildIdeWorkActionUrl() {
    return `${String(baseURL).replace(/\/+$/, '')}${COCKPIT_IDE_WORK_ACTION_PATH}`
}

export function buildIdeWorkStatusUrl() {
    return `${String(baseURL).replace(/\/+$/, '')}${COCKPIT_IDE_WORK_STATUS_PATH}`
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

export function buildIdeWorkActionBody(input = {}) {
    validateCallerInput(input, IDE_WORK_ACTION_CALLER_INPUT_KEYS)
    const action = readRequiredString(input.action)
    if (!['approve_mock_backend_work', 'cancel_mock_backend_work', 'request_read_only_review', 'request_patch_proposal'].includes(action)) {
        throw new SentinelCockpitError('invalid_request')
    }
    return {
        request_kind: IDE_WORK_ACTION_REQUEST_KIND,
        action
    }
}

export function buildIdeWorkStatusBody(input = {}) {
    validateCallerInput(input, IDE_WORK_STATUS_CALLER_INPUT_KEYS)
    return {
        request_kind: IDE_WORK_STATUS_REQUEST_KIND
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
        return narrowPlanSession(body, options)
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

async function readIdeWorkResponse(response) {
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
    if (!isPlainRecord(body) || body.schema_version !== 'sentinel.cockpit_bridge.ide_work.v1' || body.status !== 'ok') {
        throw new SentinelCockpitError('sentinel_resume_malformed')
    }
    const ideWork = narrowIdeWork(body.ide_work)
    if (!ideWork || body.safe_error !== null) {
        throw new SentinelCockpitError('sentinel_resume_malformed')
    }
    return {
        schema_version: body.schema_version,
        status: 'ok',
        ide_work: ideWork,
        safe_error: null
    }
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

function narrowPlanSession(body, options = {}) {
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
    if (options.allowIdePreview === true && body.state === 'plan_decision_required') {
        const idePreview = narrowIdePreview(body.ide_preview)
        if (idePreview) narrowed.ide_preview = idePreview
        const ideWork = narrowIdeWork(body.ide_work)
        if (ideWork) narrowed.ide_work = ideWork
    }
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

function narrowIdeWork(value) {
    if (!isPlainRecord(value)) return null

    const keys = Object.keys(value)
    if (keys.length !== IDE_WORK_KEYS.length || keys.some((key) => !IDE_WORK_KEYS.includes(key))) return null
    if (!IDE_WORK_SCHEMA_VERSIONS.includes(value.schema_version) || value.status !== 'ok' || !IDE_WORK_STATES.includes(value.state)) {
        return null
    }
    if (typeof value.approval_available !== 'boolean' || typeof value.cancel_available !== 'boolean') return null
    if (
        !Array.isArray(value.allowed_user_actions) ||
        !value.allowed_user_actions.length ||
        value.allowed_user_actions.some((action) => typeof action !== 'string' || !IDE_WORK_ALLOWED_ACTIONS.includes(action))
    ) {
        return null
    }
    const isPatchReviewRequiredSchema = value.schema_version === 'sentinel.qvc.ide_work_result_patch_review_required.v1'
    const isPatchReviewRequiredState = value.state === 'patch_review_required'
    if (isPatchReviewRequiredSchema !== isPatchReviewRequiredState) return null
    if (
        isPatchReviewRequiredSchema &&
        (value.approval_available !== false ||
            value.cancel_available !== false ||
            value.safe_error !== null ||
            value.allowed_user_actions.length !== 1 ||
            value.allowed_user_actions[0] !== 'none')
    ) {
        return null
    }
    const patchReviewPacket = narrowPatchReviewPacket(value.patch_review_packet, isPatchReviewRequiredSchema)
    if (patchReviewPacket === undefined) return null
    const includesPatchProposalAction = value.allowed_user_actions.includes('request_patch_proposal')
    const isExactPatchProposalAction = value.allowed_user_actions.length === 1 && value.allowed_user_actions[0] === 'request_patch_proposal'
    if (
        includesPatchProposalAction &&
        (!isExactPatchProposalAction ||
            value.schema_version !== 'sentinel.qvc.ide_work_approval.v1' ||
            value.state !== 'approval_pending' ||
            value.approval_available !== true ||
            value.cancel_available !== false ||
            value.safe_error !== null)
    ) {
        return null
    }
    if (!Array.isArray(value.blocked_actions) || !value.blocked_actions.length) return null

    const work = {
        schema_version: value.schema_version,
        status: 'ok',
        state: value.state,
        status_label: readIdePreviewString(value.status_label, 80),
        workflow_label: readIdePreviewString(value.workflow_label, 80),
        persona_label: readIdePreviewString(value.persona_label, 80),
        skill_label: readIdePreviewString(value.skill_label, 80),
        short_summary: readIdePreviewString(value.short_summary, 240),
        current_safe_step: readIdePreviewString(value.current_safe_step, 240),
        what_can_happen_next: readIdePreviewString(value.what_can_happen_next, 260),
        what_will_not_happen: readIdePreviewString(value.what_will_not_happen, 260),
        approval_available: value.approval_available,
        cancel_available: value.cancel_available,
        review_required_note: value.review_required_note === null ? null : readIdePreviewString(value.review_required_note, 180),
        terminal_note: value.terminal_note === null ? null : readIdePreviewString(value.terminal_note, 180),
        allowed_user_actions: [...value.allowed_user_actions],
        blocked_actions: value.blocked_actions.map((action) => readIdePreviewString(action, 180)),
        patch_review_packet: patchReviewPacket,
        safe_error: value.safe_error === null ? null : readIdePreviewString(value.safe_error, 80)
    }
    if (
        !work.status_label ||
        !work.workflow_label ||
        !work.persona_label ||
        !work.skill_label ||
        !work.short_summary ||
        !work.current_safe_step ||
        !work.what_can_happen_next ||
        !work.what_will_not_happen ||
        work.blocked_actions.some((action) => !action)
    ) {
        return null
    }
    return IDE_WORK_FORBIDDEN_TEXT.test(JSON.stringify({ ...work, patch_review_packet: null })) ? null : work
}

function narrowPatchReviewPacket(value, isPatchReviewRequired) {
    if (value === null) return null
    if (!isPatchReviewRequired || !isPlainRecord(value)) return undefined
    const keys = Object.keys(value)
    if (keys.length !== IDE_WORK_PATCH_REVIEW_PACKET_KEYS.length || keys.some((key) => !IDE_WORK_PATCH_REVIEW_PACKET_KEYS.includes(key))) {
        return undefined
    }
    if (
        value.schema_version !== 'sentinel.qvc.ide_work_patch_review_packet.v1' ||
        value.review_mode !== 'metadata_only' ||
        value.packet_retained !== true ||
        value.review_packet_status !== 'metadata_only'
    ) {
        return undefined
    }
    const changedFileCount = readBoundedIdeWorkInteger(value.changed_file_count, 1, IDE_WORK_PATCH_MAX_CHANGED_FILES)
    const addedLineCount = readBoundedIdeWorkInteger(value.added_line_count, 0, IDE_WORK_PATCH_MAX_CHANGED_LINES)
    const deletedLineCount = readBoundedIdeWorkInteger(value.deleted_line_count, 0, IDE_WORK_PATCH_MAX_CHANGED_LINES)
    const diffBytes = readBoundedIdeWorkInteger(value.diff_bytes, 1, IDE_WORK_PATCH_MAX_DIFF_BYTES)
    if (
        changedFileCount === null ||
        addedLineCount === null ||
        deletedLineCount === null ||
        diffBytes === null ||
        value.retention_label !== IDE_WORK_PATCH_REVIEW_PACKET_RETENTION_LABEL
    ) {
        return undefined
    }
    return {
        schema_version: 'sentinel.qvc.ide_work_patch_review_packet.v1',
        review_mode: 'metadata_only',
        packet_retained: true,
        review_packet_status: 'metadata_only',
        changed_file_count: changedFileCount,
        added_line_count: addedLineCount,
        deleted_line_count: deletedLineCount,
        diff_bytes: diffBytes,
        retention_label: IDE_WORK_PATCH_REVIEW_PACKET_RETENTION_LABEL
    }
}

function readBoundedIdeWorkInteger(value, min, max) {
    return Number.isSafeInteger(value) && value >= min && value <= max ? value : null
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
