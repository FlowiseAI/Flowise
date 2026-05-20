/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react'

import {
    requestGoalSnapshot,
    requestIdeWorkAction,
    requestManualWorkerPacket,
    requestPlanDecision,
    requestResultReview,
    requestResumeSnapshot
} from '@/api/sentinelCockpit'

export const EMPTY_MESSAGE = 'Paste a checkpoint reference to continue the last work safely.'
export const LOADING_MESSAGE = 'Checking the last saved work.'
export const GOAL_EMPTY_MESSAGE = 'Describe what you want to do before recording the goal.'
export const GOAL_LOADING_MESSAGE = 'Recording the goal for intake.'
export const GENERIC_ERROR = 'Resume status is not available for display.'
export const NOT_FOUND_ERROR = 'No resume status is available for that checkpoint reference.'
export const DISPLAY_BLOCKED_ERROR = 'This resume status cannot be displayed in this view.'
export const PLAN_DECISION_ERROR = 'This plan decision is not available in this view.'
export const MANUAL_PACKET_ERROR = 'Manual packet preparation is not available in this view.'
export const MANUAL_PACKET_LOADING_MESSAGE = 'Preparing the manual worker packet.'
export const RESULT_REVIEW_ERROR = 'Sentinel result review is not available in this view.'
export const RESULT_REVIEW_LOADING_MESSAGE = 'Sending the pasted result for Sentinel review.'
export const RESULT_REVIEW_EMPTY_MESSAGE = 'Paste the manual worker result in plain text before review.'
export const RESULT_REVIEW_CONFIRMATION_MESSAGE = 'Confirm this is review-only before sending it to Sentinel.'
export const RESULT_REVIEW_UNSAFE_MESSAGE = 'Use plain text only. Do not paste protocol fields, tokens, IDs, or raw packets.'
export const RESULT_REVIEW_TEXT_MAX_LENGTH = 12000
export const RESULT_REVIEW_TEXT_MIN_LENGTH = 20
export const IDE_WORK_ERROR = 'The safe mock check is not available in this view.'
export const IDE_WORK_LOADING_MESSAGE = 'Checking the safe mock step.'
export const REVISION_EMPTY_MESSAGE = 'Describe the plan revision in plain English.'
export const REVISION_TOO_LONG_MESSAGE = 'Keep the revision note under 1000 characters.'
export const REVISION_UNSAFE_MESSAGE = 'Use plain-English revision text only.'
export const REVISION_TEXT_MAX_LENGTH = 1000

const SNAPSHOT_SCHEMA_VERSION = 'sentinel.cockpit_bridge.snapshot.v1'
const PLAN_SESSION_SCHEMA_VERSION = 'sentinel.cockpit_bridge.plan_session.v1'
const PLAN_DECISION_ACTIONS = Object.freeze(['approve_plan', 'revise_plan', 'stop'])
const MANUAL_PACKET_ACTIONS = Object.freeze(['prepare_manual_worker_packet'])
const RESULT_REVIEW_ACTIONS = Object.freeze(['submit_result_review'])
const IDE_WORK_ACTIONS = Object.freeze(['approve_mock_backend_work', 'cancel_mock_backend_work', 'none'])
const IDE_WORK_SCHEMA_VERSIONS = Object.freeze([
    'sentinel.qvc.ide_work_approval.v1',
    'sentinel.qvc.ide_work_progress.v1',
    'sentinel.qvc.ide_work_result_review_required.v1'
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
    'expired'
])
const PLAN_DECISION_FORBIDDEN_TEXT =
    /run_[a-z0-9._:-]*|sentinel_session|session_id|decision_id|approval_challenge|approval_challenge_hash|client_nonce|cockpit_ref|token|authorization|action_inputs|task_packet|result_packet|evidence_manifest|gateway|bearer/i
const RESULT_REVIEW_FORBIDDEN_TEXT =
    /run_[a-z0-9._:-]*|sentinel_session|session_id|decision_id|approval_id|plan_id|task_id|task_packet_hash|result_id|shield_review_id|client_nonce|cockpit_ref|token|authorization|action_inputs|task_packet|result_packet|evidence_manifest|copyable_worker_prompt|gateway|bearer|127\.0\.0\.1:39173/i
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
const IDE_WORK_FORBIDDEN_TEXT =
    /run_[a-z0-9._:-]*|sentinel_session|session_id|decision_id|approval_id|approval_challenge|approval_challenge_hash|plan_id|task_id|task_packet|result_packet|evidence_manifest|copyable_worker_prompt|gateway|bearer|authorization|token|client_nonce|cockpit_ref|sha256:|127\.0\.0\.1|localhost|:39173|provider|model|confidence|selected\s+worker|active\s+agent|agent\s+started|running\s+task|tool\s+call|command\s*[:=]|action_inputs|adapter|argv|nonce|hash|source\s+snippet/i

const displayRows = [
    ['Current status', 'state'],
    ['Plain-English summary', 'plain_summary'],
    ['Recommended next safe action', 'next_safe_action'],
    ['Manual work status', 'worker_status'],
    ['Review result', 'result_status'],
    ['Safety review', 'shield_summary'],
    ['Accepted work state', 'accepted_state'],
    ['Stale document warning', 'stale_doc_warning']
]

