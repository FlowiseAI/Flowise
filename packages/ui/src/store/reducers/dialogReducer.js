import { SHOW_CONFIRM, HIDE_CONFIRM } from '../actions'

export const initialState = {
    show: false,
    title: '',
    description: '',
    confirmButtonName: 'OK',
    cancelButtonName: 'Cancel'
}

const alertReducer = (state = initialState, action) => {
    switch (action.type) {
        case SHOW_CONFIRM:
            return {
                show: true,
                title: action.payload.title,
                description: action.payload.description,
                confirmButtonName: action.payload.confirmButtonName,
                cancelButtonName: action.payload.cancelButtonName
            }
        case HIDE_CONFIRM:
            return initialState
        default:
            return state
    }
}

export default alertReducer
