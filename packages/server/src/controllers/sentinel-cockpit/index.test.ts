import { Readable } from 'stream'
import { Request, Response } from 'express'
import sentinelCockpitController, {
    COCKPIT_ERROR_SCHEMA_VERSION,
    COCKPIT_IDE_WORK_ACTION_PATH,
    COCKPIT_IDE_WORK_STATUS_PATH,
    COCKPIT_ROUTE_PREFIX,
    COCKPIT_SNAPSHOT_PATH,
    DEFAULT_FLOWISE_LOCAL_HOST,
    DEFAULT_FLOWISE_LOCAL_ORIGIN,
    FLOWISE_LOCAL_HOST,
    FLOWISE_LOCAL_HOST_ENV,
    FLOWISE_LOCAL_ORIGIN,
    FLOWISE_LOCAL_ORIGIN_ENV,
    admitRequest,
    rawGuardedHeadersAreSafe,
    readFlowiseLocalConfig,
    validateCockpitRequest,
    validateIdeWorkActionRequest,
    validateIdeWorkStatusRequest,
    validateManualPacketRequest,
    validatePlanDecisionRequest,
    validateResultReviewRequest
} from '.'
import * as classifyBridge from './classify.bridge'
import * as resumeBridge from './resume.bridge'
import * as snapshotStatic from './snapshot.static'

const guardedHeaders = [
    'Host',
    'Origin',
    'Referer',
    'Content-Type',
    'Content-Length',
    'Authorization',
    'Cookie',
    'Proxy-Authorization',
    'Transfer-Encoding',
    'Expect'
]

function buildReq(body: string, overrides: Partial<Request> = {}): Request {
    const req = Readable.from([body]) as unknown as Request
    Object.assign(req, {
        method: 'POST',
        path: COCKPIT_SNAPSHOT_PATH,
        originalUrl: `${COCKPIT_ROUTE_PREFIX}${COCKPIT_SNAPSHOT_PATH}`,
        rawHeaders: [
            'Host',
            FLOWISE_LOCAL_HOST,
            'Origin',
            FLOWISE_LOCAL_ORIGIN,
            'Content-Type',
            'application/json',
            'Content-Length',
            String(Buffer.byteLength(body))
        ],
        headers: {
            host: FLOWISE_LOCAL_HOST,
            origin: FLOWISE_LOCAL_ORIGIN,
            'content-type': 'application/json',
            'content-length': String(Buffer.byteLength(body))
        },
        ...overrides
    })
    return req
}

function buildRes(): Response & { bodyText: string; headers: Record<string, string> } {
    const res: any = {
        bodyText: '',
        headers: {},
        statusCode: 200,
        status: jest.fn(function status(code: number) {
            res.statusCode = code
            return res
        }),
        setHeader: jest.fn((name: string, value: string) => {
            res.headers[name.toLowerCase()] = value
        }),
        end: jest.fn((body: string) => {
            res.bodyText = body
            return res
        })
    }
    return res
}

function validRouteCard(overrides: Record<string, unknown> = {}) {
    return {
        schema_version: 'sentinel.qvc.route_card.v1',
        category: 'planning',
        title: 'Planning',
        summary: 'Sentinel understood this as a planning request.',
        what_can_happen_next: 'Sentinel can prepare a safe plain-English plan for review.',
        what_will_not_happen: 'No files are edited, no commands run, and no workers are launched.',
        needs_clarification: false,
        clarification_question: null,
        blocked_reason: null,
        ...overrides
    }
}

function validServerIdePreview(overrides: Record<string, unknown> = {}) {
    return {
        status_label: 'Backend preview ready',
        workflow_label: 'Safe planning workflow',
        persona_label: 'Planning reviewer',
        skill_label: 'Plain-English planning',
        summary: 'Sentinel can preview a safe planning path.',
        what_can_happen_next: 'Sentinel can show labels before any backend work is approved.',
        what_will_not_happen: 'No files change and no backend work starts.',
        approval_copy: 'Backend work would require a separate reviewed approval step.',
        expires_at_label: 'No preview timer',
        ...overrides
    }
}

function validServerIdeWork(overrides: Record<string, unknown> = {}) {
    return {
        schema_version: 'sentinel.qvc.ide_work_approval.v1',
        status: 'ok',
        state: 'approval_pending',
        status_label: 'Safe mock check available',
        workflow_label: 'Safe planning workflow',
        persona_label: 'Planning reviewer',
        skill_label: 'Plain-English planning',
        short_summary: 'Sentinel can rehearse backend-work approval without launching a worker.',
        current_safe_step: 'Approve the mock check only if you want a safe rehearsal.',
        what_can_happen_next: 'Sentinel can rehearse safe approval without launching a worker.',
        what_will_not_happen: 'No files change, no commands run, and no worker is launched.',
        approval_available: true,
        cancel_available: false,
        review_required_note: null,
        terminal_note: null,
        allowed_user_actions: ['approve_mock_backend_work'],
        blocked_actions: ['No files are edited here.', 'No worker is launched here.', 'No system actions start here.'],
        safe_error: null,
        ...overrides
    }
}

