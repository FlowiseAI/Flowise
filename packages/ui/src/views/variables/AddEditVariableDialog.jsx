import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// Material
import { Box, Typography } from '@mui/material'

// components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'

// Project imports
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// Icons
import { IconX, IconVariable } from '@tabler/icons-react'

// API
import variablesApi from '@/api/variables'

// Hooks

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

const variableTypes = [
    {
        label: 'Static',
        name: 'static',
        description: 'Variable value will be read from the value entered below'
    },
    {
        label: 'Runtime',
        name: 'runtime',
        description: 'Variable value will be read from .env file'
    }
]

const AddEditVariableDialog = ({ show, dialogProps, onCancel, onConfirm, setError }) => {
    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [variableName, setVariableName] = useState('')
    const [variableValue, setVariableValue] = useState('')
    const [variableType, setVariableType] = useState('static')
    const [dialogType, setDialogType] = useState('ADD')
    const [variable, setVariable] = useState({})

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setVariableName(dialogProps.data.name)
            setVariableValue(dialogProps.data.value)
            setVariableType(dialogProps.data.type)
            setDialogType('EDIT')
            setVariable(dialogProps.data)
        } else if (dialogProps.type === 'ADD') {
            setVariableName('')
            setVariableValue('')
            setVariableType('static')
            setDialogType('ADD')
            setVariable({})
        }

        return () => {
            setVariableName('')
            setVariableValue('')
            setVariableType('static')
            setDialogType('ADD')
            setVariable({})
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const addNewVariable = async () => {
        try {
            const obj = {
                name: variableName,
                value: variableValue,
                type: variableType
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
            if (setError) setError(err)
            enqueueSnackbar({
                message: `Failed to add new Variable: ${
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

    const saveVariable = async () => {
        try {
            const saveObj = {
                name: variableName,
                value: variableValue,
                type: variableType
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
            if (setError) setError(err)
            enqueueSnackbar({
                message: `Failed to save Variable: ${
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
        <>
            <Dialog
                fullWidth
                maxWidth='sm'
                open={show}
                onClose={onCancel}
                aria-labelledby='alert-dialog-title'
                aria-describedby='alert-dialog-description'
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <IconVariable />
                            {dialogProps.type === 'ADD' ? 'Add Variable' : 'Edit Variable'}
                        </DialogTitle>
                    </DialogHeader>
                    <Box>
                        <Typography>
                            Variable Name<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Input
                            key='variableName'
                            onChange={(e) => setVariableName(e.target.value)}
                            value={variableName ?? ''}
                            id='txtInput_variableName'
                        />
                    </Box>
                    <Box>
                        <Typography>
                            Type<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Select placeholder='Select Variable Type' onValueChange={(value) => setVariableType(value)}>
                            {variableTypes.map((item) => (
                                <SelectItem className='flex flex-col items-start' label={item.label} key={item.name} value={item.name}>
                                    <span className='font-semibold'>{item.label}</span>
                                    <span className='text-xs'>{item.description}</span>
                                </SelectItem>
                            ))}
                        </Select>
                    </Box>
                    {variableType === 'static' && (
                        <Box>
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <Typography>
                                    Value<span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <div style={{ flexGrow: 1 }}></div>
                            </div>
                            <Input
                                key='variableValue'
                                onChange={(e) => setVariableValue(e.target.value)}
                                value={variableValue ?? ''}
                                id='txtInput_variableValue'
                            />
                        </Box>
                    )}
                    <DialogFooter>
                        <Button
                            disabled={!variableName || !variableType || (variableType === 'static' && !variableValue)}
                            id='btn_confirmAddingNewVariable'
                            onClick={() => (dialogType === 'ADD' ? addNewVariable() : saveVariable())}
                            size='sm'
                        >
                            {dialogProps.confirmButtonName}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog />
        </>
    )
}

AddEditVariableDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    setError: PropTypes.func
}

export default AddEditVariableDialog
