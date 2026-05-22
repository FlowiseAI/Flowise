import { Buffer } from 'buffer'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { COCKPIT_SNAPSHOT_SCHEMA_VERSION, CockpitRequest, CockpitSnapshot, createStaticSnapshot } from './snapshot.static'

export const CLASSIFY_BRIDGE_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_CLASSIFY_BRIDGE'
export const CLASSIFY_BRIDGE_TOKEN_ENV = 'BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN'
export const CLASSIFY_BRIDGE_GATEWAY_ORIGIN_ENV = 'BEZZTY_FLOWISE_SENTINEL_GATEWAY_ORIGIN'
export const PLAN_READINESS_CARD_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_PLAN_READINESS_CARD'
export const PLAN_DECISION_BRIDGE_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE'
export const MANUAL_PACKET_BRIDGE_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE'
export const RESULT_REVIEW_BRIDGE_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_RESULT_REVIEW_BRIDGE'
export const IDE_PREVIEW_PROJECTION_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_IDE_PREVIEW_PROJECTION'
export const IDE_WORK_PROJECTION_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_IDE_WORK_PROJECTION'
export const IDE_WORK_ACTIONS_FLAG_ENV = 'BEZZTY_FLOWISE_SENTINEL_IDE_WORK_ACTIONS'
export const DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN = 'http://127.0.0.1:39173'
export const CLASSIFY_BRIDGE_GATEWAY_ORIGIN =
    readGatewayOrigin(process.env[CLASSIFY_BRIDGE_GATEWAY_ORIGIN_ENV]) || DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN
export const PLAN_SESSION_SCHEMA_VERSION = 'sentinel.cockpit_bridge.plan_session.v1'
export const GOAL_ROUTE_CARD_SCHEMA_VERSION = 'sentinel.qvc.route_card.v1'
export const IDE_PREVIEW_SCHEMA_VERSION = 'sentinel.qvc.ide_preview.v1'
export const IDE_PREVIEW_KEY = 'ide_preview'
export const IDE_WORK_KEY = 'ide_work'
export const IDE_WORK_BRIDGE_SCHEMA_VERSION = 'sentinel.cockpit_bridge.ide_work.v1'
export const IDE_WORK_GATEWAY_SCHEMA_VERSIONS = Object.freeze([
    'sentinel.qvc.ide_work_approval.v1',
    'sentinel.qvc.ide_work_progress.v1',
    'sentinel.qvc.ide_work_result_review_required.v1'
])
export const IDE_PREVIEW_REDUCED_KEYS = Object.freeze([
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
export const IDE_PREVIEW_APPROVAL_COPY = 'Backend work would require a separate reviewed approval step.'
export const IDE_WORK_ACTION_PATHS = Object.freeze({
    action: '/v1/ide-work/action',
    status: '/v1/ide-work/status'
})
const GOAL_ROUTE_CATEGORIES = Object.freeze([
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
const IDE_PREVIEW_RAW_KEYS = Object.freeze([
    'schema_version',
    'status',
    'workflow_label',
    'persona_label',
    'skill_label',
    'summary',
    'what_can_happen_next',
    'what_will_not_happen',
    'approval_required',
    'allowed_user_actions',
    'blocked_reason',
    'expires_at_label'
])
const IDE_WORK_RAW_KEYS = Object.freeze([
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
    'safe_error'
])
const IDE_WORK_REDUCED_KEYS = IDE_WORK_RAW_KEYS
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
    'expired'
])
const IDE_WORK_ALLOWED_ACTIONS = Object.freeze([
    'approve_mock_backend_work',
    'cancel_mock_backend_work',
    'request_read_only_review',
    'none'
])
const IDE_PREVIEW_STATUS_LABELS = Object.freeze({
    ide_preview_disabled: 'Backend preview is off',
    ide_preview_unavailable: 'Backend preview unavailable',
    ide_preview_ready: 'Backend preview ready',
    ide_preview_needs_clarification: 'Backend preview needs clarification',
    ide_preview_blocked: 'Backend preview blocked',
    ide_preview_expired: 'Backend preview expired',
    ide_preview_stopped: 'Backend preview stopped'
})
const IDE_PREVIEW_WORKFLOW_LABELS = Object.freeze([
    'No backend preview',
    'Safe planning workflow',
    'Safe review workflow',
    'Policy guidance workflow',
    'Clarification workflow'
])
const IDE_PREVIEW_PERSONA_LABELS = Object.freeze([
    'No expert selected',
    'Planning reviewer',
    'Review helper',
    'Policy guide',
    'Clarification helper'
])
const IDE_PREVIEW_SKILL_LABELS = Object.freeze([
    'No skill selected',
    'Plain-English planning',
    'Safe review',
    'Policy guidance',
    'Clarifying questions'
])
const IDE_PREVIEW_FORBIDDEN_FRAGMENTS = Object.freeze([
    'run_',
    'sess_',
    'dec_',
    'plan_',
    'ap_',
    'task_',
    'result_',
    'shield_',
    'cockpit_',
    'req_',
    'sentinel_session',
    'session_id',
    'decision_id',
    'approval_challenge',
    'approval_id',
    'task_packet',
    'task_packet_hash',
    'result_packet',
    'result_id',
    'shield_review_id',
    'evidence_manifest',
    'client_nonce',
    'cockpit_ref',
    'sha256:',
    'bearer',
    'authorization',
    'token',
    'gateway',
    '127.0.0.1',
    'localhost',
    ':39173',
    'goal_text',
    'action_inputs',
    'allowed_actions',
    'copyable_worker_prompt',
    'worker_type',
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
    'repo-write',
    'commit',
    'publish',
    'deploy',
    'c:\\',
    '/mnt/'
])
const IDE_WORK_FORBIDDEN_FRAGMENTS = Object.freeze([
    ...IDE_PREVIEW_FORBIDDEN_FRAGMENTS,
    'adapter',
    'argv',
    'session',
    'nonce',
    'hash',
    'path',
    'raw',
    'selected worker',
    'active agent',
    'launch worker',
    'open ide',
    'execute',
    'write files',
    'create pr'
])

export type GoalRouteCard = Readonly<{
    schema_version: typeof GOAL_ROUTE_CARD_SCHEMA_VERSION
    category:
        | 'planning'
        | 'review'
        | 'audit'
        | 'debug_diagnose'
        | 'manual_coding_work'
        | 'result_review'
        | 'policy_help'
        | 'unclear'
        | 'blocked_unsafe'
    title: string
    summary: string
    what_can_happen_next: string
    what_will_not_happen: string
    needs_clarification: boolean
    clarification_question: string | null
    blocked_reason: string | null
}>

export type IdePreviewProjection = Readonly<{
    status_label: string
    workflow_label: string
    persona_label: string
    skill_label: string
    summary: string
    what_can_happen_next: string
    what_will_not_happen: string
    approval_copy: string
    expires_at_label: string
}>

export type IdeWorkProjection = Readonly<{
    schema_version:
        | 'sentinel.qvc.ide_work_approval.v1'
        | 'sentinel.qvc.ide_work_progress.v1'
        | 'sentinel.qvc.ide_work_result_review_required.v1'
    status: 'ok'
    state:
        | 'disabled'
        | 'approval_unavailable'
        | 'approval_pending'
        | 'starting'
        | 'mock_in_progress'
        | 'cancel_requested'
        | 'cancelled'
        | 'timed_out'
        | 'failed_closed'
        | 'review_required'
        | 'expired'
    status_label: string
    workflow_label: string
    persona_label: string
    skill_label: string
    short_summary: string
    current_safe_step: string
    what_can_happen_next: string
    what_will_not_happen: string
    approval_available: boolean
    cancel_available: boolean
    review_required_note: string | null
    terminal_note: string | null
    allowed_user_actions: string[]
    blocked_actions: string[]
    safe_error: string | null
}>

export type ClassifyBridgeErrorCode =
    | 'sentinel_classify_unavailable'
    | 'sentinel_classify_malformed'
    | 'feature_disabled'
    | 'plan_session_not_found'
    | 'plan_session_expired'
    | 'plan_session_consumed'
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

export type ClassifyBridgeConfig = Readonly<{
    requested: boolean
    planReadinessCard: boolean
    planDecisionBridge: boolean
    manualPacketBridge: boolean
    resultReviewBridge: boolean
    idePreviewProjection: boolean
    ideWorkProjection: boolean
    ideWorkActions: boolean
    gatewayOrigin: string
    token?: string
    errorCode?: ClassifyBridgeErrorCode
}>

export type PlanDecisionRequest = Readonly<{
    request_kind: 'plan_decision'
    cockpit_ref: string
    client_nonce: string
    decision: 'approve_plan' | 'revise_plan' | 'stop'
    revision_text?: string
}>

export type ManualPacketRequest = Readonly<{
    request_kind: 'manual_worker_packet'
    cockpit_ref: string
    client_nonce: string
}>

export type ResultReviewRequest = Readonly<{
    request_kind: 'result_review'
    cockpit_ref: string
    client_nonce: string
    result_text: string
    review_only_confirmation: true
}>

export type IdeWorkActionRequest = Readonly<{
    request_kind: 'ide_work_action'
    action: 'approve_mock_backend_work' | 'cancel_mock_backend_work' | 'request_read_only_review'
}>

export type IdeWorkStatusRequest = Readonly<{
    request_kind: 'ide_work_status'
}>

export type PlanSessionResponse = Readonly<{
    schema_version: typeof PLAN_SESSION_SCHEMA_VERSION
    status: 'ok' | 'error'
    state:
        | 'plan_decision_required'
        | 'plan_drafted'
        | 'plan_revision_requested'
        | 'plan_stopped'
        | 'goal_blocked'
        | 'manual_packet_preparation_required'
        | 'manual_packet_ready'
        | 'manual_packet_already_prepared'
        | 'result_review_required'
        | 'result_review_accepted'
        | 'result_review_needs_more_information'
        | 'result_review_rejected'
        | 'result_review_unavailable'
    plain_summary: string
    next_safe_action:
        | 'user_plan_decision_required'
        | 'plan_display_only'
        | 'submit_revised_goal'
        | 'done'
        | 'goal_blocked'
        | 'prepare_manual_worker_packet'
        | 'manual_handoff_ready'
        | 'submit_manual_worker_result'
        | 'review_complete'
        | 'review_needs_more_information'
        | 'review_manual_intervention'
        | 'review_unavailable'
    allowed_user_actions: string[]
    blocked_actions: string[]
    cockpit_ref: string | null
    plan_card: null | Readonly<{
        plain_title: string
        plain_summary: string
        plain_steps: string[]
        will_not_do: string[]
    }>
    route_card?: GoalRouteCard | null
    ide_preview?: IdePreviewProjection | null
    ide_work?: IdeWorkProjection | null
    safe_error: null | Readonly<{
        code: ClassifyBridgeErrorCode
        message: string
    }>
}>

type FetchLike = (
    url: string,
    init: {
        method: 'POST'
        headers: Record<string, string>
        body: string
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

type ClassifyBridgeOptions = Readonly<{
    config?: ClassifyBridgeConfig
    fetchImpl?: FetchLike
    requestId?: string
}>

type GatewayClassifyBody = Record<string, unknown>
type GatewayDraftPlanBody = Record<string, unknown>
type GatewayManualPacketBody = Record<string, unknown>
type GatewayResultReviewBody = Record<string, unknown>
type GatewayIdeWorkBody = Record<string, unknown>
type PlanBindingState = 'pending' | 'in_flight' | 'consumed'
type ManualPacketBindingState = 'pending' | 'in_flight' | 'consumed'
type ResultReviewBindingState = 'pending' | 'in_flight' | 'consumed'

type PlanBinding = {
    cockpitRef: string
    nonceHash: string
    runId: string
    sentinelSessionId: string
    decisionId: string
    approvalChallenge: string
    approvalChallengeExpiresAt: number
    createdAt: number
    expiresAt: number
    state: PlanBindingState
}

type ManualPacketBinding = {
    cockpitRef: string
    nonceHash: string
    runId: string
    sentinelSessionId: string
    planId: string
    approvalId: string
    createdAt: number
    expiresAt: number
    state: ManualPacketBindingState
}

type ResultReviewBinding = {
    cockpitRef: string
    nonceHash: string
    runId: string
    sentinelSessionId: string
    taskId: string
    taskPacketHash: string
    createdAt: number
    expiresAt: number
    state: ResultReviewBindingState
}

const GATEWAY_SCHEMA_VERSION = 'sentinel.gateway.v1'
const RESPONSE_LIMIT_BYTES = 64 * 1024
const FETCH_TIMEOUT_MS = 5000
const IDE_WORK_FETCH_TIMEOUT_MS = 70000
const PLAN_BINDING_MAX_TTL_MS = 10 * 60 * 1000
const MANUAL_PACKET_BINDING_MAX_TTL_MS = 10 * 60 * 1000
const RESULT_REVIEW_BINDING_MAX_TTL_MS = 15 * 60 * 1000
const planBindings = new Map<string, PlanBinding>()
const manualPacketBindings = new Map<string, ManualPacketBinding>()
const resultReviewBindings = new Map<string, ResultReviewBinding>()
let ideWorkBinding: null | {
    runId: string
    sentinelSessionId: string
    allowedAction: IdeWorkActionRequest['action']
    createdAt: number
    expiresAt: number
} = null

const defaultConfig = readClassifyBridgeConfig(process.env)

export function classifyBridgeIsRequested(): boolean {
    return defaultConfig.requested
}

export function planDecisionBridgeIsRequested(): boolean {
    return defaultConfig.planDecisionBridge
}

export function readClassifyBridgeConfig(env: NodeJS.ProcessEnv): ClassifyBridgeConfig {
    const planReadinessCard = env[PLAN_READINESS_CARD_FLAG_ENV] === '1'
    const planDecisionBridge = env[PLAN_DECISION_BRIDGE_FLAG_ENV] === '1'
    const manualPacketBridge = env[MANUAL_PACKET_BRIDGE_FLAG_ENV] === '1'
    const resultReviewBridge = env[RESULT_REVIEW_BRIDGE_FLAG_ENV] === '1'
    const idePreviewProjection = env[IDE_PREVIEW_PROJECTION_FLAG_ENV] === '1'
    const ideWorkProjection = env[IDE_WORK_PROJECTION_FLAG_ENV] === '1'
    const ideWorkActions = env[IDE_WORK_ACTIONS_FLAG_ENV] === '1'
    const configuredGatewayOrigin = env[CLASSIFY_BRIDGE_GATEWAY_ORIGIN_ENV]
    const gatewayOrigin = readGatewayOrigin(configuredGatewayOrigin)
    if (env[CLASSIFY_BRIDGE_FLAG_ENV] !== '1') {
        return {
            requested: false,
            planReadinessCard,
            planDecisionBridge,
            manualPacketBridge,
            resultReviewBridge,
            idePreviewProjection,
            ideWorkProjection,
            ideWorkActions,
            gatewayOrigin: gatewayOrigin || DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN
        }
    }
    if (configuredGatewayOrigin !== undefined && !gatewayOrigin) {
        return {
            requested: true,
            planReadinessCard,
            planDecisionBridge,
            manualPacketBridge,
            resultReviewBridge,
            idePreviewProjection,
            ideWorkProjection,
            ideWorkActions,
            gatewayOrigin: DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN,
            errorCode: 'sentinel_classify_unavailable'
        }
    }

    const token = env[CLASSIFY_BRIDGE_TOKEN_ENV]
    if (!isSafeBearerToken(token)) {
        return {
            requested: true,
            planReadinessCard,
            planDecisionBridge,
            manualPacketBridge,
            resultReviewBridge,
            idePreviewProjection,
            ideWorkProjection,
            ideWorkActions,
            gatewayOrigin: gatewayOrigin || DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN,
            errorCode: 'sentinel_classify_unavailable'
        }
    }

    return {
        requested: true,
        planReadinessCard,
        planDecisionBridge,
        manualPacketBridge,
        resultReviewBridge,
        idePreviewProjection,
        ideWorkProjection,
        ideWorkActions,
        gatewayOrigin: gatewayOrigin || DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN,
        token
    }
}

export async function createClassifySnapshot(
    request: CockpitRequest,
    options: ClassifyBridgeOptions = {}
): Promise<CockpitSnapshot | PlanSessionResponse> {
    const config = options.config || defaultConfig
    if (!config.requested) {
        return createStaticSnapshot(request)
    }
    if (request.request_kind !== 'goal' || !request.plain_goal) {
        throw classifyBridgeError(400, 'sentinel_classify_malformed')
    }
    if (config.errorCode || !config.token) {
        throw classifyBridgeError(503, 'sentinel_classify_unavailable')
    }

    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw classifyBridgeError(503, 'sentinel_classify_unavailable')
    }

    const gatewayClassify = await fetchGatewayClassify(
        request.plain_goal,
        config.token,
        config.gatewayOrigin,
        runtimeFetch,
        options.requestId
    )
    if (config.planDecisionBridge && gatewayClassify.status !== 'blocked') {
        const routeCard = projectGoalRouteCard(gatewayClassify)
        if (routeCard?.category === 'policy_help') {
            const guidanceSnapshot = projectPolicyHelpGuidanceSnapshot(
                routeCard,
                projectIdePreview(gatewayClassify, config.idePreviewProjection)
            )
            assertClassifySnapshotSafe(guidanceSnapshot, config.token, request.plain_goal)
            return guidanceSnapshot
        }
        if (request.client_nonce) {
            const planSession = createPlanDecisionRequiredSession(
                gatewayClassify,
                request.client_nonce,
                projectIdePreview(gatewayClassify, config.idePreviewProjection),
                projectIdeWork(gatewayClassify, config.ideWorkProjection, config.ideWorkActions)
            )
            if (planSession) {
                assertPlanSessionSafe(planSession, config.token, request.plain_goal, request.client_nonce)
                return planSession
            }
        }
        const readinessSnapshot = projectClassifySnapshot(gatewayClassify, true, config.idePreviewProjection)
        assertClassifySnapshotSafe(readinessSnapshot, config.token, request.plain_goal)
        return readinessSnapshot
    }
    const snapshot = projectClassifySnapshot(gatewayClassify, config.planReadinessCard, config.idePreviewProjection)
    assertClassifySnapshotSafe(snapshot, config.token, request.plain_goal)
    return snapshot
}

export async function createPlanDecisionSession(
    request: PlanDecisionRequest,
    options: ClassifyBridgeOptions = {}
): Promise<PlanSessionResponse> {
    const config = options.config || defaultConfig
    if (!config.planDecisionBridge) {
        throw classifyBridgeError(403, 'feature_disabled')
    }
    if (config.errorCode || !config.token) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }

    const binding = claimPlanBinding(request.cockpit_ref, request.client_nonce)
    try {
        const gatewayDraftPlan = await fetchGatewayDraftPlan(
            binding,
            request,
            config.token,
            config.gatewayOrigin,
            runtimeFetch,
            options.requestId
        )
        binding.state = 'consumed'
        const planSession = projectPlanDecisionSession(request, gatewayDraftPlan, binding, config)
        assertPlanSessionSafe(planSession, config.token, request.revision_text || '', request.client_nonce)
        return planSession
    } catch (error) {
        binding.state = 'consumed'
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'gateway_unavailable')
    }
}

export async function createManualPacketSession(
    request: ManualPacketRequest,
    options: ClassifyBridgeOptions = {}
): Promise<PlanSessionResponse> {
    const config = options.config || defaultConfig
    if (!config.requested || !config.planDecisionBridge || !config.manualPacketBridge) {
        throw classifyBridgeError(403, 'feature_disabled')
    }
    if (config.errorCode || !config.token) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }

    const binding = claimManualPacketBinding(request.cockpit_ref, request.client_nonce)
    try {
        const gatewayPacket = await fetchGatewayManualWorkerPacket(
            binding,
            config.token,
            config.gatewayOrigin,
            runtimeFetch,
            options.requestId
        )
        binding.state = 'consumed'
        const planSession = projectManualPacketSession(
            gatewayPacket.alreadyPrepared,
            config,
            binding,
            gatewayPacket.body,
            request.client_nonce
        )
        assertPlanSessionSafe(planSession, config.token, '', request.client_nonce)
        return planSession
    } catch (error) {
        binding.state = 'consumed'
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'gateway_unavailable')
    }
}

export async function createResultReviewSession(
    request: ResultReviewRequest,
    options: ClassifyBridgeOptions = {}
): Promise<PlanSessionResponse> {
    const config = options.config || defaultConfig
    if (!config.requested || !config.planDecisionBridge || !config.manualPacketBridge || !config.resultReviewBridge) {
        throw classifyBridgeError(403, 'feature_disabled')
    }
    if (config.errorCode || !config.token) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }

    const binding = claimResultReviewBinding(request.cockpit_ref, request.client_nonce)
    try {
        const gatewayReview = await fetchGatewayResultReview(
            binding,
            request.result_text,
            config.token,
            config.gatewayOrigin,
            runtimeFetch,
            options.requestId
        )
        binding.state = 'consumed'
        const planSession = projectResultReviewSession(gatewayReview)
        assertPlanSessionSafe(planSession, config.token, request.result_text, request.client_nonce)
        return planSession
    } catch (error) {
        binding.state = 'consumed'
        if (isClassifyBridgeError(error) && !['gateway_rejected', 'gateway_unavailable'].includes(error.code)) {
            throw error
        }
        const planSession = projectResultReviewUnavailableSession()
        assertPlanSessionSafe(planSession, config.token, request.result_text, request.client_nonce)
        return planSession
    }
}

export async function createIdeWorkActionSession(
    request: IdeWorkActionRequest,
    options: ClassifyBridgeOptions = {}
): Promise<{ schema_version: typeof IDE_WORK_BRIDGE_SCHEMA_VERSION; status: 'ok'; ide_work: IdeWorkProjection; safe_error: null }> {
    const config = options.config || defaultConfig
    if (!config.requested || !config.ideWorkProjection || !config.ideWorkActions) {
        throw classifyBridgeError(403, 'feature_disabled')
    }
    if (config.errorCode || !config.token) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const binding = claimIdeWorkBinding(true, request.action)
    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const gatewayBody = await fetchGatewayIdeWork(
        IDE_WORK_ACTION_PATHS.action,
        binding,
        { request_kind: request.request_kind, action: request.action },
        config.token,
        config.gatewayOrigin,
        runtimeFetch,
        options.requestId
    )
    const ideWork = projectIdeWork(gatewayBody, true, config.ideWorkActions)
    if (!ideWork) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
    assertIdeWorkSafe(ideWork, config.token)
    return {
        schema_version: IDE_WORK_BRIDGE_SCHEMA_VERSION,
        status: 'ok',
        ide_work: ideWork,
        safe_error: null
    }
}

export async function createIdeWorkStatusSession(
    request: IdeWorkStatusRequest,
    options: ClassifyBridgeOptions = {}
): Promise<{ schema_version: typeof IDE_WORK_BRIDGE_SCHEMA_VERSION; status: 'ok'; ide_work: IdeWorkProjection; safe_error: null }> {
    const config = options.config || defaultConfig
    if (!config.requested || !config.ideWorkProjection) {
        throw classifyBridgeError(403, 'feature_disabled')
    }
    if (config.errorCode || !config.token) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const binding = claimIdeWorkBinding(false)
    const runtimeFetch = options.fetchImpl || (globalThis as unknown as { fetch?: FetchLike }).fetch
    if (!runtimeFetch) {
        throw classifyBridgeError(503, 'gateway_unavailable')
    }
    const gatewayBody = await fetchGatewayIdeWork(
        IDE_WORK_ACTION_PATHS.status,
        binding,
        { request_kind: request.request_kind },
        config.token,
        config.gatewayOrigin,
        runtimeFetch,
        options.requestId
    )
    const ideWork = projectIdeWork(gatewayBody, true, config.ideWorkActions)
    if (!ideWork) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
    assertIdeWorkSafe(ideWork, config.token)
    return {
        schema_version: IDE_WORK_BRIDGE_SCHEMA_VERSION,
        status: 'ok',
        ide_work: ideWork,
        safe_error: null
    }
}

async function fetchGatewayClassify(
    goalText: string,
    token: string,
    gatewayOrigin: string,
    fetchImpl: FetchLike,
    requestId?: string
): Promise<GatewayClassifyBody> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const response = await fetchImpl(`${gatewayOrigin}/v1/intent/classify`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema_version: GATEWAY_SCHEMA_VERSION,
                request_id: requestId || `req_${randomUUID()}`,
                client: {
                    client_type: 'flowise',
                    client_instance_id: 'flowise_sentinel_cockpit'
                },
                operator: {
                    operator_id: 'flowise_local_operator'
                },
                goal_text: goalText
            }),
            redirect: 'manual',
            signal: controller.signal
        })
        const bodyText = await response.text()
        if (Buffer.byteLength(bodyText) > RESPONSE_LIMIT_BYTES) {
            throw classifyBridgeError(502, 'sentinel_classify_malformed')
        }
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            throw classifyBridgeError(502, 'sentinel_classify_malformed')
        }
        if (response.status !== 200 && response.status !== 409) {
            throw classifyBridgeError(502, 'sentinel_classify_unavailable')
        }
        let parsed: unknown
        try {
            parsed = JSON.parse(bodyText)
        } catch {
            throw classifyBridgeError(502, 'sentinel_classify_malformed')
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw classifyBridgeError(502, 'sentinel_classify_malformed')
        }
        assertGatewayClassifyDto(parsed as GatewayClassifyBody, response.status)
        return parsed as GatewayClassifyBody
    } catch (error) {
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'sentinel_classify_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

function assertGatewayClassifyDto(body: GatewayClassifyBody, httpStatus: number) {
    if (body.schema_version !== GATEWAY_SCHEMA_VERSION) {
        throw classifyBridgeError(502, 'sentinel_classify_malformed')
    }
    if (httpStatus === 200 && body.status !== 'needs_user') {
        throw classifyBridgeError(502, 'sentinel_classify_malformed')
    }
    if (httpStatus === 409 && body.status !== 'blocked') {
        throw classifyBridgeError(502, 'sentinel_classify_malformed')
    }
}

function projectClassifySnapshot(body: GatewayClassifyBody, planReadinessCard: boolean, idePreviewProjection: boolean): CockpitSnapshot {
    const blocked = body.status === 'blocked'
    const routeCard = projectGoalRouteCard(body)
    const idePreview = projectIdePreview(body, idePreviewProjection)
    if (!blocked && planReadinessCard) {
        return {
            schema_version: COCKPIT_SNAPSHOT_SCHEMA_VERSION,
            status: 'ok',
            snapshot_ref: 'snapshot_goal_plan_readiness',
            state: 'plan_readiness',
            plain_summary:
                'Sentinel classified this goal. A plain-English plan needs a later explicit approval step. No plan was drafted, no files changed, and no work started.',
            next_safe_action: 'planning_requires_approval_step',
            allowed_user_actions: ['none'],
            blocked_actions: [
                'Plan drafting is not available here.',
                'Approval controls are not available here.',
                'Execution is not available here.'
            ],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none',
            route_card: routeCard,
            ...(idePreview ? { [IDE_PREVIEW_KEY]: idePreview } : {})
        }
    }

    return {
        schema_version: COCKPIT_SNAPSHOT_SCHEMA_VERSION,
        status: 'ok',
        snapshot_ref: blocked ? 'snapshot_goal_classify_blocked' : 'snapshot_goal_classify_display',
        state: blocked ? 'goal_blocked' : 'goal_classified',
        plain_summary: blocked
            ? 'Sentinel classified this goal as outside the current safety boundary. No plan was drafted and no work started.'
            : 'Sentinel classified this goal for intake. Planning remains deferred, and no file changes were made.',
        next_safe_action: blocked ? 'goal_blocked' : 'planning_deferred',
        allowed_user_actions: ['none'],
        blocked_actions: blocked
            ? [
                  'This goal is blocked by Sentinel safety policy.',
                  'Plan approval is not available here.',
                  'Execution is not available here.'
              ]
            : [
                  'Plan approval is not available here.',
                  'Execution is not available here.',
                  'Manual handoff and result intake are deferred.'
              ],
        checkpoint_ref: null,
        evidence_refs: [],
        manual_handoff_preview: null,
        worker_status: 'none',
        result_status: 'not_started',
        shield_summary: 'not_reviewed',
        accepted_state: 'not_accepted',
        stale_doc_warning: 'none',
        route_card: routeCard,
        ...(idePreview ? { [IDE_PREVIEW_KEY]: idePreview } : {})
    }
}

function projectPolicyHelpGuidanceSnapshot(routeCard: GoalRouteCard, idePreview: IdePreviewProjection | null): CockpitSnapshot {
    return {
        schema_version: COCKPIT_SNAPSHOT_SCHEMA_VERSION,
        status: 'ok',
        snapshot_ref: 'snapshot_goal_policy_help_guidance',
        state: 'policy_help_guidance',
        plain_summary: 'Sentinel understood this as a guidance request. No task was created, no plan was approved, and no work started.',
        next_safe_action: 'guidance_only',
        allowed_user_actions: ['none'],
        blocked_actions: [
            'Plan approval is not needed for this guidance request.',
            'No files are edited here.',
            'No system actions start here.'
        ],
        checkpoint_ref: null,
        evidence_refs: [],
        manual_handoff_preview: null,
        worker_status: 'none',
        result_status: 'not_started',
        shield_summary: 'not_reviewed',
        accepted_state: 'not_accepted',
        stale_doc_warning: 'none',
        route_card: routeCard,
        ...(idePreview ? { [IDE_PREVIEW_KEY]: idePreview } : {})
    }
}

function assertClassifySnapshotSafe(snapshot: CockpitSnapshot, token: string, goalText: string) {
    if (
        !Array.isArray(snapshot.allowed_user_actions) ||
        snapshot.allowed_user_actions.length !== 1 ||
        snapshot.allowed_user_actions[0] !== 'none'
    ) {
        throw classifyBridgeError(502, 'sentinel_classify_malformed')
    }

    const serialized = JSON.stringify(snapshot).toLowerCase()
    const blockedFragments = [
        token.toLowerCase(),
        goalText.toLowerCase(),
        'run_',
        'sentinel_session_id',
        'decision_id',
        'goal_text',
        'approval_challenge',
        'approval_challenge_hash',
        'approval_challenge_expires_at',
        'action_inputs',
        'allowed_actions',
        'task_packet',
        'result_packet',
        'evidence_manifest',
        'gateway',
        'bearer',
        'authorization'
    ]
    if (blockedFragments.some((fragment) => fragment && serialized.includes(fragment))) {
        throw classifyBridgeError(502, 'sentinel_classify_malformed')
    }
}

function projectIdePreview(body: GatewayClassifyBody, enabled: boolean): IdePreviewProjection | null {
    if (!enabled) return null
    const preview = body[IDE_PREVIEW_KEY]
    if (!preview || typeof preview !== 'object' || Array.isArray(preview)) {
        return null
    }
    const input = preview as Record<string, unknown>
    if (!keysMatch(input, IDE_PREVIEW_RAW_KEYS)) {
        return null
    }
    if (input.schema_version !== IDE_PREVIEW_SCHEMA_VERSION || typeof input.status !== 'string') {
        return null
    }
    const statusLabel = IDE_PREVIEW_STATUS_LABELS[input.status as keyof typeof IDE_PREVIEW_STATUS_LABELS]
    if (!statusLabel) {
        return null
    }
    const workflowLabel = readIdePreviewString(input.workflow_label, 80)
    const personaLabel = readIdePreviewString(input.persona_label, 80)
    const skillLabel = readIdePreviewString(input.skill_label, 80)
    const summary = readIdePreviewString(input.summary, 260)
    const whatCanHappenNext = readIdePreviewString(input.what_can_happen_next, 260)
    const whatWillNotHappen = readIdePreviewString(input.what_will_not_happen, 260)
    const expiresAtLabel = readIdePreviewString(input.expires_at_label, 80)
    if (!workflowLabel || !personaLabel || !skillLabel || !summary || !whatCanHappenNext || !whatWillNotHappen || !expiresAtLabel) {
        return null
    }
    if (
        !IDE_PREVIEW_WORKFLOW_LABELS.includes(workflowLabel) ||
        !IDE_PREVIEW_PERSONA_LABELS.includes(personaLabel) ||
        !IDE_PREVIEW_SKILL_LABELS.includes(skillLabel)
    ) {
        return null
    }
    if (input.approval_required !== true && input.approval_required !== false) {
        return null
    }
    if (!Array.isArray(input.allowed_user_actions) || input.allowed_user_actions.length !== 1 || input.allowed_user_actions[0] !== 'none') {
        return null
    }
    if (input.blocked_reason !== null && input.blocked_reason !== 'unsafe_goal') {
        return null
    }
    const output: IdePreviewProjection = {
        status_label: statusLabel,
        workflow_label: workflowLabel,
        persona_label: personaLabel,
        skill_label: skillLabel,
        summary,
        what_can_happen_next: whatCanHappenNext,
        what_will_not_happen: whatWillNotHappen,
        approval_copy: IDE_PREVIEW_APPROVAL_COPY,
        expires_at_label: expiresAtLabel
    }
    return idePreviewHasForbiddenText(output) ? null : output
}

function projectIdeWork(
    body: GatewayClassifyBody | GatewayIdeWorkBody,
    enabled: boolean,
    actionsEnabled: boolean
): IdeWorkProjection | null {
    if (!enabled) return null
    const ideWork = body[IDE_WORK_KEY]
    if (!ideWork || typeof ideWork !== 'object' || Array.isArray(ideWork)) {
        return null
    }
    const input = ideWork as Record<string, unknown>
    if (!keysMatch(input, IDE_WORK_RAW_KEYS)) {
        return null
    }
    if (!IDE_WORK_GATEWAY_SCHEMA_VERSIONS.includes(input.schema_version as string) || input.status !== 'ok') {
        return null
    }
    if (typeof input.state !== 'string' || !IDE_WORK_STATES.includes(input.state)) {
        return null
    }
    const statusLabel = readIdeWorkString(input.status_label, 80)
    const workflowLabel = readIdeWorkString(input.workflow_label, 80)
    const personaLabel = readIdeWorkString(input.persona_label, 80)
    const skillLabel = readIdeWorkString(input.skill_label, 80)
    const shortSummary = readIdeWorkString(input.short_summary, 220)
    const currentSafeStep = readIdeWorkString(input.current_safe_step, 220)
    const whatCanHappenNext = readIdeWorkString(input.what_can_happen_next, 260)
    const whatWillNotHappen = readIdeWorkString(input.what_will_not_happen, 260)
    if (
        !statusLabel ||
        !workflowLabel ||
        !personaLabel ||
        !skillLabel ||
        !shortSummary ||
        !currentSafeStep ||
        !whatCanHappenNext ||
        !whatWillNotHappen
    ) {
        return null
    }
    const allowedActions = Array.isArray(input.allowed_user_actions)
        ? input.allowed_user_actions.filter((action): action is string => typeof action === 'string')
        : []
    if (!allowedActions.length || allowedActions.some((action) => !IDE_WORK_ALLOWED_ACTIONS.includes(action))) {
        return null
    }
    const blockedActions = Array.isArray(input.blocked_actions) ? input.blocked_actions.map((action) => readIdeWorkString(action, 160)) : []
    if (!blockedActions.length || blockedActions.some((action) => !action)) {
        return null
    }
    const output: IdeWorkProjection = {
        schema_version: input.schema_version as IdeWorkProjection['schema_version'],
        status: 'ok',
        state: input.state as IdeWorkProjection['state'],
        status_label: statusLabel,
        workflow_label: workflowLabel,
        persona_label: personaLabel,
        skill_label: skillLabel,
        short_summary: shortSummary,
        current_safe_step: currentSafeStep,
        what_can_happen_next: whatCanHappenNext,
        what_will_not_happen: whatWillNotHappen,
        approval_available: actionsEnabled && input.approval_available === true,
        cancel_available: actionsEnabled && input.cancel_available === true,
        review_required_note: input.review_required_note === null ? null : readIdeWorkString(input.review_required_note, 180),
        terminal_note: input.terminal_note === null ? null : readIdeWorkString(input.terminal_note, 180),
        allowed_user_actions: actionsEnabled ? allowedActions : ['none'],
        blocked_actions: blockedActions as string[],
        safe_error: input.safe_error === null ? null : readIdeWorkString(input.safe_error, 80)
    }
    if (output.review_required_note === undefined || output.terminal_note === undefined || output.safe_error === undefined) {
        return null
    }
    return ideWorkHasForbiddenText(output) ? null : output
}

function readIdeWorkString(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (!normalized || normalized.length > maxLength) return null
    if (/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/.test(normalized)) return null
    if (/[^\x20-\x7e]/.test(normalized)) return null
    return ideWorkTextHasForbiddenFragment(normalized) ? null : normalized
}

function ideWorkHasForbiddenText(projection: IdeWorkProjection): boolean {
    return !keysMatch(projection as unknown as Record<string, unknown>, IDE_WORK_REDUCED_KEYS)
}

function ideWorkTextHasForbiddenFragment(value: string): boolean {
    const lower = value.toLowerCase()
    return IDE_WORK_FORBIDDEN_FRAGMENTS.some((fragment) => lower.includes(fragment))
}

function readIdePreviewString(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (!normalized || normalized.length > maxLength) return null
    if (/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/.test(normalized)) return null
    if (/[^\x20-\x7e]/.test(normalized)) return null
    return idePreviewTextHasForbiddenFragment(normalized) ? null : normalized
}

function idePreviewHasForbiddenText(preview: IdePreviewProjection): boolean {
    return (
        !keysMatch(preview as unknown as Record<string, unknown>, IDE_PREVIEW_REDUCED_KEYS) ||
        idePreviewTextHasForbiddenFragment(JSON.stringify(preview))
    )
}

function idePreviewTextHasForbiddenFragment(value: string): boolean {
    const lower = value.toLowerCase()
    return IDE_PREVIEW_FORBIDDEN_FRAGMENTS.some((fragment) => lower.includes(fragment))
}

function keysMatch(body: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
    const keys = Object.keys(body).sort()
    const expected = [...expectedKeys].sort()
    return keys.length === expected.length && keys.every((key, index) => key === expected[index])
}

function createPlanDecisionRequiredSession(
    body: GatewayClassifyBody,
    clientNonce: string,
    idePreview: IdePreviewProjection | null = null,
    ideWork: IdeWorkProjection | null = null
): PlanSessionResponse | null {
    const runId = readGatewayString(body.run_id, 1, 128)
    const sentinelSessionId = readGatewayString(body.sentinel_session_id, 1, 128)
    const decisionId = readGatewayString(body.decision_id, 1, 128)
    const approvalChallenge = readGatewayString(body.approval_challenge, 8, 2048)
    const approvalChallengeExpiresAt = readGatewayString(body.approval_challenge_expires_at, 1, 128)
    if (!runId || !sentinelSessionId || !decisionId || !approvalChallenge || !approvalChallengeExpiresAt) {
        return null
    }

    const challengeExpiry = Date.parse(approvalChallengeExpiresAt)
    const now = Date.now()
    if (!Number.isFinite(challengeExpiry) || challengeExpiry <= now) {
        return null
    }

    prunePlanBindings(now)
    const cockpitRef = `cockpit_${randomBytes(18).toString('base64url')}`
    const ttlMs = Math.min(PLAN_BINDING_MAX_TTL_MS, challengeExpiry - now)
    planBindings.set(cockpitRef, {
        cockpitRef,
        nonceHash: sha256(clientNonce),
        runId,
        sentinelSessionId,
        decisionId,
        approvalChallenge,
        approvalChallengeExpiresAt: challengeExpiry,
        createdAt: now,
        expiresAt: now + ttlMs,
        state: 'pending'
    })
    const ideWorkAllowedAction = readIdeWorkBindingAction(ideWork)
    if (ideWorkAllowedAction) {
        ideWorkBinding = {
            runId,
            sentinelSessionId,
            allowedAction: ideWorkAllowedAction,
            createdAt: now,
            expiresAt: now + ttlMs
        }
    }

    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: 'plan_decision_required',
        plain_summary: 'Sentinel is ready to draft a plain-English plan after your explicit plan decision.',
        next_safe_action: 'user_plan_decision_required',
        allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
        blocked_actions: ['No files are edited here.', 'No system actions start here.', 'No hidden execution is available here.'],
        cockpit_ref: cockpitRef,
        plan_card: null,
        route_card: projectGoalRouteCard(body),
        ...(idePreview ? { [IDE_PREVIEW_KEY]: idePreview } : {}),
        ...(ideWork ? { [IDE_WORK_KEY]: ideWork } : {}),
        safe_error: null
    }
}

function claimPlanBinding(cockpitRef: string, clientNonce: string): PlanBinding {
    prunePlanBindings()
    const binding = planBindings.get(cockpitRef)
    if (!binding) {
        throw classifyBridgeError(404, 'plan_session_not_found')
    }
    if (binding.expiresAt <= Date.now()) {
        binding.state = 'consumed'
        throw classifyBridgeError(410, 'plan_session_expired')
    }
    if (binding.state !== 'pending') {
        throw classifyBridgeError(409, 'plan_session_consumed')
    }
    if (binding.nonceHash !== sha256(clientNonce)) {
        binding.state = 'consumed'
        throw classifyBridgeError(403, 'plan_session_nonce_mismatch')
    }
    binding.state = 'in_flight'
    return binding
}

function readIdeWorkBindingAction(ideWork: IdeWorkProjection | null): IdeWorkActionRequest['action'] | null {
    if (!ideWork || !Array.isArray(ideWork.allowed_user_actions) || ideWork.allowed_user_actions.length !== 1) {
        return null
    }
    const action = ideWork.allowed_user_actions[0]
    if (action === 'approve_mock_backend_work' || action === 'request_read_only_review') {
        return ideWork.approval_available === true ? action : null
    }
    if (action === 'cancel_mock_backend_work') {
        return ideWork.cancel_available === true ? action : null
    }
    return null
}

function claimIdeWorkBinding(requireFresh = true, action?: IdeWorkActionRequest['action']): { runId: string; sentinelSessionId: string } {
    const binding = ideWorkBinding
    if (!binding) {
        throw classifyBridgeError(404, 'plan_session_not_found')
    }
    if (binding.expiresAt <= Date.now()) {
        ideWorkBinding = null
        throw classifyBridgeError(410, 'plan_session_expired')
    }
    if (requireFresh === false) {
        return binding
    }
    if (action && binding.allowedAction !== action) {
        throw classifyBridgeError(403, 'plan_session_state_mismatch')
    }
    return binding
}

