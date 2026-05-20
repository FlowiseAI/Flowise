import { Buffer } from 'buffer'
import { Request, Response } from 'express'
import * as classifyBridge from './classify.bridge'
import { COCKPIT_ALLOWED_USER_ACTIONS, COCKPIT_SNAPSHOT_SCHEMA_VERSION, CockpitRequest } from './snapshot.static'
import * as resumeBridge from './resume.bridge'
import * as snapshotStatic from './snapshot.static'

export const COCKPIT_ERROR_SCHEMA_VERSION = 'sentinel.cockpit_bridge.error.v1'
export const COCKPIT_ROUTE_PREFIX = '/sentinel-cockpit/v1'
export const COCKPIT_SNAPSHOT_PATH = '/snapshot'
export const COCKPIT_PLAN_DECISION_PATH = '/plan-decision'
export const COCKPIT_MANUAL_WORKER_PACKET_PATH = '/manual-worker-packet'
export const COCKPIT_RESULT_REVIEW_PATH = '/result-review'
export const COCKPIT_BODY_LIMIT_BYTES = 16 * 1024
export const COCKPIT_RESPONSE_LIMIT_BYTES = 64 * 1024
export const FLOWISE_LOCAL_ORIGIN_ENV = 'FLOWISE_LOCAL_ORIGIN'
export const FLOWISE_LOCAL_HOST_ENV = 'FLOWISE_LOCAL_HOST'
export const DEFAULT_FLOWISE_LOCAL_ORIGIN = 'http://127.0.0.1:3000'
export const DEFAULT_FLOWISE_LOCAL_HOST = '127.0.0.1:3000'
export const FLOWISE_LOCAL_ORIGIN = readFlowiseLocalConfig(process.env).origin
export const FLOWISE_LOCAL_HOST = readFlowiseLocalConfig(process.env).host

