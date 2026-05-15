export const COCKPIT_SNAPSHOT_SCHEMA_VERSION = 'sentinel.cockpit_bridge.snapshot.v1'

export const COCKPIT_ALLOWED_USER_ACTIONS = Object.freeze([
    'revise',
    'stop',
    'cancel',
    'continue',
    'approve_manual_handoff',
    'confirm_result_source_status_only',
    'none'
])

export type CockpitRequest = Readonly<{
    request_kind: 'goal' | 'choice' | 'resume'
    plain_goal?: string
    plain_constraints?: string
    choice?: string
    checkpoint_ref?: string
    displayed_prompt_ref?: string
    client_nonce?: string
}>

export type CockpitSnapshot = Readonly<{
    schema_version: string
    status: 'ok'
    snapshot_ref: string
    state: string
    plain_summary: string
    next_safe_action: string
    allowed_user_actions: string[]
    blocked_actions: string[]
    checkpoint_ref: string | null
    evidence_refs: string[]
    manual_handoff_preview: string | null
    worker_status: string
    result_status: string
    shield_summary: string
    accepted_state: string
    stale_doc_warning: string
    route_card?: unknown
}>

export function createStaticSnapshot(request: CockpitRequest): CockpitSnapshot {
    const checkpointRef = request.checkpoint_ref || 'checkpoint_manual_only'
    if (request.request_kind === 'goal') {
        return {
            schema_version: COCKPIT_SNAPSHOT_SCHEMA_VERSION,
            status: 'ok',
            snapshot_ref: 'snapshot_goal_intake',
            state: 'goal_intake',
            plain_summary: 'Your goal was received by the local cockpit. Planning is not available yet, and no file changes were made.',
            next_safe_action: 'planning_deferred',
            allowed_user_actions: ['none'],
            blocked_actions: ['Planning approval is not available here.', 'Execution is not available here.', 'Manual handoff and result intake are deferred.'],
            checkpoint_ref: null,
            evidence_refs: [],
            manual_handoff_preview: null,
            worker_status: 'none',
            result_status: 'not_started',
            shield_summary: 'not_reviewed',
            accepted_state: 'not_accepted',
            stale_doc_warning: 'none'
        }
    }

    return {
        schema_version: COCKPIT_SNAPSHOT_SCHEMA_VERSION,
        status: 'ok',
        snapshot_ref: 'snapshot_manual_only',
        state: 'manual_only',
        plain_summary: 'Sentinel can show a local cockpit snapshot. This bridge only reports manual status.',
        next_safe_action: 'continue_manual_loop',
        allowed_user_actions: ['none'],
        blocked_actions: ['This bridge reports status only and cannot perform actions.'],
        checkpoint_ref: checkpointRef,
        evidence_refs: [],
        manual_handoff_preview: null,
        worker_status: 'none',
        result_status: 'none',
        shield_summary: 'not_reviewed',
        accepted_state: 'not_accepted',
        stale_doc_warning: 'none'
    }
}
