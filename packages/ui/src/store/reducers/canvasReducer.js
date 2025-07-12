// action - state management
import * as actionTypes from '../actions'

export const initialState = {
    isDirty: false,
    isReadonly: false,
    chatflow: null,
    canvasDialogShow: false,
    componentNodes: [],
    componentCredentials: []
}

// ==============================|| CANVAS REDUCER ||============================== //

const canvasReducer = (state = initialState, action) => {
    switch (action.type) {
        case actionTypes.SET_DIRTY:
            if (!action.isReadonly) {
                return {
                    ...state,
                    isDirty: true
                }
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
        case actionTypes.SET_READONLY:
            return {
                ...state,
                isReadonly: action.isReadonly
            }
        default:
            return state
    }
}

export default canvasReducer
