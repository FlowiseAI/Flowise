// action - state management
import undoable from 'redux-undo'
import * as actionTypes from '../actions'

export const initialState = {
    isDirty: false,
    chatflow: null,
    canvasDialogShow: false,
    componentNodes: [],
    componentCredentials: []
}

// ==============================|| CANVAS REDUCER ||============================== //

const canvasReducer = (state = initialState, action) => {
    switch (action.type) {
        case actionTypes.SET_DIRTY:
            return {
                ...state,
                isDirty: true
            }
        case actionTypes.REMOVE_DIRTY:
            return {
                ...state,
                isDirty: false
            }
        case actionTypes.SET_CHATFLOW:
            return {
                ...state,
                chatflow: action.chatflow
            }
        case actionTypes.SHOW_CANVAS_DIALOG:
            return {
                ...state,
                canvasDialogShow: true
            }
        case actionTypes.HIDE_CANVAS_DIALOG:
            return {
                ...state,
                canvasDialogShow: false
            }
        case actionTypes.SET_COMPONENT_NODES:
            return {
                ...state,
                componentNodes: action.componentNodes
            }
        case actionTypes.SET_COMPONENT_CREDENTIALS:
            return {
                ...state,
                componentCredentials: action.componentCredentials
            }
        default:
            return state
    }
}

const undoableCanvas = undoable(canvasReducer, {
    debug: true,
    filter: (action, currentState, previousState) => {
        if (action.skipHistory) return false
        if (action.type !== actionTypes.SET_CHATFLOW) return false

        const currentFlowData = currentState.chatflow?.flowData
        const previousFlowData = previousState.chatflow?.flowData

        return currentFlowData !== previousFlowData
    },
    groupBy: (action) => {
        if (action.type === actionTypes.SET_CHATFLOW) {
            return Math.floor(Date.now() / 2000)
        }
        return null
    },
    limit: 50
})

export default undoableCanvas