const REQUEST_KINDS = Object.freeze(['goal', 'choice', 'resume'])
const PLAN_DECISION_REQUEST_KINDS = Object.freeze(['plan_decision'])
const MANUAL_PACKET_REQUEST_KINDS = Object.freeze(['manual_worker_packet'])
const RESULT_REVIEW_REQUEST_KINDS = Object.freeze(['result_review'])
const CHOICES = Object.freeze(['revise', 'stop', 'cancel', 'continue', 'approve_manual_handoff', 'confirm_result_source_status_only'])
const PLAN_DECISIONS = Object.freeze(['approve_plan', 'revise_plan', 'stop'])
const SNAPSHOT_KEYS = Object.freeze([
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
const PLAN_SESSION_KEYS = Object.freeze([
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
const ROUTE_CARD_KEY = 'route_card'
const IDE_PREVIEW_KEY = 'ide_preview'
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
const ROUTE_CARD_KEYS = Object.freeze([
    'schema_version',
    'category',
    'title',
    'summary',
    'what_can_happen_next',
    'what_will_not_happen',
    'needs_clarification',
    'clarification_question',
    'blocked_reason'
])
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
const ROUTE_CARD_FORBIDDEN_FRAGMENTS = Object.freeze([
    'run_',
    'sentinel_session_id',
    'session_id',
    'decision_id',
    'approval_id',
    'plan_id',
    'task_id',
    'task_packet_hash',
    'approval_challenge',
    'approval_challenge_hash',
    'action_inputs',
    'task_packet',
    'copyable_worker_prompt',
    'result_packet',
    'evidence_manifest',
    'gateway',
    'bearer',
    'authorization',
    'token',
    'client_nonce',
    'cockpit_ref',
    'sha256:',
    'dto'
])
const IDE_PREVIEW_FORBIDDEN_FRAGMENTS = Object.freeze([
    ...ROUTE_CARD_FORBIDDEN_FRAGMENTS,
    'schema_version',
    'allowed_user_actions',
    'approval_required',
    'blocked_reason',
    'unsafe_goal',
    'ide_preview_',
    'sentinel.qvc.ide_preview',
    'raw dto',
    'json dto',
    'provider output',
    'worker output',
    'tool trace',
    'confidence',
    'command line',
    'environment variable',
    'source snippet',
    'codex',
    'opencode',
    'hermes',
    'mcp',
    'agentflow',
    'hitl',
    'worker_type',
    'worker_launch',
    'subprocess',
    'shell',
    'command',
    'provider',
    'model',
    'repo-write',
    'commit',
    'publish',
    'deploy',
    '127.0.0.1',
    'localhost',
    ':39173',
    'c:\\',
    '/mnt/'
])
const PLAN_CARD_KEYS = Object.freeze(['plain_title', 'plain_summary', 'plain_steps', 'will_not_do'])
const REQUEST_KEYS_BY_KIND: Record<string, readonly string[]> = Object.freeze({
    goal: Object.freeze(['request_kind', 'plain_goal']),
    choice: Object.freeze(['request_kind', 'choice', 'checkpoint_ref', 'displayed_prompt_ref', 'client_nonce']),
    resume: Object.freeze(['request_kind', 'checkpoint_ref', 'displayed_prompt_ref', 'client_nonce'])
})
const GUARDED_DUPLICATE_HEADERS = Object.freeze([
    'host',
    'origin',
    'referer',
    'content-type',
    'content-length',
    'authorization',
    'cookie',
    'proxy-authorization',
    'transfer-encoding',
    'expect'
])
const FORBIDDEN_REQUEST_FIELDS = Object.freeze([
    'token',
    'secret',
    'auth',
    'authorization',
    'cookie',
    'shell',
    'tool',
    'mcp',
    'worker',
    'callback_url',
    'webhook',
    'runtime_ingest',
    'file',
    'path',
    'command',
    'commit',
    'publish',
    'send',
    'deploy',
    'result_packet',
    'task_packet'
])
const ERROR_MESSAGE = 'The cockpit snapshot request was blocked.'

type ErrorCode =
    | 'method_not_allowed'
    | 'not_found'
    | 'preflight_denied'
    | 'header_denied'
    | 'unsupported_media_type'
    | 'unsupported_content_encoding'
    | 'body_too_large'
    | 'invalid_json'
    | 'invalid_request'
    | 'invalid_snapshot'
    | 'sentinel_classify_unavailable'
    | 'sentinel_classify_malformed'
    | 'sentinel_resume_disabled'
    | 'sentinel_resume_binding_invalid'
    | 'sentinel_resume_binding_not_found'
    | 'sentinel_resume_unavailable'
    | 'sentinel_resume_malformed'
    | 'feature_disabled'
    | 'plan_session_not_found'
    | 'plan_session_expired'
    | 'plan_session_consumed'
    | 'plan_session_owner_mismatch'
    | 'plan_session_nonce_mismatch'
    | 'plan_session_state_mismatch'
    | 'manual_packet_invalid_input'
    | 'manual_packet_not_found'
    | 'manual_packet_expired'
    | 'manual_packet_consumed'
    | 'manual_packet_nonce_mismatch'
    | 'manual_packet_state_mismatch'
    | 'result_review_invalid_input'
    | 'result_review_not_found'
    | 'result_review_expired'
    | 'result_review_consumed'
    | 'result_review_nonce_mismatch'
    | 'result_review_state_mismatch'
    | 'plan_decision_invalid_input'
    | 'gateway_unavailable'
    | 'gateway_rejected'
    | 'internal_error'

type AdmissionResult = Readonly<{
    ok: boolean
    statusCode?: number
    code?: ErrorCode
}>

type FlowiseLocalConfig = Readonly<{
    ok: boolean
    origin: string
    host: string
}>

const okAdmission: AdmissionResult = Object.freeze({ ok: true })

async function handleSnapshot(req: Request, res: Response): Promise<void> {
    try {
        const admission = admitRequest(req)
        if (!admission.ok) {
            sendError(res, admission.statusCode || 400, admission.code || 'invalid_request')
            return
        }

        const body = await readJsonBody(req)
        if (req.path === COCKPIT_PLAN_DECISION_PATH) {
            const planDecisionRequest = validatePlanDecisionRequest(body)
            const planSession = await classifyBridge.createPlanDecisionSession(planDecisionRequest)
            const validatedPlanSession = validatePlanSession(planSession)
            sendJson(res, 200, validatedPlanSession)
            return
        }
        if (req.path === COCKPIT_MANUAL_WORKER_PACKET_PATH) {
            const manualPacketRequest = validateManualPacketRequest(body)
            const planSession = await classifyBridge.createManualPacketSession(manualPacketRequest)
            const validatedPlanSession = validatePlanSession(planSession)
            sendJson(res, 200, validatedPlanSession)
            return
        }
        if (req.path === COCKPIT_RESULT_REVIEW_PATH) {
            const resultReviewRequest = validateResultReviewRequest(body)
            const planSession = await classifyBridge.createResultReviewSession(resultReviewRequest)
            const validatedPlanSession = validatePlanSession(planSession)
            sendJson(res, 200, validatedPlanSession)
            return
        }

        const cockpitRequest = validateCockpitRequest(body)
        const snapshot =
            cockpitRequest.request_kind === 'resume' && resumeBridge.resumeBridgeIsRequested()
                ? await resumeBridge.createResumeSnapshot(cockpitRequest)
                : cockpitRequest.request_kind === 'goal' && classifyBridge.classifyBridgeIsRequested()
                ? await classifyBridge.createClassifySnapshot(cockpitRequest)
                : snapshotStatic.createStaticSnapshot(cockpitRequest)
        if (isPlanSessionResponse(snapshot)) {
            sendJson(res, 200, validatePlanSession(snapshot))
            return
        }

        const validatedSnapshot = validateSnapshot(snapshot, cockpitRequest)
        sendJson(res, 200, validatedSnapshot)
    } catch (error) {
        const statusCode = getErrorStatusCode(error)
        const code = getErrorCode(error)
        sendError(res, statusCode, code)
    }
}

export function admitRequest(req: Request): AdmissionResult {
    if (
        ![COCKPIT_SNAPSHOT_PATH, COCKPIT_PLAN_DECISION_PATH, COCKPIT_MANUAL_WORKER_PACKET_PATH, COCKPIT_RESULT_REVIEW_PATH].includes(
            req.path
        ) ||
        hasQueryString(req)
    ) {
        return { ok: false, statusCode: 404, code: 'not_found' }
    }
    if (req.method === 'OPTIONS') {
        return { ok: false, statusCode: 403, code: 'preflight_denied' }
    }
    if (req.method !== 'POST') {
        return { ok: false, statusCode: 405, code: 'method_not_allowed' }
    }
    if (!rawGuardedHeadersAreSafe(req.rawHeaders || [])) {
        return { ok: false, statusCode: 403, code: 'header_denied' }
    }
    if (!normalizedHeadersAreSafe(req.headers)) {
        return { ok: false, statusCode: 403, code: 'header_denied' }
    }
    if (!isJsonContentType(req.headers['content-type'])) {
        return { ok: false, statusCode: 415, code: 'unsupported_media_type' }
    }
    if (!contentEncodingIsSafe(req.headers['content-encoding'])) {
        return { ok: false, statusCode: 415, code: 'unsupported_content_encoding' }
    }
    return okAdmission
}

export function rawGuardedHeadersAreSafe(rawHeaders: string[]): boolean {
    for (const name of GUARDED_DUPLICATE_HEADERS) {
        if (countRawHeader(rawHeaders, name) > 1) {
            return false
        }
    }
    return true
}

export function validateCockpitRequest(body: unknown): CockpitRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw httpError(400, 'invalid_request')
    }

    const requestBody = body as Record<string, unknown>
    const requestKind = requestBody.request_kind
    if (typeof requestKind !== 'string' || !REQUEST_KINDS.includes(requestKind)) {
        throw httpError(400, 'invalid_request')
    }

    const allowedKeys =
        requestKind === 'goal' && classifyBridge.planDecisionBridgeIsRequested()
            ? Object.freeze(['request_kind', 'plain_goal', 'client_nonce'])
            : REQUEST_KEYS_BY_KIND[requestKind]
    assertExactAllowedKeys(requestBody, allowedKeys)
    rejectForbiddenFields(requestBody)

    const request: Record<string, string> = { request_kind: requestKind }
    if (requestKind === 'goal') {
        request.plain_goal = validateGoalText(requestBody.plain_goal)
    }
    if (requestKind === 'choice') {
        if (typeof requestBody.choice !== 'string' || !CHOICES.includes(requestBody.choice)) {
            throw httpError(400, 'invalid_request')
        }
        request.choice = requestBody.choice
        if (requestBody.checkpoint_ref !== undefined) {
            request.checkpoint_ref = validateRef(requestBody.checkpoint_ref)
        } else if (requestBody.choice !== 'confirm_result_source_status_only') {
            throw httpError(400, 'invalid_request')
        }
    }
    if (requestKind === 'resume') {
        request.checkpoint_ref = validateRef(requestBody.checkpoint_ref)
    }
    if (requestBody.displayed_prompt_ref !== undefined) {
        request.displayed_prompt_ref = validateRef(requestBody.displayed_prompt_ref)
    }
    if (requestBody.client_nonce !== undefined) {
        request.client_nonce = validateClientNonce(
            requestBody.client_nonce,
            requestKind === 'goal' ? 'plan_decision_invalid_input' : 'invalid_request'
        )
    }

    if (requestKind !== 'goal') {
        assertRequestTextSafeWithoutAuthorityRefs(request)
    }
    return request as CockpitRequest
}

export function validatePlanDecisionRequest(body: unknown): classifyBridge.PlanDecisionRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw httpError(400, 'plan_decision_invalid_input')
    }
    const requestBody = body as Record<string, unknown>
    const requestKind = requestBody.request_kind
    if (typeof requestKind !== 'string' || !PLAN_DECISION_REQUEST_KINDS.includes(requestKind)) {
        throw httpError(400, 'plan_decision_invalid_input')
    }

    const decision = requestBody.decision
    const allowedKeys =
        decision === 'revise_plan'
            ? Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce', 'decision', 'revision_text'])
            : Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce', 'decision'])
    assertExactAllowedKeys(requestBody, allowedKeys, 'plan_decision_invalid_input')
    rejectForbiddenFields(requestBody)

    if (typeof decision !== 'string' || !PLAN_DECISIONS.includes(decision)) {
        throw httpError(400, 'plan_decision_invalid_input')
    }

    const request: Record<string, string> = {
        request_kind: 'plan_decision',
        cockpit_ref: validateCockpitRef(requestBody.cockpit_ref),
        client_nonce: validateClientNonce(requestBody.client_nonce, 'plan_decision_invalid_input'),
        decision
    }
    if (decision === 'revise_plan') {
        if (typeof requestBody.revision_text !== 'string') {
            throw httpError(400, 'plan_decision_invalid_input')
        }
        try {
            request.revision_text = validateText(requestBody.revision_text, 2000, false)
        } catch {
            throw httpError(400, 'plan_decision_invalid_input')
        }
    }

    assertRequestTextSafeWithoutAuthorityRefs(request)
    return request as classifyBridge.PlanDecisionRequest
}

