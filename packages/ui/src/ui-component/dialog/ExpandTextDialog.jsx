import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import PerfectScrollbar from 'react-perfect-scrollbar'

// MUI
import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { LoadingButton } from '@mui/lab'

// Project Import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'

// Store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

// API
import nodesApi from '@/api/nodes'
import useApi from '@/hooks/useApi'

import './ExpandTextDialog.css'

const ExpandTextDialog = ({ show, dialogProps, onCancel, onInputHintDialogClicked, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)

    const [inputValue, setInputValue] = useState('')
    const [inputParam, setInputParam] = useState(null)
    const [languageType, setLanguageType] = useState('json')
    const [loading, setLoading] = useState(false)
    const [codeExecutedResult, setCodeExecutedResult] = useState('')

    const executeCustomFunctionNodeApi = useApi(nodesApi.executeCustomFunctionNode)

    useEffect(() => {
        if (dialogProps.value) {
            setInputValue(dialogProps.value)
        }
        if (dialogProps.inputParam) {
            setInputParam(dialogProps.inputParam)
            if (dialogProps.inputParam.type === 'code') {
                setLanguageType('js')
            }
        }
        if (dialogProps.languageType) {
            setLanguageType(dialogProps.languageType)
        }

        return () => {
            setInputValue('')
            setLoading(false)
            setInputParam(null)
            setLanguageType('json')
            setCodeExecutedResult('')
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        setLoading(executeCustomFunctionNodeApi.loading)
    }, [executeCustomFunctionNodeApi.loading])

    useEffect(() => {
        if (executeCustomFunctionNodeApi.data) {
            if (typeof executeCustomFunctionNodeApi.data === 'object') {
                setCodeExecutedResult(JSON.stringify(executeCustomFunctionNodeApi.data, null, 2))
            } else {
                setCodeExecutedResult(executeCustomFunctionNodeApi.data)
            }
        }
    }, [executeCustomFunctionNodeApi.data])

    useEffect(() => {
        if (executeCustomFunctionNodeApi.error) {
            if (typeof executeCustomFunctionNodeApi.error === 'object' && executeCustomFunctionNodeApi.error?.response?.data) {
                setCodeExecutedResult(executeCustomFunctionNodeApi.error?.response?.data)
            } else if (typeof executeCustomFunctionNodeApi.error === 'string') {
                setCodeExecutedResult(executeCustomFunctionNodeApi.error)
            }
        }
    }, [executeCustomFunctionNodeApi.error])

    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='md' aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {inputParam && (inputParam.type === 'string' || inputParam.type === 'code') && (
                        <div style={{ flex: 70 }}>
                            <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'row' }}>
                                <Typography variant='h4'>{inputParam.label}</Typography>
                                <div style={{ flex: 1 }} />
                                {inputParam.hint && (
                                    <Button
                                        sx={{ p: 0, px: 2 }}
                                        color='secondary'
                                        variant='text'
                                        onClick={() => {
                                            onInputHintDialogClicked(inputParam.hint)
                                        }}
                                    >
                                        {inputParam.hint.label}
                                    </Button>
                                )}
                            </div>
                            <PerfectScrollbar
                                style={{
                                    border: '1px solid',
                                    borderColor: theme.palette.grey['500'],
                                    borderRadius: '12px',
                                    height: '100%',
                                    maxHeight: languageType === 'js' ? 'calc(100vh - 250px)' : 'calc(100vh - 220px)',
                                    overflowX: 'hidden',
                                    backgroundColor: 'white'
                                }}
                            >
                                <CodeEditor
                                    disabled={dialogProps.disabled}
                                    value={inputValue}
                                    height={languageType === 'js' ? 'calc(100vh - 250px)' : 'calc(100vh - 220px)'}
                                    theme={customization.isDarkMode ? 'dark' : 'light'}
                                    lang={languageType}
                                    placeholder={inputParam.placeholder}
                                    basicSetup={
                                        languageType !== 'js'
                                            ? {
                                                  lineNumbers: false,
                                                  foldGutter: false,
                                                  autocompletion: false,
                                                  highlightActiveLine: false
                                              }
                                            : {}
                                    }
                                    onValueChange={(code) => setInputValue(code)}
                                />
                            </PerfectScrollbar>
                        </div>
                    )}
                </div>
                {languageType === 'js' && !inputParam.hideCodeExecute && (
                    <LoadingButton
                        sx={{
                            mt: 2,
                            '&:hover': {
                                backgroundColor: theme.palette.secondary.main,
                                backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
                            },
                            '&:disabled': {
                                backgroundColor: theme.palette.secondary.main,
                                backgroundImage: `linear-gradient(rgb(0 0 0/50%) 0 0)`
                            }
                        }}
                        loading={loading}
                        variant='contained'
                        fullWidth
                        color='secondary'
                        onClick={() => {
                            setLoading(true)
                            executeCustomFunctionNodeApi.request({ javascriptFunction: inputValue })
                        }}
                    >
                        Execute
                    </LoadingButton>
                )}
                {codeExecutedResult && (
                    <div style={{ marginTop: '15px' }}>
                        <CodeEditor
                            disabled={true}
                            value={
                                typeof codeExecutedResult === 'object' ? JSON.stringify(codeExecutedResult, null, 2) : codeExecutedResult
                            }
                            height='max-content'
                            theme={customization.isDarkMode ? 'dark' : 'light'}
                            lang={'js'}
                            basicSetup={{ lineNumbers: false, foldGutter: false, autocompletion: false, highlightActiveLine: false }}
                        />
                    </div>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{dialogProps.cancelButtonName}</Button>
                <StyledButton disabled={dialogProps.disabled} variant='contained' onClick={() => onConfirm(inputValue, inputParam.name)}>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ExpandTextDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    onInputHintDialogClicked: PropTypes.func
}

export default ExpandTextDialog
