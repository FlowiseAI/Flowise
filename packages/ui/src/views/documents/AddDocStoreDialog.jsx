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

// Icons
import { IconX, IconFileStack } from '@tabler/icons'

// API
import variablesApi from '@/api/variables'

// Hooks

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

const ContentTypes = [
    {
        label: 'Text',
        name: 'text'
    },
    {
        label: 'Code',
        name: 'code'
    },
    {
        label: 'Markdown',
        name: 'markdown'
    }
]

const TextSplitter = [
    {
        label: 'Character Text Splitter',
        name: 'character-splitter'
    },
    {
        label: 'Recursive Text Splitter',
        name: 'recursive-splitter'
    },
    {
        label: 'Token Text Splitter',
        name: 'token-splitter'
    }
]
const MarkdownSplitter = [
    {
        label: 'Markdown Text Splitter',
        name: 'markdown-splitter'
    }
]

const Languages = [
    {
        label: 'cpp',
        name: 'cpp'
    },
    {
        label: 'go',
        name: 'go'
    },
    {
        label: 'java',
        name: 'java'
    },
    {
        label: 'js',
        name: 'js'
    },
    {
        label: 'php',
        name: 'php'
    },
    {
        label: 'proto',
        name: 'proto'
    },
    {
        label: 'python',
        name: 'python'
    },
    {
        label: 'rst',
        name: 'rst'
    },
    {
        label: 'ruby',
        name: 'ruby'
    },
    {
        label: 'rust',
        name: 'rust'
    },
    {
        label: 'scala',
        name: 'scala'
    },
    {
        label: 'swift',
        name: 'swift'
    },
    {
        label: 'markdown',
        name: 'markdown'
    },
    {
        label: 'latex',
        name: 'latex'
    },
    {
        label: 'html',
        name: 'html'
    },
    {
        label: 'sol',
        name: 'sol'
    }
]

const AddDocStoreDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [documentStoreName, setDocumentStoreName] = useState('')
    const [documentStoreDesc, setDocumentStoreDesc] = useState('')
    const [contentType, setContentType] = useState('text')
    const [textSplitter, setTextSplitter] = useState('recursive-splitter')
    const [codeLanguage, setCodeLanguage] = useState('')
    const [dialogType, setDialogType] = useState('ADD')

    useEffect(() => {
        setDialogType(dialogProps.type)
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setDocumentStoreName(dialogProps.data.name)
            setDocumentStoreDesc(dialogProps.data.description)
            setContentType(dialogProps.data.contentType)
            setTextSplitter(dialogProps.data.textSplitter)
            setCodeLanguage(dialogProps.data.codeLanguage)
        } else if (dialogProps.type === 'ADD') {
            setDocumentStoreName('')
            setDocumentStoreDesc('')
            setContentType('text')
            setTextSplitter('')
            setCodeLanguage('')
        }

        return () => {
            setDocumentStoreName('')
            setDocumentStoreDesc('')
            setContentType('text')
            setTextSplitter('')
            setCodeLanguage('')
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
                name: documentStoreName,
                description: documentStoreDesc,
                contentType: contentType,
                textSplitter: textSplitter,
                codeLanguage: codeLanguage
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
                name: documentStoreName,
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
            maxWidth='md'
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
                        <IconFileStack
                            style={{
                                width: '100%',
                                height: '100%',
                                padding: 7,
                                borderRadius: '50%',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    {'Document Store'}
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
                        key='documentStoreName'
                        onChange={(e) => setDocumentStoreName(e.target.value)}
                        value={documentStoreName ?? ''}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>Description</Typography>

                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput
                        size='small'
                        multiline={true}
                        rows={3}
                        sx={{ mt: 1 }}
                        type='string'
                        fullWidth
                        key='documentStoreDesc'
                        onChange={(e) => setDocumentStoreDesc(e.target.value)}
                        value={documentStoreDesc ?? ''}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Content Type<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <Dropdown
                        key={contentType}
                        name='variableType'
                        options={ContentTypes}
                        onSelect={(newValue) => setContentType(newValue)}
                        value={contentType ?? 'choose an option'}
                    />
                </Box>
                {contentType === 'text' && (
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            <Typography>
                                Splitter<span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <div style={{ flexGrow: 1 }}></div>
                        </div>
                        <Dropdown
                            key={textSplitter}
                            name='textSplitter'
                            options={TextSplitter}
                            onSelect={(newValue) => setTextSplitter(newValue)}
                            value={textSplitter ?? 'choose an option'}
                        />
                    </Box>
                )}
                {contentType === 'markdown' && (
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            <Typography>
                                Splitter<span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <div style={{ flexGrow: 1 }}></div>
                        </div>
                        <Dropdown
                            key={textSplitter}
                            name='textSplitter'
                            options={MarkdownSplitter}
                            onSelect={(newValue) => setTextSplitter(newValue)}
                            value={textSplitter ?? 'choose an option'}
                        />
                    </Box>
                )}
                {contentType === 'code' && (
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            <Typography>
                                Language<span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                            <div style={{ flexGrow: 1 }}></div>
                        </div>
                        <Dropdown
                            key={textSplitter}
                            name='textSplitter'
                            options={Languages}
                            onSelect={(newValue) => setCodeLanguage(newValue)}
                            value={codeLanguage ?? 'choose an option'}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <StyledButton
                    disabled={!documentStoreName}
                    variant='contained'
                    onClick={() => (dialogType === 'ADD' ? addNewVariable() : saveVariable())}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddDocStoreDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddDocStoreDialog
