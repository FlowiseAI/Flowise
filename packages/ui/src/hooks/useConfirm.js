import { useContext } from 'react'
import ConfirmContext from 'store/context/ConfirmContext'
import { HIDE_CONFIRM, SHOW_CONFIRM } from 'store/actions'

let resolveCallback
const useConfirm = () => {
    const [confirmState, dispatch] = useContext(ConfirmContext)

    const closeConfirm = () => {
        dispatch({
            type: HIDE_CONFIRM
        })
    }

    const onConfirm = () => {
        closeConfirm()
        resolveCallback(true)
    }

    const onCancel = () => {
        closeConfirm()
        resolveCallback(false)
    }
    const confirm = (confirmPayload) => {
        dispatch({
            type: SHOW_CONFIRM,
            payload: confirmPayload
        })
        return new Promise((res) => {
            resolveCallback = res
        })
    }

    return { confirm, onConfirm, onCancel, confirmState }
}

export default useConfirm
