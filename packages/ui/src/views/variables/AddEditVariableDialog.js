import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, OutlinedInput } from '@mui/material'

// Project imports
import { StyledButton } from 'ui-component/button/StyledButton'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'

// Icons
import { IconX, IconVariable } from '@tabler/icons'

// API
import variablesApi from 'api/variables'

// Hooks

// utils
import useNotifier from 'utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'
import { TooltipWithParser } from '../../ui-component/tooltip/TooltipWithParser'
import { Dropdown } from '../../ui-component/dropdown/Dropdown'

const variableTypes = [
    {
        label: 'Static Variable',
        name: 'static'
    },
    {
        label: 'Runtime Variable',
        name: 'runtime'
    }
]

const AddEditVariableDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [name, setName] = useState('')
    const [value, setValue] = useState('')
    const [type, setType] = useState('')

    const [variable, setVariable] = useState({})

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When variable dialog is opened from Variables dashboard
            setName(dialogProps.data.name)
            setValue(dialogProps.data.value)
            setType(dialogProps.data.type)
            //setVariable(dialogProps.data)
        } else if (dialogProps.type === 'ADD' && dialogProps.data) {
            // When variable dialog is to add a new variable
            setName('')
            setValue('')
            setType('static')
            //setVariable({ name: '', value: '', type: 'static' })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const addNewVariable = async () => {
        try {
            const obj = {
                name,
                value,
                type
            }
            const createResp = await variablesApi.createVariable(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Variable added',
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
                onConfirm(createResp.data.id)
            }
        } catch (err) {
            const errorData = typeof err === 'string' ? err : err.response?.data || `${err.response?.status}: ${err.response?.statusText}`
            enqueueSnackbar({
                message: `Failed to add new Variable: ${errorData}`,
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

    const saveVariable = async () => {
        try {
            const saveObj = {
                name,
                value,
                type
            }

            const saveResp = await variablesApi.updateVariable(variable.id, saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Variable saved',
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
                onConfirm(saveResp.data.id)
            }
        } catch (error) {
            const errorData = error.response?.data || `${error.response?.status}: ${error.response?.statusText}`
            enqueueSnackbar({
                message: `Failed to save Variable: ${errorData}`,
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
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div
                        style={{
                            width: 50,
                            height: 50,
                            marginRight: 10,
                            borderRadius: '50%',
                            backgroundColor: 'white'
                        }}
                    >
                        <IconVariable
                            style={{
                                width: '100%',
                                height: '100%',
                                padding: 7,
                                borderRadius: '50%',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    {dialogProps.type === 'ADD' ? 'Add Variable' : 'Edit Variable'}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Variable Name<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>

                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput type='string' fullWidth key='name' onChange={(e) => setName(e.target.value)} value={name ?? ''} />
                </Box>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Value
                            <TooltipWithParser style={{ marginLeft: 10 }} title='Value is mandatory for static variables.' />
                        </Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput type='string' fullWidth key='value' onChange={(e) => setValue(e.target.value)} value={value ?? ''} />
                    <Typography variant='subtitle2'>Leave the value empty for runtime variables. Will be populated at runtime.</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Type<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <Dropdown
                        key='type'
                        name='variable-type'
                        options={variableTypes}
                        onSelect={(newValue) => setType(newValue)}
                        value={type ?? 'static'}
                    />
                    <Typography variant='subtitle2'>
                        Runtime: Value would be populated from env. Static: Value would be used as is.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <StyledButton
                    disabled={!name}
                    variant='contained'
                    onClick={() => (dialogProps.type === 'ADD' ? addNewVariable() : saveVariable())}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddEditVariableDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddEditVariableDialog
