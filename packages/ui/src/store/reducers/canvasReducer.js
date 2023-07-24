// action - state management
import * as actionTypes from '../actions'

export const initialState = {
    isDirty: false,
    chatflow: null,
    canvasDialogShow: false
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
        default:
            return state
    }
}

export default canvasReducer