async function fetchGatewayDraftPlan(
    binding: PlanBinding,
    request: PlanDecisionRequest,
    token: string,
    gatewayOrigin: string,
    fetchImpl: FetchLike,
    requestId?: string
): Promise<GatewayDraftPlanBody> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const response = await fetchImpl(`${gatewayOrigin}/v1/runs/draft-plan`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema_version: GATEWAY_SCHEMA_VERSION,
                request_id: requestId || `req_${randomUUID()}`,
                run_id: binding.runId,
                sentinel_session_id: binding.sentinelSessionId,
                decision_id: binding.decisionId,
                client: {
                    client_type: 'flowise',
                    client_instance_id: 'flowise_sentinel_cockpit'
                },
                operator: {
                    operator_id: 'flowise_local_operator'
                },
                approval: {
                    approval_state: approvalStateForDecision(request.decision),
                    approval_challenge: binding.approvalChallenge,
                    approval_text: approvalTextForDecision(request)
                }
            }),
            redirect: 'manual',
            signal: controller.signal
        })
        const bodyText = await response.text()
        if (Buffer.byteLength(bodyText) > RESPONSE_LIMIT_BYTES) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (response.status !== 200) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        let parsed: unknown
        try {
            parsed = JSON.parse(bodyText)
        } catch {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        assertGatewayDraftPlanDto(parsed as GatewayDraftPlanBody)
        return parsed as GatewayDraftPlanBody
    } catch (error) {
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'gateway_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

async function fetchGatewayIdeWork(
    path: string,
    binding: { runId: string; sentinelSessionId: string },
    body: Record<string, unknown>,
    token: string,
    gatewayOrigin: string,
    fetchImpl: FetchLike,
    requestId?: string
): Promise<GatewayIdeWorkBody> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), IDE_WORK_FETCH_TIMEOUT_MS)
    try {
        const response = await fetchImpl(`${gatewayOrigin}${path}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema_version: GATEWAY_SCHEMA_VERSION,
                request_id: requestId || `req_${randomUUID()}`,
                run_id: binding.runId,
                sentinel_session_id: binding.sentinelSessionId,
                client: {
                    client_type: 'flowise',
                    client_instance_id: 'flowise_sentinel_cockpit'
                },
                operator: {
                    operator_id: 'flowise_local_operator'
                },
                ...body
            }),
            redirect: 'manual',
            signal: controller.signal
        })
        const bodyText = await response.text()
        if (Buffer.byteLength(bodyText) > RESPONSE_LIMIT_BYTES) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (response.status !== 200 && response.status !== 409) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        let parsed: unknown
        try {
            parsed = JSON.parse(bodyText)
        } catch {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        return parsed as GatewayIdeWorkBody
    } catch (error) {
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'gateway_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

function assertGatewayDraftPlanDto(body: GatewayDraftPlanBody) {
    if (body.schema_version !== GATEWAY_SCHEMA_VERSION || body.status !== 'ok') {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
}

function projectPlanDecisionSession(
    request: PlanDecisionRequest,
    body: GatewayDraftPlanBody,
    binding?: PlanBinding,
    config?: ClassifyBridgeConfig
): PlanSessionResponse {
    if (request.decision === 'revise_plan') {
        return {
            schema_version: PLAN_SESSION_SCHEMA_VERSION,
            status: 'ok',
            state: 'plan_revision_requested',
            plain_summary: 'Sentinel recorded that this plan needs revision. Start a new goal with the revised direction when ready.',
            next_safe_action: 'submit_revised_goal',
            allowed_user_actions: ['none'],
            blocked_actions: ['No files are edited here.', 'No system actions start here.'],
            cockpit_ref: null,
            plan_card: null,
            safe_error: null
        }
    }

    if (request.decision === 'stop') {
        return {
            schema_version: PLAN_SESSION_SCHEMA_VERSION,
            status: 'ok',
            state: 'plan_stopped',
            plain_summary: 'Sentinel recorded that this plan was stopped. No work started.',
            next_safe_action: 'done',
            allowed_user_actions: ['none'],
            blocked_actions: ['No files are edited here.', 'No system actions start here.'],
            cockpit_ref: null,
            plan_card: null,
            safe_error: null
        }
    }

    if (config?.manualPacketBridge) {
        if (!binding) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        return createManualPacketPreparationRequiredSession(binding, body, request.client_nonce)
    }

    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: 'plan_drafted',
        plain_summary: 'Sentinel drafted a display-only plan summary. It is not permission for work to run.',
        next_safe_action: 'plan_display_only',
        allowed_user_actions: ['none'],
        blocked_actions: ['No files are edited here.', 'No system actions start here.', 'Manual result intake is not available here.'],
        cockpit_ref: null,
        plan_card: {
            plain_title: 'Plain-English plan draft',
            plain_summary: 'Review this plan outside the cockpit before any manual work begins.',
            plain_steps: [
                'Confirm the goal is still correct.',
                'Use the governed manual coding process.',
                'Return with evidence for review.'
            ],
            will_not_do: ['No files are edited here', 'No tools are run here', 'No background work starts here']
        },
        safe_error: null
    }
}

function createManualPacketPreparationRequiredSession(
    binding: PlanBinding,
    body: GatewayDraftPlanBody,
    clientNonce: string
): PlanSessionResponse {
    const planId = readGatewayId(body.plan_id, 'plan_')
    const approvalId = readGatewayId(body.approval_id, 'ap_')
    if (!planId || !approvalId) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }

    pruneManualPacketBindings()
    const cockpitRef = `cockpit_${randomBytes(18).toString('base64url')}`
    const now = Date.now()
    manualPacketBindings.set(cockpitRef, {
        cockpitRef,
        nonceHash: sha256(clientNonce),
        runId: binding.runId,
        sentinelSessionId: binding.sentinelSessionId,
        planId,
        approvalId,
        createdAt: now,
        expiresAt: now + MANUAL_PACKET_BINDING_MAX_TTL_MS,
        state: 'pending'
    })

    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: 'manual_packet_preparation_required',
        plain_summary: 'Sentinel drafted the plan. You can now prepare a manual worker packet as a separate explicit step.',
        next_safe_action: 'prepare_manual_worker_packet',
        allowed_user_actions: ['prepare_manual_worker_packet'],
        blocked_actions: [
            'No worker is launched here.',
            'No files are edited here.',
            'No tools, shell, MCP, Agentflow, or HITL work starts here.'
        ],
        cockpit_ref: cockpitRef,
        plan_card: {
            plain_title: 'Manual packet preparation',
            plain_summary: 'Prepare a manual packet only when you are ready to hand work to the governed out-of-band process.',
            plain_steps: [
                'Confirm the plan is still the right next step.',
                'Prepare the manual packet.',
                'Use the governed manual handoff outside this page.'
            ],
            will_not_do: ['No worker is launched here', 'No files are edited here', 'No background work starts here']
        },
        safe_error: null
    }
}

function claimManualPacketBinding(cockpitRef: string, clientNonce: string): ManualPacketBinding {
    pruneManualPacketBindings()
    const binding = manualPacketBindings.get(cockpitRef)
    if (!binding) {
        throw classifyBridgeError(404, 'manual_packet_not_found')
    }
    if (binding.expiresAt <= Date.now()) {
        binding.state = 'consumed'
        throw classifyBridgeError(410, 'manual_packet_expired')
    }
    if (binding.state !== 'pending') {
        throw classifyBridgeError(409, 'manual_packet_consumed')
    }
    if (binding.nonceHash !== sha256(clientNonce)) {
        binding.state = 'consumed'
        throw classifyBridgeError(403, 'manual_packet_nonce_mismatch')
    }
    binding.state = 'in_flight'
    return binding
}

async function fetchGatewayManualWorkerPacket(
    binding: ManualPacketBinding,
    token: string,
    gatewayOrigin: string,
    fetchImpl: FetchLike,
    requestId?: string
): Promise<{ alreadyPrepared: boolean; body: GatewayManualPacketBody | null }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const response = await fetchImpl(`${gatewayOrigin}/v1/tasks/manual-worker-packet`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema_version: GATEWAY_SCHEMA_VERSION,
                request_id: requestId || `req_${randomUUID()}`,
                run_id: binding.runId,
                sentinel_session_id: binding.sentinelSessionId,
                plan_id: binding.planId,
                approval_id: binding.approvalId,
                client: {
                    client_type: 'flowise',
                    client_instance_id: 'flowise_sentinel_cockpit'
                },
                operator: {
                    operator_id: 'flowise_local_operator'
                },
                worker_type: 'manual_codex'
            }),
            redirect: 'manual',
            signal: controller.signal
        })
        const bodyText = await response.text()
        if (Buffer.byteLength(bodyText) > RESPONSE_LIMIT_BYTES) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        let parsed: unknown
        try {
            parsed = JSON.parse(bodyText)
        } catch {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (response.status === 409 && (parsed as { error?: { code?: unknown } }).error?.code === 'task_packet_already_exists') {
            return { alreadyPrepared: true, body: null }
        }
        if (response.status !== 200) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        assertGatewayManualPacketDto(parsed as GatewayManualPacketBody)
        return { alreadyPrepared: false, body: parsed as GatewayManualPacketBody }
    } catch (error) {
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'gateway_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

function assertGatewayManualPacketDto(body: GatewayManualPacketBody) {
    if (body.schema_version !== GATEWAY_SCHEMA_VERSION || body.status !== 'ok') {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
}

function projectManualPacketSession(
    alreadyPrepared: boolean,
    config?: ClassifyBridgeConfig,
    binding?: ManualPacketBinding,
    body?: GatewayManualPacketBody | null,
    clientNonce = ''
): PlanSessionResponse {
    if (!alreadyPrepared && config?.resultReviewBridge && binding && body && clientNonce) {
        const reviewSession = createResultReviewRequiredSession(binding, body, clientNonce)
        if (reviewSession) {
            return reviewSession
        }
    }

    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: alreadyPrepared ? 'manual_packet_already_prepared' : 'manual_packet_ready',
        plain_summary: alreadyPrepared
            ? 'A manual worker packet was already prepared. No worker was launched and no files were edited here.'
            : 'The manual worker packet is ready. No worker was launched and no files were edited here.',
        next_safe_action: 'manual_handoff_ready',
        allowed_user_actions: ['none'],
        blocked_actions: [
            'No worker was launched here.',
            'No files were edited here.',
            'No tools, shell, MCP, Agentflow, or HITL work ran here.'
        ],
        cockpit_ref: null,
        plan_card: {
            plain_title: alreadyPrepared ? 'Manual packet already ready' : 'Manual packet ready',
            plain_summary:
                'Use the governed out-of-band manual handoff process for any work. This page does not expose packet contents or execute work.',
            plain_steps: ['Use the approved manual handoff process outside this page.', 'Return later with worker evidence for review.'],
            will_not_do: ['No worker launched here', 'No files edited here', 'No result intake here']
        },
        safe_error: null
    }
}

function createResultReviewRequiredSession(
    binding: ManualPacketBinding,
    body: GatewayManualPacketBody,
    clientNonce: string
): PlanSessionResponse | null {
    const taskId = readGatewayId(body.task_id, 'task_')
    const taskPacketHash = readGatewayHash(body.task_packet_hash)
    if (!taskId || !taskPacketHash) {
        return null
    }

    pruneResultReviewBindings()
    const cockpitRef = `cockpit_${randomBytes(18).toString('base64url')}`
    const now = Date.now()
    resultReviewBindings.set(cockpitRef, {
        cockpitRef,
        nonceHash: sha256(clientNonce),
        runId: binding.runId,
        sentinelSessionId: binding.sentinelSessionId,
        taskId,
        taskPacketHash,
        createdAt: now,
        expiresAt: now + RESULT_REVIEW_BINDING_MAX_TTL_MS,
        state: 'pending'
    })

    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: 'result_review_required',
        plain_summary:
            'The manual worker packet is ready. Paste the manual worker result for Sentinel review when the out-of-band work is finished.',
        next_safe_action: 'submit_manual_worker_result',
        allowed_user_actions: ['submit_result_review'],
        blocked_actions: [
            'No worker is launched here.',
            'No files are edited here.',
            'No shell, MCP, Agentflow, HITL, commit, publish, or deploy action runs here.'
        ],
        cockpit_ref: cockpitRef,
        plan_card: {
            plain_title: 'Paste manual result for review',
            plain_summary: 'This sends pasted plain text to Sentinel review through Flowise. It does not run or continue the work.',
            plain_steps: ['Paste the manual worker result text.', 'Confirm this is review-only.', 'Submit it for Sentinel review.'],
            will_not_do: ['No worker launched here', 'No files edited here', 'No packet contents displayed here']
        },
        safe_error: null
    }
}

function claimResultReviewBinding(cockpitRef: string, clientNonce: string): ResultReviewBinding {
    pruneResultReviewBindings()
    const binding = resultReviewBindings.get(cockpitRef)
    if (!binding) {
        throw classifyBridgeError(404, 'result_review_not_found')
    }
    if (binding.expiresAt <= Date.now()) {
        binding.state = 'consumed'
        throw classifyBridgeError(410, 'result_review_expired')
    }
    if (binding.state !== 'pending') {
        throw classifyBridgeError(409, 'result_review_consumed')
    }
    if (binding.nonceHash !== sha256(clientNonce)) {
        binding.state = 'consumed'
        throw classifyBridgeError(403, 'result_review_nonce_mismatch')
    }
    binding.state = 'in_flight'
    return binding
}

async function fetchGatewayResultReview(
    binding: ResultReviewBinding,
    resultText: string,
    token: string,
    gatewayOrigin: string,
    fetchImpl: FetchLike,
    requestId?: string
): Promise<GatewayResultReviewBody> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const response = await fetchImpl(`${gatewayOrigin}/v1/results/review`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema_version: GATEWAY_SCHEMA_VERSION,
                request_id: requestId || `req_${randomUUID()}`,
                run_id: binding.runId,
                sentinel_session_id: binding.sentinelSessionId,
                task_id: binding.taskId,
                task_packet_hash: binding.taskPacketHash,
                client: {
                    client_type: 'flowise',
                    client_instance_id: 'flowise_sentinel_cockpit'
                },
                operator: {
                    operator_id: 'flowise_local_operator'
                },
                result_packet: buildGatewayResultPacket(resultText)
            }),
            redirect: 'manual',
            signal: controller.signal
        })
        const bodyText = await response.text()
        if (Buffer.byteLength(bodyText) > RESPONSE_LIMIT_BYTES) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (response.status !== 200) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        let parsed: unknown
        try {
            parsed = JSON.parse(bodyText)
        } catch {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw classifyBridgeError(502, 'gateway_rejected')
        }
        assertGatewayResultReviewDto(parsed as GatewayResultReviewBody, binding)
        return parsed as GatewayResultReviewBody
    } catch (error) {
        if (isClassifyBridgeError(error)) {
            throw error
        }
        throw classifyBridgeError(502, 'gateway_unavailable')
    } finally {
        clearTimeout(timeout)
    }
}

function buildGatewayResultPacket(resultText: string): Record<string, unknown> {
    return {
        worker_identity: 'manual_codex',
        summary: resultText,
        files_changed: [],
        commands_run: [],
        tests_run: [],
        blocked_actions_confirmation: true
    }
}

function assertGatewayResultReviewDto(body: GatewayResultReviewBody, binding: ResultReviewBinding) {
    if (body.schema_version !== GATEWAY_SCHEMA_VERSION) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
    const reviewState = String(body.review_state)
    if (!['accepted', 'needs_user', 'rejected'].includes(reviewState) || body.status !== reviewState) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
    if (body.run_id !== undefined && body.run_id !== binding.runId) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
    if (body.sentinel_session_id !== undefined && body.sentinel_session_id !== binding.sentinelSessionId) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
    if (body.task_id !== undefined && body.task_id !== binding.taskId) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
}

function projectResultReviewSession(body: GatewayResultReviewBody): PlanSessionResponse {
    if (body.review_state === 'accepted' && body.next_safe_action === 'accepted_complete') {
        return {
            schema_version: PLAN_SESSION_SCHEMA_VERSION,
            status: 'ok',
            state: 'result_review_accepted',
            plain_summary:
                'Sentinel accepted this pasted result for the prepared manual packet. This page did not apply code, publish work, or start a continuation.',
            next_safe_action: 'review_complete',
            allowed_user_actions: ['none'],
            blocked_actions: [
                'No worker was launched here.',
                'No repo write occurred here.',
                'No commit, publish, or deploy action ran here.'
            ],
            cockpit_ref: null,
            plan_card: {
                plain_title: 'Sentinel review accepted',
                plain_summary:
                    'Sentinel accepted this pasted result for the prepared manual packet. This page did not apply code, publish work, or start a continuation.',
                plain_steps: [
                    'Record or hand off this verdict using your normal out-of-band process.',
                    'Use a separately approved continue path for any next step.'
                ],
                will_not_do: ['No code applied here', 'No worker launched here', 'No automatic continuation here']
            },
            safe_error: null
        }
    }

    if (body.review_state === 'needs_user') {
        return {
            schema_version: PLAN_SESSION_SCHEMA_VERSION,
            status: 'ok',
            state: 'result_review_needs_more_information',
            plain_summary: 'Sentinel needs more information before it can accept this pasted result.',
            next_safe_action: 'review_needs_more_information',
            allowed_user_actions: ['none'],
            blocked_actions: ['No resume control is available here.', 'No worker was launched here.', 'No files were edited here.'],
            cockpit_ref: null,
            plan_card: {
                plain_title: 'More information needed',
                plain_summary: 'Ask the manual worker or reviewer for clearer plain-English context outside the cockpit.',
                plain_steps: [
                    'Ask for clearer plain-English context outside this page.',
                    'Use an approved review path when the result is ready.'
                ],
                will_not_do: ['No automatic retry here', 'No resume control here', 'No repo write here']
            },
            safe_error: null
        }
    }

    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: 'result_review_rejected',
        plain_summary: 'Sentinel rejected this pasted result for the prepared manual packet. Do not continue from it.',
        next_safe_action: 'review_manual_intervention',
        allowed_user_actions: ['none'],
        blocked_actions: ['Do not treat this as accepted work.', 'No worker was launched here.', 'No files were edited here.'],
        cockpit_ref: null,
        plan_card: {
            plain_title: 'Sentinel review rejected',
            plain_summary: 'Do not treat this as accepted work. Stop and use human review outside the cockpit.',
            plain_steps: ['Do not continue from this result.', 'Use human review outside the cockpit.'],
            will_not_do: ['No automatic continuation here', 'No worker launch here', 'No repo write here']
        },
        safe_error: null
    }
}

function projectResultReviewUnavailableSession(): PlanSessionResponse {
    return {
        schema_version: PLAN_SESSION_SCHEMA_VERSION,
        status: 'ok',
        state: 'result_review_unavailable',
        plain_summary: 'Sentinel could not complete the review safely. Nothing was accepted and no action occurred here.',
        next_safe_action: 'review_unavailable',
        allowed_user_actions: ['none'],
        blocked_actions: [
            'No files were edited here.',
            'No worker was launched here.',
            'No repo write, commit, publish, or deploy action ran here.'
        ],
        cockpit_ref: null,
        plan_card: {
            plain_title: 'Sentinel review unavailable',
            plain_summary: 'Nothing was accepted. Keep the result outside this page and use an approved retry or review path.',
            plain_steps: ['Keep the manual result outside this page.', 'Use an approved retry or review path if needed.'],
            will_not_do: ['No automatic retry here', 'No worker launch here', 'No repo write here']
        },
        safe_error: null
    }
}

function assertPlanSessionSafe(response: PlanSessionResponse, token: string, rawText: string, clientNonce: string) {
    const serialized = JSON.stringify(response)
    const lower = serialized.toLowerCase()
    const blockedFragments = [
        token.toLowerCase(),
        rawText.toLowerCase(),
        clientNonce.toLowerCase(),
        sha256(clientNonce).toLowerCase(),
        'run_',
        'sentinel_session_id',
        'decision_id',
        'approval_id',
        'plan_id',
        'task_id',
        'task_packet_hash',
        'approval_challenge',
        'approval_challenge_hash',
        'approval_challenge_expires_at',
        'action_inputs',
        'task_packet',
        'copyable_worker_prompt',
        'result_packet',
        'evidence_manifest',
        'gateway',
        'bearer',
        'authorization'
    ]
    if (blockedFragments.some((fragment) => fragment && lower.includes(fragment))) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
}

function assertIdeWorkSafe(response: IdeWorkProjection, token: string) {
    const serialized = [
        response.status_label,
        response.workflow_label,
        response.persona_label,
        response.skill_label,
        response.short_summary,
        response.current_safe_step,
        response.what_can_happen_next,
        response.what_will_not_happen,
        response.review_required_note || '',
        response.terminal_note || '',
        response.safe_error || '',
        ...response.blocked_actions
    ]
        .join(' ')
        .toLowerCase()
    const blockedFragments = [
        token.toLowerCase(),
        'run_',
        'sess_',
        'dec_',
        'plan_',
        'ap_',
        'task_',
        'result_',
        'shield_',
        'cockpit_',
        'req_',
        'gateway',
        'bearer',
        'authorization',
        'token',
        'client_nonce',
        'task_packet',
        'result_packet',
        'copyable_worker_prompt',
        'provider output',
        'worker output',
        'command line',
        'source snippet'
    ]
    if (blockedFragments.some((fragment) => fragment && serialized.includes(fragment))) {
        throw classifyBridgeError(502, 'gateway_rejected')
    }
}

function approvalStateForDecision(decision: PlanDecisionRequest['decision']): 'approved' | 'revise' | 'cancel' {
    if (decision === 'approve_plan') return 'approved'
    if (decision === 'revise_plan') return 'revise'
    return 'cancel'
}

function approvalTextForDecision(request: PlanDecisionRequest): string {
    if (request.decision === 'approve_plan') return 'Approved for plain-English plan drafting.'
    if (request.decision === 'stop') return 'Stop this plan decision.'
    return request.revision_text || 'Revise this plan before any work starts.'
}

function readGatewayString(value: unknown, minLength: number, maxLength: number): string | null {
    return typeof value === 'string' && value.length >= minLength && value.length <= maxLength ? value : null
}

function readGatewayId(value: unknown, prefix: string): string | null {
    return typeof value === 'string' && value.length >= prefix.length + 1 && value.length <= 128 && value.startsWith(prefix) ? value : null
}

function readGatewayHash(value: unknown): string | null {
    return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value) ? value : null
}

function projectGoalRouteCard(body: GatewayClassifyBody): GoalRouteCard | null {
    const card = body.route_card
    if (!card || typeof card !== 'object' || Array.isArray(card)) {
        return null
    }
    const input = card as Record<string, unknown>
    if (input.schema_version !== GOAL_ROUTE_CARD_SCHEMA_VERSION || typeof input.category !== 'string') {
        return null
    }
    if (!GOAL_ROUTE_CATEGORIES.includes(input.category as (typeof GOAL_ROUTE_CATEGORIES)[number])) {
        return null
    }
    const title = readRouteCardString(input.title, 80)
    const summary = readRouteCardString(input.summary, 220)
    const whatCanHappenNext = readRouteCardString(input.what_can_happen_next, 260)
    const whatWillNotHappen = readRouteCardString(input.what_will_not_happen, 260)
    const clarificationQuestion = input.clarification_question === null ? null : readRouteCardString(input.clarification_question, 220)
    const blockedReason = input.blocked_reason === null ? null : readRouteCardString(input.blocked_reason, 220)
    if (!title || !summary || !whatCanHappenNext || !whatWillNotHappen) {
        return null
    }
    if (input.clarification_question !== null && !clarificationQuestion) {
        return null
    }
    if (input.blocked_reason !== null && !blockedReason) {
        return null
    }
    const output: GoalRouteCard = {
        schema_version: GOAL_ROUTE_CARD_SCHEMA_VERSION,
        category: input.category as GoalRouteCard['category'],
        title,
        summary,
        what_can_happen_next: whatCanHappenNext,
        what_will_not_happen: whatWillNotHappen,
        needs_clarification: input.needs_clarification === true,
        clarification_question: clarificationQuestion,
        blocked_reason: blockedReason
    }
    return routeCardHasForbiddenText(output) ? null : output
}

function readRouteCardString(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, ' ')
    if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/.test(trimmed)) {
        return null
    }
    return trimmed
}

function routeCardHasForbiddenText(card: GoalRouteCard): boolean {
    const serialized = JSON.stringify(card).toLowerCase()
    return [
        'run_',
        'sentinel_session',
        'session_id',
        'decision_id',
        'approval_id',
        'approval_challenge',
        'plan_id',
        'task_id',
        'task_packet',
        'result_packet',
        'evidence_manifest',
        'copyable_worker_prompt',
        'gateway',
        'bearer',
        'authorization',
        'token',
        'client_nonce',
        'cockpit_ref',
        'sha256:'
    ].some((fragment) => serialized.includes(fragment))
}

function prunePlanBindings(now = Date.now()) {
    for (const [key, binding] of planBindings.entries()) {
        if (binding.state === 'consumed' || binding.expiresAt <= now) {
            planBindings.delete(key)
        }
    }
}

function pruneManualPacketBindings(now = Date.now()) {
    for (const [key, binding] of manualPacketBindings.entries()) {
        if (binding.state === 'consumed' || binding.expiresAt <= now) {
            manualPacketBindings.delete(key)
        }
    }
}

function pruneResultReviewBindings(now = Date.now()) {
    for (const [key, binding] of resultReviewBindings.entries()) {
        if (binding.state === 'consumed' || binding.expiresAt <= now) {
            resultReviewBindings.delete(key)
        }
    }
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
}

export function __resetPlanSessionBindingsForTest() {
    planBindings.clear()
    manualPacketBindings.clear()
    resultReviewBindings.clear()
}

function isSafeBearerToken(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 24 && value.length <= 512 && /^[\x21-\x7E]+$/.test(value)
}

function readGatewayOrigin(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
        return DEFAULT_CLASSIFY_BRIDGE_GATEWAY_ORIGIN
    }
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 160 || !/^[\x21-\x7E]+$/.test(trimmed)) {
        return null
    }

    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        return null
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null
    }
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        return null
    }
    if (!isLocalOrPrivateHostname(parsed.hostname)) {
        return null
    }
    return parsed.origin
}

function isLocalOrPrivateHostname(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
    if (host === 'localhost' || host === '::1') {
        return true
    }
    const parts = host.split('.')
    if (parts.length !== 4 || parts.some((part) => !/^[0-9]+$/.test(part))) {
        return false
    }
    const octets = parts.map((part) => Number(part))
    if (octets.some((part) => part < 0 || part > 255)) {
        return false
    }
    const [first, second] = octets
    return first === 127 || first === 10 || (first === 192 && second === 168) || (first === 172 && second >= 16 && second <= 31)
}

function classifyBridgeError(statusCode: number, code: ClassifyBridgeErrorCode) {
    const error = new Error(code) as Error & { statusCode: number; code: ClassifyBridgeErrorCode }
    error.statusCode = statusCode
    error.code = code
    return error
}

function isClassifyBridgeError(error: unknown): error is Error & { statusCode: number; code: ClassifyBridgeErrorCode } {
    const maybe = error as { statusCode?: unknown; code?: unknown }
    return typeof maybe?.statusCode === 'number' && typeof maybe?.code === 'string'
}