describe('sentinel cockpit controller admission', () => {
    it('rejects duplicate guarded raw headers before normalized header reliance', () => {
        for (const header of guardedHeaders) {
            expect(rawGuardedHeadersAreSafe([header, 'same', header, 'same'])).toBe(false)
            expect(rawGuardedHeadersAreSafe([header, 'one', header, 'two'])).toBe(false)
        }
    })

    it('accepts the exact local POST snapshot admission shape', () => {
        const req = buildReq(JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' }))

        expect(admitRequest(req).ok).toBe(true)
    })

    it('supports validated local Flowise origin and host overrides', () => {
        const originalOrigin = process.env[FLOWISE_LOCAL_ORIGIN_ENV]
        const originalHost = process.env[FLOWISE_LOCAL_HOST_ENV]
        const localOrigin = 'http://127.0.0.1:4300'
        const localHost = '127.0.0.1:4300'
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' })
        try {
            process.env[FLOWISE_LOCAL_ORIGIN_ENV] = localOrigin
            process.env[FLOWISE_LOCAL_HOST_ENV] = localHost
            const req = buildReq(body, {
                rawHeaders: [
                    'Host',
                    localHost,
                    'Origin',
                    localOrigin,
                    'Content-Type',
                    'application/json',
                    'Content-Length',
                    String(Buffer.byteLength(body))
                ],
                headers: {
                    host: localHost,
                    origin: localOrigin,
                    'content-type': 'application/json',
                    'content-length': String(Buffer.byteLength(body))
                }
            } as Partial<Request>)

            expect(readFlowiseLocalConfig(process.env)).toEqual({ ok: true, origin: localOrigin, host: localHost })
            expect(admitRequest(req).ok).toBe(true)
        } finally {
            if (originalOrigin === undefined) delete process.env[FLOWISE_LOCAL_ORIGIN_ENV]
            else process.env[FLOWISE_LOCAL_ORIGIN_ENV] = originalOrigin
            if (originalHost === undefined) delete process.env[FLOWISE_LOCAL_HOST_ENV]
            else process.env[FLOWISE_LOCAL_HOST_ENV] = originalHost
        }
    })

    it('fails closed for malformed or non-local Flowise origin and host overrides', () => {
        const originalOrigin = process.env[FLOWISE_LOCAL_ORIGIN_ENV]
        const originalHost = process.env[FLOWISE_LOCAL_HOST_ENV]
        try {
            process.env[FLOWISE_LOCAL_ORIGIN_ENV] = 'https://example.com'
            process.env[FLOWISE_LOCAL_HOST_ENV] = 'example.com'

            expect(readFlowiseLocalConfig(process.env)).toEqual({
                ok: false,
                origin: DEFAULT_FLOWISE_LOCAL_ORIGIN,
                host: DEFAULT_FLOWISE_LOCAL_HOST
            })
            expect(admitRequest(buildReq(JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' })))).toEqual({
                ok: false,
                statusCode: 403,
                code: 'header_denied'
            })
        } finally {
            if (originalOrigin === undefined) delete process.env[FLOWISE_LOCAL_ORIGIN_ENV]
            else process.env[FLOWISE_LOCAL_ORIGIN_ENV] = originalOrigin
            if (originalHost === undefined) delete process.env[FLOWISE_LOCAL_HOST_ENV]
            else process.env[FLOWISE_LOCAL_HOST_ENV] = originalHost
        }
    })

    it('rejects unsafe normalized headers', () => {
        const req = buildReq(JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' }), {
            headers: {
                host: FLOWISE_LOCAL_HOST,
                origin: FLOWISE_LOCAL_ORIGIN,
                authorization: 'Bearer blocked',
                'content-type': 'application/json'
            }
        } as Partial<Request>)

        expect(admitRequest(req)).toEqual({ ok: false, statusCode: 403, code: 'header_denied' })
    })
})

describe('sentinel cockpit request validation', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('accepts kind-specific goal, choice, and resume bodies', () => {
        expect(validateCockpitRequest({ request_kind: 'goal', plain_goal: ' plan\nnext\tstep ' })).toEqual({
            request_kind: 'goal',
            plain_goal: 'plan next step'
        })
        expect(validateCockpitRequest({ request_kind: 'choice', choice: 'confirm_result_source_status_only' })).toEqual({
            request_kind: 'choice',
            choice: 'confirm_result_source_status_only'
        })
        expect(validateCockpitRequest({ request_kind: 'resume', checkpoint_ref: 'checkpoint_123' })).toEqual({
            request_kind: 'resume',
            checkpoint_ref: 'checkpoint_123'
        })
    })

    it('rejects cross-kind, missing discriminator, and forbidden fields', () => {
        expect(() => validateCockpitRequest({ request_kind: 'goal', choice: 'continue', plain_goal: 'x' })).toThrow('invalid_request')
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', plain_constraints: 'blocked' })).toThrow(
            'invalid_request'
        )
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', displayed_prompt_ref: 'blocked' })).toThrow(
            'invalid_request'
        )
        expect(() => validateCockpitRequest({ plain_goal: 'x' })).toThrow('invalid_request')
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', token: 'blocked' })).toThrow('invalid_request')
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: '   ' })).toThrow('invalid_request')
        expect(validateCockpitRequest({ request_kind: 'goal', plain_goal: 'run a worker command' })).toEqual({
            request_kind: 'goal',
            plain_goal: 'run a worker command'
        })
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'use bearer token safely' })).toThrow('invalid_request')
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'safe\u200Bgoal' })).toThrow('invalid_request')
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'abcd1234abcd1234abcd1234abcd1234' })).toThrow(
            'invalid_request'
        )
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'safe\u0007goal' })).toThrow('invalid_request')
        expect(() => validateCockpitRequest({ request_kind: 'resume', checkpoint_ref: 'checkpoint_123', run_id: 'run_123' })).toThrow(
            'invalid_request'
        )
    })

    it('keeps goal client_nonce flag-gated and validates plan decision bodies', () => {
        const clientNonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
        const cockpitRef = 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90'

        jest.spyOn(classifyBridge, 'planDecisionBridgeIsRequested').mockReturnValue(false)
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: clientNonce })).toThrow(
            'invalid_request'
        )

        jest.spyOn(classifyBridge, 'planDecisionBridgeIsRequested').mockReturnValue(true)
        expect(validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: clientNonce })).toEqual({
            request_kind: 'goal',
            plain_goal: 'x',
            client_nonce: clientNonce
        })
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: 'short' })).toThrow(
            'plan_decision_invalid_input'
        )
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: '' })).toThrow(
            'plan_decision_invalid_input'
        )
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: 123 })).toThrow(
            'plan_decision_invalid_input'
        )
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: `${'a'.repeat(129)}` })).toThrow(
            'plan_decision_invalid_input'
        )
        expect(() => validateCockpitRequest({ request_kind: 'goal', plain_goal: 'x', client_nonce: 'nonce_abcdefghijklmnop!' })).toThrow(
            'plan_decision_invalid_input'
        )
        expect(
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toEqual({
            request_kind: 'plan_decision',
            cockpit_ref: cockpitRef,
            client_nonce: clientNonce,
            decision: 'approve_plan'
        })
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: '',
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: 123,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: 'cockpit_short',
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: 'session_a1b2c3d4e5f60718293a4b5c6d7e8f90',
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90!',
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: `cockpit_${'a'.repeat(121)}`,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                decision: 'approve_plan',
                revision_text: 'not allowed'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                decision: 'revise_plan'
            })
        ).toThrow('plan_decision_invalid_input')
        expect(() =>
            validatePlanDecisionRequest({
                request_kind: 'plan_decision',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                decision: 'revise_plan',
                revision_text: 'use bearer token safely'
            })
        ).toThrow('plan_decision_invalid_input')
    })

    it('validates manual worker packet requests with only opaque authority fields', () => {
        const clientNonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
        const cockpitRef = 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90'

        expect(
            validateManualPacketRequest({ request_kind: 'manual_worker_packet', cockpit_ref: cockpitRef, client_nonce: clientNonce })
        ).toEqual({
            request_kind: 'manual_worker_packet',
            cockpit_ref: cockpitRef,
            client_nonce: clientNonce
        })
        expect(() =>
            validateManualPacketRequest({
                request_kind: 'manual_worker_packet',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                worker_type: 'manual_codex'
            })
        ).toThrow('manual_packet_invalid_input')
        expect(() =>
            validateManualPacketRequest({
                request_kind: 'manual_worker_packet',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                plan_id: 'plan_hidden'
            })
        ).toThrow('manual_packet_invalid_input')
        expect(() =>
            validateManualPacketRequest({ request_kind: 'manual_worker_packet', cockpit_ref: 'cockpit_short', client_nonce: clientNonce })
        ).toThrow('manual_packet_invalid_input')
        expect(() =>
            validateManualPacketRequest({ request_kind: 'manual_worker_packet', cockpit_ref: cockpitRef, client_nonce: 'short' })
        ).toThrow('manual_packet_invalid_input')
    })

    it('validates result review requests with pasted text only', () => {
        const clientNonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
        const cockpitRef = 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90'
        const resultText = 'Manual worker completed the requested review outside this page.'

        expect(
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: resultText,
                review_only_confirmation: true
            })
        ).toEqual({
            request_kind: 'result_review',
            cockpit_ref: cockpitRef,
            client_nonce: clientNonce,
            result_text: resultText,
            review_only_confirmation: true
        })
        expect(() =>
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: resultText
            })
        ).toThrow('result_review_invalid_input')
        expect(() =>
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: resultText,
                review_only_confirmation: false
            })
        ).toThrow('result_review_invalid_input')
        expect(() =>
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: resultText,
                review_only_confirmation: true,
                task_id: 'task_hidden'
            })
        ).toThrow('result_review_invalid_input')
        expect(() =>
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: '{"result_packet":true}',
                review_only_confirmation: true
            })
        ).toThrow('result_review_invalid_input')
        expect(() =>
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: 'This result mentions task_id and must be blocked.',
                review_only_confirmation: true
            })
        ).toThrow('result_review_invalid_input')
        expect(() =>
            validateResultReviewRequest({
                request_kind: 'result_review',
                cockpit_ref: cockpitRef,
                client_nonce: clientNonce,
                result_text: 'short',
                review_only_confirmation: true
            })
        ).toThrow('result_review_invalid_input')
    })

    it('validates IDE mock work requests with action-only local bodies', () => {
        expect(validateIdeWorkActionRequest({ request_kind: 'ide_work_action', action: 'approve_mock_backend_work' })).toEqual({
            request_kind: 'ide_work_action',
            action: 'approve_mock_backend_work'
        })
        expect(validateIdeWorkActionRequest({ request_kind: 'ide_work_action', action: 'cancel_mock_backend_work' })).toEqual({
            request_kind: 'ide_work_action',
            action: 'cancel_mock_backend_work'
        })
        expect(validateIdeWorkStatusRequest({ request_kind: 'ide_work_status' })).toEqual({
            request_kind: 'ide_work_status'
        })
        expect(() => validateIdeWorkActionRequest({ request_kind: 'ide_work_action', action: 'launch_worker' })).toThrow(
            'ide_work_invalid_input'
        )
        expect(() =>
            validateIdeWorkActionRequest({
                request_kind: 'ide_work_action',
                action: 'approve_mock_backend_work',
                cockpit_ref: 'cockpit_hidden'
            })
        ).toThrow('ide_work_invalid_input')
        expect(() => validateIdeWorkStatusRequest({ request_kind: 'ide_work_status', run_id: 'run_hidden' })).toThrow(
            'ide_work_invalid_input'
        )
    })
})