export function validateManualPacketRequest(body: unknown): classifyBridge.ManualPacketRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw httpError(400, 'manual_packet_invalid_input')
    }
    const requestBody = body as Record<string, unknown>
    const requestKind = requestBody.request_kind
    if (typeof requestKind !== 'string' || !MANUAL_PACKET_REQUEST_KINDS.includes(requestKind)) {
        throw httpError(400, 'manual_packet_invalid_input')
    }

    assertExactAllowedKeys(requestBody, Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce']), 'manual_packet_invalid_input')
    rejectForbiddenFields(requestBody)

    const request: Record<string, string> = {
        request_kind: 'manual_worker_packet',
        cockpit_ref: validateCockpitRef(requestBody.cockpit_ref, 'manual_packet_invalid_input'),
        client_nonce: validateClientNonce(requestBody.client_nonce, 'manual_packet_invalid_input')
    }

    assertRequestTextSafeWithoutAuthorityRefs(request)
    return request as classifyBridge.ManualPacketRequest
}

export function validateResultReviewRequest(body: unknown): classifyBridge.ResultReviewRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw httpError(400, 'result_review_invalid_input')
    }
    const requestBody = body as Record<string, unknown>
    const requestKind = requestBody.request_kind
    if (typeof requestKind !== 'string' || !RESULT_REVIEW_REQUEST_KINDS.includes(requestKind)) {
        throw httpError(400, 'result_review_invalid_input')
    }

    assertExactAllowedKeys(
        requestBody,
        Object.freeze(['request_kind', 'cockpit_ref', 'client_nonce', 'result_text', 'review_only_confirmation']),
        'result_review_invalid_input'
    )
    rejectForbiddenFields(requestBody)
    if (requestBody.review_only_confirmation !== true) {
        throw httpError(400, 'result_review_invalid_input')
    }

    return {
        request_kind: 'result_review',
        cockpit_ref: validateCockpitRef(requestBody.cockpit_ref, 'result_review_invalid_input'),
        client_nonce: validateClientNonce(requestBody.client_nonce, 'result_review_invalid_input'),
        result_text: validateResultText(requestBody.result_text),
        review_only_confirmation: true
    }
}

