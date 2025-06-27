import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Button, Box, Typography, FormGroup, FormControl, FormControlLabel, Checkbox, Tooltip } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'

// Hooks
import useNotifier from '@/utils/useNotifier'
import { useFlags } from 'flagsmith/react'

// API
import chatflowsApi from '@/api/chatflows'
import { TooltipWithParser } from '../tooltip/TooltipWithParser'

const visibilityOptions = [
    { name: 'Private', description: 'Only visible to you' },
    { name: 'Organization', description: 'Visible to all members of your organization' },
    { name: 'Browser Extension', description: 'Accessible via browser extension' }
]

const VisibilitySettings = ({ dialogProps }) => {
    const flags = useFlags(['chatflow:share:internal', 'org:manage'])

    const dispatch = useDispatch()
    const chatflow = useSelector((state) => state?.canvas?.chatflow) || dialogProps.chatflow

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [visibility, setVisibility] = useState(chatflow.visibility || ['Private'])

    const handleChange = useCallback(
        (event, option) => {
            const updatedVisibility = visibility.includes(option) ? visibility.filter((v) => v !== option) : [...visibility, option]
            setVisibility(updatedVisibility)
        },
        [visibility]
    )

    const onSave = async () => {
        try {
            if (!dialogProps.chatflow.id && dialogProps.handleSaveFlow) {
                return dialogProps.handleSaveFlow(dialogProps.chatflow.name, {
                    visibility
                })
            }

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                visibility: visibility
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Workflow Visibility Saved',
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
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save Workflow Visibility: ${errorData}`,
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
        }
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.visibility) {
            setVisibility(dialogProps.chatflow.visibility || ['Private'])
        }
    }, [dialogProps])

    return (
        <>
            <Typography variant='h4' sx={{ mb: 1 }}>
                Workflow visibility
                <TooltipWithParser
                    style={{ mb: 1, mt: 2, marginLeft: 10 }}
                    title={'Control visibility and organization permissions. Contact your organization admin to enable more options.'}
                />
            </Typography>
            <FormControl component='fieldset' sx={{ width: '100%', mb: 2 }}>
                <FormGroup>
                    {visibilityOptions.map(({ name, description }) => {
                        const isDisabled =
                            name === 'Private' ||
                            (name === 'Browser Extension' && !flags['org:manage']?.enabled) ||
                            (name === 'Organization' && !flags['org:manage']?.enabled) ||
                            (name === 'Marketplace' && !flags['chatflow:share:internal']?.enabled)
                        return (
                            <Box key={name} display='flex' alignItems='center'>
                                <FormControlLabel
                                    control={
                                        <Tooltip title={isDisabled ? 'Contact your org admin to enable this option' : ''}>
                                            <Checkbox checked={visibility.includes(name)} onChange={(event) => handleChange(event, name)} />
                                        </Tooltip>
                                    }
                                    label={name}
                                    disabled={isDisabled}
                                />
                                <TooltipWithParser title={description} />
                            </Box>
                        )
                    })}
                </FormGroup>
            </FormControl>
            <StyledButton variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}
VisibilitySettings.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default VisibilitySettings