describe('sentinel cockpit controller responses', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('returns route-local JSON with closed headers for a valid snapshot', async () => {
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toBe('application/json; charset=utf-8')
        expect(res.headers['cache-control']).toBe('no-store')
        expect(res.headers['x-content-type-options']).toBe('nosniff')
        expect(parsed.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(parsed.status).toBe('ok')
        expect(parsed.snapshot_ref).toBe('snapshot_goal_intake')
        expect(parsed.state).toBe('goal_intake')
        expect(parsed.next_safe_action).toBe('planning_deferred')
        expect(parsed.allowed_user_actions).toEqual(['none'])
        expect(parsed.checkpoint_ref).toBeNull()
        expect(parsed.worker_status).toBe('none')
        expect(parsed.result_status).toBe('not_started')
        expect(res.bodyText).not.toContain('audit this repo')
        expect(res.bodyText).not.toContain('revise')
        expect(res.bodyText).not.toContain('continue')
    })

    it('rejects aborted request bodies as invalid JSON', async () => {
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' })
        const req = buildReq(body) as Request & {
            on: jest.Mock
            setEncoding: jest.Mock
        }
        req.setEncoding = jest.fn()
        req.on = jest.fn((event: string, handler: () => void) => {
            if (event === 'aborted') {
                setImmediate(handler)
            }
            return req
        })
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(400)
        expect(parsed.error.code).toBe('invalid_json')
    })

    it('redacts status-only result confirmation details', async () => {
        const body = JSON.stringify({ request_kind: 'choice', choice: 'confirm_result_source_status_only' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(parsed.state).not.toBe('accepted')
        expect(parsed.accepted_state).toBe('not_accepted')
        expect(parsed.evidence_refs).toEqual([])
        expect(parsed.manual_handoff_preview).toBeNull()
    })

    it('keeps resume requests static when the live resume bridge is not requested', async () => {
        jest.spyOn(resumeBridge, 'resumeBridgeIsRequested').mockReturnValue(false)
        const body = JSON.stringify({ request_kind: 'resume', checkpoint_ref: 'checkpoint_123' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(parsed.snapshot_ref).toBe('snapshot_manual_only')
        expect(parsed.checkpoint_ref).toBe('checkpoint_123')
        expect(parsed.allowed_user_actions).toEqual(['none'])
    })

    it('keeps goal requests static when the live classify bridge is not requested', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(false)
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'classify this goal' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(parsed.snapshot_ref).toBe('snapshot_goal_intake')
        expect(parsed.state).toBe('goal_intake')
        expect(parsed.allowed_user_actions).toEqual(['none'])
        expect(res.bodyText).not.toContain('classify this goal')
    })

    it('uses the server-side classify bridge only for goal requests when enabled', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        const createClassifySnapshot = jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_goal_classify_display',
            state: 'goal_classified',
            plain_summary: 'Sentinel classified this goal for intake. Planning remains deferred, and no file changes were made.',
            next_safe_action: 'planning_deferred',
            allowed_user_actions: ['none'],
            blocked_actions: ['Plan approval is not available here.', 'Execution is not available here.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none'
        })
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'classify this goal' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(createClassifySnapshot).toHaveBeenCalledWith({ request_kind: 'goal', plain_goal: 'classify this goal' })
        expect(parsed.snapshot_ref).toBe('snapshot_goal_classify_display')
        expect(parsed.state).toBe('goal_classified')
        expect(parsed.allowed_user_actions).toEqual(['none'])
        expect(res.bodyText).not.toContain('classify this goal')
    })

    it('preserves sanitized route guidance on classify snapshot responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_goal_classify_blocked',
            state: 'goal_blocked',
            plain_summary: 'Sentinel blocked this goal for safety. Nothing was executed.',
            next_safe_action: 'goal_blocked',
            allowed_user_actions: ['none'],
            blocked_actions: ['Execution is not available here.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none',
            route_card: validRouteCard({
                category: 'blocked_unsafe',
                title: 'Blocked for safety',
                summary: 'Sentinel understood this as outside the current safety boundary.',
                what_can_happen_next: 'Rewrite the goal as planning, review, diagnosis, or manual handoff guidance.',
                what_will_not_happen: 'No commands run, no workers are launched, and no MCP action starts here.',
                blocked_reason: 'The request asks for an action this cockpit is not allowed to perform.'
            })
        } as any)
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'deploy through shell' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(parsed.route_card).toEqual(
            validRouteCard({
                category: 'blocked_unsafe',
                title: 'Blocked for safety',
                summary: 'Sentinel understood this as outside the current safety boundary.',
                what_can_happen_next: 'Rewrite the goal as planning, review, diagnosis, or manual handoff guidance.',
                what_will_not_happen: 'No commands run, no workers are launched, and no MCP action starts here.',
                blocked_reason: 'The request asks for an action this cockpit is not allowed to perform.'
            })
        )
        expect(res.bodyText).not.toContain('deploy through shell')
    })

    it('preserves reduced IDE preview projection on classify snapshot responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_goal_classify_display',
            state: 'goal_classified',
            plain_summary: 'Sentinel classified this goal for intake. Planning remains deferred, and no file changes were made.',
            next_safe_action: 'planning_deferred',
            allowed_user_actions: ['none'],
            blocked_actions: ['Plan approval is not available here.', 'Execution is not available here.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none',
            route_card: validRouteCard(),
            ide_preview: validServerIdePreview()
        } as any)
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'classify this goal' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(Object.keys(parsed.ide_preview)).toEqual(Object.keys(validServerIdePreview()))
        expect(parsed.ide_preview).toEqual(validServerIdePreview())
        const serializedPreview = JSON.stringify(parsed.ide_preview)
        expect(res.bodyText).not.toContain('sentinel.qvc.ide_preview.v1')
        expect(serializedPreview).not.toContain('allowed_user_actions')
        expect(serializedPreview).not.toContain('approval_required')
        expect(serializedPreview).not.toContain('blocked_reason')
    })

    it('fails closed for unsafe IDE preview projection on classify snapshot responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_goal_classify_display',
            state: 'goal_classified',
            plain_summary: 'Sentinel classified this goal for intake. Planning remains deferred, and no file changes were made.',
            next_safe_action: 'planning_deferred',
            allowed_user_actions: ['none'],
            blocked_actions: ['Plan approval is not available here.', 'Execution is not available here.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none',
            ide_preview: validServerIdePreview({
                summary: 'Provider output with token material must never display.'
            })
        } as any)
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'classify this goal' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(500)
        expect(parsed.error.code).toBe('invalid_snapshot')
        expect(res.bodyText).not.toContain('Provider output')
    })

    it('fails closed for unsafe route guidance on classify snapshot responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_goal_classify_display',
            state: 'goal_classified',
            plain_summary: 'Sentinel classified this goal for intake. Planning remains deferred, and no file changes were made.',
            next_safe_action: 'planning_deferred',
            allowed_user_actions: ['none'],
            blocked_actions: ['Plan approval is not available here.', 'Execution is not available here.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none',
            route_card: validRouteCard({
                summary: 'Gateway token material must never display.'
            })
        } as any)
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'classify this goal' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(500)
        expect(parsed.error.code).toBe('invalid_snapshot')
        expect(res.bodyText).not.toContain('Gateway token')
    })

    it('preserves sanitized route guidance on nonce-bound plan-session responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'planDecisionBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.plan_session.v1',
            status: 'ok',
            state: 'plan_decision_required',
            plain_summary: 'Sentinel can prepare a plan after an explicit decision.',
            next_safe_action: 'choose_plan_decision',
            allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
            blocked_actions: ['No files are edited here.'],
            cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90',
            plan_card: null,
            safe_error: null,
            route_card: validRouteCard()
        } as any)
        const body = JSON.stringify({
            request_kind: 'goal',
            plain_goal: 'plan this work',
            client_nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
        })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(parsed.schema_version).toBe('sentinel.cockpit_bridge.plan_session.v1')
        expect(parsed.route_card).toEqual(validRouteCard())
        expect(res.bodyText).not.toContain('client_nonce')
    })

    it('preserves reduced IDE preview on nonce-bound plan-session responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'planDecisionBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.plan_session.v1',
            status: 'ok',
            state: 'plan_decision_required',
            plain_summary: 'Sentinel can prepare a plan after an explicit decision.',
            next_safe_action: 'choose_plan_decision',
            allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
            blocked_actions: ['No files are edited here.'],
            cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90',
            plan_card: null,
            safe_error: null,
            route_card: validRouteCard(),
            ide_preview: validServerIdePreview()
        } as any)
        const body = JSON.stringify({
            request_kind: 'goal',
            plain_goal: 'plan this work',
            client_nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
        })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(parsed.schema_version).toBe('sentinel.cockpit_bridge.plan_session.v1')
        expect(parsed.ide_preview).toEqual(validServerIdePreview())
        expect(Object.keys(parsed.ide_preview)).toEqual(Object.keys(validServerIdePreview()))
        expect(res.bodyText).not.toContain('sentinel.qvc.ide_preview.v1')
        expect(res.bodyText).not.toContain('ide_preview_ready')
        expect(res.bodyText).not.toContain('client_nonce')
        expect(res.bodyText).not.toContain('gateway')
    })

    it('preserves sanitized IDE mock work on nonce-bound plan-session responses', async () => {
        jest.spyOn(classifyBridge, 'classifyBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'planDecisionBridgeIsRequested').mockReturnValue(true)
        jest.spyOn(classifyBridge, 'createClassifySnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.plan_session.v1',
            status: 'ok',
            state: 'plan_decision_required',
            plain_summary: 'Sentinel can prepare a plan after an explicit decision.',
            next_safe_action: 'choose_plan_decision',
            allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
            blocked_actions: ['No files are edited here.'],
            cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90',
            plan_card: null,
            safe_error: null,
            route_card: validRouteCard(),
            ide_work: validServerIdeWork()
        } as any)
        const body = JSON.stringify({
            request_kind: 'goal',
            plain_goal: 'plan this work',
            client_nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
        })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(200)
        expect(parsed.ide_work).toEqual(validServerIdeWork())
        expect(res.bodyText).not.toContain('client_nonce')
        expect(res.bodyText).not.toContain('gateway')
        expect(res.bodyText).not.toContain('task_packet')
    })

    it('routes IDE mock work action and status calls through the server bridge only', async () => {
        const actionSpy = jest.spyOn(classifyBridge, 'createIdeWorkActionSession').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.ide_work.v1',
            status: 'ok',
            ide_work: validServerIdeWork({
                schema_version: 'sentinel.qvc.ide_work_progress.v1',
                state: 'mock_in_progress',
                status_label: 'Mock check in progress',
                approval_available: false,
                cancel_available: true,
                allowed_user_actions: ['cancel_mock_backend_work']
            }) as any,
            safe_error: null
        })
        const statusSpy = jest.spyOn(classifyBridge, 'createIdeWorkStatusSession').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.ide_work.v1',
            status: 'ok',
            ide_work: validServerIdeWork({
                schema_version: 'sentinel.qvc.ide_work_result_review_required.v1',
                state: 'review_required',
                approval_available: false,
                cancel_available: false,
                review_required_note: 'Review is required before any work can be accepted.',
                terminal_note: 'No files changed and no worker was launched.',
                allowed_user_actions: ['none']
            }) as any,
            safe_error: null
        })

        const actionBody = JSON.stringify({ request_kind: 'ide_work_action', action: 'approve_mock_backend_work' })
        const actionReq = buildReq(actionBody, {
            path: COCKPIT_IDE_WORK_ACTION_PATH,
            originalUrl: `${COCKPIT_ROUTE_PREFIX}${COCKPIT_IDE_WORK_ACTION_PATH}`
        } as Partial<Request>)
        const actionRes = buildRes()
        await sentinelCockpitController.handleSnapshot(actionReq, actionRes)

        expect(actionSpy).toHaveBeenCalledWith({ request_kind: 'ide_work_action', action: 'approve_mock_backend_work' })
        expect(actionRes.statusCode).toBe(200)
        expect(JSON.parse(actionRes.bodyText).ide_work.state).toBe('mock_in_progress')

        const statusBody = JSON.stringify({ request_kind: 'ide_work_status' })
        const statusReq = buildReq(statusBody, {
            path: COCKPIT_IDE_WORK_STATUS_PATH,
            originalUrl: `${COCKPIT_ROUTE_PREFIX}${COCKPIT_IDE_WORK_STATUS_PATH}`
        } as Partial<Request>)
        const statusRes = buildRes()
        await sentinelCockpitController.handleSnapshot(statusReq, statusRes)

        expect(statusSpy).toHaveBeenCalledWith({ request_kind: 'ide_work_status' })
        expect(statusRes.statusCode).toBe(200)
        expect(JSON.parse(statusRes.bodyText).ide_work.state).toBe('review_required')
    })

    it('uses the server-side resume bridge only for resume requests when enabled', async () => {
        jest.spyOn(resumeBridge, 'resumeBridgeIsRequested').mockReturnValue(true)
        const createResumeSnapshot = jest.spyOn(resumeBridge, 'createResumeSnapshot').mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
            status: 'ok',
            snapshot_ref: 'snapshot_resume_status',
            state: 'resume_status',
            plain_summary: 'Sentinel resume status is available for display.',
            next_safe_action: 'review_resume_status',
            allowed_user_actions: ['none'],
            blocked_actions: ['This bridge reports status only and cannot perform actions.'],
            checkpoint_ref: 'checkpoint_123',
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_accepted',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none'
        })
        const body = JSON.stringify({ request_kind: 'resume', checkpoint_ref: 'checkpoint_123' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(createResumeSnapshot).toHaveBeenCalledWith({ request_kind: 'resume', checkpoint_ref: 'checkpoint_123' })
        expect(parsed.snapshot_ref).toBe('snapshot_resume_status')
        expect(parsed.checkpoint_ref).toBe('checkpoint_123')
    })

    it('returns a closed route-local error when static snapshot creation fails', async () => {
        jest.spyOn(snapshotStatic, 'createStaticSnapshot').mockImplementation(() => {
            throw new Error('do not leak this detail')
        })
        const body = JSON.stringify({ request_kind: 'goal', plain_goal: 'audit this repo' })
        const req = buildReq(body)
        const res = buildRes()

        await sentinelCockpitController.handleSnapshot(req, res)

        const parsed = JSON.parse(res.bodyText)
        expect(res.statusCode).toBe(500)
        expect(parsed).toEqual({
            schema_version: COCKPIT_ERROR_SCHEMA_VERSION,
            status: 'error',
            error: {
                code: 'internal_error',
                message: 'The cockpit snapshot request was blocked.'
            }
        })
        expect(res.bodyText).not.toContain('do not leak')
    })
})