function normalizedHeadersAreSafe(headers: Request['headers']): boolean {
    const localConfig = readFlowiseLocalConfig(process.env)
    if (!localConfig.ok) return false
    if (readSafeLocalHost(headers.host) !== localConfig.host) return false
    if (readSafeLocalOrigin(headers.origin)?.origin !== localConfig.origin) return false
    if (headers.referer !== undefined) return false
    if (headers.authorization !== undefined || headers.cookie !== undefined || headers['proxy-authorization'] !== undefined) return false
    if (headers['transfer-encoding'] !== undefined || headers.expect !== undefined) return false
    for (const [name, value] of Object.entries(headers)) {
        if (/(?:token|secret|api[-_]?key|gateway|guard|mcp|worker|callback|webhook|upload|publish|deploy|shell|tool)/i.test(name)) {
            return false
        }
        if (headerValueHasForbiddenText(value)) {
            return false
        }
    }
    const contentLength = headers['content-length']
    if (typeof contentLength === 'string') {
        if (!/^[0-9]+$/.test(contentLength) || Number(contentLength) > COCKPIT_BODY_LIMIT_BYTES) return false
    }
    return true
}

function hasQueryString(req: Request): boolean {
    const originalUrl = typeof req.originalUrl === 'string' ? req.originalUrl : ''
    const expected = `${COCKPIT_ROUTE_PREFIX}${req.path}`
    return originalUrl !== expected
}

function countRawHeader(rawHeaders: string[], targetName: string): number {
    let count = 0
    for (let index = 0; index < rawHeaders.length; index += 2) {
        if (String(rawHeaders[index]).toLowerCase() === targetName) {
            count += 1
        }
    }
    return count
}

function isJsonContentType(contentType: unknown): boolean {
    if (typeof contentType !== 'string') return false
    const parts = contentType.split(';').map((part) => part.trim().toLowerCase())
    return parts[0] === 'application/json' && parts.slice(1).every((part) => part === 'charset=utf-8')
}

function contentEncodingIsSafe(contentEncoding: unknown): boolean {
    return contentEncoding === undefined || contentEncoding === 'identity'
}

function readJsonBody(req: Request): Promise<unknown> {
    const contentLength = req.headers['content-length']
    if (typeof contentLength === 'string' && (!/^[0-9]+$/.test(contentLength) || Number(contentLength) > COCKPIT_BODY_LIMIT_BYTES)) {
        throw httpError(413, 'body_too_large')
    }

    return new Promise((resolve, reject) => {
        let raw = ''
        let size = 0
        let settled = false

        req.setEncoding('utf8')
        req.on('data', (chunk: string) => {
            if (settled) return
            size += Buffer.byteLength(chunk)
            if (size > COCKPIT_BODY_LIMIT_BYTES) {
                settled = true
                reject(httpError(413, 'body_too_large'))
                req.destroy()
                return
            }
            raw += chunk
        })
        req.on('end', () => {
            if (settled) return
            settled = true
            if (!raw) {
                reject(httpError(400, 'invalid_json'))
                return
            }
            try {
                resolve(JSON.parse(raw))
            } catch {
                reject(httpError(400, 'invalid_json'))
            }
        })
        req.on('error', () => {
            if (!settled) {
                settled = true
                reject(httpError(400, 'invalid_json'))
            }
        })
        req.on('aborted', () => {
            if (!settled) {
                settled = true
                reject(httpError(400, 'invalid_json'))
            }
        })
    })
}

