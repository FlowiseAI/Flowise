import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    IconButton,
    OutlinedInput,
    Popover
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { StyledButton } from '@/ui-component/button/StyledButton'

// Icons
import { IconX, IconCopy } from '@tabler/icons'

// API
import apikeyApi from '@/api/apikey'

// utils
import useNotifier from '@/utils/useNotifier'

const APIKeyDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const theme = useTheme()
    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [keyName, setKeyName] = useState('')
    const [anchorEl, setAnchorEl] = useState(null)
    const openPopOver = Boolean(anchorEl)

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.key) {
            setKeyName(dialogProps.key.keyName)
        } else if (dialogProps.type === 'ADD') {
            setKeyName('')
        }
    }, [dialogProps])

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const addNewKey = async () => {
        try {
            const createResp = await apikeyApi.createNewAPI({ keyName })
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New API key added',
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
                onConfirm()
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to add new API key: ${errorData}`,
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

    const saveKey = async () => {
        try {
            const saveResp = await apikeyApi.updateAPI(dialogProps.key.id, { keyName })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'API Key saved',
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
                onConfirm()
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save API key: ${errorData}`,
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
                {dialogProps.type === 'EDIT' && (
                    <Box sx={{ p: 2 }}>
                        <Typography variant='overline'>API Key</Typography>
                        <Stack direction='row' sx={{ mb: 1 }}>
                            <Typography
                                sx={{
                                    p: 1,
                                    borderRadius: 10,
                                    backgroundColor: theme.palette.primary.light,
                                    width: 'max-content',
                                    height: 'max-content'
                                }}
                                variant='h5'
                            >
                                {dialogProps.key.apiKey}
                            </Typography>
                            <IconButton
                                title='Copy API Key'
                                color='success'
                                onClick={(event) => {
                                    navigator.clipboard.writeText(dialogProps.key.apiKey)
                                    setAnchorEl(event.currentTarget)
                                    setTimeout(() => {
                                        handleClosePopOver()
                                    }, 1500)
                                }}
                            >
                                <IconCopy />
                            </IconButton>
                            <Popover
                                open={openPopOver}
                                anchorEl={anchorEl}
                                onClose={handleClosePopOver}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right'
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'left'
                                }}
                            >
                                <Typography variant='h6' sx={{ pl: 1, pr: 1, color: 'white', background: theme.palette.success.dark }}>
                                    Copied!
                                </Typography>
                            </Popover>
                        </Stack>
                    </Box>
                )}

                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>Key Name</Typography>
                    </Stack>
                    <OutlinedInput
                        id='keyName'
                        type='string'
                        fullWidth
                        placeholder='My New Key'
                        value={keyName}
                        name='keyName'
                        onChange={(e) => setKeyName(e.target.value)}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <StyledButton
                    variant='contained'
                    onClick={() => (dialogProps.type === 'ADD' ? addNewKey() : saveKey())}
                    id={dialogProps.customBtnId}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

APIKeyDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default APIKeyDialog
