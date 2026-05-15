jest.mock('@/store/constant', () => ({
    baseURL: 'http://127.0.0.1:3000'
}))

import {
    COCKPIT_SNAPSHOT_PATH,
    GOAL_REQUEST_BODY_KEYS,
    MANUAL_PACKET_BODY_KEYS,
    PLAN_DECISION_BODY_KEYS,
    PLAN_DECISION_REVISE_BODY_KEYS,
    PLAN_SESSION_KEYS,
    REQUEST_BODY_KEYS,
    RESULT_REVIEW_BODY_KEYS,
    SNAPSHOT_KEYS,
    SentinelCockpitError,
    buildGoalBody,
    buildManualWorkerPacketBody,
    buildManualWorkerPacketUrl,
    buildPlanDecisionBody,
    buildPlanDecisionUrl,
    buildResultReviewBody,
    buildResultReviewUrl,
    buildResumeBody,
    buildSnapshotUrl,
    requestPlanDecision,
    requestManualWorkerPacket,
    requestResultReview,
    requestGoalSnapshot,
    requestResumeSnapshot
} from './sentinelCockpit'

const validSnapshot = (overrides = {}) => ({
    schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
    status: 'ok',
    snapshot_ref: 'snapshot_safe',
    state: 'resume_status',
    plain_summary: 'Resume status is available for display.',
    next_safe_action: 'accepted_complete',
    allowed_user_actions: ['none'],
    blocked_actions: [],
    checkpoint_ref: 'checkpoint_safe',
    evidence_refs: [],
    manual_handoff_preview: null,
    worker_status: 'none',
    result_status: 'accepted',
    shield_summary: null,
    accepted_state: 'accepted',
    stale_doc_warning: null,
    ...overrides
})

const fetchResponse = (body, { ok = true, status = 200 } = {}) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body)
})

const validPlanSession = (overrides = {}) => ({
    schema_version: 'sentinel.cockpit_bridge.plan_session.v1',
    status: 'ok',
    state: 'plan_decision_required',
    plain_summary: 'Sentinel is ready for a plan decision.',
    next_safe_action: 'user_plan_decision_required',
    allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
    blocked_actions: [],
    cockpit_ref: 'cockpit_safe_ref',
    plan_card: null,
    safe_error: null,
    ...overrides
})

const validRouteCard = (overrides = {}) => ({
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
})

