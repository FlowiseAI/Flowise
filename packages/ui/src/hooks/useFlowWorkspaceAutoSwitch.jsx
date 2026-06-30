import { useRef } from 'react'
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
    const attemptedRef = useRef(new Set())

    const tryAutoSwitch = async (chatflowId, error, onSwitched) => {
        const status = error?.response?.status
        if (status !== 404 || !chatflowId) return false
        // Only attempt once per flow id to avoid any retry loop if something goes sideways.
        if (attemptedRef.current.has(chatflowId)) return false
        attemptedRef.current.add(chatflowId)

        try {
            const res = await chatflowsApi.getChatflowWorkspace(chatflowId)
            const workspaceId = res?.data?.workspaceId
            if (!workspaceId) return false
            if (workspaceId === currentUser?.activeWorkspaceId) return false
            const assigned = currentUser?.assignedWorkspaces || []
            if (!assigned.some((w) => w.id === workspaceId)) return false

            const switchRes = await workspaceApi.switchWorkspace(workspaceId)
            dispatch(workspaceSwitchSuccess(switchRes.data))
            if (typeof onSwitched === 'function') onSwitched()
            return true
        } catch (e) {
            // Resolver 404 (not a member / missing flow) or any failure → fall back to the normal error.
            return false
        }
    }

    return tryAutoSwitch
}