function assertExactAllowedKeys(body: Record<string, unknown>, allowedKeys: readonly string[], code: ErrorCode = 'invalid_request') {
    for (const key of Object.keys(body)) {
        if (!allowedKeys.includes(key)) {
            throw httpError(400, code)
        }
    }
}

function rejectForbiddenFields(body: Record<string, unknown>) {
    for (const key of Object.keys(body)) {
        if (FORBIDDEN_REQUEST_FIELDS.includes(key.toLowerCase())) {
            throw httpError(400, 'invalid_request')
        }
    }
}

function validateText(value: unknown, maxLength: number, allowEmpty: boolean): string {
    if (typeof value !== 'string' || value.length > maxLength || hasDisallowedControlCharacter(value)) {
        throw httpError(400, 'invalid_request')
    }
    const trimmed = value.trim()
    if (!allowEmpty && !trimmed) {
        throw httpError(400, 'invalid_request')
    }
    assertNoForbiddenText(trimmed)
    return trimmed
}

function validateGoalText(value: unknown): string {
    if (typeof value !== 'string') {
        throw httpError(400, 'invalid_request')
    }
    const normalized = value
        .replace(/[\t\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (!normalized || normalized.length > 1024 || hasDisallowedControlCharacter(normalized) || hasHiddenControlCharacter(normalized)) {
        throw httpError(400, 'invalid_request')
    }
    if (secretTextPresent(normalized)) {
        throw httpError(400, 'invalid_request')
    }
    return normalized
}

function validateResultText(value: unknown): string {
    if (typeof value !== 'string') {
        throw httpError(400, 'result_review_invalid_input')
    }
    const normalized = value.replace(/\r\n?/g, '\n').trim()
    if (
        normalized.length < 20 ||
        normalized.length > 12000 ||
        Buffer.byteLength(normalized, 'utf8') > 14 * 1024 ||
        hasDisallowedControlCharacter(normalized) ||
        hasHiddenControlCharacter(normalized)
    ) {
        throw httpError(400, 'result_review_invalid_input')
    }
    if (looksLikeTopLevelJson(normalized) || resultTextHasProtocolAuthority(normalized) || secretTextPresent(normalized)) {
        throw httpError(400, 'result_review_invalid_input')
    }
    if (/<\s*\/?\s*[a-z][^>]*>|on[a-z]+\s*=/i.test(normalized)) {
        throw httpError(400, 'result_review_invalid_input')
    }
    return normalized
}

function validateRef(value: unknown): string {
    if (typeof value !== 'string' || value.length < 1 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
        throw httpError(400, 'invalid_request')
    }
    assertNoForbiddenText(value)
    return value
}

function validateClientNonce(value: unknown, code: ErrorCode = 'invalid_request'): string {
    if (
        typeof value !== 'string' ||
        value.length < 22 ||
        value.length > 128 ||
        !/^[A-Za-z0-9_-]+$/.test(value) ||
        hasDisallowedControlCharacter(value) ||
        hasHiddenControlCharacter(value)
    ) {
        throw httpError(400, code)
    }
    return value
}

function validateCockpitRef(value: unknown, code: ErrorCode = 'plan_decision_invalid_input'): string {
    if (
        typeof value !== 'string' ||
        value.length < 32 ||
        value.length > 128 ||
        !/^cockpit_[A-Za-z0-9_-]+$/.test(value) ||
        hasDisallowedControlCharacter(value) ||
        hasHiddenControlCharacter(value)
    ) {
        throw httpError(400, code)
    }
    return value
}

function validateSnapshot(snapshot: ReturnType<typeof snapshotStatic.createStaticSnapshot>, request: CockpitRequest) {
    assertResponseKeys(snapshot as Record<string, unknown>, SNAPSHOT_KEYS, Object.freeze([ROUTE_CARD_KEY, IDE_PREVIEW_KEY]))
    validateRouteCard((snapshot as { route_card?: unknown }).route_card)
    validateIdePreview((snapshot as { ide_preview?: unknown }).ide_preview)
    if (snapshot.schema_version !== COCKPIT_SNAPSHOT_SCHEMA_VERSION || snapshot.status !== 'ok') {
        throw httpError(500, 'invalid_snapshot')
    }
    if (!snapshot.allowed_user_actions.every((action) => COCKPIT_ALLOWED_USER_ACTIONS.includes(action))) {
        throw httpError(500, 'invalid_snapshot')
    }
    if (snapshot.allowed_user_actions.length !== 1 || snapshot.allowed_user_actions[0] !== 'none') {
        throw httpError(500, 'invalid_snapshot')
    }
    if (request.choice === 'confirm_result_source_status_only') {
        if (snapshot.state === 'accepted' || snapshot.accepted_state !== 'not_accepted' || snapshot.shield_summary !== 'not_reviewed') {
            throw httpError(500, 'invalid_snapshot')
        }
        if (snapshot.evidence_refs.length > 0 || snapshot.manual_handoff_preview !== null) {
            throw httpError(500, 'invalid_snapshot')
        }
    }
    const serialized = JSON.stringify(snapshot)
    if (Buffer.byteLength(serialized) > COCKPIT_RESPONSE_LIMIT_BYTES) {
        throw httpError(500, 'invalid_snapshot')
    }
    const {
        route_card: _routeCard,
        ide_preview: _idePreview,
        ...snapshotWithoutRouteCard
    } = snapshot as typeof snapshot & {
        route_card?: unknown
        ide_preview?: unknown
    }
    assertNoForbiddenText(JSON.stringify(snapshotWithoutRouteCard))
    return snapshot
}

function isPlanSessionResponse(value: unknown): value is classifyBridge.PlanSessionResponse {
    return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as { schema_version?: unknown }).schema_version === classifyBridge.PLAN_SESSION_SCHEMA_VERSION
    )
}