const pageStyles = {
    root: {
        minHeight: '100%',
        padding: '32px',
        background: '#020617',
        color: '#e5eefb'
    },
    panel: {
        width: '100%',
        maxWidth: '920px',
        margin: '0 auto',
        border: '1px solid #334155',
        borderRadius: '8px',
        background: '#0f172a',
        padding: '24px',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)'
    },
    title: {
        margin: '0 0 8px',
        fontSize: '1.4rem',
        fontWeight: 700
    },
    copy: {
        margin: '0 0 20px',
        color: '#cbd5e1',
        lineHeight: 1.5
    },
    eyebrow: {
        margin: '0 0 6px',
        color: '#67e8f9',
        fontSize: '0.78rem',
        fontWeight: 700,
        letterSpacing: 0,
        textTransform: 'uppercase'
    },
    guidance: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '10px',
        marginBottom: '20px'
    },
    guidanceItem: {
        border: '1px solid #334155',
        borderRadius: '6px',
        background: '#111827',
        padding: '12px'
    },
    guidanceTitle: {
        margin: '0 0 4px',
        color: '#f8fafc',
        fontSize: '0.92rem',
        fontWeight: 700
    },
    guidanceCopy: {
        margin: 0,
        color: '#cbd5e1',
        fontSize: '0.88rem',
        lineHeight: 1.4
    },
    form: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto auto',
        gap: '10px',
        alignItems: 'end',
        marginBottom: '20px'
    },
    goalForm: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '10px',
        alignItems: 'end',
        marginBottom: '14px'
    },
    label: {
        display: 'block',
        marginBottom: '6px',
        color: '#dbeafe',
        fontSize: '0.9rem',
        fontWeight: 600
    },
    input: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #475569',
        borderRadius: '6px',
        background: '#020617',
        color: '#f8fafc',
        padding: '10px 12px',
        fontSize: '0.95rem'
    },
    textarea: {
        width: '100%',
        minHeight: '76px',
        boxSizing: 'border-box',
        border: '1px solid #475569',
        borderRadius: '6px',
        background: '#020617',
        color: '#f8fafc',
        padding: '10px 12px',
        fontSize: '0.95rem',
        resize: 'vertical'
    },
    button: {
        border: '1px solid #38bdf8',
        borderRadius: '6px',
        background: '#0ea5e9',
        color: '#04111d',
        minHeight: '40px',
        padding: '0 14px',
        fontWeight: 600,
        cursor: 'pointer'
    },
    secondaryButton: {
        border: '1px solid #475569',
        borderRadius: '6px',
        background: '#111827',
        color: '#e5eefb',
        minHeight: '40px',
        padding: '0 14px',
        fontWeight: 600,
        cursor: 'pointer'
    },
    status: {
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '16px',
        background: '#111827'
    },
    error: {
        border: '1px solid #fca5a5',
        borderRadius: '8px',
        padding: '16px',
        background: '#450a0a',
        color: '#fecaca'
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '180px minmax(0, 1fr)',
        gap: '14px',
        padding: '10px 0',
        borderBottom: '1px solid #334155'
    },
    rowLabel: {
        color: '#bfdbfe',
        fontWeight: 600
    },
    rowValue: {
        minWidth: 0,
        overflowWrap: 'anywhere'
    },
    recommendation: {
        margin: '0 0 14px',
        color: '#dbeafe',
        fontWeight: 600
    },
    blockedNote: {
        marginTop: '14px',
        color: '#cbd5e1',
        fontSize: '0.9rem'
    },
    planCard: {
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '16px',
        background: '#111827'
    },
    routeBlock: {
        display: 'grid',
        gap: '8px',
        margin: '0 0 14px',
        paddingBottom: '14px',
        borderBottom: '1px solid #334155'
    },
    routeLabel: {
        margin: 0,
        color: '#93c5fd',
        fontSize: '0.88rem',
        fontWeight: 700
    },
    routeValue: {
        margin: 0,
        color: '#e5eefb',
        lineHeight: 1.45
    },
    idePreview: {
        margin: '0 0 14px',
        border: '1px solid #334155',
        borderRadius: '6px',
        background: '#0b1220',
        padding: '12px',
        cursor: 'default'
    },
    idePreviewTitle: {
        margin: '0 0 6px',
        color: '#e5eefb',
        fontSize: '0.96rem',
        fontWeight: 700
    },
    idePreviewCopy: {
        margin: '0 0 10px',
        color: '#cbd5e1',
        fontSize: '0.88rem',
        lineHeight: 1.4
    },
    idePreviewGrid: {
        display: 'grid',
        gap: '8px',
        margin: '0 0 10px'
    },
    idePreviewRow: {
        display: 'grid',
        gridTemplateColumns: '170px minmax(0, 1fr)',
        gap: '12px'
    },
    idePreviewLabel: {
        color: '#bfdbfe',
        fontSize: '0.86rem',
        fontWeight: 600
    },
    idePreviewValue: {
        color: '#dbeafe',
        fontSize: '0.88rem',
        lineHeight: 1.4,
        minWidth: 0,
        overflowWrap: 'anywhere'
    },
    planTitle: {
        margin: '0 0 8px',
        color: '#f8fafc',
        fontSize: '1rem',
        fontWeight: 700
    },
    planList: {
        margin: '8px 0 0',
        paddingLeft: '20px',
        color: '#dbeafe'
    },
    blockedList: {
        margin: 0,
        paddingLeft: '18px',
        color: '#e5eefb'
    },
    decisionControls: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '14px'
    },
    revisionArea: {
        marginTop: '14px'
    },
    checkboxRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginTop: '10px',
        color: '#dbeafe',
        fontSize: '0.9rem',
        lineHeight: 1.4
    },
    note: {
        margin: '12px 0 0',
        color: '#cbd5e1',
        fontSize: '0.9rem'
    }
}

const IDE_PREVIEW_ROWS = Object.freeze([
    ['Preview status', 'status_label'],
    ['Suggested workflow', 'workflow_label'],
    ['Summary', 'summary'],
    ['What can happen next', 'what_can_happen_next'],
    ['What will not happen', 'what_will_not_happen'],
    ['Approval note', 'approval_copy']
])

const IDE_WORK_ROWS = Object.freeze([
    ['Mock check status', 'status_label'],
    ['Suggested workflow', 'workflow_label'],
    ['Summary', 'short_summary'],
    ['Current safe step', 'current_safe_step'],
    ['What can happen next', 'what_can_happen_next'],
    ['What will not happen', 'what_will_not_happen']
])

export default function SentinelResumeStatus() {
    const goalRef = useRef('')
    const checkpointRef = useRef('')
    const clientNonceRef = useRef('')
    const cockpitRef = useRef('')
    const revisionRef = useRef('')
    const resultTextRef = useRef('')
    const [goalInput, setGoalInput] = useState('')
    const [checkpointInput, setCheckpointInput] = useState('')
    const [revisionInput, setRevisionInput] = useState('')
    const [resultTextInput, setResultTextInput] = useState('')
    const [reviewOnlyConfirmed, setReviewOnlyConfirmed] = useState(false)
    const [snapshot, setSnapshot] = useState(null)
    const [error, setError] = useState('')
    const [loadingMode, setLoadingMode] = useState('')
    const [showIdePreview, setShowIdePreview] = useState(false)
    const isLoading = loadingMode !== ''

    useEffect(() => {
        return () => {
            goalRef.current = ''
            checkpointRef.current = ''
            clientNonceRef.current = ''
            cockpitRef.current = ''
            revisionRef.current = ''
            resultTextRef.current = ''
        }
    }, [])

    const handleGoalInputChange = (event) => {
        const value = event.target.value
        goalRef.current = value
        setGoalInput(value)
    }

    const handleInputChange = (event) => {
        const value = event.target.value
        checkpointRef.current = value
        setCheckpointInput(value)
    }

    const handleRevisionChange = (event) => {
        const value = event.target.value
        revisionRef.current = value
        setRevisionInput(value)
    }

    const handleResultTextChange = (event) => {
        const value = event.target.value
        resultTextRef.current = value
        setResultTextInput(value)
    }

    const clearPlanAuthority = () => {
        clientNonceRef.current = ''
        cockpitRef.current = ''
        revisionRef.current = ''
        resultTextRef.current = ''
        setRevisionInput('')
        setResultTextInput('')
        setReviewOnlyConfirmed(false)
    }

    const clearState = () => {
        setShowIdePreview(false)
        goalRef.current = ''
        checkpointRef.current = ''
        clearPlanAuthority()
        setGoalInput('')
        setCheckpointInput('')
        setSnapshot(null)
        setError('')
        setLoadingMode('')
    }

    const handleGoalSubmit = async (event) => {
        event.preventDefault()
        setShowIdePreview(false)
        const submittedGoal = goalRef.current.trim()
        goalRef.current = ''
        setGoalInput('')
        setSnapshot(null)
        setError('')

        if (!submittedGoal) {
            setError(GOAL_EMPTY_MESSAGE)
            return
        }

        let clientNonce
        try {
            clientNonce = generateClientNonce()
        } catch {
            setError(PLAN_DECISION_ERROR)
            return
        }
        clientNonceRef.current = clientNonce
        cockpitRef.current = ''
        revisionRef.current = ''
        setRevisionInput('')
        setLoadingMode('goal')
        try {
            const result = await loadGoalSnapshot(submittedGoal, requestGoalSnapshot, clientNonce)
            setError(result.error)
            setSnapshot(result.snapshot)
            setShowIdePreview(result.error === '' && canShowIdePreview(result.snapshot, clientNonce))
            if (isPlanDecisionRequiredSession(result.snapshot, clientNonce)) {
                cockpitRef.current = result.snapshot.cockpit_ref
            } else {
                clearPlanAuthority()
            }
        } finally {
            setLoadingMode('')
        }
    }

    const handleResumeSubmit = async (event) => {
        event.preventDefault()
        setShowIdePreview(false)
        const submittedCheckpointRef = checkpointRef.current.trim()
        checkpointRef.current = ''
        setCheckpointInput('')
        setSnapshot(null)
        setError('')

        if (!submittedCheckpointRef) {
            setError(EMPTY_MESSAGE)
            return
        }

        setLoadingMode('resume')
        try {
            const result = await loadResumeSnapshot(submittedCheckpointRef)
            setError(result.error)
            setSnapshot(result.snapshot)
            clearPlanAuthority()
        } finally {
            setLoadingMode('')
        }
    }

    const handlePlanDecision = async (decision) => {
        setShowIdePreview(false)
        if (!isPlanDecisionRequiredSession(snapshot, clientNonceRef.current) || cockpitRef.current !== snapshot.cockpit_ref) {
            clearPlanAuthority()
            setSnapshot(null)
            setError(DISPLAY_BLOCKED_ERROR)
            return
        }

        const revisionText = decision === 'revise_plan' ? revisionRef.current.trim() : ''
        const revisionError = decision === 'revise_plan' ? validateRevisionText(revisionText) : ''
        if (revisionError) {
            setError(revisionError)
            return
        }

        setLoadingMode('plan-decision')
        setError('')
        try {
            const result = await loadPlanDecisionSession({
                cockpitRef: cockpitRef.current,
                clientNonce: clientNonceRef.current,
                decision,
                revisionText
            })
            setError(result.error)
            setSnapshot(result.snapshot)
            if (
                isPlanDecisionRequiredSession(result.snapshot, clientNonceRef.current) ||
                isManualPacketRequiredSession(result.snapshot, clientNonceRef.current)
            ) {
                cockpitRef.current = result.snapshot.cockpit_ref
            } else {
                clearPlanAuthority()
            }
        } finally {
            setLoadingMode('')
        }
    }

    const handleManualPacketPrepare = async () => {
        setShowIdePreview(false)
        if (!isManualPacketRequiredSession(snapshot, clientNonceRef.current) || cockpitRef.current !== snapshot.cockpit_ref) {
            clearPlanAuthority()
            setSnapshot(null)
            setError(DISPLAY_BLOCKED_ERROR)
            return
        }

        setLoadingMode('manual-packet')
        setError('')
        try {
            const result = await loadManualPacketSession({
                cockpitRef: cockpitRef.current,
                clientNonce: clientNonceRef.current
            })
            setError(result.error)
            setSnapshot(result.snapshot)
            if (
                isManualPacketRequiredSession(result.snapshot, clientNonceRef.current) ||
                isResultReviewRequiredSession(result.snapshot, clientNonceRef.current)
            ) {
                cockpitRef.current = result.snapshot.cockpit_ref
            } else {
                clearPlanAuthority()
            }
        } finally {
            setLoadingMode('')
        }
    }

    const handleResultReviewSubmit = async () => {
        setShowIdePreview(false)
        if (!isResultReviewRequiredSession(snapshot, clientNonceRef.current) || cockpitRef.current !== snapshot.cockpit_ref) {
            clearPlanAuthority()
            setSnapshot(null)
            setError(DISPLAY_BLOCKED_ERROR)
            return
        }

        const resultText = resultTextRef.current.trim()
        resultTextRef.current = ''
        setResultTextInput('')
        const confirmed = reviewOnlyConfirmed
        setReviewOnlyConfirmed(false)
        const resultError = validateResultReviewText(resultText)
        if (resultError) {
            setError(resultError)
            return
        }
        if (confirmed !== true) {
            setError(RESULT_REVIEW_CONFIRMATION_MESSAGE)
            return
        }

        setLoadingMode('result-review')
        setError('')
        try {
            const result = await loadResultReviewSession({
                cockpitRef: cockpitRef.current,
                clientNonce: clientNonceRef.current,
                resultText,
                reviewOnlyConfirmation: true
            })
            setError(result.error)
            setSnapshot(result.snapshot)
            clearPlanAuthority()
        } finally {
            setLoadingMode('')
        }
    }

    const handleIdeWorkAction = async (action) => {
        if (!canUseIdeWorkAction(snapshot, action)) {
            setError(IDE_WORK_ERROR)
            return
        }

        setLoadingMode('ide-work')
        setError('')
        try {
            const result = await loadIdeWorkActionSession({ action })
            setError(result.error)
            if (result.ideWork) {
                setSnapshot((currentSnapshot) => {
                    if (!isPlanSessionResponse(currentSnapshot)) return currentSnapshot
                    return { ...currentSnapshot, ide_work: result.ideWork }
                })
            }
        } finally {
            setLoadingMode('')
        }
    }

    const planDecisionReady =
        isPlanDecisionRequiredSession(snapshot, clientNonceRef.current) && cockpitRef.current === snapshot?.cockpit_ref
    const manualPacketReady =
        isManualPacketRequiredSession(snapshot, clientNonceRef.current) && cockpitRef.current === snapshot?.cockpit_ref
    const resultReviewReady =
        isResultReviewRequiredSession(snapshot, clientNonceRef.current) && cockpitRef.current === snapshot?.cockpit_ref
    const ideWorkApproveReady = canUseIdeWorkAction(snapshot, 'approve_mock_backend_work')
    const ideWorkCancelReady = canUseIdeWorkAction(snapshot, 'cancel_mock_backend_work')

    return (
        <main style={pageStyles.root}>
            <section style={pageStyles.panel} aria-labelledby='sentinel-resume-title'>
                <p style={pageStyles.eyebrow}>Display-only coding cockpit</p>
                <h1 id='sentinel-resume-title' style={pageStyles.title}>
                    Quality Vibe Coding Cockpit
                </h1>
                <p style={pageStyles.copy}>
                    Say what you want, read the safe status, and decide the next manual step. This page cannot run tools, launch workers, or
                    change files.
                </p>

                <div style={pageStyles.guidance} aria-label='Cockpit safety boundaries'>
                    <div style={pageStyles.guidanceItem}>
                        <p style={pageStyles.guidanceTitle}>Start here</p>
                        <p style={pageStyles.guidanceCopy}>Say what you want.</p>
                    </div>
                    <div style={pageStyles.guidanceItem}>
                        <p style={pageStyles.guidanceTitle}>Safe plan</p>
                        <p style={pageStyles.guidanceCopy}>Read before deciding.</p>
                    </div>
                    <div style={pageStyles.guidanceItem}>
                        <p style={pageStyles.guidanceTitle}>You decide</p>
                        <p style={pageStyles.guidanceCopy}>Nothing happens by itself.</p>
                    </div>
                </div>

                <form style={pageStyles.goalForm} onSubmit={handleGoalSubmit} aria-label='Goal intake'>
                    <div>
                        <label htmlFor='sentinel-plain-goal' style={pageStyles.label}>
                            What do you want to do?
                        </label>
                        <textarea
                            id='sentinel-plain-goal'
                            aria-label='What do you want to do?'
                            autoComplete='off'
                            value={goalInput}
                            onChange={handleGoalInputChange}
                            style={pageStyles.textarea}
                        />
                    </div>
                    <button type='submit' style={pageStyles.button} disabled={isLoading}>
                        {loadingMode === 'goal' ? 'Checking' : 'Record goal'}
                    </button>
                </form>

                <form style={pageStyles.form} onSubmit={handleResumeSubmit} aria-label='Continue last work'>
                    <div>
                        <label htmlFor='sentinel-checkpoint-ref' style={pageStyles.label}>
                            Saved checkpoint reference
                        </label>
                        <input
                            id='sentinel-checkpoint-ref'
                            aria-label='Checkpoint reference'
                            autoComplete='off'
                            value={checkpointInput}
                            onChange={handleInputChange}
                            style={pageStyles.input}
                        />
                    </div>
                    <button type='submit' style={pageStyles.button} disabled={isLoading}>
                        {loadingMode === 'resume' ? 'Checking' : 'Continue last work'}
                    </button>
                    <button type='button' style={pageStyles.secondaryButton} onClick={clearState}>
                        Clear
                    </button>
                </form>

                {error ? <div style={pageStyles.error}>{error}</div> : null}
                {!error && !snapshot ? (
                    <div style={pageStyles.status}>
                        {isLoading ? (loadingMode === 'goal' ? GOAL_LOADING_MESSAGE : LOADING_MESSAGE) : EMPTY_MESSAGE}
                    </div>
                ) : null}
                {!error && snapshot && isPlanSessionResponse(snapshot) ? (
                    <PlanSessionCard
                        snapshot={snapshot}
                        canDecide={planDecisionReady}
                        canPrepareManualPacket={manualPacketReady}
                        canSubmitResultReview={resultReviewReady}
                        revisionInput={revisionInput}
                        resultTextInput={resultTextInput}
                        reviewOnlyConfirmed={reviewOnlyConfirmed}
                        isLoading={isLoading}
                        onRevisionChange={handleRevisionChange}
                        onResultTextChange={handleResultTextChange}
                        onReviewOnlyConfirmedChange={setReviewOnlyConfirmed}
                        onPlanDecision={handlePlanDecision}
                        onManualPacketPrepare={handleManualPacketPrepare}
                        onResultReviewSubmit={handleResultReviewSubmit}
                        onIdeWorkAction={handleIdeWorkAction}
                        showIdePreview={showIdePreview && !isLoading}
                        canApproveMockWork={ideWorkApproveReady}
                        canCancelMockWork={ideWorkCancelReady}
                    />
                ) : null}
                {!error && snapshot && !isPlanSessionResponse(snapshot) ? (
                    <ResumeSnapshot snapshot={snapshot} showIdePreview={showIdePreview && !isLoading} />
                ) : null}
            </section>
        </main>
    )
}