describe('sentinel cockpit classify bridge', () => {
    const gatewayToken = 'gw_local_placeholder_1234567890'
    const goalText = 'run a worker command safely'
    const clientNonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

    afterEach(() => {
        classifyBridge.__resetPlanSessionBindingsForTest()
    })

    function buildClassifyConfig(envOverrides: NodeJS.ProcessEnv = {}) {
        return classifyBridge.readClassifyBridgeConfig({
            BEZZTY_FLOWISE_SENTINEL_CLASSIFY_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN: gatewayToken,
            ...envOverrides
        })
    }

    function validGatewayClassify(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.gateway.v1',
            status: 'needs_user',
            run_id: 'run_hidden_123',
            sentinel_session_id: 'session_hidden_123',
            decision_id: 'decision_hidden_123',
            goal_text: goalText,
            approval_challenge: 'challenge_hidden_123',
            approval_challenge_expires_at: '2099-01-01T00:00:00.000Z',
            approval_challenge_hash: 'challenge_hash_hidden_123',
            action_inputs: { blocked: true },
            allowed_actions: ['draft_plan'],
            risk_class: 'risk_hidden',
            route_card: validGatewayRouteCard(),
            ...overrides
        }
    }

    function validGatewayRouteCard(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.qvc.route_card.v1',
            category: 'planning',
            title: 'Planning',
            summary: 'Sentinel understood this as a planning request.',
            what_can_happen_next: 'Sentinel can prepare a safe plain-English plan for your review.',
            what_will_not_happen: 'No files are edited, no commands run, and no workers are launched.',
            needs_clarification: false,
            clarification_question: null,
            blocked_reason: null,
            ...overrides
        }
    }

    function validGatewayIdePreview(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.qvc.ide_preview.v1',
            status: 'ide_preview_ready',
            workflow_label: 'Safe planning workflow',
            persona_label: 'Planning reviewer',
            skill_label: 'Plain-English planning',
            summary: 'Sentinel can preview a safe planning path.',
            what_can_happen_next: 'Sentinel can show labels before any backend work is approved.',
            what_will_not_happen: 'No files change and no backend work starts.',
            approval_required: true,
            allowed_user_actions: ['none'],
            blocked_reason: null,
            expires_at_label: 'No preview timer',
            ...overrides
        }
    }

    function validGatewayIdeWork(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.qvc.ide_work_approval.v1',
            status: 'ok',
            state: 'approval_pending',
            status_label: 'Safe mock check available',
            workflow_label: 'Safe planning workflow',
            persona_label: 'Planning reviewer',
            skill_label: 'Plain-English planning',
            short_summary: 'Sentinel can rehearse backend-work approval without launching a worker.',
            current_safe_step: 'Approve the mock check only if you want a safe rehearsal.',
            what_can_happen_next: 'Sentinel can rehearse safe approval without launching a worker.',
            what_will_not_happen: 'No files change, no commands run, and no worker is launched.',
            approval_available: true,
            cancel_available: false,
            review_required_note: null,
            terminal_note: null,
            allowed_user_actions: ['approve_mock_backend_work'],
            blocked_actions: ['No files are edited here.', 'No worker is launched here.', 'No system actions start here.'],
            safe_error: null,
            ...overrides
        }
    }

    function validGatewayDraftPlan(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.gateway.v1',
            status: 'ok',
            plan_id: 'plan_hidden_123',
            approval_id: 'ap_hidden_123',
            ...overrides
        }
    }

    function validGatewayManualPacket(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.gateway.v1',
            status: 'ok',
            task_id: 'task_hidden_123',
            task_packet_hash: 'sha256:abcdef1234567890',
            task_packet: { objective: 'raw packet hidden' },
            copyable_worker_prompt: 'raw worker prompt hidden',
            ...overrides
        }
    }

    function validGatewayResultReview(overrides: Record<string, unknown> = {}) {
        const reviewState = String(overrides.review_state || 'accepted')
        return {
            schema_version: 'sentinel.gateway.v1',
            status: reviewState,
            run_id: 'run_hidden_123',
            sentinel_session_id: 'session_hidden_123',
            task_id: 'task_hidden_123',
            task_packet_hash: `sha256:${'a'.repeat(64)}`,
            review_state: reviewState,
            next_safe_action: 'accepted_complete',
            result_id: 'result_hidden_123',
            shield_review_id: 'shield_hidden_123',
            findings: [{ code: 'raw_hidden_finding' }],
            ...overrides
        }
    }

    function gatewayResponse(body: unknown, status = 200, contentType = 'application/json; charset=utf-8') {
        return {
            status,
            headers: { get: () => contentType },
            text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
        }
    }

    it('returns static goal intake and makes no gateway call when disabled', async () => {
        const config = classifyBridge.readClassifyBridgeConfig({})
        const fetchImpl = jest.fn()

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(fetchImpl).not.toHaveBeenCalled()
        expect(snapshot.snapshot_ref).toBe('snapshot_goal_intake')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
    })

    it('builds exactly one classify gateway request and projects a safe display card', async () => {
        const config = buildClassifyConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify()))

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )
        const [url, init] = fetchImpl.mock.calls[0]
        const gatewayBody = JSON.parse(init.body)
        const serialized = JSON.stringify(snapshot)

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        expect(url).toBe('http://127.0.0.1:39173/v1/intent/classify')
        expect(init).toEqual(
            expect.objectContaining({
                method: 'POST',
                redirect: 'manual',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${gatewayToken}`,
                    'Content-Type': 'application/json'
                }
            })
        )
        expect(gatewayBody).toEqual({
            schema_version: 'sentinel.gateway.v1',
            request_id: 'req_test_123',
            client: {
                client_type: 'flowise',
                client_instance_id: 'flowise_sentinel_cockpit'
            },
            operator: {
                operator_id: 'flowise_local_operator'
            },
            goal_text: goalText
        })
        expect(gatewayBody).not.toHaveProperty('run_id')
        expect(gatewayBody).not.toHaveProperty('sentinel_session_id')
        expect(gatewayBody).not.toHaveProperty('decision_id')
        expect(snapshot.snapshot_ref).toBe('snapshot_goal_classify_display')
        expect(snapshot.state).toBe('goal_classified')
        expect(snapshot.next_safe_action).toBe('planning_deferred')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
        expect(snapshot.route_card).toEqual(validGatewayRouteCard())
        expect(snapshot.checkpoint_ref).toBeNull()
        expect(snapshot.evidence_refs).toEqual([])
        expect(snapshot.manual_handoff_preview).toBeNull()
        expect(serialized).not.toContain(goalText)
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('session_hidden_123')
        expect(serialized).not.toContain('decision_hidden_123')
        expect(serialized).not.toContain('approval_challenge')
        expect(serialized).not.toContain('allowed_actions')
        expect(serialized).not.toContain('action_inputs')
        expect(serialized).not.toContain('risk_hidden')
    })

    it('projects reduced IDE preview only behind the Flowise projection flag', async () => {
        const validClassify = validGatewayClassify({ ide_preview: validGatewayIdePreview() })
        const flagOffFetch = jest.fn().mockResolvedValue(gatewayResponse(validClassify))
        const flagOffSnapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config: buildClassifyConfig(), fetchImpl: flagOffFetch as any }
        )
        expect(flagOffSnapshot.ide_preview).toBeUndefined()

        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_IDE_PREVIEW_PROJECTION: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validClassify))
        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any }
        )
        const serialized = JSON.stringify(snapshot)

        expect(snapshot.ide_preview).toEqual(validServerIdePreview())
        expect(Object.keys(snapshot.ide_preview)).toEqual(Object.keys(validServerIdePreview()))
        const serializedPreview = JSON.stringify(snapshot.ide_preview)
        expect(serialized).not.toContain('sentinel.qvc.ide_preview.v1')
        expect(serialized).not.toContain('ide_preview_ready')
        expect(serializedPreview).not.toContain('approval_required')
        expect(serializedPreview).not.toContain('allowed_user_actions')
        expect(serializedPreview).not.toContain('blocked_reason')
        expect(serialized).not.toContain(goalText)
    })

    it('projects IDE mock work only behind projection and action flags', async () => {
        const validClassify = validGatewayClassify({ ide_work: validGatewayIdeWork() })
        const flagOffFetch = jest.fn().mockResolvedValue(gatewayResponse(validClassify))
        const flagOffSnapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            {
                config: buildClassifyConfig({
                    BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
                }),
                fetchImpl: flagOffFetch as any
            }
        )
        expect(flagOffSnapshot.ide_work).toBeUndefined()

        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_IDE_WORK_PROJECTION: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validClassify))
        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        const serialized = JSON.stringify(planSession)

        expect(planSession.ide_work).toEqual(
            validServerIdeWork({
                approval_available: false,
                allowed_user_actions: ['none']
            })
        )
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('session_hidden_123')
        expect(serialized).not.toContain('decision_hidden_123')
        expect(serialized).not.toContain('approval_challenge')
        expect(serialized).not.toContain('task_packet')
        expect(serialized).not.toContain(gatewayToken)
    })

    it('creates server-held IDE mock work action sessions without browser-supplied hidden values', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_IDE_WORK_PROJECTION: '1',
            BEZZTY_FLOWISE_SENTINEL_IDE_WORK_ACTIONS: '1'
        })
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify({ ide_work: validGatewayIdeWork() })))
            .mockResolvedValueOnce(
                gatewayResponse({
                    schema_version: 'sentinel.gateway.v1',
                    status: 'ok',
                    ide_work: validGatewayIdeWork({
                        schema_version: 'sentinel.qvc.ide_work_progress.v1',
                        state: 'mock_in_progress',
                        status_label: 'Mock check in progress',
                        current_safe_step: 'Wait for the mock check or cancel it.',
                        approval_available: false,
                        cancel_available: true,
                        allowed_user_actions: ['cancel_mock_backend_work']
                    })
                })
            )

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_classify_123' }
        )
        expect(planSession.ide_work.allowed_user_actions).toEqual(['approve_mock_backend_work'])

        const actionSession = await classifyBridge.createIdeWorkActionSession(
            { request_kind: 'ide_work_action', action: 'approve_mock_backend_work' },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_ide_work_123' }
        )
        const [url, init] = fetchImpl.mock.calls[1]
        const body = JSON.parse(init.body)

        expect(url).toBe('http://127.0.0.1:39173/v1/ide-work/action')
        expect(body).toEqual({
            schema_version: 'sentinel.gateway.v1',
            request_id: 'req_ide_work_123',
            client: {
                client_type: 'flowise',
                client_instance_id: 'flowise_sentinel_cockpit'
            },
            operator: {
                operator_id: 'flowise_local_operator'
            },
            run_id: 'run_hidden_123',
            sentinel_session_id: 'session_hidden_123',
            request_kind: 'ide_work_action',
            action: 'approve_mock_backend_work'
        })
        expect(actionSession.ide_work.state).toBe('mock_in_progress')
        expect(actionSession.ide_work.allowed_user_actions).toEqual(['cancel_mock_backend_work'])
        expect(JSON.stringify(actionSession)).not.toContain(gatewayToken)
    })

    it('omits unsafe IDE mock work projections while preserving the plan session', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_IDE_WORK_PROJECTION: '1',
            BEZZTY_FLOWISE_SENTINEL_IDE_WORK_ACTIONS: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    ide_work: validGatewayIdeWork({
                        short_summary: 'Provider model confidence should not display.'
                    })
                })
            )
        )

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(planSession.state).toBe('plan_decision_required')
        expect(planSession.ide_work).toBeUndefined()
    })

    it.each([
        ['disabled', 'ide_preview_disabled', 'Backend preview is off'],
        ['unavailable', 'ide_preview_unavailable', 'Backend preview unavailable'],
        ['ready', 'ide_preview_ready', 'Backend preview ready'],
        ['clarification', 'ide_preview_needs_clarification', 'Backend preview needs clarification'],
        ['blocked', 'ide_preview_blocked', 'Backend preview blocked'],
        ['expired', 'ide_preview_expired', 'Backend preview expired'],
        ['stopped', 'ide_preview_stopped', 'Backend preview stopped']
    ])('maps IDE preview status %s to a static browser label', async (_label, status, statusLabel) => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_IDE_PREVIEW_PROJECTION: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    ide_preview: validGatewayIdePreview({
                        status,
                        workflow_label: status === 'ide_preview_ready' ? 'Safe planning workflow' : 'No backend preview',
                        persona_label: status === 'ide_preview_ready' ? 'Planning reviewer' : 'No expert selected',
                        skill_label: status === 'ide_preview_ready' ? 'Plain-English planning' : 'No skill selected',
                        approval_required: status === 'ide_preview_ready',
                        blocked_reason: status === 'ide_preview_blocked' ? 'unsafe_goal' : null
                    })
                })
            )
        )

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(snapshot.ide_preview.status_label).toBe(statusLabel)
        expect(snapshot.ide_preview.approval_copy).toBe('Backend work would require a separate reviewed approval step.')
        expect(snapshot.ide_preview).not.toHaveProperty('blocked_reason')
    })

    it.each([
        ['missing raw preview', undefined],
        ['array raw preview', []],
        ['wrong schema', validGatewayIdePreview({ schema_version: 'sentinel.gateway.v1' })],
        ['bad status', validGatewayIdePreview({ status: 'ide_preview_run_worker' })],
        ['bad workflow label', validGatewayIdePreview({ workflow_label: 'Worker launch workflow' })],
        ['bad persona label', validGatewayIdePreview({ persona_label: 'Codex executor' })],
        ['bad skill label', validGatewayIdePreview({ skill_label: 'Shell commands' })],
        ['bad approval flag', validGatewayIdePreview({ approval_required: 'true' })],
        ['bad allowed actions', validGatewayIdePreview({ allowed_user_actions: ['start_worker'] })],
        ['bad blocked reason', validGatewayIdePreview({ blocked_reason: 'provider_error' })],
        ['extra key', { ...validGatewayIdePreview(), raw_dto: true }],
        ['non-ascii text', validGatewayIdePreview({ summary: 'Preview café.' })],
        ['hidden text', validGatewayIdePreview({ summary: 'Preview\u200bhidden.' })],
        ['oversize text', validGatewayIdePreview({ summary: 'a'.repeat(261) })],
        ['forbidden fragment', validGatewayIdePreview({ summary: 'Provider output with command line details.' })]
    ])('omits invalid IDE preview while preserving classify snapshot: %s', async (_label, idePreview) => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_IDE_PREVIEW_PROJECTION: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    ...(idePreview === undefined ? {} : { ide_preview: idePreview })
                })
            )
        )

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(snapshot.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(snapshot.route_card).toEqual(validGatewayRouteCard())
        expect(snapshot.ide_preview).toBeUndefined()
    })

    it('never synthesizes IDE preview from route guidance alone', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_IDE_PREVIEW_PROJECTION: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify()))

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(snapshot.route_card).toEqual(validGatewayRouteCard())
        expect(snapshot.ide_preview).toBeUndefined()
    })

    it('uses a configured safe server-only Gateway origin for classify requests', async () => {
        const gatewayOrigin = 'http://127.0.0.1:49173'
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_ORIGIN: gatewayOrigin
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify()))

        await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )

        expect(config.gatewayOrigin).toBe(gatewayOrigin)
        expect(fetchImpl.mock.calls[0][0]).toBe(`${gatewayOrigin}/v1/intent/classify`)
    })

    it('fails closed for unsafe configured Gateway origins before any Gateway call', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_ORIGIN: 'https://example.com'
        })
        const fetchImpl = jest.fn()

        expect(config.errorCode).toBe('sentinel_classify_unavailable')
        await expect(
            classifyBridge.createClassifySnapshot(
                { request_kind: 'goal', plain_goal: goalText },
                { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
            )
        ).rejects.toThrow('sentinel_classify_unavailable')
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('projects a display-only plan-readiness card when the plan-readiness flag is enabled', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_READINESS_CARD: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify()))

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )
        const [url, init] = fetchImpl.mock.calls[0]
        const serialized = JSON.stringify(snapshot)

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        expect(url).toBe('http://127.0.0.1:39173/v1/intent/classify')
        expect(JSON.parse(init.body)).toEqual(
            expect.objectContaining({
                schema_version: 'sentinel.gateway.v1',
                request_id: 'req_test_123',
                goal_text: goalText
            })
        )
        expect(snapshot.snapshot_ref).toBe('snapshot_goal_plan_readiness')
        expect(snapshot.state).toBe('plan_readiness')
        expect(snapshot.next_safe_action).toBe('planning_requires_approval_step')
        expect(snapshot.plain_summary).toContain('No plan was drafted')
        expect(snapshot.plain_summary).toContain('no files changed')
        expect(snapshot.plain_summary).toContain('no work started')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
        expect(snapshot.route_card).toEqual(validGatewayRouteCard())
        expect(snapshot.blocked_actions).toContain('Approval controls are not available here.')
        expect(snapshot.checkpoint_ref).toBeNull()
        expect(snapshot.evidence_refs).toEqual([])
        expect(snapshot.manual_handoff_preview).toBeNull()
        expect(serialized).not.toContain(goalText)
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('session_hidden_123')
        expect(serialized).not.toContain('decision_hidden_123')
        expect(serialized).not.toContain('approval_challenge')
        expect(serialized).not.toContain('allowed_actions')
        expect(serialized).not.toContain('action_inputs')
        expect(serialized).not.toContain('task_packet')
        expect(serialized).not.toContain('result_packet')
        expect(serialized).not.toContain('evidence_manifest')
        expect(serialized).not.toContain('gateway')
    })

    it('creates a nonce-bound plan session with reduced IDE preview only when the plan-decision bridge is enabled and nonce is present', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_IDE_PREVIEW_PROJECTION: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify({ ide_preview: validGatewayIdePreview() })))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )
        const serialized = JSON.stringify(planSession)

        expect(planSession.schema_version).toBe('sentinel.cockpit_bridge.plan_session.v1')
        expect(planSession.state).toBe('plan_decision_required')
        expect(planSession.allowed_user_actions).toEqual(['approve_plan', 'revise_plan', 'stop'])
        expect(planSession.cockpit_ref).toMatch(/^cockpit_[A-Za-z0-9_-]+$/)
        expect(planSession.route_card).toEqual(validGatewayRouteCard())
        expect(planSession.ide_preview).toEqual(validServerIdePreview())
        expect(Object.keys(planSession.ide_preview)).toEqual(Object.keys(validServerIdePreview()))
        expect(serialized).not.toContain('sentinel.qvc.ide_preview.v1')
        expect(serialized).not.toContain('ide_preview_ready')
        expect(serialized).not.toContain(clientNonce)
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('session_hidden_123')
        expect(serialized).not.toContain('decision_hidden_123')
        expect(serialized).not.toContain('challenge_hidden_123')
    })

    it('omits IDE preview from nonce-bound plan sessions when the projection flag is disabled', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify({ ide_preview: validGatewayIdePreview() })))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )

        expect(planSession.schema_version).toBe('sentinel.cockpit_bridge.plan_session.v1')
        expect(planSession.state).toBe('plan_decision_required')
        expect(planSession.ide_preview).toBeUndefined()
    })

    it('keeps policy/help classify results display-only when the plan-decision bridge is enabled', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    route_card: validGatewayRouteCard({
                        category: 'policy_help',
                        title: 'Policy or help',
                        summary: 'Sentinel understood this as a request for guidance.',
                        what_can_happen_next: 'Sentinel can explain the safe process in plain English.',
                        what_will_not_happen: 'This does not create a task, launch work, or change any files.'
                    })
                })
            )
        )

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )
        const serialized = JSON.stringify(snapshot)

        expect(snapshot.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(snapshot.snapshot_ref).toBe('snapshot_goal_policy_help_guidance')
        expect(snapshot.state).toBe('policy_help_guidance')
        expect(snapshot.next_safe_action).toBe('guidance_only')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
        expect(snapshot.cockpit_ref).toBeUndefined()
        expect(snapshot.route_card).toEqual(
            validGatewayRouteCard({
                category: 'policy_help',
                title: 'Policy or help',
                summary: 'Sentinel understood this as a request for guidance.',
                what_can_happen_next: 'Sentinel can explain the safe process in plain English.',
                what_will_not_happen: 'This does not create a task, launch work, or change any files.'
            })
        )
        expect(snapshot.plain_summary).toContain('No task was created')
        expect(snapshot.blocked_actions).toContain('Plan approval is not needed for this guidance request.')
        expect(serialized).not.toContain(clientNonce)
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('session_hidden_123')
        expect(serialized).not.toContain('decision_hidden_123')
        expect(serialized).not.toContain('challenge_hidden_123')
    })

    it('drops unsafe Gateway route guidance before projecting a plan session', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    route_card: validGatewayRouteCard({
                        summary: 'Gateway token hidden_token must never display.'
                    })
                })
            )
        )

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )
        const serialized = JSON.stringify(planSession)

        expect(planSession.schema_version).toBe('sentinel.cockpit_bridge.plan_session.v1')
        expect(planSession.state).toBe('plan_decision_required')
        expect(planSession.route_card).toBeNull()
        expect(serialized).not.toContain('hidden_token')
        expect(serialized).not.toContain('Gateway token')
        expect(serialized).not.toContain('gateway')
    })

    it('drops unsafe Gateway route guidance before projecting a classify snapshot', async () => {
        const config = buildClassifyConfig()
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    route_card: validGatewayRouteCard({
                        summary: 'Gateway token hidden_token must never display.'
                    })
                })
            )
        )

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )
        const serialized = JSON.stringify(snapshot)

        expect(snapshot.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(snapshot.snapshot_ref).toBe('snapshot_goal_classify_display')
        expect(snapshot.route_card).toBeNull()
        expect(serialized).not.toContain('hidden_token')
        expect(serialized).not.toContain('Gateway token')
        expect(serialized).not.toContain('gateway')
    })

    it('degrades to display-only plan readiness and creates no binding when nonce is absent', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify()))

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_test_123' }
        )

        expect(snapshot.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(snapshot.snapshot_ref).toBe('snapshot_goal_plan_readiness')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
    })

    it('calls draft-plan only after an explicit nonce-matched plan decision', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
        })
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_classify_123' }
        )
        const draftSession = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: planSession.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_draft_123' }
        )
        const [draftUrl, draftInit] = fetchImpl.mock.calls[1]
        const draftBody = JSON.parse(draftInit.body)
        const serialized = JSON.stringify(draftSession)

        expect(fetchImpl).toHaveBeenCalledTimes(2)
        expect(draftUrl).toBe('http://127.0.0.1:39173/v1/runs/draft-plan')
        expect(draftInit).toEqual(
            expect.objectContaining({
                method: 'POST',
                redirect: 'manual'
            })
        )
        expect(draftBody).toEqual(
            expect.objectContaining({
                schema_version: 'sentinel.gateway.v1',
                request_id: 'req_draft_123',
                run_id: 'run_hidden_123',
                sentinel_session_id: 'session_hidden_123',
                decision_id: 'decision_hidden_123',
                approval: {
                    approval_state: 'approved',
                    approval_challenge: 'challenge_hidden_123',
                    approval_text: 'Approved for plain-English plan drafting.'
                }
            })
        )
        expect(draftSession.schema_version).toBe('sentinel.cockpit_bridge.plan_session.v1')
        expect(draftSession.state).toBe('plan_drafted')
        expect(draftSession.allowed_user_actions).toEqual(['none'])
        expect(serialized).not.toContain(clientNonce)
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('plan_hidden_123')
        expect(serialized).not.toContain('challenge_hidden_123')
    })

    it('creates a server-only manual-packet binding after approved draft-plan and prepares a sanitized packet-ready status', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1'
        })
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayManualPacket()))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_classify_123' }
        )
        const packetPrepSession: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: planSession.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_draft_123' }
        )
        const packetRef = packetPrepSession.cockpit_ref as string
        const readySession = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: packetRef, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_packet_123' }
        )
        const [packetUrl, packetInit] = fetchImpl.mock.calls[2]
        const packetBody = JSON.parse(packetInit.body)
        const serializedReady = JSON.stringify(readySession)

        expect(packetPrepSession.state).toBe('manual_packet_preparation_required')
        expect(packetPrepSession.allowed_user_actions).toEqual(['prepare_manual_worker_packet'])
        expect(packetPrepSession.cockpit_ref).toMatch(/^cockpit_[A-Za-z0-9_-]+$/)
        expect(serializedReady).not.toContain(packetRef)
        expect(packetUrl).toBe('http://127.0.0.1:39173/v1/tasks/manual-worker-packet')
        expect(packetInit).toEqual(expect.objectContaining({ method: 'POST', redirect: 'manual' }))
        expect(packetBody).toEqual(
            expect.objectContaining({
                schema_version: 'sentinel.gateway.v1',
                request_id: 'req_packet_123',
                run_id: 'run_hidden_123',
                sentinel_session_id: 'session_hidden_123',
                plan_id: 'plan_hidden_123',
                approval_id: 'ap_hidden_123',
                worker_type: 'manual_codex'
            })
        )
        expect(readySession.state).toBe('manual_packet_ready')
        expect(readySession.next_safe_action).toBe('manual_handoff_ready')
        expect(readySession.allowed_user_actions).toEqual(['none'])
        expect(readySession.cockpit_ref).toBeNull()
        expect(serializedReady).not.toContain(clientNonce)
        expect(serializedReady).not.toContain('run_hidden_123')
        expect(serializedReady).not.toContain('session_hidden_123')
        expect(serializedReady).not.toContain('plan_hidden_123')
        expect(serializedReady).not.toContain('ap_hidden_123')
        expect(serializedReady).not.toContain('task_hidden_123')
        expect(serializedReady).not.toContain('task_packet_hash')
        expect(serializedReady).not.toContain('task_packet')
        expect(serializedReady).not.toContain('copyable_worker_prompt')
        expect(serializedReady).not.toContain('raw worker prompt hidden')
    })

    it('creates a one-use result-review binding after manual packet preparation and projects a sanitized verdict', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_RESULT_REVIEW_BRIDGE: '1'
        })
        const resultText = 'Manual worker completed a plain text review outside this page.'
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayManualPacket({ task_packet_hash: `sha256:${'a'.repeat(64)}` })))
            .mockResolvedValueOnce(gatewayResponse(validGatewayResultReview()))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_classify_123' }
        )
        const packetPrepSession: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: planSession.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_draft_123' }
        )
        const reviewRequired: any = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: packetPrepSession.cockpit_ref as string, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_packet_123' }
        )
        const review = await classifyBridge.createResultReviewSession(
            {
                request_kind: 'result_review',
                cockpit_ref: reviewRequired.cockpit_ref as string,
                client_nonce: clientNonce,
                result_text: resultText,
                review_only_confirmation: true
            },
            { config, fetchImpl: fetchImpl as any, requestId: 'req_review_123' }
        )
        const [reviewUrl, reviewInit] = fetchImpl.mock.calls[3]
        const reviewBody = JSON.parse(reviewInit.body)
        const serialized = JSON.stringify(review)

        expect(reviewRequired.state).toBe('result_review_required')
        expect(reviewRequired.allowed_user_actions).toEqual(['submit_result_review'])
        expect(reviewRequired.cockpit_ref).toMatch(/^cockpit_[A-Za-z0-9_-]+$/)
        expect(reviewUrl).toBe('http://127.0.0.1:39173/v1/results/review')
        expect(reviewInit).toEqual(expect.objectContaining({ method: 'POST', redirect: 'manual' }))
        expect(reviewBody).toEqual(
            expect.objectContaining({
                schema_version: 'sentinel.gateway.v1',
                request_id: 'req_review_123',
                run_id: 'run_hidden_123',
                sentinel_session_id: 'session_hidden_123',
                task_id: 'task_hidden_123',
                task_packet_hash: `sha256:${'a'.repeat(64)}`
            })
        )
        expect(reviewBody.result_packet).toEqual({
            worker_identity: 'manual_codex',
            summary: resultText,
            files_changed: [],
            commands_run: [],
            tests_run: [],
            blocked_actions_confirmation: true
        })
        expect(review.state).toBe('result_review_accepted')
        expect(review.next_safe_action).toBe('review_complete')
        expect(review.allowed_user_actions).toEqual(['none'])
        expect(review.cockpit_ref).toBeNull()
        expect(serialized).not.toContain(resultText)
        expect(serialized).not.toContain(clientNonce)
        expect(serialized).not.toContain('run_hidden_123')
        expect(serialized).not.toContain('session_hidden_123')
        expect(serialized).not.toContain('task_hidden_123')
        expect(serialized).not.toContain('result_hidden_123')
        expect(serialized).not.toContain('shield_hidden_123')
        expect(serialized).not.toContain('raw_hidden_finding')
        expect(serialized).not.toContain('result_packet')
        expect(serialized).not.toContain('gateway')

        await expect(
            classifyBridge.createResultReviewSession(
                {
                    request_kind: 'result_review',
                    cockpit_ref: reviewRequired.cockpit_ref as string,
                    client_nonce: clientNonce,
                    result_text: resultText,
                    review_only_confirmation: true
                },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('result_review_not_found')
    })

    it('reuses the configured safe Gateway origin for draft-plan, manual-packet, and result-review calls', async () => {
        const gatewayOrigin = 'http://127.0.0.1:49174'
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_RESULT_REVIEW_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_ORIGIN: gatewayOrigin
        })
        const resultText = 'Manual worker completed a plain text review outside this page.'
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayManualPacket({ task_packet_hash: `sha256:${'a'.repeat(64)}` })))
            .mockResolvedValueOnce(gatewayResponse(validGatewayResultReview()))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        const packetPrepSession: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: planSession.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: fetchImpl as any }
        )
        const reviewRequired: any = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: packetPrepSession.cockpit_ref as string, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        await classifyBridge.createResultReviewSession(
            {
                request_kind: 'result_review',
                cockpit_ref: reviewRequired.cockpit_ref as string,
                client_nonce: clientNonce,
                result_text: resultText,
                review_only_confirmation: true
            },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
            `${gatewayOrigin}/v1/intent/classify`,
            `${gatewayOrigin}/v1/runs/draft-plan`,
            `${gatewayOrigin}/v1/tasks/manual-worker-packet`,
            `${gatewayOrigin}/v1/results/review`
        ])
    })

    it.each([
        ['needs_user', 'ask_user', 'result_review_needs_more_information', 'review_needs_more_information'],
        ['rejected', 'manual_intervention', 'result_review_rejected', 'review_manual_intervention']
    ])('projects %s result-review verdicts safely', async (reviewState, nextSafeAction, expectedState, expectedAction) => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_RESULT_REVIEW_BRIDGE: '1'
        })
        const resultText = 'Manual worker completed a plain text review outside this page.'
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayManualPacket({ task_packet_hash: `sha256:${'a'.repeat(64)}` })))
            .mockResolvedValueOnce(
                gatewayResponse(validGatewayResultReview({ review_state: reviewState, next_safe_action: nextSafeAction }))
            )

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        const packetPrepSession: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: planSession.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: fetchImpl as any }
        )
        const reviewRequired: any = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: packetPrepSession.cockpit_ref as string, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        const review = await classifyBridge.createResultReviewSession(
            {
                request_kind: 'result_review',
                cockpit_ref: reviewRequired.cockpit_ref as string,
                client_nonce: clientNonce,
                result_text: resultText,
                review_only_confirmation: true
            },
            { config, fetchImpl: fetchImpl as any }
        )
        const serialized = JSON.stringify(review)

        expect(review.state).toBe(expectedState)
        expect(review.next_safe_action).toBe(expectedAction)
        expect(review.allowed_user_actions).toEqual(['none'])
        expect(review.cockpit_ref).toBeNull()
        expect(serialized).not.toContain(resultText)
        expect(serialized).not.toContain('result_hidden_123')
        expect(serialized).not.toContain('shield_hidden_123')
        expect(serialized).not.toContain('raw_hidden_finding')
        expect(serialized).not.toContain('result_packet')
    })

    it('fails closed for missing, mismatched, invalid, and Gateway-unavailable result reviews', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_RESULT_REVIEW_BRIDGE: '1'
        })
        const missingFetch = jest.fn()

        await expect(
            classifyBridge.createResultReviewSession(
                {
                    request_kind: 'result_review',
                    cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90',
                    client_nonce: clientNonce,
                    result_text: 'Manual worker completed a plain text review outside this page.',
                    review_only_confirmation: true
                },
                { config, fetchImpl: missingFetch as any }
            )
        ).rejects.toThrow('result_review_not_found')
        expect(missingFetch).not.toHaveBeenCalled()

        const mismatchFetch = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayManualPacket({ task_packet_hash: `sha256:${'a'.repeat(64)}` })))
        const mismatchPlan: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: mismatchFetch as any }
        )
        const mismatchPrep: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: mismatchPlan.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: mismatchFetch as any }
        )
        const mismatchReviewRequired: any = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: mismatchPrep.cockpit_ref as string, client_nonce: clientNonce },
            { config, fetchImpl: mismatchFetch as any }
        )
        await expect(
            classifyBridge.createResultReviewSession(
                {
                    request_kind: 'result_review',
                    cockpit_ref: mismatchReviewRequired.cockpit_ref as string,
                    client_nonce: 'nonce_wrongabcdefghijkl',
                    result_text: 'Manual worker completed a plain text review outside this page.',
                    review_only_confirmation: true
                },
                { config, fetchImpl: mismatchFetch as any }
            )
        ).rejects.toThrow('result_review_nonce_mismatch')
        await expect(
            classifyBridge.createResultReviewSession(
                {
                    request_kind: 'result_review',
                    cockpit_ref: mismatchReviewRequired.cockpit_ref as string,
                    client_nonce: clientNonce,
                    result_text: 'Manual worker completed a plain text review outside this page.',
                    review_only_confirmation: true
                },
                { config, fetchImpl: mismatchFetch as any }
            )
        ).rejects.toThrow('result_review_not_found')

        const unavailableFetch = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayManualPacket({ task_packet_hash: `sha256:${'a'.repeat(64)}` })))
            .mockResolvedValueOnce(gatewayResponse(validGatewayResultReview({ review_state: 'accepted', run_id: 'run_other_123' })))
        const unavailablePlan: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: unavailableFetch as any }
        )
        const unavailablePrep: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: unavailablePlan.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: unavailableFetch as any }
        )
        const unavailableReviewRequired: any = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: unavailablePrep.cockpit_ref as string, client_nonce: clientNonce },
            { config, fetchImpl: unavailableFetch as any }
        )
        const unavailable = await classifyBridge.createResultReviewSession(
            {
                request_kind: 'result_review',
                cockpit_ref: unavailableReviewRequired.cockpit_ref as string,
                client_nonce: clientNonce,
                result_text: 'Manual worker completed a plain text review outside this page.',
                review_only_confirmation: true
            },
            { config, fetchImpl: unavailableFetch as any }
        )
        expect(unavailable.state).toBe('result_review_unavailable')
        expect(unavailable.allowed_user_actions).toEqual(['none'])
    })

    it('does not create manual-packet binding for revise or stop plan decisions', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1'
        })
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))

        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        const revised = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: planSession.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'revise_plan',
                revision_text: 'Please make the plan smaller.'
            },
            { config, fetchImpl: fetchImpl as any }
        )

        expect(revised.state).toBe('plan_revision_requested')
        expect(revised.cockpit_ref).toBeNull()
        await expect(
            classifyBridge.createManualPacketSession(
                {
                    request_kind: 'manual_worker_packet',
                    cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90',
                    client_nonce: clientNonce
                },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('manual_packet_not_found')
        expect(fetchImpl).toHaveBeenCalledTimes(2)
    })

    it('fails closed for missing, mismatched, replayed, duplicate, and malformed manual-packet Gateway paths', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_MANUAL_PACKET_BRIDGE: '1'
        })
        const missingFetch = jest.fn()

        await expect(
            classifyBridge.createManualPacketSession(
                {
                    request_kind: 'manual_worker_packet',
                    cockpit_ref: 'cockpit_a1b2c3d4e5f60718293a4b5c6d7e8f90',
                    client_nonce: clientNonce
                },
                { config, fetchImpl: missingFetch as any }
            )
        ).rejects.toThrow('manual_packet_not_found')
        expect(missingFetch).not.toHaveBeenCalled()

        const mismatchFetch = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
        const mismatchPlan: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: mismatchFetch as any }
        )
        const mismatchPrep: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: mismatchPlan.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: mismatchFetch as any }
        )
        await expect(
            classifyBridge.createManualPacketSession(
                {
                    request_kind: 'manual_worker_packet',
                    cockpit_ref: mismatchPrep.cockpit_ref as string,
                    client_nonce: 'nonce_wrongabcdefghijkl'
                },
                { config, fetchImpl: mismatchFetch as any }
            )
        ).rejects.toThrow('manual_packet_nonce_mismatch')
        await expect(
            classifyBridge.createManualPacketSession(
                { request_kind: 'manual_worker_packet', cockpit_ref: mismatchPrep.cockpit_ref as string, client_nonce: clientNonce },
                { config, fetchImpl: mismatchFetch as any }
            )
        ).rejects.toThrow('manual_packet_not_found')
        expect(mismatchFetch).toHaveBeenCalledTimes(2)

        const duplicateFetch = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse({ error: { code: 'task_packet_already_exists' } }, 409))
        const duplicatePlan: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: duplicateFetch as any }
        )
        const duplicatePrep: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: duplicatePlan.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: duplicateFetch as any }
        )
        const duplicateReady = await classifyBridge.createManualPacketSession(
            { request_kind: 'manual_worker_packet', cockpit_ref: duplicatePrep.cockpit_ref as string, client_nonce: clientNonce },
            { config, fetchImpl: duplicateFetch as any }
        )
        expect(duplicateReady.state).toBe('manual_packet_already_prepared')
        await expect(
            classifyBridge.createManualPacketSession(
                { request_kind: 'manual_worker_packet', cockpit_ref: duplicatePrep.cockpit_ref as string, client_nonce: clientNonce },
                { config, fetchImpl: duplicateFetch as any }
            )
        ).rejects.toThrow('manual_packet_not_found')

        const malformedFetch = jest
            .fn()
            .mockResolvedValueOnce(gatewayResponse(validGatewayClassify()))
            .mockResolvedValueOnce(gatewayResponse(validGatewayDraftPlan()))
            .mockResolvedValueOnce(gatewayResponse({ schema_version: 'sentinel.gateway.v1', status: 'error' }))
        const malformedPlan: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: malformedFetch as any }
        )
        const malformedPrep: any = await classifyBridge.createPlanDecisionSession(
            {
                request_kind: 'plan_decision',
                cockpit_ref: malformedPlan.cockpit_ref as string,
                client_nonce: clientNonce,
                decision: 'approve_plan'
            },
            { config, fetchImpl: malformedFetch as any }
        )
        await expect(
            classifyBridge.createManualPacketSession(
                { request_kind: 'manual_worker_packet', cockpit_ref: malformedPrep.cockpit_ref as string, client_nonce: clientNonce },
                { config, fetchImpl: malformedFetch as any }
            )
        ).rejects.toThrow('gateway_rejected')
    })

    it('invalidates a binding after nonce mismatch and prevents replay', async () => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_PLAN_DECISION_BRIDGE: '1'
        })
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify()))
        const planSession: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: goalText, client_nonce: clientNonce },
            { config, fetchImpl: fetchImpl as any }
        )
        const cockpitRef = planSession.cockpit_ref as string

        await expect(
            classifyBridge.createPlanDecisionSession(
                {
                    request_kind: 'plan_decision',
                    cockpit_ref: cockpitRef,
                    client_nonce: 'nonce_wrongabcdefghijkl',
                    decision: 'approve_plan'
                },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('plan_session_nonce_mismatch')
        await expect(
            classifyBridge.createPlanDecisionSession(
                { request_kind: 'plan_decision', cockpit_ref: cockpitRef, client_nonce: clientNonce, decision: 'approve_plan' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('plan_session_not_found')
        expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('maps a gateway blocked classification into a fixed blocked display card', async () => {
        const config = buildClassifyConfig()
        const fetchImpl = jest.fn().mockResolvedValue(
            gatewayResponse(
                validGatewayClassify({
                    status: 'blocked',
                    blocked_actions: ['raw blocked detail'],
                    route_card: validGatewayRouteCard({
                        category: 'blocked_unsafe',
                        title: 'Blocked for safety',
                        summary: 'Sentinel understood this as asking for behavior outside the current safety boundary.',
                        what_can_happen_next: 'Rewrite the goal as planning, review, diagnosis, or manual handoff guidance.',
                        what_will_not_happen:
                            'No execution, worker launch, repository write, commit, publish, deploy, or MCP action will start here.',
                        blocked_reason: 'The request includes an action that the current cockpit is not allowed to perform.'
                    })
                }),
                409
            )
        )

        const snapshot: any = await classifyBridge.createClassifySnapshot(
            { request_kind: 'goal', plain_goal: 'deploy through shell' },
            { config, fetchImpl: fetchImpl as any }
        )
        const serialized = JSON.stringify(snapshot)

        expect(snapshot.snapshot_ref).toBe('snapshot_goal_classify_blocked')
        expect(snapshot.state).toBe('goal_blocked')
        expect(snapshot.next_safe_action).toBe('goal_blocked')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
        expect(snapshot.route_card).toEqual(
            validGatewayRouteCard({
                category: 'blocked_unsafe',
                title: 'Blocked for safety',
                summary: 'Sentinel understood this as asking for behavior outside the current safety boundary.',
                what_can_happen_next: 'Rewrite the goal as planning, review, diagnosis, or manual handoff guidance.',
                what_will_not_happen:
                    'No execution, worker launch, repository write, commit, publish, deploy, or MCP action will start here.',
                blocked_reason: 'The request includes an action that the current cockpit is not allowed to perform.'
            })
        )
        expect(serialized).not.toContain('raw blocked detail')
        expect(serialized).not.toContain('deploy through shell')
    })

    it.each([
        ['missing token', undefined],
        ['invalid token', 'bad token value']
    ])('rejects %s before gateway fetch', async (_label, token) => {
        const config = buildClassifyConfig({
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN: token
        })
        const fetchImpl = jest.fn()

        await expect(
            classifyBridge.createClassifySnapshot({ request_kind: 'goal', plain_goal: goalText }, { config, fetchImpl: fetchImpl as any })
        ).rejects.toThrow('sentinel_classify_unavailable')
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it.each([
        ['wrong schema', validGatewayClassify({ schema_version: 'sentinel.gateway.resume.v1' }), 200],
        ['unexpected status on 200', validGatewayClassify({ status: 'ok' }), 200],
        ['unexpected status on 409', validGatewayClassify({ status: 'needs_user' }), 409],
        ['malformed json', 'not-json', 200],
        ['non-json content type', validGatewayClassify(), 200, 'text/plain'],
        ['oversized response', 'x'.repeat(64 * 1024 + 1), 200]
    ])('fails closed for %s', async (_label, body, status, contentType = 'application/json; charset=utf-8') => {
        const config = buildClassifyConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(body, status, contentType))

        await expect(
            classifyBridge.createClassifySnapshot({ request_kind: 'goal', plain_goal: goalText }, { config, fetchImpl: fetchImpl as any })
        ).rejects.toThrow('sentinel_classify_malformed')
    })

    it.each([401, 403, 404, 500])('maps gateway HTTP %s to unavailable', async (status) => {
        const config = buildClassifyConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayClassify(), status))

        await expect(
            classifyBridge.createClassifySnapshot({ request_kind: 'goal', plain_goal: goalText }, { config, fetchImpl: fetchImpl as any })
        ).rejects.toThrow('sentinel_classify_unavailable')
    })

    it('maps gateway fetch failures and timeouts to unavailable', async () => {
        const config = buildClassifyConfig()
        const fetchImpl = jest.fn().mockRejectedValue(Object.assign(new Error('raw abort detail'), { name: 'AbortError' }))

        await expect(
            classifyBridge.createClassifySnapshot({ request_kind: 'goal', plain_goal: goalText }, { config, fetchImpl: fetchImpl as any })
        ).rejects.toThrow('sentinel_classify_unavailable')
    })
})

describe('sentinel cockpit resume bridge', () => {
    const futureExpiry = '2099-01-01T00:00:00.000Z'
    const gatewayToken = 'gw_local_placeholder_1234567890'
    const binding = {
        checkpoint_ref: 'checkpoint_known',
        run_id: 'run_alpha_123',
        sentinel_session_id: 'session_alpha_123',
        expires_at: futureExpiry
    }

    function buildResumeConfig(envOverrides: NodeJS.ProcessEnv = {}) {
        return resumeBridge.readResumeBridgeConfig({
            BEZZTY_FLOWISE_SENTINEL_RESUME_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN: gatewayToken,
            BEZZTY_FLOWISE_SENTINEL_RESUME_BINDINGS: JSON.stringify([binding]),
            ...envOverrides
        })
    }

    function validGatewayResume(overrides: Record<string, unknown> = {}) {
        return {
            schema_version: 'sentinel.gateway.v1',
            status: 'ok',
            run_id: binding.run_id,
            sentinel_session_id: binding.sentinel_session_id,
            next_safe_action: 'accepted_complete',
            approval_challenge: { blocked: true },
            action_inputs: { blocked: true },
            latest_result_packet: {
                result_id: 'result_blocked_123',
                display_state: 'accepted_work'
            },
            latest_shield_review: {
                shield_review_id: 'review_blocked_123',
                review_state: 'accepted'
            },
            result_acceptance: {
                can_display_as_accepted_work: true
            },
            ...overrides
        }
    }

    function gatewayResponse(body: unknown, status = 200, contentType = 'application/json; charset=utf-8') {
        return {
            status,
            headers: { get: () => contentType },
            text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
        }
    }

    it('reads resume bridge configuration without mutating the token environment', () => {
        const env = {
            BEZZTY_FLOWISE_SENTINEL_RESUME_BRIDGE: '1',
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN: gatewayToken,
            BEZZTY_FLOWISE_SENTINEL_RESUME_BINDINGS: JSON.stringify([binding])
        } as NodeJS.ProcessEnv

        const config = resumeBridge.readResumeBridgeConfig(env)

        expect(config.requested).toBe(true)
        expect(config.token).toBe(gatewayToken)
        expect(env.BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN).toBe(gatewayToken)
    })

    it('requires a server-held checkpoint binding before any gateway call', async () => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn()

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_missing' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_binding_not_found')
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('projects gateway resume into sanitized display-only snapshot shape', async () => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayResume()))

        const snapshot = await resumeBridge.createResumeSnapshot(
            { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
            { config, fetchImpl: fetchImpl as any }
        )
        const serialized = JSON.stringify(snapshot)

        expect(fetchImpl).toHaveBeenCalledWith(
            'http://127.0.0.1:39173/v1/runs/run_alpha_123/resume',
            expect.objectContaining({
                method: 'GET',
                redirect: 'manual'
            })
        )
        expect(snapshot.schema_version).toBe('sentinel.cockpit_bridge.snapshot.v1')
        expect(snapshot.snapshot_ref).toBe('snapshot_resume_status')
        expect(snapshot.accepted_state).toBe('accepted')
        expect(snapshot.result_status).toBe('accepted_work')
        expect(snapshot.allowed_user_actions).toEqual(['none'])
        expect(snapshot.evidence_refs).toEqual([])
        expect(snapshot.manual_handoff_preview).toBeNull()
        expect(serialized).not.toContain('run_alpha_123')
        expect(serialized).not.toContain('session_alpha_123')
        expect(serialized).not.toContain('approval_challenge')
        expect(serialized).not.toContain('action_inputs')
        expect(serialized).not.toContain('result_blocked_123')
        expect(serialized).not.toContain('review_blocked_123')
    })

    it.each([
        ['gateway run_id mismatch', validGatewayResume({ run_id: 'run_other_123' })],
        ['gateway sentinel_session_id mismatch', validGatewayResume({ sentinel_session_id: 'session_other_123' })],
        ['missing schema_version', validGatewayResume({ schema_version: undefined })],
        ['wrong schema_version', validGatewayResume({ schema_version: 'sentinel.gateway.resume.v1' })],
        ['non-ok status', validGatewayResume({ status: 'error' })],
        ['malformed matching-id dto', validGatewayResume({ result_acceptance: [] })]
    ])('fails closed for %s', async (_label, body) => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(body))

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_malformed')
    })

    it.each([401, 403, 500])('maps gateway HTTP %s to unavailable', async (status) => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse(validGatewayResume(), status))

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_unavailable')
    })

    it('fails closed for non-json gateway responses', async () => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse('not json', 200, 'text/plain'))

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_malformed')
    })

    it('fails closed for oversized gateway responses', async () => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn().mockResolvedValue(gatewayResponse('x'.repeat(64 * 1024 + 1)))

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_malformed')
    })

    it('maps gateway fetch failures and timeouts to unavailable', async () => {
        const config = buildResumeConfig()
        const fetchImpl = jest.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_unavailable')
    })

    it('rejects expired checkpoint bindings before any gateway call', async () => {
        const config = buildResumeConfig({
            BEZZTY_FLOWISE_SENTINEL_RESUME_BINDINGS: JSON.stringify([
                {
                    ...binding,
                    expires_at: '2000-01-01T00:00:00.000Z'
                }
            ])
        })
        const fetchImpl = jest.fn()

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_binding_not_found')
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it.each([
        ['missing', undefined],
        ['invalid', 'bad token value']
    ])('rejects %s gateway token after binding match and before fetch', async (_label, token) => {
        const config = buildResumeConfig({
            BEZZTY_FLOWISE_SENTINEL_GATEWAY_TOKEN: token
        })
        const fetchImpl = jest.fn()

        await expect(
            resumeBridge.createResumeSnapshot(
                { request_kind: 'resume', checkpoint_ref: 'checkpoint_known' },
                { config, fetchImpl: fetchImpl as any }
            )
        ).rejects.toThrow('sentinel_resume_unavailable')
        expect(fetchImpl).not.toHaveBeenCalled()
    })
})
