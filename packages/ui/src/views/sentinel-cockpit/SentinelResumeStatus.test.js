import { JSDOM } from 'jsdom'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
    requestGoalSnapshot,
    requestManualWorkerPacket,
    requestPlanDecision,
    requestResultReview,
    requestResumeSnapshot
} from '@/api/sentinelCockpit'

import SentinelResumeStatus, {
    DISPLAY_BLOCKED_ERROR,
    EMPTY_MESSAGE,
    GOAL_EMPTY_MESSAGE,
    GOAL_LOADING_MESSAGE,
    LOADING_MESSAGE,
    NOT_FOUND_ERROR,
    PLAN_DECISION_ERROR,
    PlanSessionCard,
    REVISION_EMPTY_MESSAGE,
    REVISION_TOO_LONG_MESSAGE,
    REVISION_UNSAFE_MESSAGE,
    ResumeSnapshot,
    generateClientNonce,
    isManualPacketRequiredSession,
    isPlanDecisionRequiredSession,
    isResultReviewRequiredSession,
    loadGoalSnapshot,
    loadManualPacketSession,
    loadPlanDecisionSession,
    loadResultReviewSession,
    loadResumeSnapshot
} from './SentinelResumeStatus'

jest.mock('@/api/sentinelCockpit', () => ({
    requestGoalSnapshot: jest.fn(),
    requestManualWorkerPacket: jest.fn(),
    requestPlanDecision: jest.fn(),
    requestResultReview: jest.fn(),
    requestResumeSnapshot: jest.fn()
}))

const safeSnapshot = (overrides = {}) => ({
    schema_version: 'sentinel.cockpit_bridge.snapshot.v1',
    status: 'ok',
    snapshot_ref: 'snapshot_safe_hidden',
    state: 'resume_status',
    plain_summary: 'Accepted work is ready for display.',
    next_safe_action: 'accepted_complete',
    allowed_user_actions: ['none'],
    blocked_actions: [],
    checkpoint_ref: 'checkpoint_safe_hidden',
    evidence_refs: [],
    manual_handoff_preview: null,
    worker_status: 'none',
    result_status: 'accepted',
    shield_summary: 'Review complete',
    accepted_state: 'accepted',
    stale_doc_warning: null,
    ...overrides
})

const safePlanSession = (overrides = {}) => ({
    schema_version: 'sentinel.cockpit_bridge.plan_session.v1',
    status: 'ok',
    state: 'plan_decision_required',
    plain_summary: 'Sentinel is ready to draft a plain-English plan after your explicit plan decision.',
    next_safe_action: 'user_plan_decision_required',
    allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
    blocked_actions: ['No files are edited here.', 'No system actions start here.'],
    cockpit_ref: 'cockpit_safe_ref',
    plan_card: {
        plain_title: 'Plain-English plan draft',
        plain_summary: 'Review this plan before manual work begins.',
        plain_steps: ['Confirm the goal is still correct.', 'Use the governed manual coding process.'],
        will_not_do: ['No files are edited here', 'No tools are run here']
    },
    safe_error: null,
    ...overrides
})

const safeRouteCard = (overrides = {}) => ({
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

let activeDom = null
let activeRoot = null

const installDom = () => {
    activeDom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'http://127.0.0.1:3000/sentinel-cockpit'
    })
    global.window = activeDom.window
    global.document = activeDom.window.document
    global.navigator = activeDom.window.navigator
    global.HTMLElement = activeDom.window.HTMLElement
    global.Event = activeDom.window.Event
    global.KeyboardEvent = activeDom.window.KeyboardEvent
    global.MouseEvent = activeDom.window.MouseEvent
    global.Node = activeDom.window.Node
    global.Text = activeDom.window.Text
    global.HTMLInputElement = activeDom.window.HTMLInputElement
    global.HTMLButtonElement = activeDom.window.HTMLButtonElement
    global.HTMLFormElement = activeDom.window.HTMLFormElement
    global.HTMLTextAreaElement = activeDom.window.HTMLTextAreaElement
    global.IS_REACT_ACT_ENVIRONMENT = true
}

const renderInteractive = () => {
    installDom()
    const { createRoot } = require('react-dom/client')
    const { act, Simulate } = require('react-dom/test-utils')
    const container = document.createElement('div')
    document.body.appendChild(container)
    activeRoot = createRoot(container)
    act(() => {
        activeRoot.render(<SentinelResumeStatus />)
    })

    const getInput = () => container.querySelector('#sentinel-checkpoint-ref')
    const getGoalInput = () => container.querySelector('#sentinel-plain-goal')
    const getResultReviewInput = () => container.querySelector('#sentinel-result-review-text')
    const getReviewOnlyCheckbox = () => container.querySelector('input[type="checkbox"]')
    const getButton = (label) => {
        const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent.trim() === label)
        if (!button) throw new Error(`Button not found: ${label}`)
        return button
    }

    return {
        container,
        getInput,
        getGoalInput,
        getResultReviewInput,
        getReviewOnlyCheckbox,
        getButton,
        queryByText: (text) => (container.textContent.includes(text) ? text : null),
        setInput: (value) => {
            act(() => {
                Simulate.change(getInput(), { target: { value } })
            })
        },
        setGoalInput: (value) => {
            act(() => {
                Simulate.change(getGoalInput(), { target: { value } })
            })
        },
        setResultReviewInput: (value) => {
            act(() => {
                Simulate.change(getResultReviewInput(), { target: { value } })
            })
        },
        setReviewOnlyConfirmed: (checked) => {
            act(() => {
                Simulate.change(getReviewOnlyCheckbox(), { target: { checked } })
            })
        },
        clickButton: (label) => {
            act(() => {
                Simulate.click(getButton(label))
            })
        },
        submitForm: () => {
            act(() => {
                Simulate.submit(container.querySelector('form[aria-label="Continue last work"]'))
            })
        },
        submitGoalForm: () => {
            act(() => {
                Simulate.submit(container.querySelector('form[aria-label="Goal intake"]'))
            })
        },
        unmount: () => {
            act(() => {
                activeRoot.unmount()
            })
            activeRoot = null
        }
    }
}

const buttonLabels = (container) => Array.from(container.querySelectorAll('button')).map((button) => button.textContent.trim())

const flushReactUpdates = async () => {
    const { act } = require('react-dom/test-utils')
    await act(async () => {
        await Promise.resolve()
    })
}

const waitForAssertion = async (assertion, timeoutMs = 1500) => {
    const deadline = Date.now() + timeoutMs
    let lastError
    while (Date.now() < deadline) {
        try {
            await flushReactUpdates()
            assertion()
            return
        } catch (error) {
            lastError = error
            await new Promise((resolve) => setTimeout(resolve, 20))
        }
    }
    throw lastError
}

describe('SentinelResumeStatus', () => {
    afterEach(() => {
        if (activeRoot) {
            const { act } = require('react-dom/test-utils')
            act(() => {
                activeRoot.unmount()
            })
            activeRoot = null
        }
        if (activeDom) {
            activeDom.window.close()
            activeDom = null
        }
        requestResumeSnapshot.mockReset()
        requestGoalSnapshot.mockReset()
        requestManualWorkerPacket.mockReset()
        requestPlanDecision.mockReset()
        requestResultReview.mockReset()
        jest.restoreAllMocks()
        delete global.window
        delete global.navigator
        delete global.HTMLElement
        delete global.Event
        delete global.KeyboardEvent
        delete global.MouseEvent
        delete global.Node
        delete global.Text
        delete global.HTMLInputElement
        delete global.HTMLButtonElement
        delete global.HTMLFormElement
        delete global.HTMLTextAreaElement
        delete global.IS_REACT_ACT_ENVIRONMENT
        delete global.localStorage
        delete global.sessionStorage
        delete global.history
        delete global.document
    })

    it('renders the standalone page without checkpoint/run/session values in route text', () => {
        const html = renderToStaticMarkup(<SentinelResumeStatus />)

        expect(html).toContain('Quality Vibe Coding Cockpit')
        expect(html).toContain('What do you want to do?')
        expect(html).toContain('Record goal')
        expect(html).toContain('Continue last work')
        expect(html).toContain('Start here')
        expect(html).toContain('Say what you want.')
        expect(html).toContain('Safe plan')
        expect(html).toContain('Read before deciding.')
        expect(html).toContain('You decide')
        expect(html).toContain('Nothing happens by itself.')
        expect(html).toContain('background:#020617')
        expect(html).toContain('background:#0f172a')
        expect(html).not.toMatch(/background:#(?:fff|ffffff|f8fafc)/i)
        expect(html).not.toContain('Review the status')
        expect(html).not.toContain('Decide outside this page')
        expect(html).not.toContain('Approved work still happens through the governed manual process.')
        expect(html).toContain(EMPTY_MESSAGE)
        expect(html).not.toMatch(/run_|sentinel_session|checkpoint_safe_hidden|snapshot_safe_hidden/)
    })

    it('calls the wrapper with checkpointRef only', async () => {
        const requestResumeSnapshotImpl = jest.fn().mockResolvedValue(safeSnapshot())

        const result = await loadResumeSnapshot(' checkpoint_local_only ', requestResumeSnapshotImpl)

        expect(requestResumeSnapshotImpl).toHaveBeenCalledTimes(1)
        expect(requestResumeSnapshotImpl).toHaveBeenCalledWith({ checkpointRef: 'checkpoint_local_only' })
        expect(result.snapshot.plain_summary).toBe('Accepted work is ready for display.')
        expect(result.error).toBe('')
    })

    it('calls the goal wrapper with plainGoal only', async () => {
        const requestGoalSnapshotImpl = jest.fn().mockResolvedValue(
            safeSnapshot({
                snapshot_ref: 'snapshot_goal_intake',
                state: 'goal_intake',
                plain_summary: 'Your goal was received by the local cockpit.',
                next_safe_action: 'planning_deferred',
                checkpoint_ref: null,
                result_status: 'not_started',
                accepted_state: 'not_accepted'
            })
        )

        const result = await loadGoalSnapshot(' Plan the next safe step ', requestGoalSnapshotImpl)

        expect(requestGoalSnapshotImpl).toHaveBeenCalledTimes(1)
        expect(requestGoalSnapshotImpl).toHaveBeenCalledWith({ plainGoal: 'Plan the next safe step' })
        expect(result.snapshot.state).toBe('goal_intake')
        expect(result.error).toBe('')
    })

    it('calls the goal wrapper with a memory nonce for the QVC-1E path', async () => {
        const requestGoalSnapshotImpl = jest.fn().mockResolvedValue(safePlanSession())

        const result = await loadGoalSnapshot(' Plan the next safe step ', requestGoalSnapshotImpl, 'nonce_abcdefghijklmnop')

        expect(requestGoalSnapshotImpl).toHaveBeenCalledTimes(1)
        expect(requestGoalSnapshotImpl).toHaveBeenCalledWith({
            plainGoal: 'Plan the next safe step',
            clientNonce: 'nonce_abcdefghijklmnop'
        })
        expect(result.snapshot.state).toBe('plan_decision_required')
        expect(result.error).toBe('')
    })

    it('preserves no-nonce fallback when a legacy server rejects goal nonce', async () => {
        const requestGoalSnapshotImpl = jest
            .fn()
            .mockRejectedValueOnce({ code: 'invalid_request', message: 'raw detail should not render' })
            .mockResolvedValueOnce(
                safeSnapshot({
                    snapshot_ref: 'snapshot_goal_intake',
                    state: 'goal_intake',
                    plain_summary: 'Your goal was received by the local cockpit.',
                    next_safe_action: 'planning_deferred',
                    checkpoint_ref: null,
                    result_status: 'not_started',
                    accepted_state: 'not_accepted'
                })
            )

        const result = await loadGoalSnapshot(' Plan the next safe step ', requestGoalSnapshotImpl, 'nonce_abcdefghijklmnop')

        expect(requestGoalSnapshotImpl).toHaveBeenCalledTimes(2)
        expect(requestGoalSnapshotImpl.mock.calls[0][0]).toEqual({
            plainGoal: 'Plan the next safe step',
            clientNonce: 'nonce_abcdefghijklmnop'
        })
        expect(requestGoalSnapshotImpl.mock.calls[1][0]).toEqual({ plainGoal: 'Plan the next safe step' })
        expect(result.snapshot.state).toBe('goal_intake')
        expect(result.error).toBe('')
    })

    it('does not write checkpoint state to browser storage, cookies, or history', async () => {
        const storageSet = jest.fn()
        const cookieSet = jest.fn()
        const pushState = jest.fn()
        const replaceState = jest.fn()
        global.localStorage = { setItem: storageSet }
        global.sessionStorage = { setItem: storageSet }
        global.history = { pushState, replaceState }
        global.document = {}
        Object.defineProperty(global.document, 'cookie', {
            configurable: true,
            get: () => '',
            set: cookieSet
        })
        const requestResumeSnapshotImpl = jest.fn().mockResolvedValue(safeSnapshot())

        await loadResumeSnapshot('checkpoint_local_only', requestResumeSnapshotImpl)

        expect(storageSet).not.toHaveBeenCalled()
        expect(cookieSet).not.toHaveBeenCalled()
        expect(pushState).not.toHaveBeenCalled()
        expect(replaceState).not.toHaveBeenCalled()
    })

    it('does not render forbidden raw fields or hidden identifiers', () => {
        const html = renderToStaticMarkup(
            <ResumeSnapshot
                snapshot={safeSnapshot({
                    run_id: 'run_raw_hidden',
                    sentinel_session_id: 'sentinel_session_raw_hidden',
                    session_id: 'session_raw_hidden',
                    token: 'Bearer hidden',
                    authorization: 'Authorization hidden',
                    action_inputs: { blocked: true },
                    approval_challenge: 'challenge_hidden',
                    approval_challenge_hash: 'challenge_hash_hidden',
                    raw_dto: 'raw_dto_hidden',
                    raw_gateway_dto: 'raw_gateway_dto_hidden',
                    raw_gateway_body: 'raw_gateway_body_hidden',
                    task_packet: 'task_packet_hidden',
                    task_packet_hash: 'task_packet_hash_hidden',
                    task_id: 'task_id_hidden',
                    result_packet: 'result_packet_hidden',
                    result_packet_hash: 'result_packet_hash_hidden',
                    result_id: 'result_id_hidden',
                    evidence_manifest: 'evidence_manifest_hidden',
                    evidence_manifest_ref: 'evidence_manifest_ref_hidden'
                })}
            />
        )

        expect(html).toContain('Accepted work is ready for display.')
        expect(html).toContain('Next safe action: accepted_complete')
        expect(html).toContain('This view is for guidance only.')
        expect(html).not.toMatch(
            /run_raw_hidden|sentinel_session_raw_hidden|session_raw_hidden|Bearer hidden|Authorization hidden|action_inputs|approval_challenge|approval_challenge_hash|raw_dto|raw_gateway_dto|raw_gateway_body|task_packet|task_packet_hash|task_id|result_packet|result_packet_hash|result_id|evidence_manifest|evidence_manifest_ref/
        )
        expect(html).not.toContain('checkpoint_safe_hidden')
        expect(html).not.toContain('snapshot_safe_hidden')
    })

    it('renders sanitized route guidance for snapshot responses without adding controls', () => {
        const html = renderToStaticMarkup(
            <ResumeSnapshot
                snapshot={safeSnapshot({
                    route_card: safeRouteCard({
                        category: 'unclear',
                        title: 'Needs clarification',
                        summary: 'Sentinel needs a little more context before choosing the safest path.',
                        what_can_happen_next: 'Clarify the goal in plain English, including what outcome you want.',
                        what_will_not_happen: 'No plan, work, or review starts from an unclear goal.',
                        needs_clarification: true,
                        clarification_question: 'What outcome do you want Sentinel to help you reason about?'
                    })
                })}
            />
        )

        expect(html).toContain('Sentinel route guidance')
        expect(html).toContain('Understood as')
        expect(html).toContain('Needs clarification')
        expect(html).toContain('Next')
        expect(html).toContain('Clarify the goal in plain English')
        expect(html).toContain('Not doing')
        expect(html).toContain('No plan, work, or review starts from an unclear goal.')
        expect(html).toContain('Need')
        expect(html).not.toMatch(
            /Approve plan|Revise plan|Stop|Prepare manual worker packet|Send for Sentinel review|client_nonce|cockpit_ref|gateway|bearer|authorization/
        )
    })

    it('omits unsafe snapshot route guidance without rendering raw content', () => {
        const html = renderToStaticMarkup(
            <ResumeSnapshot
                snapshot={safeSnapshot({
                    route_card: safeRouteCard({
                        title: 'Gateway token route',
                        summary: 'Gateway token hidden_token should not render.'
                    })
                })}
            />
        )

        expect(html).not.toContain('Sentinel route guidance')
        expect(html).not.toContain('hidden_token')
        expect(html).not.toContain('Gateway token route')
        expect(html).toContain('Accepted work is ready for display.')
    })

    it('clears checkpoint input on submit, Clear, and unmount without retaining it in markup or browser state', async () => {
        requestResumeSnapshot.mockResolvedValue(safeSnapshot())
        const { container, getInput, queryByText, setInput, clickButton, submitForm, unmount } = renderInteractive()

        const input = getInput()
        setInput('fws8-submit-checkpoint')
        submitForm()

        expect(input.value).toBe('')
        expect(container.textContent).not.toContain('fws8-submit-checkpoint')
        await waitForAssertion(() => expect(container.textContent).toContain('Accepted work is ready for display.'))
        expect(container.textContent).not.toContain('fws8-submit-checkpoint')

        setInput('fws8-clear-checkpoint')
        clickButton('Clear')

        expect(input.value).toBe('')
        expect(queryByText('Accepted work is ready for display.')).toBeNull()
        expect(container.textContent).not.toContain('fws8-clear-checkpoint')

        setInput('fws8-unmount-checkpoint')
        unmount()

        expect(document.body.textContent).not.toContain('fws8-unmount-checkpoint')
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe('')
        expect(window.location.pathname).toBe('/sentinel-cockpit')
        expect(window.location.search).toBe('')
        expect(window.location.hash).toBe('')
    })

    it('clears goal input on submit, Clear, and unmount without retaining it in markup or browser state', async () => {
        requestGoalSnapshot.mockResolvedValue(
            safeSnapshot({
                snapshot_ref: 'snapshot_goal_intake',
                state: 'goal_intake',
                plain_summary: 'Your goal was received by the local cockpit.',
                next_safe_action: 'planning_deferred',
                checkpoint_ref: null,
                result_status: 'not_started',
                accepted_state: 'not_accepted'
            })
        )
        const { container, getGoalInput, setGoalInput, clickButton, submitGoalForm, unmount } = renderInteractive()

        const input = getGoalInput()
        setGoalInput('qvc-static-goal-text')
        submitGoalForm()

        expect(input.value).toBe('')
        expect(container.textContent).not.toContain('qvc-static-goal-text')
        await waitForAssertion(() => expect(container.textContent).toContain('Your goal was received by the local cockpit.'))
        expect(container.textContent).not.toContain('qvc-static-goal-text')

        setGoalInput('qvc-clear-goal-text')
        clickButton('Clear')

        expect(input.value).toBe('')
        expect(container.textContent).not.toContain('qvc-clear-goal-text')

        setGoalInput('qvc-unmount-goal-text')
        unmount()

        expect(document.body.textContent).not.toContain('qvc-unmount-goal-text')
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe('')
        expect(window.location.pathname).toBe('/sentinel-cockpit')
        expect(window.location.search).toBe('')
        expect(window.location.hash).toBe('')
    })

    it('renders only fixed loading copy and Submit/Clear controls while a request is pending', async () => {
        let resolveSnapshot
        requestResumeSnapshot.mockReturnValue(
            new Promise((resolve) => {
                resolveSnapshot = resolve
            })
        )
        const { container, setInput, submitForm } = renderInteractive()

        expect(buttonLabels(container)).toEqual(['Record goal', 'Continue last work', 'Clear'])

        setInput('fws8-loading-checkpoint')
        submitForm()

        await waitForAssertion(() => expect(buttonLabels(container)).toEqual(['Record goal', 'Checking', 'Clear']))
        expect(container.textContent).toContain(LOADING_MESSAGE)
        expect(container.textContent).not.toMatch(
            /fws8-loading-checkpoint|run_|sentinel_session|session_id|checkpoint_ref|snapshot_ref|cockpit_ref|client_nonce|token|authorization|action_inputs|approval_challenge|task_packet|result_packet|evidence_manifest|raw_dto|raw_gateway/
        )

        const { act } = require('react-dom/test-utils')
        await act(async () => {
            resolveSnapshot(safeSnapshot())
            await Promise.resolve()
        })
        await waitForAssertion(() => expect(container.textContent).toContain('Accepted work is ready for display.'))
        expect(buttonLabels(container)).toEqual(['Record goal', 'Continue last work', 'Clear'])
    })

    it('renders only fixed goal loading copy and local buttons while a goal request is pending', async () => {
        let resolveSnapshot
        requestGoalSnapshot.mockReturnValue(
            new Promise((resolve) => {
                resolveSnapshot = resolve
            })
        )
        const { container, setGoalInput, submitGoalForm } = renderInteractive()

        expect(buttonLabels(container)).toEqual(['Record goal', 'Continue last work', 'Clear'])

        setGoalInput('qvc-loading-goal-text')
        submitGoalForm()

        await waitForAssertion(() => expect(buttonLabels(container)).toEqual(['Checking', 'Continue last work', 'Clear']))
        expect(container.textContent).toContain(GOAL_LOADING_MESSAGE)
        expect(container.textContent).not.toMatch(
            /qvc-loading-goal-text|run_|sentinel_session|session_id|checkpoint_ref|snapshot_ref|cockpit_ref|client_nonce|token|authorization|action_inputs|approval_challenge|task_packet|result_packet|evidence_manifest|raw_dto|raw_gateway/
        )

        const { act } = require('react-dom/test-utils')
        await act(async () => {
            resolveSnapshot(
                safeSnapshot({
                    snapshot_ref: 'snapshot_goal_intake',
                    state: 'goal_intake',
                    plain_summary: 'Your goal was received by the local cockpit.',
                    next_safe_action: 'planning_deferred',
                    checkpoint_ref: null,
                    result_status: 'not_started',
                    accepted_state: 'not_accepted'
                })
            )
            await Promise.resolve()
        })
        await waitForAssertion(() => expect(container.textContent).toContain('Your goal was received by the local cockpit.'))
        expect(buttonLabels(container)).toEqual(['Record goal', 'Continue last work', 'Clear'])
    })

    it('calls the wrapper only from submit, not render, input, Clear, completion rerender, or unmount', async () => {
        requestResumeSnapshot.mockResolvedValue(safeSnapshot())
        const { container, setInput, clickButton, submitForm, unmount } = renderInteractive()

        expect(requestResumeSnapshot).toHaveBeenCalledTimes(0)
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)
        expect(requestManualWorkerPacket).toHaveBeenCalledTimes(0)

        setInput('fws8-wrapper-checkpoint')
        expect(requestResumeSnapshot).toHaveBeenCalledTimes(0)
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)
        expect(requestManualWorkerPacket).toHaveBeenCalledTimes(0)

        clickButton('Clear')
        expect(requestResumeSnapshot).toHaveBeenCalledTimes(0)
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)
        expect(requestManualWorkerPacket).toHaveBeenCalledTimes(0)

        setInput('fws8-wrapper-checkpoint')
        submitForm()

        await waitForAssertion(() => expect(requestResumeSnapshot).toHaveBeenCalledTimes(1))
        await waitForAssertion(() => expect(container.textContent).toContain('Accepted work is ready for display.'))
        expect(requestResumeSnapshot).toHaveBeenCalledTimes(1)
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)
        expect(requestManualWorkerPacket).toHaveBeenCalledTimes(0)

        unmount()
        expect(requestResumeSnapshot).toHaveBeenCalledTimes(1)
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)
        expect(requestManualWorkerPacket).toHaveBeenCalledTimes(0)
    })

    it('calls the goal wrapper only from goal submit, not render, input, Clear, completion rerender, or unmount', async () => {
        requestGoalSnapshot.mockResolvedValue(
            safeSnapshot({
                snapshot_ref: 'snapshot_goal_intake',
                state: 'goal_intake',
                plain_summary: 'Your goal was received by the local cockpit.',
                next_safe_action: 'planning_deferred',
                checkpoint_ref: null,
                result_status: 'not_started',
                accepted_state: 'not_accepted'
            })
        )
        const { container, setGoalInput, clickButton, submitGoalForm, unmount } = renderInteractive()

        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)
        expect(requestManualWorkerPacket).toHaveBeenCalledTimes(0)
        expect(requestResumeSnapshot).toHaveBeenCalledTimes(0)

        setGoalInput('qvc-wrapper-goal-text')
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)

        clickButton('Clear')
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(0)

        setGoalInput('qvc-wrapper-goal-text')
        submitGoalForm()

        await waitForAssertion(() => expect(requestGoalSnapshot).toHaveBeenCalledTimes(1))
        await waitForAssertion(() => expect(container.textContent).toContain('Your goal was received by the local cockpit.'))
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(1)
        expect(requestResumeSnapshot).toHaveBeenCalledTimes(0)

        unmount()
        expect(requestGoalSnapshot).toHaveBeenCalledTimes(1)
    })

    it('blocks display when allowed_user_actions is unsafe', async () => {
        const requestResumeSnapshotImpl = jest.fn().mockResolvedValue(
            safeSnapshot({
                allowed_user_actions: ['continue'],
                plain_summary: 'This should not render.'
            })
        )

        const result = await loadResumeSnapshot('checkpoint_local_only', requestResumeSnapshotImpl)

        expect(result.snapshot).toBeNull()
        expect(result.error).toBe(DISPLAY_BLOCKED_ERROR)
        expect(JSON.stringify(result)).not.toContain('This should not render.')
    })

    it('blocks plan-session decision controls without matching nonce authority', async () => {
        const requestGoalSnapshotImpl = jest.fn().mockResolvedValue({
            schema_version: 'sentinel.cockpit_bridge.plan_session.v1',
            status: 'ok',
            state: 'plan_decision_required',
            plain_summary: 'Sentinel is ready for a plan decision.',
            next_safe_action: 'user_plan_decision_required',
            allowed_user_actions: ['approve_plan', 'revise_plan', 'stop'],
            blocked_actions: [],
            cockpit_ref: 'cockpit_hidden_ref',
            plan_card: null,
            safe_error: null
        })

        const result = await loadGoalSnapshot('Plan the next safe step', requestGoalSnapshotImpl)

        expect(result.snapshot).toBeNull()
        expect(result.error).toBe(DISPLAY_BLOCKED_ERROR)
        expect(JSON.stringify(result)).not.toContain('cockpit_hidden_ref')
        expect(JSON.stringify(result)).not.toContain('approve_plan')
    })

    it('renders a valid plan-session card without exposing cockpit authority', () => {
        const html = renderToStaticMarkup(
            <PlanSessionCard
                snapshot={safePlanSession({
                    cockpit_ref: 'cockpit_hidden_ref',
                    run_id: 'run_hidden',
                    sentinel_session_id: 'sentinel_session_hidden',
                    decision_id: 'decision_hidden',
                    approval_challenge: 'approval_challenge_hidden'
                })}
                canDecide
                revisionInput=''
            />
        )

        expect(html).toContain('Plain-English plan draft')
        expect(html).toContain('Approve plan')
        expect(html).toContain('Revise plan')
        expect(html).toContain('Stop')
        expect(html).not.toMatch(
            /cockpit_hidden_ref|run_hidden|sentinel_session_hidden|decision_hidden|approval_challenge_hidden|client_nonce|gateway|bearer|authorization/
        )
    })

    it('renders sanitized Sentinel-owned route guidance without adding controls', () => {
        const html = renderToStaticMarkup(
            <PlanSessionCard
                snapshot={safePlanSession({
                    route_card: safeRouteCard()
                })}
                canDecide
                revisionInput=''
            />
        )

        expect(html).toContain('Sentinel route guidance')
        expect(html).toContain('Understood as')
        expect(html).toContain('Planning')
        expect(html).toContain('Next')
        expect(html).toContain('Sentinel can prepare a safe plain-English plan for your review.')
        expect(html).toContain('Not doing')
        expect(html).toContain('No files are edited, no commands run, and no workers are launched.')
        expect(html).toContain('Approve plan')
        expect(html).toContain('Revise plan')
        expect(html).toContain('Stop')
        expect(html).not.toMatch(
            /run_hidden|sentinel_session|decision_id|approval_challenge|client_nonce|cockpit_ref|gateway|bearer|authorization|task_packet|result_packet/
        )
    })

    it('omits unsafe route guidance instead of rendering raw routing details', () => {
        const html = renderToStaticMarkup(
            <PlanSessionCard
                snapshot={safePlanSession({
                    route_card: safeRouteCard({
                        title: 'Gateway token route',
                        summary: 'Gateway token hidden_token should not render.'
                    })
                })}
                canDecide
                revisionInput=''
            />
        )

        expect(html).not.toContain('Sentinel route guidance')
        expect(html).not.toContain('hidden_token')
        expect(html).not.toContain('Gateway token route')
        expect(html).toContain('Plain-English plan draft')
    })

    it('requires exact plan-decision predicate before rendering controls', () => {
        expect(isPlanDecisionRequiredSession(safePlanSession(), 'nonce_abcdefghijklmnop')).toBe(true)
        expect(isPlanDecisionRequiredSession(safePlanSession({ schema_version: 'wrong' }), 'nonce_abcdefghijklmnop')).toBe(false)
        expect(isPlanDecisionRequiredSession(safePlanSession({ state: 'plan_drafted' }), 'nonce_abcdefghijklmnop')).toBe(false)
        expect(isPlanDecisionRequiredSession(safePlanSession({ cockpit_ref: '' }), 'nonce_abcdefghijklmnop')).toBe(false)
        expect(
            isPlanDecisionRequiredSession(safePlanSession({ allowed_user_actions: ['approve_plan', 'stop'] }), 'nonce_abcdefghijklmnop')
        ).toBe(false)
        expect(
            isPlanDecisionRequiredSession(
                safePlanSession({ allowed_user_actions: ['approve_plan', 'revise_plan', 'stop', 'execute'] }),
                'nonce_abcdefghijklmnop'
            )
        ).toBe(false)
        expect(isPlanDecisionRequiredSession(safePlanSession(), '')).toBe(false)
    })

    it('requires exact manual packet predicate before rendering prepare controls', () => {
        const manualSession = safePlanSession({
            state: 'manual_packet_preparation_required',
            next_safe_action: 'prepare_manual_worker_packet',
            allowed_user_actions: ['prepare_manual_worker_packet'],
            cockpit_ref: 'cockpit_safe_ref'
        })

        expect(isManualPacketRequiredSession(manualSession, 'nonce_abcdefghijklmnop')).toBe(true)
        expect(
            isManualPacketRequiredSession(
                { ...manualSession, allowed_user_actions: ['prepare_manual_worker_packet', 'execute'] },
                'nonce_abcdefghijklmnop'
            )
        ).toBe(false)
        expect(isManualPacketRequiredSession({ ...manualSession, cockpit_ref: '' }, 'nonce_abcdefghijklmnop')).toBe(false)
        expect(isManualPacketRequiredSession({ ...manualSession, state: 'manual_packet_ready' }, 'nonce_abcdefghijklmnop')).toBe(false)
        expect(isManualPacketRequiredSession(manualSession, '')).toBe(false)
    })

    it('requires exact result review predicate before rendering review controls', () => {
        const reviewSession = safePlanSession({
            state: 'result_review_required',
            next_safe_action: 'submit_manual_worker_result',
            allowed_user_actions: ['submit_result_review'],
            cockpit_ref: 'cockpit_review_ref'
        })

        expect(isResultReviewRequiredSession(reviewSession, 'nonce_abcdefghijklmnop')).toBe(true)
        expect(
            isResultReviewRequiredSession(
                { ...reviewSession, allowed_user_actions: ['submit_result_review', 'execute'] },
                'nonce_abcdefghijklmnop'
            )
        ).toBe(false)
        expect(isResultReviewRequiredSession({ ...reviewSession, cockpit_ref: '' }, 'nonce_abcdefghijklmnop')).toBe(false)
        expect(
            isResultReviewRequiredSession(
                { ...reviewSession, state: 'result_review_accepted', allowed_user_actions: ['none'], cockpit_ref: null },
                'nonce_abcdefghijklmnop'
            )
        ).toBe(false)
        expect(isResultReviewRequiredSession(reviewSession, '')).toBe(false)
    })

    it('generates a URL-safe 128-bit nonce without storage or URL writes', () => {
        installDom()
        const nonce = generateClientNonce()

        expect(nonce).toMatch(/^[a-f0-9]{32}$/)
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe('')
        expect(window.location.search).toBe('')
        expect(window.location.hash).toBe('')
    })

    it('renders plan controls after goal submit and calls plan-decision wrapper with nonce authority only', async () => {
        requestGoalSnapshot.mockResolvedValue(safePlanSession())
        requestPlanDecision.mockResolvedValue(
            safePlanSession({
                state: 'plan_drafted',
                plain_summary: 'Sentinel drafted a display-only plan summary.',
                next_safe_action: 'plan_display_only',
                allowed_user_actions: ['none'],
                cockpit_ref: null,
                plan_card: null
            })
        )
        const { container, setGoalInput, submitGoalForm, clickButton } = renderInteractive()

        setGoalInput('qvc-plan-session-goal')
        submitGoalForm()

        await waitForAssertion(() => expect(container.textContent).toContain('Approve plan'))
        expect(container.textContent).toContain('Revise plan')
        expect(container.textContent).toContain('Stop')
        expect(container.textContent).not.toMatch(
            /qvc-plan-session-goal|cockpit_safe_ref|client_nonce|run_|sentinel_session|decision_id|approval_challenge|gateway|bearer|authorization/
        )

        const goalInput = requestGoalSnapshot.mock.calls[0][0]
        expect(goalInput.plainGoal).toBe('qvc-plan-session-goal')
        expect(goalInput.clientNonce).toMatch(/^[a-f0-9]{32}$/)

        clickButton('Approve plan')

        await waitForAssertion(() => expect(requestPlanDecision).toHaveBeenCalledTimes(1))
        expect(requestPlanDecision).toHaveBeenCalledWith({
            cockpitRef: 'cockpit_safe_ref',
            clientNonce: goalInput.clientNonce,
            decision: 'approve_plan'
        })
        await waitForAssertion(() => expect(container.textContent).toContain('Sentinel drafted a display-only plan summary.'))
        expect(container.textContent).not.toContain('Approve plan')
        expect(JSON.stringify(requestPlanDecision.mock.calls)).not.toContain('127.0.0.1:39173')
    })

    it('renders manual packet prepare control after plan approval and calls the wrapper with nonce authority only', async () => {
        requestGoalSnapshot.mockResolvedValue(safePlanSession())
        requestPlanDecision.mockResolvedValue(
            safePlanSession({
                state: 'manual_packet_preparation_required',
                plain_summary: 'Sentinel drafted the plan. You can now prepare a manual worker packet as a separate explicit step.',
                next_safe_action: 'prepare_manual_worker_packet',
                allowed_user_actions: ['prepare_manual_worker_packet'],
                cockpit_ref: 'cockpit_packet_ref',
                plan_card: {
                    plain_title: 'Manual packet preparation',
                    plain_summary: 'Prepare a manual packet only when you are ready.',
                    plain_steps: ['Confirm the plan is still the right next step.', 'Prepare the manual packet.'],
                    will_not_do: ['No worker is launched here', 'No files are edited here']
                }
            })
        )
        requestManualWorkerPacket.mockResolvedValue(
            safePlanSession({
                state: 'manual_packet_ready',
                plain_summary: 'The manual worker packet is ready. No worker was launched and no files were edited here.',
                next_safe_action: 'manual_handoff_ready',
                allowed_user_actions: ['none'],
                cockpit_ref: null,
                plan_card: {
                    plain_title: 'Manual packet ready',
                    plain_summary: 'Use the governed out-of-band manual handoff process.',
                    plain_steps: ['Use the approved manual handoff process outside this page.'],
                    will_not_do: ['No worker launched here', 'No files edited here']
                },
                task_packet: 'hidden',
                copyable_worker_prompt: 'hidden',
                task_id: 'task_hidden',
                task_packet_hash: 'hash_hidden'
            })
        )
        const { container, setGoalInput, submitGoalForm, clickButton } = renderInteractive()

        setGoalInput('qvc-manual-packet-goal')
        submitGoalForm()
        await waitForAssertion(() => expect(container.textContent).toContain('Approve plan'))

        const goalInput = requestGoalSnapshot.mock.calls[0][0]
        clickButton('Approve plan')

        await waitForAssertion(() => expect(container.textContent).toContain('Prepare manual worker packet'))
        expect(container.textContent).not.toMatch(
            /qvc-manual-packet-goal|cockpit_packet_ref|client_nonce|run_|sentinel_session|decision_id|approval_id|plan_id|task_id|task_packet|copyable_worker_prompt|gateway|bearer|authorization/
        )

        clickButton('Prepare manual worker packet')

        await waitForAssertion(() => expect(requestManualWorkerPacket).toHaveBeenCalledTimes(1))
        expect(requestManualWorkerPacket).toHaveBeenCalledWith({
            cockpitRef: 'cockpit_packet_ref',
            clientNonce: goalInput.clientNonce
        })
        await waitForAssertion(() => expect(container.textContent).toContain('Manual packet ready'))
        expect(container.textContent).toContain('Use the governed out-of-band manual handoff process.')
        expect(container.textContent).not.toContain('Prepare manual worker packet')
        expect(container.textContent).not.toMatch(
            /cockpit_packet_ref|client_nonce|task_hidden|hash_hidden|task_packet|copyable_worker_prompt|127\.0\.0\.1:39173/
        )
    })

    it('renders result review controls after manual packet preparation and calls the wrapper with pasted text only', async () => {
        requestGoalSnapshot.mockResolvedValue(safePlanSession())
        requestPlanDecision.mockResolvedValue(
            safePlanSession({
                state: 'manual_packet_preparation_required',
                plain_summary: 'Sentinel drafted the plan. You can now prepare a manual worker packet as a separate explicit step.',
                next_safe_action: 'prepare_manual_worker_packet',
                allowed_user_actions: ['prepare_manual_worker_packet'],
                cockpit_ref: 'cockpit_packet_ref'
            })
        )
        requestManualWorkerPacket.mockResolvedValue(
            safePlanSession({
                state: 'result_review_required',
                plain_summary: 'The manual worker packet is ready. Paste the manual worker result for Sentinel review.',
                next_safe_action: 'submit_manual_worker_result',
                allowed_user_actions: ['submit_result_review'],
                cockpit_ref: 'cockpit_review_ref',
                plan_card: {
                    plain_title: 'Paste manual result for review',
                    plain_summary: 'This sends pasted plain text to Sentinel review through Flowise.',
                    plain_steps: ['Paste the manual worker result text.'],
                    will_not_do: ['No worker launched here']
                }
            })
        )
        requestResultReview.mockResolvedValue(
            safePlanSession({
                state: 'result_review_accepted',
                plain_summary:
                    'Sentinel accepted this pasted result for the prepared manual packet. This page did not apply code, publish work, or start a continuation.',
                next_safe_action: 'review_complete',
                allowed_user_actions: ['none'],
                cockpit_ref: null,
                plan_card: {
                    plain_title: 'Sentinel review accepted',
                    plain_summary:
                        'Sentinel accepted this pasted result for the prepared manual packet. This page did not apply code, publish work, or start a continuation.',
                    plain_steps: ['Record or hand off this verdict using your normal out-of-band process.'],
                    will_not_do: ['No code applied here']
                },
                result_packet: 'hidden',
                task_id: 'task_hidden',
                shield_review_id: 'shield_hidden'
            })
        )
        const { container, setGoalInput, submitGoalForm, clickButton, setResultReviewInput, setReviewOnlyConfirmed, getResultReviewInput } =
            renderInteractive()

        setGoalInput('qvc-result-review-goal')
        submitGoalForm()
        await waitForAssertion(() => expect(container.textContent).toContain('Approve plan'))

        const goalInput = requestGoalSnapshot.mock.calls[0][0]
        clickButton('Approve plan')
        await waitForAssertion(() => expect(container.textContent).toContain('Prepare manual worker packet'))
        clickButton('Prepare manual worker packet')
        await waitForAssertion(() => expect(container.textContent).toContain('Pasted manual worker result'))
        expect(container.textContent).not.toMatch(
            /qvc-result-review-goal|cockpit_review_ref|client_nonce|run_|sentinel_session|task_id|task_packet_hash|result_packet|gateway|bearer|authorization/
        )

        setResultReviewInput('Manual worker completed a plain text review outside this page.')
        setReviewOnlyConfirmed(true)
        clickButton('Send for Sentinel review')

        await waitForAssertion(() => expect(requestResultReview).toHaveBeenCalledTimes(1))
        expect(requestResultReview).toHaveBeenCalledWith({
            cockpitRef: 'cockpit_review_ref',
            clientNonce: goalInput.clientNonce,
            resultText: 'Manual worker completed a plain text review outside this page.',
            reviewOnlyConfirmation: true
        })
        expect(getResultReviewInput()).toBeNull()
        await waitForAssertion(() => expect(container.textContent).toContain('Sentinel review accepted'))
        expect(container.textContent).not.toContain('Send for Sentinel review')
        expect(container.textContent).not.toMatch(
            /cockpit_review_ref|client_nonce|task_hidden|shield_hidden|result_packet|127\.0\.0\.1:39173/
        )
        expect(JSON.stringify(requestResultReview.mock.calls)).not.toContain('127.0.0.1:39173')
    })

    it('requires review-only confirmation and blocks unsafe result text before wrapper calls', async () => {
        const requestResultReviewImpl = jest.fn()

        expect(
            await loadResultReviewSession(
                {
                    cockpitRef: 'cockpit_safe_ref',
                    clientNonce: 'nonce_abcdefghijklmnop',
                    resultText: 'Manual worker completed a plain text review outside this page.',
                    reviewOnlyConfirmation: false
                },
                requestResultReviewImpl
            )
        ).toEqual({ snapshot: null, error: 'Confirm this is review-only before sending it to Sentinel.' })
        expect(
            await loadResultReviewSession(
                {
                    cockpitRef: 'cockpit_safe_ref',
                    clientNonce: 'nonce_abcdefghijklmnop',
                    resultText: '{"result_packet":true}',
                    reviewOnlyConfirmation: true
                },
                requestResultReviewImpl
            )
        ).toEqual({ snapshot: null, error: 'Use plain text only. Do not paste protocol fields, tokens, IDs, or raw packets.' })
        expect(requestResultReviewImpl).not.toHaveBeenCalled()
    })

    it.each([
        [
            'result_review_needs_more_information',
            'More information needed',
            'Ask the manual worker or reviewer for clearer plain-English context outside the cockpit.'
        ],
        [
            'result_review_rejected',
            'Sentinel review rejected',
            'Do not treat this as accepted work. Stop and use human review outside the cockpit.'
        ],
        [
            'result_review_unavailable',
            'Sentinel review unavailable',
            'Nothing was accepted. Keep the result outside this page and use an approved retry or review path.'
        ]
    ])('renders fixed safe copy for %s verdict states', (state, title, summary) => {
        const html = renderToStaticMarkup(
            <PlanSessionCard
                snapshot={safePlanSession({
                    state,
                    plain_summary: 'Raw Gateway detail should not be needed.',
                    next_safe_action: 'review_unavailable',
                    allowed_user_actions: ['none'],
                    cockpit_ref: null,
                    plan_card: {
                        plain_title: title,
                        plain_summary: summary,
                        plain_steps: ['Use manual review outside this page.'],
                        will_not_do: ['No repo write here']
                    },
                    result_packet: 'hidden',
                    result_id: 'result_hidden',
                    shield_review_id: 'shield_hidden'
                })}
            />
        )

        expect(html).toContain(title)
        expect(html).toContain(summary)
        expect(html).not.toMatch(/result_hidden|shield_hidden|result_packet|client_nonce|cockpit_ref|127\.0\.0\.1:39173/)
    })

    it('maps manual packet errors to fixed copy without raw detail', async () => {
        const requestManualWorkerPacketImpl = jest
            .fn()
            .mockRejectedValue({ code: 'manual_packet_nonce_mismatch', message: 'raw packet mismatch detail' })

        const result = await loadManualPacketSession(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop'
            },
            requestManualWorkerPacketImpl
        )

        expect(result.snapshot).toBeNull()
        expect(result.error).toBe('Manual packet preparation is not available in this view.')
        expect(JSON.stringify(result)).not.toContain('raw packet mismatch detail')
    })

    it('sends bounded revise text and rejects empty, over-limit, or unsafe revision text', async () => {
        expect(
            await loadPlanDecisionSession({
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'revise_plan',
                revisionText: ''
            })
        ).toEqual({ snapshot: null, error: REVISION_EMPTY_MESSAGE })
        expect(
            await loadPlanDecisionSession({
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'revise_plan',
                revisionText: 'a'.repeat(1001)
            })
        ).toEqual({ snapshot: null, error: REVISION_TOO_LONG_MESSAGE })
        expect(
            await loadPlanDecisionSession({
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'revise_plan',
                revisionText: 'use run_hidden in the plan'
            })
        ).toEqual({ snapshot: null, error: REVISION_UNSAFE_MESSAGE })

        const requestPlanDecisionImpl = jest.fn().mockResolvedValue(
            safePlanSession({
                state: 'plan_revision_requested',
                plain_summary: 'Sentinel recorded that this plan needs revision.',
                next_safe_action: 'submit_revised_goal',
                allowed_user_actions: ['none'],
                cockpit_ref: null,
                plan_card: null
            })
        )

        const result = await loadPlanDecisionSession(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'revise_plan',
                revisionText: 'Please make the plan smaller.'
            },
            requestPlanDecisionImpl
        )

        expect(requestPlanDecisionImpl).toHaveBeenCalledWith({
            cockpitRef: 'cockpit_safe_ref',
            clientNonce: 'nonce_abcdefghijklmnop',
            decision: 'revise_plan',
            revisionText: 'Please make the plan smaller.'
        })
        expect(result.snapshot.state).toBe('plan_revision_requested')
        expect(result.error).toBe('')
    })

    it('clears nonce, cockpit ref, revision text, card, and controls on Clear, new goal, and unmount', async () => {
        requestGoalSnapshot.mockResolvedValue(safePlanSession())
        const { container, setGoalInput, submitGoalForm, clickButton, unmount } = renderInteractive()

        setGoalInput('qvc-clear-authority-goal')
        submitGoalForm()
        await waitForAssertion(() => expect(container.textContent).toContain('Approve plan'))

        const revision = container.querySelector('#sentinel-revision-text')
        const { act, Simulate } = require('react-dom/test-utils')
        act(() => {
            Simulate.change(revision, { target: { value: 'Please narrow this.' } })
        })
        expect(revision.value).toBe('Please narrow this.')

        clickButton('Clear')
        expect(container.textContent).not.toContain('Approve plan')
        expect(container.textContent).not.toContain('Please narrow this.')
        expect(container.textContent).not.toContain('cockpit_safe_ref')

        setGoalInput('qvc-new-authority-goal')
        submitGoalForm()
        await waitForAssertion(() => expect(requestGoalSnapshot).toHaveBeenCalledTimes(2))
        expect(requestGoalSnapshot.mock.calls[1][0].clientNonce).toMatch(/^[a-f0-9]{32}$/)
        expect(requestGoalSnapshot.mock.calls[1][0].clientNonce).not.toBe(requestGoalSnapshot.mock.calls[0][0].clientNonce)

        unmount()
        expect(document.body.textContent).not.toContain('Approve plan')
        expect(document.body.textContent).not.toContain('cockpit_safe_ref')
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.cookie).toBe('')
        expect(window.location.search).toBe('')
        expect(window.location.hash).toBe('')
    })

    it('maps plan-decision errors to fixed copy without raw detail', async () => {
        const requestPlanDecisionImpl = jest
            .fn()
            .mockRejectedValue({ code: 'plan_session_nonce_mismatch', message: 'raw nonce mismatch detail' })

        const result = await loadPlanDecisionSession(
            {
                cockpitRef: 'cockpit_safe_ref',
                clientNonce: 'nonce_abcdefghijklmnop',
                decision: 'stop'
            },
            requestPlanDecisionImpl
        )

        expect(result.snapshot).toBeNull()
        expect(result.error).toBe(PLAN_DECISION_ERROR)
        expect(JSON.stringify(result)).not.toContain('raw nonce mismatch detail')
    })

    it('renders fixed error copy without leaking raw error detail', async () => {
        const requestResumeSnapshotImpl = jest.fn().mockRejectedValue({
            code: 'sentinel_resume_binding_not_found',
            message: 'raw internal detail should not render'
        })

        const result = await loadResumeSnapshot('checkpoint_local_only', requestResumeSnapshotImpl)

        expect(result.snapshot).toBeNull()
        expect(result.error).toBe(NOT_FOUND_ERROR)
        expect(JSON.stringify(result)).not.toContain('raw internal detail should not render')
    })

    it('renders fixed goal empty copy without leaking submitted whitespace', async () => {
        const result = await loadGoalSnapshot('   ')

        expect(result.snapshot).toBeNull()
        expect(result.error).toBe(GOAL_EMPTY_MESSAGE)
    })
})