export function ResumeSnapshot({ snapshot, showIdePreview = false }) {
    const routeCard = readSafeRouteCard(snapshot.route_card)
    const idePreviewRows = showIdePreview ? readIdePreviewRows(snapshot.ide_preview) : []

    return (
        <section style={pageStyles.status} aria-label='Resume snapshot'>
            {routeCard ? <RouteGuidanceCard routeCard={routeCard} /> : null}
            <p style={pageStyles.recommendation}>Next safe action: {formatValue(snapshot.next_safe_action)}</p>
            {idePreviewRows.length > 0 ? <ReadOnlyWorkPreview rows={idePreviewRows} /> : null}
            {displayRows.map(([label, key]) => (
                <div key={key} style={pageStyles.row}>
                    <div style={pageStyles.rowLabel}>{label}</div>
                    <div style={pageStyles.rowValue}>{formatSnapshotField(key, snapshot[key])}</div>
                </div>
            ))}
            <div style={pageStyles.row}>
                <div style={pageStyles.rowLabel}>Blocked actions</div>
                <div style={pageStyles.rowValue}>{formatList(snapshot.blocked_actions)}</div>
            </div>
            <div style={pageStyles.row}>
                <div style={pageStyles.rowLabel}>Evidence</div>
                <div style={pageStyles.rowValue}>
                    {Array.isArray(snapshot.evidence_refs) && snapshot.evidence_refs.length === 0
                        ? 'No evidence references displayed'
                        : 'Display blocked'}
                </div>
            </div>
            <div style={{ ...pageStyles.row, borderBottom: 'none' }}>
                <div style={pageStyles.rowLabel}>Manual handoff preview</div>
                <div style={pageStyles.rowValue}>{snapshot.manual_handoff_preview === null ? 'No preview' : 'Display blocked'}</div>
            </div>
            <p style={pageStyles.blockedNote}>
                This view is for guidance only. It does not expose approval, execution, worker, or review controls.
            </p>
        </section>
    )
}

function ReadOnlyWorkPreview({ rows }) {
    return (
        <section style={pageStyles.idePreview} aria-label='Read-only work preview'>
            <h2 style={pageStyles.idePreviewTitle}>Read-only work preview</h2>
            <p style={pageStyles.idePreviewCopy}>Read-only preview. No backend work has started from this page.</p>
            <div style={pageStyles.idePreviewGrid}>
                {rows.map(([label, value]) => (
                    <div key={label} style={pageStyles.idePreviewRow}>
                        <div style={pageStyles.idePreviewLabel}>{label}</div>
                        <div style={pageStyles.idePreviewValue}>{value}</div>
                    </div>
                ))}
            </div>
            <p style={{ ...pageStyles.idePreviewCopy, marginBottom: 0 }}>
                This card cannot approve, continue, launch, run, or change anything.
            </p>
        </section>
    )
}

function MockBackendWorkCard({ ideWork, rows, canApprove, canCancel, isLoading, onIdeWorkAction }) {
    return (
        <section style={pageStyles.idePreview} aria-label='Safe mock check'>
            <h2 style={pageStyles.idePreviewTitle}>Safe mock check</h2>
            <p style={pageStyles.idePreviewCopy}>Display-only rehearsal. No real IDE, worker, or file change starts here.</p>
            <div style={pageStyles.idePreviewGrid}>
                {rows.map(([label, value]) => (
                    <div key={label} style={pageStyles.idePreviewRow}>
                        <div style={pageStyles.idePreviewLabel}>{label}</div>
                        <div style={pageStyles.idePreviewValue}>{value}</div>
                    </div>
                ))}
            </div>
            {ideWork?.review_required_note ? (
                <p style={pageStyles.idePreviewCopy}>Review note: {formatValue(ideWork.review_required_note)}</p>
            ) : null}
            {ideWork?.terminal_note ? <p style={pageStyles.idePreviewCopy}>Closeout: {formatValue(ideWork.terminal_note)}</p> : null}
            {Array.isArray(ideWork?.blocked_actions) && ideWork.blocked_actions.length > 0 ? (
                <div style={pageStyles.idePreviewGrid}>
                    <div style={pageStyles.idePreviewRow}>
                        <div style={pageStyles.idePreviewLabel}>Blocked actions</div>
                        <div style={pageStyles.idePreviewValue}>{formatList(ideWork.blocked_actions)}</div>
                    </div>
                </div>
            ) : null}
            {canApprove || canCancel ? (
                <div style={pageStyles.decisionControls} aria-label='Safe mock check controls'>
                    {canApprove ? (
                        <button
                            type='button'
                            style={pageStyles.button}
                            disabled={isLoading}
                            onClick={() => onIdeWorkAction('approve_mock_backend_work')}
                        >
                            {isLoading ? 'Checking' : 'Approve safe mock check'}
                        </button>
                    ) : null}
                    {canCancel ? (
                        <button
                            type='button'
                            style={pageStyles.secondaryButton}
                            disabled={isLoading}
                            onClick={() => onIdeWorkAction('cancel_mock_backend_work')}
                        >
                            Cancel mock check
                        </button>
                    ) : null}
                </div>
            ) : null}
            <p style={{ ...pageStyles.idePreviewCopy, marginBottom: 0 }}>
                This card only rehearses the approval path. It cannot accept work, publish, deploy, or continue by itself.
            </p>
        </section>
    )
}

export function PlanSessionCard({
    snapshot,
    canDecide = false,
    canPrepareManualPacket = false,
    canSubmitResultReview = false,
    canApproveMockWork = false,
    canCancelMockWork = false,
    revisionInput = '',
    resultTextInput = '',
    reviewOnlyConfirmed = false,
    isLoading = false,
    onRevisionChange = () => {},
    onResultTextChange = () => {},
    onReviewOnlyConfirmedChange = () => {},
    onPlanDecision = () => {},
    onManualPacketPrepare = () => {},
    onResultReviewSubmit = () => {},
    onIdeWorkAction = () => {},
    showIdePreview = false
}) {
    const planCard = isPlainRecord(snapshot.plan_card) ? snapshot.plan_card : null
    const routeCard = readSafeRouteCard(snapshot.route_card)
    const idePreviewRows = showIdePreview ? readIdePreviewRows(snapshot.ide_preview) : []
    const ideWorkRows = readIdeWorkRows(snapshot.ide_work)

    return (
        <section style={pageStyles.planCard} aria-label='Plan session'>
            {routeCard ? <RouteGuidanceCard routeCard={routeCard} /> : null}
            <p style={pageStyles.recommendation}>Next safe action: {formatPlanAction(snapshot.next_safe_action)}</p>
            {idePreviewRows.length > 0 ? <ReadOnlyWorkPreview rows={idePreviewRows} /> : null}
            {ideWorkRows.length > 0 ? (
                <MockBackendWorkCard
                    ideWork={snapshot.ide_work}
                    rows={ideWorkRows}
                    canApprove={canApproveMockWork}
                    canCancel={canCancelMockWork}
                    isLoading={isLoading}
                    onIdeWorkAction={onIdeWorkAction}
                />
            ) : null}
            <h2 style={pageStyles.planTitle}>{formatValue(planCard?.plain_title || 'Plain-English plan status')}</h2>
            <p style={pageStyles.copy}>{formatValue(planCard?.plain_summary || snapshot.plain_summary)}</p>
            {Array.isArray(planCard?.plain_steps) && planCard.plain_steps.length > 0 ? (
                <div style={pageStyles.row}>
                    <div style={pageStyles.rowLabel}>Plan steps</div>
                    <ul style={pageStyles.planList}>
                        {planCard.plain_steps.map((step) => (
                            <li key={step}>{formatValue(step)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {Array.isArray(planCard?.will_not_do) && planCard.will_not_do.length > 0 ? (
                <div style={pageStyles.row}>
                    <div style={pageStyles.rowLabel}>This will not do</div>
                    <ul style={pageStyles.planList}>
                        {planCard.will_not_do.map((item) => (
                            <li key={item}>{formatValue(item)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            <div style={pageStyles.row}>
                <div style={pageStyles.rowLabel}>Blocked actions</div>
                <div style={pageStyles.rowValue}>{formatList(snapshot.blocked_actions)}</div>
            </div>
            {canDecide ? (
                <>
                    <div style={pageStyles.revisionArea}>
                        <label htmlFor='sentinel-revision-text' style={pageStyles.label}>
                            Revision note
                        </label>
                        <textarea
                            id='sentinel-revision-text'
                            aria-label='Revision note'
                            autoComplete='off'
                            maxLength={REVISION_TEXT_MAX_LENGTH}
                            value={revisionInput}
                            onChange={onRevisionChange}
                            style={pageStyles.textarea}
                        />
                    </div>
                    <div style={pageStyles.decisionControls} aria-label='Plan decision controls'>
                        <button type='button' style={pageStyles.button} disabled={isLoading} onClick={() => onPlanDecision('approve_plan')}>
                            Approve plan
                        </button>
                        <button
                            type='button'
                            style={pageStyles.secondaryButton}
                            disabled={isLoading}
                            onClick={() => onPlanDecision('revise_plan')}
                        >
                            Revise plan
                        </button>
                        <button
                            type='button'
                            style={pageStyles.secondaryButton}
                            disabled={isLoading}
                            onClick={() => onPlanDecision('stop')}
                        >
                            Stop
                        </button>
                    </div>
                    <p style={pageStyles.note}>
                        These controls only record your plan decision. They do not run tools, launch workers, or change files.
                    </p>
                </>
            ) : canPrepareManualPacket ? (
                <>
                    <div style={pageStyles.decisionControls} aria-label='Manual packet controls'>
                        <button type='button' style={pageStyles.button} disabled={isLoading} onClick={onManualPacketPrepare}>
                            {isLoading ? 'Preparing' : 'Prepare manual worker packet'}
                        </button>
                    </div>
                    <p style={pageStyles.note}>
                        This only prepares a manual handoff status. It does not launch a worker, run tools, or change files.
                    </p>
                </>
            ) : canSubmitResultReview ? (
                <>
                    <div style={pageStyles.revisionArea}>
                        <label htmlFor='sentinel-result-review-text' style={pageStyles.label}>
                            Pasted manual worker result
                        </label>
                        <textarea
                            id='sentinel-result-review-text'
                            aria-label='Pasted manual worker result'
                            autoComplete='off'
                            maxLength={RESULT_REVIEW_TEXT_MAX_LENGTH}
                            value={resultTextInput}
                            onChange={onResultTextChange}
                            style={pageStyles.textarea}
                        />
                        <label style={pageStyles.checkboxRow}>
                            <input
                                type='checkbox'
                                checked={reviewOnlyConfirmed}
                                onChange={(event) => onReviewOnlyConfirmedChange(event.target.checked)}
                            />
                            <span>
                                I understand this only sends the pasted worker result for Sentinel review. This screen will not edit files,
                                run commands, launch workers, use MCP, Agentflow, or HITL, commit, publish, deploy, or continue the work.
                            </span>
                        </label>
                    </div>
                    <div style={pageStyles.decisionControls} aria-label='Result review controls'>
                        <button type='button' style={pageStyles.button} disabled={isLoading} onClick={onResultReviewSubmit}>
                            {isLoading ? 'Sending' : 'Send for Sentinel review'}
                        </button>
                    </div>
                    <p style={pageStyles.note}>This sends plain text for review only. It does not expose packet contents or launch work.</p>
                </>
            ) : (
                <p style={pageStyles.note}>Plan decision controls are not available for this state.</p>
            )}
        </section>
    )
}

function RouteGuidanceCard({ routeCard }) {
    return (
        <div style={pageStyles.routeBlock} aria-label='Sentinel route guidance'>
            <div>
                <p style={pageStyles.routeLabel}>Understood as</p>
                <p style={pageStyles.routeValue}>{formatValue(routeCard.title)}</p>
            </div>
            <div>
                <p style={pageStyles.routeLabel}>Summary</p>
                <p style={pageStyles.routeValue}>{formatValue(routeCard.summary)}</p>
            </div>
            <div>
                <p style={pageStyles.routeLabel}>Next</p>
                <p style={pageStyles.routeValue}>{formatValue(routeCard.what_can_happen_next)}</p>
            </div>
            <div>
                <p style={pageStyles.routeLabel}>Not doing</p>
                <p style={pageStyles.routeValue}>{formatValue(routeCard.what_will_not_happen)}</p>
            </div>
            {routeCard.needs_clarification && routeCard.clarification_question ? (
                <div>
                    <p style={pageStyles.routeLabel}>Need</p>
                    <p style={pageStyles.routeValue}>{formatValue(routeCard.clarification_question)}</p>
                </div>
            ) : null}
            {routeCard.blocked_reason ? (
                <div>
                    <p style={pageStyles.routeLabel}>Blocked</p>
                    <p style={pageStyles.routeValue}>{formatValue(routeCard.blocked_reason)}</p>
                </div>
            ) : null}
        </div>
    )
}

export async function loadGoalSnapshot(goalValue, requestGoalSnapshotImpl = requestGoalSnapshot, clientNonce = '') {
    const submittedGoal = typeof goalValue === 'string' ? goalValue.trim() : ''
    if (!submittedGoal) {
        return { snapshot: null, error: GOAL_EMPTY_MESSAGE }
    }

    try {
        const request = clientNonce ? { plainGoal: submittedGoal, clientNonce } : { plainGoal: submittedGoal }
        const nextSnapshot = await requestGoalSnapshotImpl(request)
        if (!isDisplaySafeCockpitResponse(nextSnapshot, clientNonce)) {
            return { snapshot: null, error: DISPLAY_BLOCKED_ERROR }
        }
        return { snapshot: nextSnapshot, error: '' }
    } catch (error) {
        if (clientNonce && isLegacyNonceRejection(error)) {
            return loadGoalSnapshot(submittedGoal, requestGoalSnapshotImpl)
        }
        return { snapshot: null, error: readSafeErrorCopy(error) }
    }
}

export async function loadResumeSnapshot(checkpointValue, requestResumeSnapshotImpl = requestResumeSnapshot) {
    const submittedCheckpointRef = typeof checkpointValue === 'string' ? checkpointValue.trim() : ''
    if (!submittedCheckpointRef) {
        return { snapshot: null, error: EMPTY_MESSAGE }
    }

    try {
        const nextSnapshot = await requestResumeSnapshotImpl({ checkpointRef: submittedCheckpointRef })
        if (!isDisplayOnlySnapshot(nextSnapshot)) {
            return { snapshot: null, error: DISPLAY_BLOCKED_ERROR }
        }
        return { snapshot: nextSnapshot, error: '' }
    } catch (error) {
        return { snapshot: null, error: readSafeErrorCopy(error) }
    }
}

export async function loadPlanDecisionSession(decisionInput, requestPlanDecisionImpl = requestPlanDecision) {
    const decision = typeof decisionInput?.decision === 'string' ? decisionInput.decision : ''
    const request = {
        cockpitRef: typeof decisionInput?.cockpitRef === 'string' ? decisionInput.cockpitRef.trim() : '',
        clientNonce: typeof decisionInput?.clientNonce === 'string' ? decisionInput.clientNonce.trim() : '',
        decision
    }
    if (decision === 'revise_plan') {
        const revisionText = typeof decisionInput?.revisionText === 'string' ? decisionInput.revisionText.trim() : ''
        const revisionError = validateRevisionText(revisionText)
        if (revisionError) {
            return { snapshot: null, error: revisionError }
        }
        request.revisionText = revisionText
    }

    try {
        const nextSnapshot = await requestPlanDecisionImpl(request)
        if (!isDisplaySafeCockpitResponse(nextSnapshot, request.clientNonce)) {
            return { snapshot: null, error: DISPLAY_BLOCKED_ERROR }
        }
        return { snapshot: nextSnapshot, error: '' }
    } catch (error) {
        return { snapshot: null, error: readSafeErrorCopy(error) }
    }
}

export async function loadManualPacketSession(packetInput, requestManualWorkerPacketImpl = requestManualWorkerPacket) {
    const request = {
        cockpitRef: typeof packetInput?.cockpitRef === 'string' ? packetInput.cockpitRef.trim() : '',
        clientNonce: typeof packetInput?.clientNonce === 'string' ? packetInput.clientNonce.trim() : ''
    }

    try {
        const nextSnapshot = await requestManualWorkerPacketImpl(request)
        if (!isDisplaySafeCockpitResponse(nextSnapshot, request.clientNonce)) {
            return { snapshot: null, error: DISPLAY_BLOCKED_ERROR }
        }
        return { snapshot: nextSnapshot, error: '' }
    } catch (error) {
        return { snapshot: null, error: readSafeErrorCopy(error) }
    }
}

export async function loadResultReviewSession(reviewInput, requestResultReviewImpl = requestResultReview) {
    const request = {
        cockpitRef: typeof reviewInput?.cockpitRef === 'string' ? reviewInput.cockpitRef.trim() : '',
        clientNonce: typeof reviewInput?.clientNonce === 'string' ? reviewInput.clientNonce.trim() : '',
        resultText: typeof reviewInput?.resultText === 'string' ? reviewInput.resultText.trim() : '',
        reviewOnlyConfirmation: reviewInput?.reviewOnlyConfirmation === true
    }
    const resultError = validateResultReviewText(request.resultText)
    if (resultError) {
        return { snapshot: null, error: resultError }
    }
    if (request.reviewOnlyConfirmation !== true) {
        return { snapshot: null, error: RESULT_REVIEW_CONFIRMATION_MESSAGE }
    }

    try {
        const nextSnapshot = await requestResultReviewImpl(request)
        if (!isDisplaySafeCockpitResponse(nextSnapshot, request.clientNonce)) {
            return { snapshot: null, error: DISPLAY_BLOCKED_ERROR }
        }
        return { snapshot: nextSnapshot, error: '' }
    } catch (error) {
        return { snapshot: null, error: readSafeErrorCopy(error) }
    }
}

export async function loadIdeWorkActionSession(actionInput, requestIdeWorkActionImpl = requestIdeWorkAction) {
    const action = typeof actionInput?.action === 'string' ? actionInput.action.trim() : ''
    if (action !== 'approve_mock_backend_work' && action !== 'cancel_mock_backend_work') {
        return { ideWork: null, error: IDE_WORK_ERROR }
    }

    try {
        const response = await requestIdeWorkActionImpl({ action })
        if (!isSafeIdeWorkProjection(response?.ide_work)) {
            return { ideWork: null, error: DISPLAY_BLOCKED_ERROR }
        }
        return { ideWork: response.ide_work, error: '' }
    } catch (error) {
        return { ideWork: null, error: readSafeErrorCopy(error) }
    }
}

export function isDisplayOnlySnapshot(snapshot) {
    return (
        snapshot?.schema_version === SNAPSHOT_SCHEMA_VERSION &&
        snapshot.status === 'ok' &&
        Array.isArray(snapshot.allowed_user_actions) &&
        snapshot.allowed_user_actions.length === 1 &&
        snapshot.allowed_user_actions[0] === 'none'
    )
}

export function canShowIdePreview(snapshot, clientNonce = '') {
    return (
        hasRenderableIdePreview(snapshot?.ide_preview) &&
        (isDisplayOnlySnapshot(snapshot) || isPlanDecisionRequiredSession(snapshot, clientNonce))
    )
}

export function canUseIdeWorkAction(snapshot, action) {
    const ideWork = snapshot?.ide_work
    if (!isPlanSessionResponse(snapshot) || !isSafeIdeWorkProjection(ideWork)) return false
    if (action === 'approve_mock_backend_work') {
        return ideWork.approval_available === true && ideWork.allowed_user_actions.join(',') === 'approve_mock_backend_work'
    }
    if (action === 'cancel_mock_backend_work') {
        return ideWork.cancel_available === true && ideWork.allowed_user_actions.join(',') === 'cancel_mock_backend_work'
    }
    return false
}

export function isPlanSessionResponse(snapshot) {
    return snapshot?.schema_version === PLAN_SESSION_SCHEMA_VERSION && snapshot.status === 'ok'
}

export function isPlanDecisionRequiredSession(snapshot, clientNonce = '') {
    return (
        isPlanSessionResponse(snapshot) &&
        snapshot.state === 'plan_decision_required' &&
        Array.isArray(snapshot.allowed_user_actions) &&
        snapshot.allowed_user_actions.join(',') === PLAN_DECISION_ACTIONS.join(',') &&
        typeof snapshot.cockpit_ref === 'string' &&
        snapshot.cockpit_ref.trim().length > 0 &&
        typeof clientNonce === 'string' &&
        clientNonce.trim().length > 0
    )
}

export function isManualPacketRequiredSession(snapshot, clientNonce = '') {
    return (
        isPlanSessionResponse(snapshot) &&
        snapshot.state === 'manual_packet_preparation_required' &&
        Array.isArray(snapshot.allowed_user_actions) &&
        snapshot.allowed_user_actions.join(',') === MANUAL_PACKET_ACTIONS.join(',') &&
        typeof snapshot.cockpit_ref === 'string' &&
        snapshot.cockpit_ref.trim().length > 0 &&
        typeof clientNonce === 'string' &&
        clientNonce.trim().length > 0
    )
}

export function isResultReviewRequiredSession(snapshot, clientNonce = '') {
    return (
        isPlanSessionResponse(snapshot) &&
        snapshot.state === 'result_review_required' &&
        Array.isArray(snapshot.allowed_user_actions) &&
        snapshot.allowed_user_actions.join(',') === RESULT_REVIEW_ACTIONS.join(',') &&
        typeof snapshot.cockpit_ref === 'string' &&
        snapshot.cockpit_ref.trim().length > 0 &&
        typeof clientNonce === 'string' &&
        clientNonce.trim().length > 0
    )
}

export function isTerminalPlanSession(snapshot) {
    return (
        isPlanSessionResponse(snapshot) &&
        snapshot.state !== 'plan_decision_required' &&
        Array.isArray(snapshot.allowed_user_actions) &&
        snapshot.allowed_user_actions.length === 1 &&
        snapshot.allowed_user_actions[0] === 'none' &&
        snapshot.cockpit_ref === null
    )
}

export function isDisplaySafeCockpitResponse(snapshot, clientNonce = '') {
    return (
        isDisplayOnlySnapshot(snapshot) ||
        isPlanDecisionRequiredSession(snapshot, clientNonce) ||
        isManualPacketRequiredSession(snapshot, clientNonce) ||
        isResultReviewRequiredSession(snapshot, clientNonce) ||
        isTerminalPlanSession(snapshot)
    )
}

export function validateRevisionText(revisionText) {
    if (typeof revisionText !== 'string' || revisionText.trim().length === 0) return REVISION_EMPTY_MESSAGE
    if (revisionText.trim().length > REVISION_TEXT_MAX_LENGTH) return REVISION_TOO_LONG_MESSAGE
    if (PLAN_DECISION_FORBIDDEN_TEXT.test(revisionText)) return REVISION_UNSAFE_MESSAGE
    return ''
}

export function validateResultReviewText(resultText) {
    if (typeof resultText !== 'string' || resultText.trim().length === 0) return RESULT_REVIEW_EMPTY_MESSAGE
    const trimmed = resultText.trim()
    if (trimmed.length < RESULT_REVIEW_TEXT_MIN_LENGTH || trimmed.length > RESULT_REVIEW_TEXT_MAX_LENGTH)
        return RESULT_REVIEW_UNSAFE_MESSAGE
    if (/^[{[]/.test(trimmed)) return RESULT_REVIEW_UNSAFE_MESSAGE
    if (RESULT_REVIEW_FORBIDDEN_TEXT.test(trimmed)) return RESULT_REVIEW_UNSAFE_MESSAGE
    if (/<\s*\/?\s*[a-z][^>]*>|on[a-z]+\s*=/i.test(trimmed)) return RESULT_REVIEW_UNSAFE_MESSAGE
    return ''
}

export function generateClientNonce() {
    const cryptoSource = globalThis.crypto || globalThis.window?.crypto
    if (!cryptoSource || typeof cryptoSource.getRandomValues !== 'function') {
        throw new Error('secure nonce generation is unavailable')
    }
    const bytes = new Uint8Array(16)
    cryptoSource.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function readSafeErrorCopy(error) {
    if (error?.code === 'sentinel_resume_binding_not_found') return NOT_FOUND_ERROR
    if (error?.code === 'sentinel_resume_display_blocked') return DISPLAY_BLOCKED_ERROR
    if (
        [
            'feature_disabled',
            'plan_session_not_found',
            'plan_session_expired',
            'plan_session_consumed',
            'plan_session_owner_mismatch',
            'plan_session_nonce_mismatch',
            'plan_session_state_mismatch',
            'plan_decision_invalid_input',
            'gateway_unavailable',
            'gateway_rejected',
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
            'ide_work_unavailable'
        ].includes(error?.code)
    ) {
        if (String(error?.code || '').startsWith('ide_work_')) return IDE_WORK_ERROR
        if (String(error?.code || '').startsWith('result_review_')) return RESULT_REVIEW_ERROR
        return String(error?.code || '').startsWith('manual_packet_') ? MANUAL_PACKET_ERROR : PLAN_DECISION_ERROR
    }
    return GENERIC_ERROR
}

function isLegacyNonceRejection(error) {
    return error?.code === 'invalid_request' || error?.code === 'plan_decision_invalid_input'
}

function readSafeRouteCard(card) {
    if (!isPlainRecord(card)) return null
    if (card.schema_version !== ROUTE_CARD_SCHEMA_VERSION || !ROUTE_CARD_CATEGORIES.includes(card.category)) return null

    const title = readRouteCardString(card.title, 80)
    const summary = readRouteCardString(card.summary, 220)
    const whatCanHappenNext = readRouteCardString(card.what_can_happen_next, 260)
    const whatWillNotHappen = readRouteCardString(card.what_will_not_happen, 260)
    const clarificationQuestion = card.clarification_question === null ? null : readRouteCardString(card.clarification_question, 220)
    const blockedReason = card.blocked_reason === null ? null : readRouteCardString(card.blocked_reason, 220)

    if (!title || !summary || !whatCanHappenNext || !whatWillNotHappen) return null
    if (card.clarification_question !== null && !clarificationQuestion) return null
    if (card.blocked_reason !== null && !blockedReason) return null

    const routeCard = {
        schema_version: ROUTE_CARD_SCHEMA_VERSION,
        category: card.category,
        title,
        summary,
        what_can_happen_next: whatCanHappenNext,
        what_will_not_happen: whatWillNotHappen,
        needs_clarification: card.needs_clarification === true,
        clarification_question: clarificationQuestion,
        blocked_reason: blockedReason
    }
    return ROUTE_CARD_FORBIDDEN_TEXT.test(JSON.stringify(routeCard)) ? null : routeCard
}

function hasRenderableIdePreview(preview) {
    return readIdePreviewRows(preview).length > 0
}

function readIdePreviewRows(preview) {
    if (!isPlainRecord(preview)) return []
    return IDE_PREVIEW_ROWS.reduce((rows, [label, key]) => {
        const value = preview[key]
        if (typeof value !== 'string') return rows
        const trimmed = value.trim()
        if (!trimmed) return rows
        rows.push([label, trimmed])
        return rows
    }, [])
}

function readIdeWorkRows(ideWork) {
    if (!isSafeIdeWorkProjection(ideWork)) return []
    return IDE_WORK_ROWS.reduce((rows, [label, key]) => {
        const value = ideWork[key]
        if (typeof value !== 'string') return rows
        const trimmed = value.trim()
        if (!trimmed) return rows
        rows.push([label, trimmed])
        return rows
    }, [])
}

function isSafeIdeWorkProjection(ideWork) {
    if (!isPlainRecord(ideWork)) return false
    if (!IDE_WORK_SCHEMA_VERSIONS.includes(ideWork.schema_version)) return false
    if (ideWork.status !== 'ok' || !IDE_WORK_STATES.includes(ideWork.state)) return false
    if (typeof ideWork.approval_available !== 'boolean' || typeof ideWork.cancel_available !== 'boolean') return false
    if (
        !Array.isArray(ideWork.allowed_user_actions) ||
        !ideWork.allowed_user_actions.length ||
        ideWork.allowed_user_actions.some((action) => typeof action !== 'string' || !IDE_WORK_ACTIONS.includes(action))
    ) {
        return false
    }
    if (!Array.isArray(ideWork.blocked_actions) || !ideWork.blocked_actions.length) return false

    const requiredTextKeys = [
        'status_label',
        'workflow_label',
        'persona_label',
        'skill_label',
        'short_summary',
        'current_safe_step',
        'what_can_happen_next',
        'what_will_not_happen'
    ]
    for (const key of requiredTextKeys) {
        if (!readRouteCardString(ideWork[key], 260)) return false
    }
    for (const key of ['review_required_note', 'terminal_note', 'safe_error']) {
        if (ideWork[key] !== null && !readRouteCardString(ideWork[key], 180)) return false
    }
    if (ideWork.blocked_actions.some((item) => !readRouteCardString(item, 180))) return false
    return IDE_WORK_FORBIDDEN_TEXT.test(JSON.stringify(ideWork)) ? false : true
}

function readRouteCardString(value, maxLength) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, ' ')
    if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/.test(trimmed)) return null
    return trimmed
}

function formatValue(value) {
    if (value === null || value === undefined || value === '') return 'None'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value === 'guidance_only') return 'Use this guidance only. Enter a specific work goal if you want a plan.'
    return String(value)
}

function formatSnapshotField(key, value) {
    if (key === 'state' && value === 'policy_help_guidance') return 'Guidance only'
    if (key === 'worker_status' && value === 'none') return 'No manual work'
    if (key === 'result_status' && value === 'not_started') return 'Not started'
    if (key === 'shield_summary' && value === 'not_reviewed') return 'Not reviewed'
    if (key === 'accepted_state' && value === 'not_accepted') return 'Not accepted'
    if (value === 'none') return 'None'
    return formatValue(value)
}

function formatPlanAction(value) {
    if (value === 'user_plan_decision_required') return 'Choose whether to approve, revise, or stop this plan.'
    if (value === 'plan_display_only') return 'Review the plan outside this page before manual work begins.'
    if (value === 'prepare_manual_worker_packet') return 'Prepare the manual worker packet as a separate safe step.'
    if (value === 'manual_handoff_ready') return 'Use the governed out-of-band manual handoff process.'
    if (value === 'submit_manual_worker_result') return 'Paste the manual worker result for Sentinel review.'
    if (value === 'review_complete') return 'Sentinel review is complete. No continuation starts here.'
    if (value === 'review_needs_more_information') return 'More information is needed before this can be treated as accepted.'
    if (value === 'review_manual_intervention') return 'Manual intervention is needed outside this page.'
    if (value === 'review_unavailable') return 'Sentinel review is unavailable. Nothing was accepted here.'
    if (value === 'submit_revised_goal') return 'Submit a revised goal when ready.'
    if (value === 'done') return 'No further action is needed here.'
    if (value === 'goal_blocked') return 'This goal is blocked.'
    return formatValue(value)
}

function formatList(value) {
    if (!Array.isArray(value) || value.length === 0) return 'None'
    return (
        <ul style={pageStyles.blockedList}>
            {value.map((item) => (
                <li key={item}>{formatValue(item)}</li>
            ))}
        </ul>
    )
}

function isPlainRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}
