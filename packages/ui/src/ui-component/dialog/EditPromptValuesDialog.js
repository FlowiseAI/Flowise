import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    Box,
    List,
    ListItemButton,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Typography,
    Stack
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { StyledButton } from 'ui-component/button/StyledButton'
import { DarkCodeEditor } from 'ui-component/editor/DarkCodeEditor'
import { LightCodeEditor } from 'ui-component/editor/LightCodeEditor'

import './EditPromptValuesDialog.css'
import { baseURL } from 'store/constant'

const EditPromptValuesDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const languageType = 'json'

    const [inputValue, setInputValue] = useState('')
    const [inputParam, setInputParam] = useState(null)
    const [textCursorPosition, setTextCursorPosition] = useState({})

    useEffect(() => {
        if (dialogProps.value) setInputValue(dialogProps.value)
        if (dialogProps.inputParam) setInputParam(dialogProps.inputParam)

        return () => {
            setInputValue('')
            setInputParam(null)
            setTextCursorPosition({})
        }
    }, [dialogProps])

    const onMouseUp = (e) => {
        if (e.target && e.target.selectionEnd && e.target.value) {
            const cursorPosition = e.target.selectionEnd
            const textBeforeCursorPosition = e.target.value.substring(0, cursorPosition)
            const textAfterCursorPosition = e.target.value.substring(cursorPosition, e.target.value.length)
            const body = {
                textBeforeCursorPosition,
                textAfterCursorPosition
            }
            setTextCursorPosition(body)
        } else {
            setTextCursorPosition({})
        }
    }

    const onSelectOutputResponseClick = (node, isUserQuestion = false) => {
        let variablePath = isUserQuestion ? `question` : `${node.id}.data.instance`
        if (textCursorPosition) {
            let newInput = ''
            if (textCursorPosition.textBeforeCursorPosition === undefined && textCursorPosition.textAfterCursorPosition === undefined)
                newInput = `${inputValue}${`{{${variablePath}}}`}`
            else newInput = `${textCursorPosition.textBeforeCursorPosition}{{${variablePath}}}${textCursorPosition.textAfterCursorPosition}`
            setInputValue(newInput)
        }
    }

    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='md' aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {inputParam && inputParam.type === 'string' && (
                        <div style={{ flex: 70 }}>
                            <Typography sx={{ mb: 2, ml: 1 }} variant='h4'>
                                {inputParam.label}
                            </Typography>
                            <PerfectScrollbar
                                style={{
                                    border: '1px solid',
                                    borderColor: theme.palette.grey['500'],
                                    borderRadius: '12px',
                                    height: '100%',
                                    maxHeight: 'calc(100vh - 220px)',
                                    overflowX: 'hidden',
                                    backgroundColor: 'white'
                                }}
                            >
                                {customization.isDarkMode ? (
                                    <DarkCodeEditor
                                        disabled={dialogProps.disabled}
                                        value={inputValue}
                                        onValueChange={(code) => setInputValue(code)}
                                        placeholder={inputParam.placeholder}
                                        type={languageType}
                                        onMouseUp={(e) => onMouseUp(e)}
                                        onBlur={(e) => onMouseUp(e)}
                                        style={{
                                            fontSize: '0.875rem',
                                            minHeight: 'calc(100vh - 220px)',
                                            width: '100%'
                                        }}
                                    />
                                ) : (
                                    <LightCodeEditor
                                        disabled={dialogProps.disabled}
                                        value={inputValue}
                                        onValueChange={(code) => setInputValue(code)}
                                        placeholder={inputParam.placeholder}
                                        type={languageType}
                                        onMouseUp={(e) => onMouseUp(e)}
                                        onBlur={(e) => onMouseUp(e)}
                                        style={{
                                            fontSize: '0.875rem',
                                            minHeight: 'calc(100vh - 220px)',
                                            width: '100%'
                                        }}
                                    />
                                )}
                            </PerfectScrollbar>
                        </div>
                    )}
                    {!dialogProps.disabled && inputParam && inputParam.acceptVariable && (
                        <div style={{ flex: 30 }}>
                            <Stack flexDirection='row' sx={{ mb: 1, ml: 2 }}>
                                <Typography variant='h4'>Select Variable</Typography>
                            </Stack>
                            <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 220px)', overflowX: 'hidden' }}>
                                <Box sx={{ pl: 2, pr: 2 }}>
                                    <List>
                                        <ListItemButton
                                            sx={{
                                                p: 0,
                                                borderRadius: `${customization.borderRadius}px`,
                                                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                                mb: 1
                                            }}
                                            disabled={dialogProps.disabled}
                                            onClick={() => onSelectOutputResponseClick(null, true)}
                                        >
                                            <ListItem alignItems='center'>
                                                <ListItemAvatar>
                                                    <div
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: '50%',
                                                            backgroundColor: 'white'
                                                        }}
                                                    >
                                                        <img
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                padding: 10,
                                                                objectFit: 'contain'
                                                            }}
                                                            alt='AI'
                                                            src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                                                        />
                                                    </div>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    sx={{ ml: 1 }}
                                                    primary='question'
                                                    secondary={`User's question from chatbox`}
                                                />
                                            </ListItem>
                                        </ListItemButton>
                                        {dialogProps.availableNodesForVariable &&
                                            dialogProps.availableNodesForVariable.length > 0 &&
                                            dialogProps.availableNodesForVariable.map((node, index) => {
                                                const selectedOutputAnchor = node.data.outputAnchors[0].options.find(
                                                    (ancr) => ancr.name === node.data.outputs['output']
                                                )
                                                return (
                                                    <ListItemButton
                                                        key={index}
                                                        sx={{
                                                            p: 0,
                                                            borderRadius: `${customization.borderRadius}px`,
                                                            boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                                            mb: 1
                                                        }}
                                                        disabled={dialogProps.disabled}
                                                        onClick={() => onSelectOutputResponseClick(node)}
                                                    >
                                                        <ListItem alignItems='center'>
                                                            <ListItemAvatar>
                                                                <div
                                                                    style={{
                                                                        width: 50,
                                                                        height: 50,
                                                                        borderRadius: '50%',
                                                                        backgroundColor: 'white'
                                                                    }}
                                                                >
                                                                    <img
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            padding: 10,
                                                                            objectFit: 'contain'
                                                                        }}
                                                                        alt={node.data.name}
                                                                        src={`${baseURL}/api/v1/node-icon/${node.data.name}`}
                                                                    />
                                                                </div>
                                                            </ListItemAvatar>
                                                            <ListItemText
                                                                sx={{ ml: 1 }}
                                                                primary={
                                                                    node.data.inputs.chainName ? node.data.inputs.chainName : node.data.id
                                                                }
                                                                secondary={`${selectedOutputAnchor?.label ?? 'output'} from ${
                                                                    node.data.label
                                                                }`}
                                                            />
                                                        </ListItem>
                                                    </ListItemButton>
                                                )
                                            })}
                                    </List>
                                </Box>
                            </PerfectScrollbar>
                        </div>
                    )}
                </div>
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

EditPromptValuesDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default EditPromptValuesDialog
