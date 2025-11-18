// authSlice.js
import { createSlice } from '@reduxjs/toolkit'
import AuthUtils from '@/utils/authUtils'

const initialState = {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
    isAuthenticated: 'true' === localStorage.getItem('isAuthenticated'),
    isGlobal: 'true' === localStorage.getItem('isGlobal'),
    token: null,
    permissions:
        localStorage.getItem('permissions') && localStorage.getItem('permissions') !== 'undefined'
            ? JSON.parse(localStorage.getItem('permissions'))
            : null,
    features:
        localStorage.getItem('features') && localStorage.getItem('features') !== 'undefined'
            ? JSON.parse(localStorage.getItem('features'))
            : null
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            AuthUtils.updateStateAndLocalStorage(state, action.payload)
        },
        logoutSuccess: (state) => {
            state.user = null
            state.token = null
            state.permissions = null
            state.features = null
            state.isAuthenticated = false
            state.isGlobal = false
            AuthUtils.removeCurrentUser()
        },
        workspaceSwitchSuccess: (state, action) => {
            AuthUtils.updateStateAndLocalStorage(state, action.payload)
        },
        upgradePlanSuccess: (state, action) => {
            AuthUtils.updateStateAndLocalStorage(state, action.payload)
        },
        userProfileUpdated: (state, action) => {
            const user = AuthUtils.extractUser(action.payload)
            state.user.name = user.name
            state.user.email = user.email
            AuthUtils.updateCurrentUser(state.user)
        },
        workspaceNameUpdated: (state, action) => {
            const updatedWorkspace = action.payload
            // find the matching assignedWorkspace and update it
            const assignedWorkspaces = state.user.assignedWorkspaces.map((workspace) => {
                if (workspace.id === updatedWorkspace.id) {
                    return {
                        ...workspace,
                        name: updatedWorkspace.name
                    }
                }
                return workspace
            })
            state.user.assignedWorkspaces = assignedWorkspaces
            AuthUtils.updateCurrentUser(state.user)
        }
    }
})

export const { loginSuccess, logoutSuccess, workspaceSwitchSuccess, upgradePlanSuccess, userProfileUpdated, workspaceNameUpdated } =
    authSlice.actions
export default authSlice.reducer
