import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSnackbar } from 'notistack'
import { removeSnackbar } from 'store/actions'

let displayed = []

const useNotifier = () => {
    const dispatch = useDispatch()
    const notifier = useSelector((state) => state.notifier)
    const { notifications } = notifier

    const { enqueueSnackbar, closeSnackbar } = useSnackbar()

    const storeDisplayed = (id) => {
        displayed = [...displayed, id]
    }

    const removeDisplayed = (id) => {
        displayed = [...displayed.filter((key) => id !== key)]
    }

    React.useEffect(() => {
        notifications.forEach(({ key, message, options = {}, dismissed = false }) => {
            if (dismissed) {
                // dismiss snackbar using notistack
                closeSnackbar(key)
                return
            }

            // do nothing if snackbar is already displayed
            if (displayed.includes(key)) return

            // display snackbar using notistack
            enqueueSnackbar(message, {
                key,
                ...options,
                onClose: (event, reason, myKey) => {
                    if (options.onClose) {
                        options.onClose(event, reason, myKey)
                    }
                },
                onExited: (event, myKey) => {
                    // remove this snackbar from redux store
                    dispatch(removeSnackbar(myKey))
                    removeDisplayed(myKey)
                }
            })

            // keep track of snackbars that we've displayed
            storeDisplayed(key)
        })
    }, [notifications, closeSnackbar, enqueueSnackbar, dispatch])
}

export default useNotifier
