// action - customization reducer
export const SET_MENU = '@customization/SET_MENU'
export const MENU_TOGGLE = '@customization/MENU_TOGGLE'
export const MENU_OPEN = '@customization/MENU_OPEN'
export const SET_FONT_FAMILY = '@customization/SET_FONT_FAMILY'
export const SET_BORDER_RADIUS = '@customization/SET_BORDER_RADIUS'
export const SET_LAYOUT = '@customization/SET_LAYOUT '
export const SET_DARKMODE = '@customization/SET_DARKMODE'

// action - canvas reducer
export const SET_DIRTY = '@canvas/SET_DIRTY'
export const REMOVE_DIRTY = '@canvas/REMOVE_DIRTY'
export const SET_CHATFLOW = '@canvas/SET_CHATFLOW'
export const SHOW_CANVAS_DIALOG = '@canvas/SHOW_CANVAS_DIALOG'
export const HIDE_CANVAS_DIALOG = '@canvas/HIDE_CANVAS_DIALOG'
export const SET_COMPONENT_NODES = '@canvas/SET_COMPONENT_NODES'
export const SET_COMPONENT_CREDENTIALS = '@canvas/SET_COMPONENT_CREDENTIALS'

// action - notifier reducer
export const ENQUEUE_SNACKBAR = 'ENQUEUE_SNACKBAR'
export const CLOSE_SNACKBAR = 'CLOSE_SNACKBAR'
export const REMOVE_SNACKBAR = 'REMOVE_SNACKBAR'

// action - dialog reducer
export const SHOW_CONFIRM = 'SHOW_CONFIRM'
export const HIDE_CONFIRM = 'HIDE_CONFIRM'

export const enqueueSnackbar = (notification) => {
    const key = notification.options && notification.options.key

    return {
        type: ENQUEUE_SNACKBAR,
        notification: {
            ...notification,
            options: {
                ...notification.options,
                persist: notification.options?.persist ?? false, // Default: auto-close enabled
                autoHideDuration: notification.options?.autoHideDuration ?? 5000 // Default auto-close duration: 5 seconds
            },
            key: key || new Date().getTime() + Math.random()
        }
    }
}

export const closeSnackbar = (key) => ({
    type: CLOSE_SNACKBAR,
    dismissAll: !key, // dismiss all if no key has been defined
    key
})

export const removeSnackbar = (key) => ({
    type: REMOVE_SNACKBAR,
    key
})