function validatePlanSession(planSession: classifyBridge.PlanSessionResponse) {
    assertResponseKeys(planSession as unknown as Record<string, unknown>, PLAN_SESSION_KEYS, Object.freeze([ROUTE_CARD_KEY, IDE_PREVIEW_KEY]))
    validateRouteCard((planSession as classifyBridge.PlanSessionResponse & { route_card?: unknown }).route_card)
    validateIdePreview((planSession as classifyBridge.PlanSessionResponse & { ide_preview?: unknown }).ide_preview)
    if (planSession.schema_version !== classifyBridge.PLAN_SESSION_SCHEMA_VERSION || !['ok', 'error'].includes(planSession.status)) {
        throw httpError(500, 'invalid_snapshot')
    }
    const actionKeys = planSession.allowed_user_actions
    if (!Array.isArray(actionKeys)) {
        throw httpError(500, 'invalid_snapshot')
    }
    if (planSession.state === 'plan_decision_required') {
        if (actionKeys.join(',') !== 'approve_plan,revise_plan,stop' || !planSession.cockpit_ref) {
            throw httpError(500, 'invalid_snapshot')
        }
    } else if (planSession.state === 'manual_packet_preparation_required') {
        if (actionKeys.join(',') !== 'prepare_manual_worker_packet' || !planSession.cockpit_ref) {
            throw httpError(500, 'invalid_snapshot')
        }
    } else if (planSession.state === 'result_review_required') {
        if (actionKeys.join(',') !== 'submit_result_review' || !planSession.cockpit_ref) {
            throw httpError(500, 'invalid_snapshot')
        }
    } else if (actionKeys.length !== 1 || actionKeys[0] !== 'none' || planSession.cockpit_ref !== null) {
        throw httpError(500, 'invalid_snapshot')
    }
    if (planSession.plan_card !== null) {
        const planCardKeys = Object.keys(planSession.plan_card).sort()
        const expectedPlanCardKeys = [...PLAN_CARD_KEYS].sort()
        if (planCardKeys.length !== expectedPlanCardKeys.length || planCardKeys.some((key, index) => key !== expectedPlanCardKeys[index])) {
            throw httpError(500, 'invalid_snapshot')
        }
    }
    const serialized = JSON.stringify(planSession)
    if (Buffer.byteLength(serialized) > COCKPIT_RESPONSE_LIMIT_BYTES) {
        throw httpError(500, 'invalid_snapshot')
    }
    const forbiddenFragments = [
        'run_',
        'sentinel_session_id',
        'decision_id',
        'approval_id',
        'plan_id',
        'task_id',
        'task_packet_hash',
        'approval_challenge',
        'approval_challenge_hash',
        'action_inputs',
        'task_packet',
        'copyable_worker_prompt',
        'result_packet',
        'evidence_manifest',
        'gateway',
        'bearer',
        'authorization'
    ]
    const lower = serialized.toLowerCase()
    if (forbiddenFragments.some((fragment) => lower.includes(fragment))) {
        throw httpError(500, 'invalid_snapshot')
    }
    return planSession
}

function assertResponseKeys(
    body: Record<string, unknown>,
    requiredKeys: readonly string[],
    optionalKeys: readonly string[] = Object.freeze([])
) {
    const keys = Object.keys(body)
    const allowedKeys = new Set([...requiredKeys, ...optionalKeys])
    if (requiredKeys.some((key) => !keys.includes(key)) || keys.some((key) => !allowedKeys.has(key))) {
        throw httpError(500, 'invalid_snapshot')
    }
}

