import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

import { Box, Typography, Stack, Popover } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// Icons
import { IconX, IconCopy } from '@tabler/icons-react'

// API
import apikeyApi from '@/api/apikey'

// utils
import useNotifier from '@/utils/useNotifier'
import { IconCheck } from '@tabler/icons-react'

const APIKeyDialog = ({ show, dialogProps, onCancel, onConfirm, setError }) => {
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
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to add new API key: ${
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
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to save API key: ${
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
            onCancel()
        }
    }

    return (
        <Dialog open={show} onClose={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogProps.title}</DialogTitle>
                </DialogHeader>
                {dialogProps.type === 'EDIT' && (
                    <Box>
                        <Typography variant='overline'>API Key</Typography>
                        <Stack className='flex-row w-full gap-2' direction='row'>
                            <Typography
                                className='h-10 flex items-center flex-1 rounded-md px-2 py-1'
                                sx={{
                                    backgroundColor: theme.palette.primary.light
                                }}
                                variant='h5'
                            >
                                {dialogProps.key.apiKey}
                            </Typography>
                            <Button
                                onClick={(event) => {
                                    navigator.clipboard.writeText(dialogProps.key.apiKey)
                                    setAnchorEl(event.currentTarget)
                                    setTimeout(() => {
                                        handleClosePopOver()
                                    }, 1500)
                                }}
                                size='icon'
                                title='Copy API Key'
                                variant='secondary'
                            >
                                {openPopOver ? <IconCheck color='green' /> : <IconCopy />}
                            </Button>
                            <Popover
                                open={openPopOver}
                                anchorEl={anchorEl}
                                onClose={handleClosePopOver}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'center'
                                }}
                                transformOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'center'
                                }}
                                slotProps={{ paper: { sx: { boxShadow: 'none' } } }}
                            >
                                <Typography variant='h6' sx={{ pl: 1, pr: 1, color: 'white', background: theme.palette.success.dark }}>
                                    Copied!
                                </Typography>
                            </Popover>
                        </Stack>
                    </Box>
                )}

                <Box>
                    <Typography variant='overline'>Key Name</Typography>
                    <Input placeholder='My New Key' value={keyName} name='keyName' onChange={(e) => setKeyName(e.target.value)} />
                </Box>
                <DialogFooter>
                    <Button id={dialogProps.customBtnId} onClick={() => (dialogProps.type === 'ADD' ? addNewKey() : saveKey())} size='sm'>
                        {dialogProps.confirmButtonName}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

APIKeyDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    setError: PropTypes.func
}

export default APIKeyDialog
