import { Button } from '@mui/material'
import useConfirm from 'hooks/useConfirm'
import { batchDeleteChainLogs } from 'api/chainlogs'
import useApi from 'hooks/useApi'
import { useDispatch } from 'react-redux'
import useNotifier from 'utils/useNotifier'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'
import { IconX } from '@tabler/icons'

export default function useDeleteChainLogs({ refetch }) {
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const { request } = useApi(batchDeleteChainLogs)
    const { confirm, onConfirm, onCancel } = useConfirm()

    const handleDelete = async () => {
        const isMultipleSelected = selected.length > 1

        const confirmPayload = {
            title: isMultipleSelected ? 'Delete log records' : 'Delete log record',
            description: `Are you sure you want to delete ${isMultipleSelected ? 'these items' : 'this item'}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }

        try {
            const result = await confirm(confirmPayload)
            const data = { ids: selected }
            if (result) {
                await request({ data })
                enqueueSnackbar({
                    message: isMultipleSelected ? 'Log records deleted' : 'Log record deleted',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                refetch()
                setSelected([])
                onConfirm()
            }
        } catch (error) {
            enqueueSnackbar({
                message: 'Failed to delete log records',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    return { handleDelete }
}