function validateRouteCard(routeCard: unknown) {
    if (routeCard == null) {
        return
    }
    if (!routeCard || typeof routeCard !== 'object' || Array.isArray(routeCard)) {
        throw httpError(500, 'invalid_snapshot')
    }

    const card = routeCard as Record<string, unknown>
    assertResponseKeys(card, ROUTE_CARD_KEYS)
    if (card.schema_version !== 'sentinel.qvc.route_card.v1') {
        throw httpError(500, 'invalid_snapshot')
    }
    if (typeof card.category !== 'string' || !ROUTE_CARD_CATEGORIES.includes(card.category)) {
        throw httpError(500, 'invalid_snapshot')
    }
    validateRouteCardText(card.title, 96)
    validateRouteCardText(card.summary, 320)
    validateRouteCardText(card.what_can_happen_next, 320)
    validateRouteCardText(card.what_will_not_happen, 360)
    if (typeof card.needs_clarification !== 'boolean') {
        throw httpError(500, 'invalid_snapshot')
    }
    validateOptionalRouteCardText(card.clarification_question, 240)
    validateOptionalRouteCardText(card.blocked_reason, 240)

    const lower = JSON.stringify(card).toLowerCase()
    if (ROUTE_CARD_FORBIDDEN_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
        throw httpError(500, 'invalid_snapshot')
    }
}

function validateIdePreview(idePreview: unknown) {
    if (idePreview == null) {
        return
    }
    if (!idePreview || typeof idePreview !== 'object' || Array.isArray(idePreview)) {
        throw httpError(500, 'invalid_snapshot')
    }
    const preview = idePreview as Record<string, unknown>
    assertResponseKeys(preview, IDE_PREVIEW_KEYS)
    validateIdePreviewText(preview.status_label, 80)
    validateIdePreviewText(preview.workflow_label, 80)
    validateIdePreviewText(preview.persona_label, 80)
    validateIdePreviewText(preview.skill_label, 80)
    validateIdePreviewText(preview.summary, 260)
    validateIdePreviewText(preview.what_can_happen_next, 260)
    validateIdePreviewText(preview.what_will_not_happen, 260)
    validateIdePreviewText(preview.approval_copy, 160)
    validateIdePreviewText(preview.expires_at_label, 80)
    if (Buffer.byteLength(JSON.stringify(preview)) > 2048) {
        throw httpError(500, 'invalid_snapshot')
    }
    const lower = JSON.stringify(preview).toLowerCase()
    if (IDE_PREVIEW_FORBIDDEN_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
        throw httpError(500, 'invalid_snapshot')
    }
}

function validateIdePreviewText(value: unknown, maxLength: number) {
    if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.length > maxLength ||
        hasDisallowedControlCharacter(value) ||
        hasHiddenControlCharacter(value) ||
        /[^\x20-\x7e]/.test(value) ||
        secretTextPresent(value)
    ) {
        throw httpError(500, 'invalid_snapshot')
    }
}

function validateRouteCardText(value: unknown, maxLength: number) {
    if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.length > maxLength ||
        hasDisallowedControlCharacter(value) ||
        hasHiddenControlCharacter(value) ||
        secretTextPresent(value)
    ) {
        throw httpError(500, 'invalid_snapshot')
    }
}

function validateOptionalRouteCardText(value: unknown, maxLength: number) {
    if (value === null) {
        return
    }
    validateRouteCardText(value, maxLength)
}

function sendJson(res: Response, statusCode: number, body: unknown) {
    const serialized = `${JSON.stringify(body)}\n`
    res.status(statusCode)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Length', String(Buffer.byteLength(serialized)))
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'"
    )
    res.end(serialized)
}

function sendError(res: Response, statusCode: number, code: ErrorCode) {
    sendJson(res, statusCode, {
        schema_version: COCKPIT_ERROR_SCHEMA_VERSION,
        status: 'error',
        error: {
            code,
            message: ERROR_MESSAGE
        }
    })
}

export function readFlowiseLocalConfig(env: NodeJS.ProcessEnv): FlowiseLocalConfig {
    const origin = readSafeLocalOrigin(env[FLOWISE_LOCAL_ORIGIN_ENV] || DEFAULT_FLOWISE_LOCAL_ORIGIN)
    if (!origin) {
        return { ok: false, origin: DEFAULT_FLOWISE_LOCAL_ORIGIN, host: DEFAULT_FLOWISE_LOCAL_HOST }
    }
    const host = readSafeLocalHost(env[FLOWISE_LOCAL_HOST_ENV] || origin.host)
    if (!host || host !== origin.host) {
        return { ok: false, origin: origin.origin, host: origin.host }
    }
    return { ok: true, origin: origin.origin, host }
}

function readSafeLocalOrigin(value: unknown): { origin: string; host: string } | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 160 || hasDisallowedControlCharacter(trimmed) || hasHiddenControlCharacter(trimmed)) return null
    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        return null
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null
    if (!isLocalOrPrivateHostname(parsed.hostname)) return null
    return { origin: parsed.origin, host: parsed.host }
}

function readSafeLocalHost(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 128 || hasDisallowedControlCharacter(trimmed) || hasHiddenControlCharacter(trimmed)) return null
    if (/[/?#@\\]/.test(trimmed)) return null
    let parsed: URL
    try {
        parsed = new URL(`http://${trimmed}`)
    } catch {
        return null
    }
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null
    if (!isLocalOrPrivateHostname(parsed.hostname)) return null
    return parsed.host
}

function isLocalOrPrivateHostname(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
    if (host === 'localhost' || host === '::1') return true
    const parts = host.split('.')
    if (parts.length !== 4 || parts.some((part) => !/^[0-9]+$/.test(part))) return false
    const octets = parts.map((part) => Number(part))
    if (octets.some((part) => part < 0 || part > 255)) return false
    const [first, second] = octets
    return first === 127 || first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31)
}

