import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'

// Canvas state slice
interface CanvasState {
    isDirty: boolean
    chatflow: any | null
    componentNodes: any[]
    canvasDialogShow: boolean
}

const initialCanvasState: CanvasState = {
    isDirty: false,
    chatflow: null,
    componentNodes: [],
    canvasDialogShow: false
}

const canvasSlice = createSlice({
    name: 'canvas',
    initialState: initialCanvasState,
    reducers: {
        SET_DIRTY: (state) => {
            state.isDirty = true
        },
        REMOVE_DIRTY: (state) => {
            state.isDirty = false
        },
        SET_CHATFLOW: (state, action: PayloadAction<any>) => {
            state.chatflow = action.payload.chatflow || action.payload
        },
        SET_COMPONENT_NODES: (state, action: PayloadAction<any[]>) => {
            state.componentNodes = action.payload
        },
        SHOW_CANVAS_DIALOG: (state) => {
            state.canvasDialogShow = true
        },
        HIDE_CANVAS_DIALOG: (state) => {
            state.canvasDialogShow = false
        }
    }
})

// Customization slice
interface CustomizationState {
    isDarkMode: boolean
    borderRadius: number
    fontFamily: string
}

const customizationSlice = createSlice({
    name: 'customization',
    initialState: {
        isDarkMode: false,
        borderRadius: 12,
        fontFamily: "'Roboto', sans-serif"
    } as CustomizationState,
    reducers: {
        SET_DARK_MODE: (state, action: PayloadAction<boolean>) => {
            state.isDarkMode = action.payload
        }
    }
})

// Snackbar slice
interface SnackbarState {
    notifications: any[]
}

const snackbarSlice = createSlice({
    name: 'snackbar',
    initialState: {
        notifications: []
    } as SnackbarState,
    reducers: {
        enqueueSnackbar: (state, action) => {
            state.notifications.push(action.payload)
        },
        closeSnackbar: (state, action) => {
            state.notifications = state.notifications.filter((n: any) => n.key !== action.payload)
        },
        removeSnackbar: (state, action) => {
            state.notifications = state.notifications.filter((n: any) => n.key !== action.payload)
        }
    }
})

export const store = configureStore({
    reducer: {
        canvas: canvasSlice.reducer,
        customization: customizationSlice.reducer,
        snackbar: snackbarSlice.reducer
    }
})

export const { SET_DIRTY, REMOVE_DIRTY, SET_CHATFLOW, SET_COMPONENT_NODES, SHOW_CANVAS_DIALOG, HIDE_CANVAS_DIALOG } = canvasSlice.actions

export const { SET_DARK_MODE } = customizationSlice.actions

export const { enqueueSnackbar, closeSnackbar, removeSnackbar } = snackbarSlice.actions

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
