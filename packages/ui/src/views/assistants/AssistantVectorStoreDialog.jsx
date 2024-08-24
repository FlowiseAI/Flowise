import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { omit } from 'lodash'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Stack, OutlinedInput, Typography } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// Icons
import { IconX } from '@tabler/icons-react'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'
import { formatBytes } from '@/utils/genericHelper'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

const AssistantVectorStoreDialog = ({ show, dialogProps, onCancel, onConfirm, onDelete, setError }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getAssistantVectorStoreApi = useApi(assistantsApi.getAssistantVectorStore)
    const listAssistantVectorStoreApi = useApi(assistantsApi.listAssistantVectorStore)

    const [name, setName] = useState('')
    const [isExpirationOn, setExpirationOnOff] = useState(false)
    const [expirationDays, setExpirationDays] = useState(7)
    const [availableVectorStoreOptions, setAvailableVectorStoreOptions] = useState([{ label: '- Create New -', name: '-create-' }])
    const [selectedVectorStore, setSelectedVectorStore] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (getAssistantVectorStoreApi.data) {
            if (getAssistantVectorStoreApi.data.name) {
                setName(getAssistantVectorStoreApi.data.name)
            } else {
                setName('')
            }

            if (getAssistantVectorStoreApi.data.id) {
                setSelectedVectorStore(getAssistantVectorStoreApi.data.id)
            } else {
                setSelectedVectorStore('')
            }

            if (getAssistantVectorStoreApi.data.expires_after && getAssistantVectorStoreApi.data.expires_after.days) {
                setExpirationDays(getAssistantVectorStoreApi.data.expires_after.days)
                setExpirationOnOff(true)
            } else {
                setExpirationDays(7)
                setExpirationOnOff(false)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAssistantVectorStoreApi.data])

    useEffect(() => {
        if (listAssistantVectorStoreApi.data) {
            let vectorStores = []
            for (let i = 0; i < listAssistantVectorStoreApi.data.length; i += 1) {
                vectorStores.push({
                    label: listAssistantVectorStoreApi.data[i]?.name ?? listAssistantVectorStoreApi.data[i].id,
                    name: listAssistantVectorStoreApi.data[i].id,
                    description: `${listAssistantVectorStoreApi.data[i]?.file_counts?.total} files (${formatBytes(
                        listAssistantVectorStoreApi.data[i]?.usage_bytes
                    )})`
                })
            }
            vectorStores = vectorStores.filter((vs) => vs.name !== '-create-')
            vectorStores.unshift({ label: '- Create New -', name: '-create-' })
            setAvailableVectorStoreOptions(vectorStores)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listAssistantVectorStoreApi.data])

    useEffect(() => {
        if (getAssistantVectorStoreApi.error && setError) {
            setError(getAssistantVectorStoreApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAssistantVectorStoreApi.error])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            getAssistantVectorStoreApi.request(dialogProps.data.id, dialogProps.credential)
            listAssistantVectorStoreApi.request(dialogProps.credential)
        } else if (dialogProps.type === 'ADD') {
            listAssistantVectorStoreApi.request(dialogProps.credential)
        }

        return () => {
            setName('')
            setExpirationOnOff(false)
            setExpirationDays(7)
            setSelectedVectorStore('')
            setAvailableVectorStoreOptions([{ label: '- Create New -', name: '-create-' }])
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const deleteVectorStore = async () => {
        setLoading(true)
        try {
            const deleteResp = await assistantsApi.deleteAssistantVectorStore(selectedVectorStore, dialogProps.credential)
            if (deleteResp.data) {
                enqueueSnackbar({
                    message: 'Vector Store deleted',
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
                onDelete(selectedVectorStore)
            }
            setLoading(false)
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to delete Vector Store: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            setLoading(false)
            onCancel()
        }
    }

    const addNewVectorStore = async () => {
        setLoading(true)
        try {
            const obj = {
                name: name !== '' ? name : null,
                expires_after: isExpirationOn ? { anchor: 'last_active_at', days: parseFloat(expirationDays) } : null
            }
            const createResp = await assistantsApi.createAssistantVectorStore(dialogProps.credential, obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Vector Store added',
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
                onConfirm(createResp.data)
            }
            setLoading(false)
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to add new Vector Store: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            setLoading(false)
            onCancel()
        }
    }

    const saveVectorStore = async (selectedVectorStoreId) => {
        setLoading(true)
        try {
            const saveObj = {
                name: name !== '' ? name : null,
                expires_after: isExpirationOn ? { anchor: 'last_active_at', days: parseFloat(expirationDays) } : null
            }
            const saveResp = await assistantsApi.updateAssistantVectorStore(selectedVectorStoreId, dialogProps.credential, saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Vector Store saved',
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
                if ('files' in saveResp.data) {
                    const files = saveResp.data.files
                    onConfirm(omit(saveResp.data, ['files']), files)
                } else {
                    onConfirm(saveResp.data)
                }
            }
            setLoading(false)
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to save Vector Store: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            setLoading(false)
            onCancel()
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Select Vector Store
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                    </Stack>
                    <Dropdown
                        name={selectedVectorStore}
                        options={availableVectorStoreOptions}
                        loading={listAssistantVectorStoreApi.loading}
                        onSelect={(newValue) => {
                            setSelectedVectorStore(newValue)
                            if (newValue === '-create-') {
                                setName('')
                                setExpirationOnOff(false)
                                setExpirationDays(7)
                            } else {
                                getAssistantVectorStoreApi.request(newValue, dialogProps.credential)
                            }
                        }}
                        value={selectedVectorStore ?? 'choose an option'}
                    />
                </Box>

                {selectedVectorStore !== '' && (
                    <>
                        <Box sx={{ p: 2 }}>
                            <Stack sx={{ position: 'relative' }} direction='row'>
                                <Typography variant='overline'>Vector Store Name</Typography>
                            </Stack>
                            <OutlinedInput
                                id='vsName'
                                type='string'
                                fullWidth
                                placeholder={'My Vector Store'}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </Box>

                        <Box sx={{ p: 2 }}>
                            <Stack sx={{ position: 'relative' }} direction='row'>
                                <Typography variant='overline'>Vector Store Expiration</Typography>
                            </Stack>
                            <SwitchInput onChange={(newValue) => setExpirationOnOff(newValue)} value={isExpirationOn} />
                        </Box>

                        {isExpirationOn && (
                            <Box sx={{ p: 2 }}>
                                <Stack sx={{ position: 'relative' }} direction='row'>
                                    <Typography variant='overline'>
                                        Expiration Days
                                        <span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                </Stack>
                                <OutlinedInput
                                    id='expDays'
                                    type='number'
                                    fullWidth
                                    value={expirationDays}
                                    onChange={(e) => setExpirationDays(e.target.value)}
                                />
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='error' variant='contained' onClick={() => deleteVectorStore()}>
                        Delete
                    </StyledButton>
                )}
                <StyledButton
                    disabled={!selectedVectorStore}
                    variant='contained'
                    onClick={() => (selectedVectorStore === '-create-' ? addNewVectorStore() : saveVectorStore(selectedVectorStore))}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
            {loading && <BackdropLoader open={loading} />}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AssistantVectorStoreDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    onDelete: PropTypes.func,
    setError: PropTypes.func
}

export default AssistantVectorStoreDialog
