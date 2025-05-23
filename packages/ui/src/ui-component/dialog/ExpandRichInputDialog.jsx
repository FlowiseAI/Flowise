import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import PerfectScrollbar from 'react-perfect-scrollbar'

// MUI
import { Button, Dialog, DialogActions, DialogContent, Typography, Box } from '@mui/material'
import { styled } from '@mui/material/styles'

// Project Import
import { StyledButton } from '@/ui-component/button/StyledButton'

// TipTap
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { suggestionOptions } from '@/ui-component/input/suggestionOption'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'

// Store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

// Add styled component for editor wrapper
const StyledEditorContent = styled(EditorContent)(({ theme, rows }) => ({
    '& .ProseMirror': {
        padding: '0px 14px',
        height: rows ? `${rows * 1.4375}rem` : '2.4rem',
        overflowY: rows ? 'auto' : 'hidden',
        overflowX: rows ? 'auto' : 'hidden',
        lineHeight: rows ? '1.4375em' : '0.875em',
        fontWeight: 500,
        color: theme.palette.grey[900],
        border: `1px solid ${theme.palette.textBackground.border}`,
        borderRadius: '10px',
        backgroundColor: theme.palette.textBackground.main,
        boxSizing: 'border-box',
        whiteSpace: rows ? 'pre-wrap' : 'nowrap',
        '&:hover': {
            borderColor: theme.palette.text.primary,
            cursor: 'text'
        },
        '&:focus': {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 0px ${theme.palette.primary.main}`,
            outline: 'none'
        },
        '&[disabled]': {
            backgroundColor: theme.palette.action.disabledBackground,
            color: theme.palette.action.disabled
        },
        // Placeholder for first paragraph when editor is empty
        '& p.is-editor-empty:first-of-type::before': {
            content: 'attr(data-placeholder)',
            float: 'left',
            color: theme.palette.text.primary,
            opacity: 0.4,
            pointerEvents: 'none',
            height: 0
        }
    }
}))

// define your extension array
const extensions = (availableNodesForVariable, availableState, acceptNodeOutputAsVariable, nodes, nodeData, isNodeInsideInteration) => [
    StarterKit,
    Mention.configure({
        HTMLAttributes: {
            class: 'variable'
        },
        renderHTML({ options, node }) {
            return [
                'span',
                mergeAttributes(this.HTMLAttributes, options.HTMLAttributes),
                `${options.suggestion.char} ${node.attrs.label ?? node.attrs.id} }}`
            ]
        },
        suggestion: suggestionOptions(
            availableNodesForVariable,
            availableState,
            acceptNodeOutputAsVariable,
            nodes,
            nodeData,
            isNodeInsideInteration
        ),
        deleteTriggerWithBackspace: true
    })
]

const ExpandRichInputDialog = ({ show, dialogProps, onCancel, onInputHintDialogClicked, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    const [inputValue, setInputValue] = useState('')
    const [inputParam, setInputParam] = useState(null)
    const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
    const [availableState, setAvailableState] = useState([])
    const [nodeData, setNodeData] = useState({})
    const [isNodeInsideInteration, setIsNodeInsideInteration] = useState(false)

    useEffect(() => {
        if (dialogProps.value) {
            setInputValue(dialogProps.value)
        }
        if (dialogProps.inputParam) {
            setInputParam(dialogProps.inputParam)
        }

        return () => {
            setInputValue('')
            setInputParam(null)
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (!dialogProps.disabled && dialogProps.nodes && dialogProps.edges && dialogProps.nodeId && inputParam) {
            const nodesForVariable = inputParam?.acceptVariable
                ? getAvailableNodesForVariable(dialogProps.nodes, dialogProps.edges, dialogProps.nodeId, inputParam.id)
                : []
            setAvailableNodesForVariable(nodesForVariable)

            const startAgentflowNode = dialogProps.nodes.find((node) => node.data.name === 'startAgentflow')
            const state = startAgentflowNode?.data?.inputs?.startState
            setAvailableState(state)

            const agentflowNode = dialogProps.nodes.find((node) => node.data.id === dialogProps.nodeId)
            setNodeData(agentflowNode?.data)

            setIsNodeInsideInteration(dialogProps.nodes.find((node) => node.data.id === dialogProps.nodeId)?.extent === 'parent')
        }
    }, [dialogProps.disabled, inputParam, dialogProps.nodes, dialogProps.edges, dialogProps.nodeId])

    const editor = useEditor(
        {
            extensions: [
                ...extensions(
                    availableNodesForVariable,
                    availableState,
                    inputParam?.acceptNodeOutputAsVariable,
                    dialogProps.nodes,
                    nodeData,
                    isNodeInsideInteration
                ),
                Placeholder.configure({ placeholder: inputParam?.placeholder })
            ],
            content: inputValue,
            onUpdate: ({ editor }) => {
                setInputValue(editor.getHTML())
            },
            editable: !dialogProps.disabled
        },
        [availableNodesForVariable]
    )

    // Focus the editor when dialog opens
    useEffect(() => {
        if (show && editor) {
            setTimeout(() => {
                editor.commands.focus()
            }, 100)
        }
    }, [show, editor])

    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='md' aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {inputParam && (
                        <div style={{ flex: 70, width: '100%' }}>
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
                                    borderRadius: '12px',
                                    height: '100%',
                                    maxHeight: 'calc(100vh - 220px)',
                                    overflowX: 'hidden'
                                }}
                            >
                                <Box sx={{ mt: 1, border: '' }}>
                                    <StyledEditorContent editor={editor} rows={15} />
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

ExpandRichInputDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    onInputHintDialogClicked: PropTypes.func
}

export default ExpandRichInputDialog