describe('sentinelCockpit API wrapper', () => {
    afterEach(() => {
        jest.useRealTimers()
        jest.restoreAllMocks()
    })

    it('builds the exact cockpit snapshot URL outside /api/v1', () => {
        expect(buildSnapshotUrl()).toBe(`http://127.0.0.1:3000${COCKPIT_SNAPSHOT_PATH}`)
        expect(buildSnapshotUrl()).not.toContain('/api/v1')
        expect(buildSnapshotUrl()).not.toContain('?')
        expect(buildPlanDecisionUrl()).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/plan-decision')
        expect(buildManualWorkerPacketUrl()).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/manual-worker-packet')
        expect(buildResultReviewUrl()).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/result-review')
    })

    it('posts only the resume request body whitelist', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validSnapshot()))

        await requestResumeSnapshot(
            {
                checkpointRef: ' checkpoint_safe ',
                displayedPromptRef: ' prompt_safe ',
                clientNonce: ' nonce_safe '
            },
            { fetchImpl }
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [url, options] = fetchImpl.mock.calls[0]
        const body = JSON.parse(options.body)
        expect(url).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/snapshot')
        expect(options.method).toBe('POST')
        expect(Object.keys(body).sort()).toEqual([...REQUEST_BODY_KEYS].sort())
        expect(body).toEqual({
            request_kind: 'resume',
            checkpoint_ref: 'checkpoint_safe',
            displayed_prompt_ref: 'prompt_safe',
            client_nonce: 'nonce_safe'
        })
    })

    it('posts only the goal request body whitelist', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            fetchResponse(
                validSnapshot({
                    snapshot_ref: 'snapshot_goal_intake',
                    state: 'goal_intake',
                    plain_summary: 'Your goal was received by the local cockpit.',
                    next_safe_action: 'planning_deferred',
                    checkpoint_ref: null,
                    result_status: 'not_started',
                    accepted_state: 'not_accepted'
                })
            )
        )

        await requestGoalSnapshot(
            {
                plainGoal: '  Plan the next safe step  '
            },
            { fetchImpl }
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [url, options] = fetchImpl.mock.calls[0]
        const body = JSON.parse(options.body)
        expect(url).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/snapshot')
        expect(options.method).toBe('POST')
        expect(Object.keys(body).sort()).toEqual(['plain_goal', 'request_kind'])
        expect(body).toEqual({
            request_kind: 'goal',
            plain_goal: 'Plan the next safe step'
        })
    })

    it('posts a goal client nonce only when the caller supplies it', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validPlanSession()))

        await requestGoalSnapshot(
            {
                plainGoal: 'Plan the next safe step',
                clientNonce: 'nonce_abcdefghijklmnop'
            },
            { fetchImpl }
        )

        const [, options] = fetchImpl.mock.calls[0]
        const body = JSON.parse(options.body)
        expect(Object.keys(body).sort()).toEqual([...GOAL_REQUEST_BODY_KEYS].sort())
        expect(body).toEqual({
            request_kind: 'goal',
            plain_goal: 'Plan the next safe step',
            client_nonce: 'nonce_abcdefghijklmnop'
        })
    })

    it('posts only the plan-decision request body whitelist', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validPlanSession({ state: 'plan_drafted', next_safe_action: 'plan_display_only', allowed_user_actions: ['none'], cockpit_ref: null })))

        await requestPlanDecision(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'approve_plan'
            },
            { fetchImpl }
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [url, options] = fetchImpl.mock.calls[0]
        const body = JSON.parse(options.body)
        expect(url).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/plan-decision')
        expect(options.method).toBe('POST')
        expect(options.credentials).toBe('omit')
        expect(options.referrerPolicy).toBe('no-referrer')
        expect(options.cache).toBe('no-store')
        expect(Object.keys(body).sort()).toEqual([...PLAN_DECISION_BODY_KEYS].sort())
        expect(body).toEqual({
            request_kind: 'plan_decision',
            cockpit_ref: 'cockpit_safe_ref',
            client_nonce: 'nonce_abcdefghijklmnop',
            decision: 'approve_plan'
        })
    })

    it('includes revision text only for revise_plan plan decisions', () => {
        expect(
            buildPlanDecisionBody({
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'revise_plan',
                revisionText: 'Please narrow the plan.'
            })
        ).toEqual({
            request_kind: 'plan_decision',
            cockpit_ref: 'cockpit_safe_ref',
            client_nonce: 'nonce_abcdefghijklmnop',
            decision: 'revise_plan',
            revision_text: 'Please narrow the plan.'
        })
        expect(Object.keys(buildPlanDecisionBody({
            cockpitRef: 'cockpit_safe_ref',
            clientNonce: 'nonce_abcdefghijklmnop',
            decision: 'revise_plan',
            revisionText: 'Please narrow the plan.'
        })).sort()).toEqual([...PLAN_DECISION_REVISE_BODY_KEYS].sort())
        expect(() =>
            buildPlanDecisionBody({
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'approve_plan',
                revisionText: 'not allowed'
            })
        ).toThrow('invalid_request')
    })

    it('posts only the manual worker packet request body whitelist', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            fetchResponse(
                validPlanSession({
                    state: 'manual_packet_ready',
                    plain_summary: 'The manual worker packet is ready.',
                    next_safe_action: 'manual_handoff_ready',
                    allowed_user_actions: ['none'],
                    cockpit_ref: null
                })
            )
        )

        await requestManualWorkerPacket(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop'
            },
            { fetchImpl }
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [url, options] = fetchImpl.mock.calls[0]
        const body = JSON.parse(options.body)
        expect(url).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/manual-worker-packet')
        expect(options.method).toBe('POST')
        expect(options.credentials).toBe('omit')
        expect(options.referrerPolicy).toBe('no-referrer')
        expect(options.cache).toBe('no-store')
        expect(Object.keys(body).sort()).toEqual([...MANUAL_PACKET_BODY_KEYS].sort())
        expect(body).toEqual({
            request_kind: 'manual_worker_packet',
            cockpit_ref: 'cockpit_safe_ref',
            client_nonce: 'nonce_abcdefghijklmnop'
        })
        expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('127.0.0.1:39173')
    })

    it('builds manual worker packet body without accepting hidden Gateway fields', () => {
        expect(buildManualWorkerPacketBody({ cockpitRef: ' cockpit_safe_ref ', clientNonce: ' nonce_abcdefghijklmnop ' })).toEqual({
            request_kind: 'manual_worker_packet',
            cockpit_ref: 'cockpit_safe_ref',
            client_nonce: 'nonce_abcdefghijklmnop'
        })
        expect(() => buildManualWorkerPacketBody({ cockpitRef: '', clientNonce: 'nonce_abcdefghijklmnop' })).toThrow('invalid_request')
    })

    it('posts only the result review request body whitelist', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            fetchResponse(
                validPlanSession({
                    state: 'result_review_accepted',
                    plain_summary: 'Sentinel accepted the pasted manual result.',
                    next_safe_action: 'review_complete',
                    allowed_user_actions: ['none'],
                    cockpit_ref: null
                })
            )
        )

        await requestResultReview(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                resultText: 'Manual worker completed a plain text review outside this page.',
                reviewOnlyConfirmation: true
            },
            { fetchImpl }
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [url, options] = fetchImpl.mock.calls[0]
        const body = JSON.parse(options.body)
        expect(url).toBe('http://127.0.0.1:3000/sentinel-cockpit/v1/result-review')
        expect(options.method).toBe('POST')
        expect(options.credentials).toBe('omit')
        expect(options.referrerPolicy).toBe('no-referrer')
        expect(options.cache).toBe('no-store')
        expect(Object.keys(body).sort()).toEqual([...RESULT_REVIEW_BODY_KEYS].sort())
        expect(body).toEqual({
            request_kind: 'result_review',
            cockpit_ref: 'cockpit_safe_ref',
            client_nonce: 'nonce_abcdefghijklmnop',
            result_text: 'Manual worker completed a plain text review outside this page.',
            review_only_confirmation: true
        })
        expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('127.0.0.1:39173')
    })

    it('builds result review body only with explicit confirmation', () => {
        expect(
            buildResultReviewBody({
                cockpitRef: ' cockpit_safe_ref ',
                clientNonce: ' nonce_abcdefghijklmnop ',
                resultText: '  Manual worker completed a plain text review outside this page.  ',
                reviewOnlyConfirmation: true
            })
        ).toEqual({
            request_kind: 'result_review',
            cockpit_ref: 'cockpit_safe_ref',
            client_nonce: 'nonce_abcdefghijklmnop',
            result_text: 'Manual worker completed a plain text review outside this page.',
            review_only_confirmation: true
        })
        expect(() =>
            buildResultReviewBody({
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                resultText: 'Manual worker completed a plain text review outside this page.',
                reviewOnlyConfirmation: false
            })
        ).toThrow('invalid_request')
    })

    it('uses isolated browser transport options without credentials or referrer', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validSnapshot()))

        await requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl })

        const [, options] = fetchImpl.mock.calls[0]
        expect(options.credentials).toBe('omit')
        expect(options.referrerPolicy).toBe('no-referrer')
        expect(options.cache).toBe('no-store')
        expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
        expect(options).not.toHaveProperty('withCredentials')
        expect(options.headers).not.toHaveProperty('Authorization')
        expect(options.headers).not.toHaveProperty('Cookie')
    })

    it.each([
        'run_id',
        'token',
        'authorization',
        'cookie',
        'action_inputs',
        'approval_challenge',
        'task_packet',
        'result_packet',
        'evidence_manifest',
        'gatewayUrl',
        'gateway_host'
    ])('rejects forbidden caller key %s before any network call', async (key) => {
        const fetchImpl = jest.fn()

        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe', [key]: 'blocked' }, { fetchImpl })).rejects.toMatchObject({
            code: 'invalid_request'
        })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it.each(['run_id', 'token', 'authorization', 'approval_challenge', 'action_inputs', 'task_packet', 'result_packet', 'gatewayUrl'])(
        'rejects forbidden goal caller key %s before any network call',
        async (key) => {
            const fetchImpl = jest.fn()

            await expect(requestGoalSnapshot({ plainGoal: 'Plan the next safe step', [key]: 'blocked' }, { fetchImpl })).rejects.toMatchObject({
                code: 'invalid_request'
            })
            expect(fetchImpl).not.toHaveBeenCalled()
        }
    )

    it.each(['run_id', 'plan_id', 'approval_id', 'task_id', 'task_packet_hash', 'workerType', 'copyable_worker_prompt', 'result_packet', 'gatewayUrl', 'command', 'mcp', 'shell'])(
        'rejects forbidden manual packet caller key %s before any network call',
        async (key) => {
            const fetchImpl = jest.fn()

            await expect(
                requestManualWorkerPacket({ cockpitRef: 'cockpit_safe_ref', clientNonce: 'nonce_abcdefghijklmnop', [key]: 'blocked' }, { fetchImpl })
            ).rejects.toMatchObject({ code: 'invalid_request' })
            expect(fetchImpl).not.toHaveBeenCalled()
        }
    )

    it.each(['run_id', 'sentinel_session_id', 'task_id', 'task_packet_hash', 'result_packet', 'evidence_manifest', 'gatewayUrl', 'token', 'copyable_worker_prompt', 'shell'])(
        'rejects forbidden result review caller key %s before any network call',
        async (key) => {
            const fetchImpl = jest.fn()

            await expect(
                requestResultReview(
                    {
                        cockpitRef: 'cockpit_safe_ref',
                        clientNonce: 'nonce_abcdefghijklmnop',
                        resultText: 'Manual worker completed a plain text review outside this page.',
                        reviewOnlyConfirmation: true,
                        [key]: 'blocked'
                    },
                    { fetchImpl }
                )
            ).rejects.toMatchObject({ code: 'invalid_request' })
            expect(fetchImpl).not.toHaveBeenCalled()
        }
    )

    it.each(['plainConstraints', 'displayedPromptRef', 'checkpointRef'])(
        'rejects out-of-scope goal caller key %s before any network call',
        async (key) => {
            const fetchImpl = jest.fn()

            await expect(requestGoalSnapshot({ plainGoal: 'Plan the next safe step', [key]: 'blocked' }, { fetchImpl })).rejects.toMatchObject({
                code: 'invalid_request'
            })
            expect(fetchImpl).not.toHaveBeenCalled()
        }
    )

    it('rejects missing or blank goal text before any network call', async () => {
        const fetchImpl = jest.fn()

        await expect(requestGoalSnapshot({}, { fetchImpl })).rejects.toMatchObject({ code: 'invalid_request' })
        await expect(requestGoalSnapshot({ plainGoal: '   ' }, { fetchImpl })).rejects.toMatchObject({ code: 'invalid_request' })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('rejects unknown caller keys before any network call', async () => {
        const fetchImpl = jest.fn()

        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe', extra: 'blocked' }, { fetchImpl })).rejects.toMatchObject({
            code: 'invalid_request'
        })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('returns only frozen snapshot keys and drops extra response fields', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validSnapshot({ raw_gateway_body: 'blocked' })))

        const snapshot = await requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl })

        expect(Object.keys(snapshot).sort()).toEqual([...SNAPSHOT_KEYS].sort())
        expect(snapshot).not.toHaveProperty('raw_gateway_body')
    })

    it('preserves only a sanitized route card from snapshot responses', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validSnapshot({ route_card: validRouteCard(), raw_gateway_body: 'blocked' })))

        const snapshot = await requestGoalSnapshot({ plainGoal: 'Plan the next safe step' }, { fetchImpl })

        expect(snapshot.route_card).toEqual(validRouteCard())
        expect(snapshot).not.toHaveProperty('raw_gateway_body')
        expect(JSON.stringify(snapshot)).not.toMatch(/gateway|token|run_hidden|approval_challenge|client_nonce/)
    })

    it('omits unsafe route cards from snapshot responses', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            fetchResponse(
                validSnapshot({
                    route_card: validRouteCard({
                        summary: 'Gateway token hidden_token should never display.'
                    })
                })
            )
        )

        const snapshot = await requestGoalSnapshot({ plainGoal: 'Plan the next safe step' }, { fetchImpl })

        expect(snapshot).not.toHaveProperty('route_card')
        expect(Object.keys(snapshot).sort()).toEqual([...SNAPSHOT_KEYS].sort())
        expect(JSON.stringify(snapshot)).not.toContain('hidden_token')
    })

    it('returns only frozen plan-session keys and drops extra response fields', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validPlanSession({ run_id: 'run_hidden_123', approval_challenge: 'hidden' })))

        const session = await requestPlanDecision(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'approve_plan'
            },
            { fetchImpl }
        )

        expect(Object.keys(session).sort()).toEqual([...PLAN_SESSION_KEYS].sort())
        expect(session.allowed_user_actions).toEqual(['approve_plan', 'revise_plan', 'stop'])
        expect(session).not.toHaveProperty('run_id')
        expect(session).not.toHaveProperty('approval_challenge')
    })

    it('preserves only a sanitized route card from plan-session responses', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validPlanSession({ route_card: validRouteCard(), raw_gateway_body: 'blocked' })))

        const session = await requestGoalSnapshot(
            {
                plainGoal: 'Plan the next safe step',
                clientNonce: 'nonce_abcdefghijklmnop'
            },
            { fetchImpl }
        )

        expect(session.route_card).toEqual(validRouteCard())
        expect(session).not.toHaveProperty('raw_gateway_body')
        expect(JSON.stringify(session)).not.toMatch(/gateway|token|run_hidden|approval_challenge|client_nonce/)
    })

    it('omits unsafe route cards without changing the plan-session contract', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            fetchResponse(
                validPlanSession({
                    route_card: validRouteCard({
                        summary: 'Gateway token hidden_token should never display.'
                    })
                })
            )
        )

        const session = await requestGoalSnapshot(
            {
                plainGoal: 'Plan the next safe step',
                clientNonce: 'nonce_abcdefghijklmnop'
            },
            { fetchImpl }
        )

        expect(session).not.toHaveProperty('route_card')
        expect(Object.keys(session).sort()).toEqual([...PLAN_SESSION_KEYS].sort())
        expect(JSON.stringify(session)).not.toContain('hidden_token')
    })

    it('accepts manual packet preparation state and then only display-only ready states', async () => {
        const prepareFetch = jest.fn().mockResolvedValue(
            fetchResponse(
                validPlanSession({
                    state: 'manual_packet_preparation_required',
                    next_safe_action: 'prepare_manual_worker_packet',
                    allowed_user_actions: ['prepare_manual_worker_packet'],
                    cockpit_ref: 'cockpit_safe_ref'
                })
            )
        )
        const readyFetch = jest.fn().mockResolvedValue(
            fetchResponse(
                validPlanSession({
                    state: 'manual_packet_ready',
                    next_safe_action: 'manual_handoff_ready',
                    allowed_user_actions: ['none'],
                    cockpit_ref: null,
                    task_packet: 'hidden',
                    copyable_worker_prompt: 'hidden'
                })
            )
        )
        const reviewFetch = jest.fn().mockResolvedValue(
            fetchResponse(
                validPlanSession({
                    state: 'result_review_required',
                    next_safe_action: 'submit_manual_worker_result',
                    allowed_user_actions: ['submit_result_review'],
                    cockpit_ref: 'cockpit_review_ref'
                })
            )
        )

        const prepare = await requestPlanDecision(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'approve_plan'
            },
            { fetchImpl: prepareFetch }
        )
        const ready = await requestManualWorkerPacket({ cockpitRef: 'cockpit_safe_ref', clientNonce: 'nonce_abcdefghijklmnop' }, { fetchImpl: readyFetch })
        const reviewRequired = await requestManualWorkerPacket({ cockpitRef: 'cockpit_safe_ref', clientNonce: 'nonce_abcdefghijklmnop' }, { fetchImpl: reviewFetch })

        expect(prepare.allowed_user_actions).toEqual(['prepare_manual_worker_packet'])
        expect(prepare.cockpit_ref).toBe('cockpit_safe_ref')
        expect(ready.allowed_user_actions).toEqual(['none'])
        expect(ready.cockpit_ref).toBeNull()
        expect(reviewRequired.allowed_user_actions).toEqual(['submit_result_review'])
        expect(reviewRequired.cockpit_ref).toBe('cockpit_review_ref')
        expect(ready).not.toHaveProperty('task_packet')
        expect(ready).not.toHaveProperty('copyable_worker_prompt')
    })

    it('maps non-2xx closed error codes without exposing raw body text', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            fetchResponse(
                {
                    error: {
                        code: 'sentinel_resume_binding_not_found',
                        message: 'do not leak this detail'
                    }
                },
                { ok: false, status: 404 }
            )
        )

        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl })).rejects.toMatchObject({
            code: 'sentinel_resume_binding_not_found',
            status: 404
        })
        await requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl }).catch((error) => {
            expect(error.message).not.toContain('do not leak this detail')
        })
    })

    it('fails closed when allowed_user_actions is anything other than ["none"]', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(fetchResponse(validSnapshot({ allowed_user_actions: ['continue'] })))

        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl })).rejects.toMatchObject({
            code: 'sentinel_resume_display_blocked'
        })
    })

    it('fails closed on wrong schema_version or status', async () => {
        const wrongSchema = jest.fn().mockResolvedValue(fetchResponse(validSnapshot({ schema_version: 'sentinel.gateway.v1' })))
        const wrongStatus = jest.fn().mockResolvedValue(fetchResponse(validSnapshot({ status: 'error' })))

        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl: wrongSchema })).rejects.toMatchObject({
            code: 'sentinel_resume_malformed'
        })
        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl: wrongStatus })).rejects.toMatchObject({
            code: 'sentinel_resume_malformed'
        })
    })

    it('fails closed on malformed JSON and network errors', async () => {
        const malformedJson = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockRejectedValue(new Error('raw parse detail'))
        })
        const networkError = jest.fn().mockRejectedValue(new Error('raw network detail'))

        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl: malformedJson })).rejects.toMatchObject({
            code: 'sentinel_resume_malformed'
        })
        await expect(requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl: networkError })).rejects.toMatchObject({
            code: 'sentinel_resume_unavailable'
        })
    })

    it('uses AbortController timeout and reports unavailable without leaking abort detail', async () => {
        jest.useFakeTimers()
        const fetchImpl = jest.fn(
            (_url, options) =>
                new Promise((_resolve, reject) => {
                    options.signal.addEventListener('abort', () => {
                        const error = new Error('raw abort detail')
                        error.name = 'AbortError'
                        reject(error)
                    })
                })
        )

        const pending = requestResumeSnapshot({ checkpointRef: 'checkpoint_safe' }, { fetchImpl, timeoutMs: 10 })
        jest.advanceTimersByTime(11)

        await expect(pending).rejects.toMatchObject({ code: 'sentinel_resume_unavailable' })
    })

    it('buildResumeBody never includes absent optional fields', () => {
        expect(buildResumeBody()).toEqual({ request_kind: 'resume' })
    })

    it('buildGoalBody never includes absent optional fields beyond required goal text', () => {
        expect(buildGoalBody({ plainGoal: '  Plan safely  ' })).toEqual({
            request_kind: 'goal',
            plain_goal: 'Plan safely'
        })
    })

    it('uses the typed error shape', () => {
        const error = new SentinelCockpitError('invalid_request', 400)
        expect(error.name).toBe('SentinelCockpitError')
        expect(error.code).toBe('invalid_request')
        expect(error.status).toBe(400)
    })
})
