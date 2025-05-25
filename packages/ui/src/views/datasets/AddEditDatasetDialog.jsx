import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, OutlinedInput } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { File } from '@/ui-component/file/File'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

// Icons
import { IconX, IconDatabase } from '@tabler/icons-react'

// API
import datasetApi from '@/api/dataset'

// Hooks

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
const CSVFORMAT = `Only the first 2 columns will be considered:
----------------------------
| Input      | Output      |
----------------------------
| test input | test output |
----------------------------
`

const AddEditDatasetDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [datasetName, setDatasetName] = useState('')
    const [datasetDescription, setDatasetDescription] = useState('')
    const [dialogType, setDialogType] = useState('ADD')
    const [dataset, setDataset] = useState({})
    const [firstRowHeaders, setFirstRowHeaders] = useState(false)
    const [selectedFile, setSelectedFile] = useState()

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setDatasetName(dialogProps.data.name)
            setDatasetDescription(dialogProps.data.description)
            setDialogType('EDIT')
            setDataset(dialogProps.data)
        } else if (dialogProps.type === 'ADD') {
            setDatasetName('')
            setDatasetDescription('')
            setDialogType('ADD')
            setDataset({})
        }

        return () => {
            setDatasetName('')
            setDatasetDescription('')
            setDialogType('ADD')
            setDataset({})
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const addNewDataset = async () => {
        try {
            const obj = {
                name: datasetName,
                description: datasetDescription
            }
            if (selectedFile) {
                obj.firstRowHeaders = firstRowHeaders
                obj.csvFile = selectedFile
            }
            const createResp = await datasetApi.createDataset(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Dataset added',
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
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to add new Dataset: ${
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

    const saveDataset = async () => {
        try {
            const saveObj = {
                name: datasetName,
                description: datasetDescription
            }

            const saveResp = await datasetApi.updateDataset(dataset.id, saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Dataset saved',
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
            enqueueSnackbar({
                message: `Failed to save Dataset: ${
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
                    <IconDatabase style={{ marginRight: '10px' }} />
                    {dialogProps.type === 'ADD' ? 'Add Dataset' : 'Edit Dataset'}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Name<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput
                        size='small'
                        sx={{ mt: 1 }}
                        type='string'
                        fullWidth
                        key='datasetName'
                        onChange={(e) => setDatasetName(e.target.value)}
                        value={datasetName ?? ''}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>Description</Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput
                        size='small'
                        sx={{ mt: 1 }}
                        type='string'
                        fullWidth
                        multiline={true}
                        rows={4}
                        key='datasetDescription'
                        onChange={(e) => setDatasetDescription(e.target.value)}
                        value={datasetDescription ?? ''}
                    />
                </Box>
                {dialogType === 'ADD' && (
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography>
                                Upload CSV
                                <TooltipWithParser style={{ mb: 1, mt: 2 }} title={`<pre>${CSVFORMAT}</pre>`} />
                            </Typography>
                            <div style={{ flexGrow: 1 }}></div>
                        </div>
                        <File
                            disabled={false}
                            fileType='.csv'
                            onChange={(newValue) => setSelectedFile(newValue)}
                            value={selectedFile ?? 'Choose a file to upload'}
                        />
                        <SwitchInput
                            value={firstRowHeaders}
                            onChange={setFirstRowHeaders}
                            label={'Treat First Row as headers in the upload file?'}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onCancel()}>{dialogProps.cancelButtonName}</Button>
                <StyledButton
                    disabled={!datasetName}
                    variant='contained'
                    onClick={() => (dialogType === 'ADD' ? addNewDataset() : saveDataset())}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddEditDatasetDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddEditDatasetDialog
