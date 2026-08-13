import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import chatflowsApi from '@/api/chatflows'
import workspaceApi from '@/api/workspace'
import { workspaceSwitchSuccess } from '@/store/reducers/authSlice'

// When a flow canvas fails to load with a 404 because the flow lives in a workspace the user belongs to but
// isn't their ACTIVE workspace, resolve the flow's owning workspace (membership-gated server-side) and switch
// to it, then let the caller re-fetch — instead of dead-ending on "Chatflow <id> not found in the database!".
//
// Returns an async `tryAutoSwitch(chatflowId, error, onSwitched)`:
//   - returns true  => it switched workspaces and invoked onSwitched() (caller should suppress its error)
//   - returns false => not applicable / not a member; caller should fall back to its normal error handling
//
// Security: the resolver only returns a workspaceId when the user is a member, and we additionally verify the
// id is in the user's assignedWorkspaces before switching — so we never switch into an unauthorized workspace.
export const useFlowWorkspaceAutoSwitch = () => {
    const dispatch = useDispatch()
    const currentUser = useSelector((state) => state.auth.user)
    // Keep the latest user in a ref so tryAutoSwitch can read it without being listed as a useCallback dep.
    // This keeps the callback identity stable (callers omit it from their useEffect deps) while still reading
    // the freshest user — avoiding a stale closure if the user loads/changes after the callback was created.
    const currentUserRef = useRef(currentUser)
    useEffect(() => {
        currentUserRef.current = currentUser
    }, [currentUser])

    const attemptedRef = useRef(new Set())

    const tryAutoSwitch = useCallback(
        async (chatflowId, error, onSwitched) => {
            const status = error?.response?.status
            if (status !== 404 || !chatflowId) return false

            // Bail before marking attempted if the user isn't loaded yet, so a later (loaded) call can retry.
            const user = currentUserRef.current
            if (!user) return false

            // Only attempt once per flow id to avoid any retry loop if something goes sideways.
            if (attemptedRef.current.has(chatflowId)) return false
            attemptedRef.current.add(chatflowId)

            try {
                const res = await chatflowsApi.getChatflowWorkspace(chatflowId)
                const workspaceId = res?.data?.workspaceId
                if (!workspaceId) return false
                if (workspaceId === user.activeWorkspaceId) return false
                const assigned = user.assignedWorkspaces || []
                if (!assigned.some((w) => w?.id === workspaceId)) return false

                const switchRes = await workspaceApi.switchWorkspace(workspaceId)
                dispatch(workspaceSwitchSuccess(switchRes?.data))
                if (typeof onSwitched === 'function') onSwitched()
                return true
            } catch (e) {
                // A 404 is definitive (not a member / missing flow) — leave it marked so we don't retry.
                // For transient failures (network error, 5xx, etc.) clear the mark so a later re-fetch can retry.
                if (e?.response?.status !== 404) {
                    attemptedRef.current.delete(chatflowId)
                }
                // Fall back to the caller's normal error handling.
                return false
            }
        },
        [dispatch]
    )

    return tryAutoSwitch
}