function getErrorStatusCode(error: unknown): number {
    const maybe = error as { statusCode?: unknown }
    return typeof maybe?.statusCode === 'number' ? maybe.statusCode : 500
}

function getErrorCode(error: unknown): ErrorCode {
    const maybe = error as { code?: unknown }
    const code = typeof maybe?.code === 'string' ? maybe.code : 'internal_error'
    if (
        [
            'method_not_allowed',
            'not_found',
            'preflight_denied',
            'header_denied',
            'unsupported_media_type',
            'unsupported_content_encoding',
            'body_too_large',
            'invalid_json',
            'invalid_request',
            'invalid_snapshot',
            'sentinel_classify_unavailable',
            'sentinel_classify_malformed',
            'sentinel_resume_disabled',
            'sentinel_resume_binding_invalid',
            'sentinel_resume_binding_not_found',
            'sentinel_resume_unavailable',
            'sentinel_resume_malformed',
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
        ].includes(code)
    ) {
        return code as ErrorCode
    }
    return 'internal_error'
}

function httpError(statusCode: number, code: ErrorCode) {
    const error = new Error(code) as Error & { statusCode: number; code: ErrorCode }
    error.statusCode = statusCode
    error.code = code
    return error
}

function headerValueHasForbiddenText(value: unknown): boolean {
    const values = Array.isArray(value) ? value : [value]
    return values.some((entry) => typeof entry === 'string' && forbiddenTextPresent(entry))
}

function assertNoForbiddenText(value: string) {
    if (forbiddenTextPresent(value)) {
        throw httpError(400, 'invalid_request')
    }
}

function assertRequestTextSafeWithoutAuthorityRefs(request: Record<string, string>) {
    const { client_nonce: _clientNonce, cockpit_ref: _cockpitRef, ...scannedRequest } = request
    assertNoForbiddenText(JSON.stringify(scannedRequest))
}

function forbiddenTextPresent(value: string): boolean {
    return (
        /\b(?:SENTINEL_GATEWAY_TOKEN|authorization|bearer|token|secret|password|api[-_]?key|approval_challenge|task_packet|result_packet|callback_url|webhook|runtime[-_]?ingest|worker|mcp|tool|shell|command|commit|publish|send|deploy|risk_class|authority_ladder|artifact_registry|persona|DTO)\b/i.test(
            value
        ) || containsTokenShapedText(value)
    )
}

function secretTextPresent(value: string): boolean {
    return (
        /\b(?:SENTINEL_GATEWAY_TOKEN|authorization|bearer|token|secret|password|passwd|api[-_]?key|apikey|cookie|private\s+key)\b/i.test(
            value
        ) ||
        /BEGIN [A-Z ]*PRIVATE KEY/i.test(value) ||
        /\b(?:sk-|ghp_|github_pat_|xoxb-|AKIA)[A-Za-z0-9_./+=-]{8,}\b/.test(value) ||
        /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(value) ||
        /https?:\/\/[^/\s:@]+:[^/\s@]+@/i.test(value) ||
        containsTokenShapedText(value)
    )
}

function looksLikeTopLevelJson(value: string): boolean {
    const trimmed = value.trim()
    if (!/^[{[]/.test(trimmed)) return false
    try {
        const parsed = JSON.parse(trimmed)
        return !!parsed && typeof parsed === 'object'
    } catch {
        return false
    }
}

function resultTextHasProtocolAuthority(value: string): boolean {
    return (
        /\b(?:run_id|sentinel_session_id|session_id|decision_id|approval_id|plan_id|task_id|task_packet_hash|result_id|shield_review_id|result_packet|evidence_manifest|gateway_url|client_nonce|cockpit_ref|action_inputs|task_packet|copyable_worker_prompt|authorization|bearer|token)\b/i.test(
            value
        ) || /127\.0\.0\.1:39173/i.test(value)
    )
}

function containsTokenShapedText(value: string): boolean {
    const candidates = value.match(/[A-Za-z0-9._~:-]{32,256}/g) || []
    return candidates.some((candidate) => {
        if (candidate === COCKPIT_SNAPSHOT_SCHEMA_VERSION || candidate === COCKPIT_ERROR_SCHEMA_VERSION) return false
        if (!/[A-Za-z]/.test(candidate) || !/[0-9]/.test(candidate) || /^(.)\1+$/.test(candidate)) return false
        const lower = candidate.toLowerCase()
        return !['placeholder', 'example', 'sample'].some((fragment) => lower.includes(fragment))
    })
}

function hasDisallowedControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index)
        if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
            return true
        }
    }
    return false
}

function hasHiddenControlCharacter(value: string): boolean {
    return /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(value)
}

export default {
    handleSnapshot
}
