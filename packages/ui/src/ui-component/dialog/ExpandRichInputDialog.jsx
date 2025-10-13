import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
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
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { suggestionOptions } from '@/ui-component/input/suggestionOption'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'

const lowlight = createLowlight(common)

// Store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

// Add styled component for editor wrapper
const StyledEditorContent = styled(EditorContent)(({ theme, rows, disabled, isDarkMode }) => ({
    '& .ProseMirror': {
        padding: '0px 14px',
        height: rows ? `${rows * 1.4375}rem` : '2.4rem',
        overflowY: rows ? 'auto' : 'hidden',
        overflowX: rows ? 'auto' : 'hidden',
        lineHeight: rows ? '1.4375em' : '0.875em',
        fontWeight: 500,
        color: disabled ? theme.palette.action.disabled : theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[900] + 25}`,
        borderRadius: '10px',
        backgroundColor: theme.palette.textBackground.main,
        boxSizing: 'border-box',
        whiteSpace: rows ? 'pre-wrap' : 'nowrap',
        '&:hover': {
            borderColor: disabled ? `${theme.palette.grey[900] + 25}` : theme.palette.text.primary,
            cursor: disabled ? 'default' : 'text'
        },
        '&:focus': {
            borderColor: disabled ? `${theme.palette.grey[900] + 25}` : theme.palette.primary.main,
            outline: 'none'
        },
        // Placeholder for first paragraph when editor is empty
        '& p.is-editor-empty:first-of-type::before': {
            content: 'attr(data-placeholder)',
            float: 'left',
            color: disabled ? theme.palette.action.disabled : theme.palette.text.primary,
            opacity: disabled ? 0.6 : 0.4,
            pointerEvents: 'none',
            height: 0
        },
        // Set CSS custom properties for theme-aware styling based on the screenshot
        '--code-bg': isDarkMode ? '#2d2d2d' : '#f5f5f5',
        '--code-color': isDarkMode ? '#d4d4d4' : '#333333',
        '--hljs-comment': isDarkMode ? '#6a9955' : '#6a9955',
        '--hljs-variable': isDarkMode ? '#9cdcfe' : '#d73a49', // Light blue for variables (var, i)
        '--hljs-number': isDarkMode ? '#b5cea8' : '#e36209', // Light green for numbers (1, 20, 15, etc.)
        '--hljs-string': isDarkMode ? '#ce9178' : '#22863a', // Orange/peach for strings ("FizzBuzz", "Fizz", "Buzz")
        '--hljs-title': isDarkMode ? '#dcdcaa' : '#6f42c1', // Yellow for function names (log)
        '--hljs-keyword': isDarkMode ? '#569cd6' : '#005cc5', // Blue for keywords (for, if, else)
        '--hljs-operator': isDarkMode ? '#d4d4d4' : '#333333', // White/gray for operators (=, %, ==, etc.)
        '--hljs-punctuation': isDarkMode ? '#d4d4d4' : '#333333' // White/gray for punctuation ({, }, ;, etc.)
    }
}))

// define your extension array
const extensions = (availableNodesForVariable, availableState, acceptNodeOutputAsVariable, nodes, nodeData, isNodeInsideInteration) => [
    StarterKit.configure({
        codeBlock: false
    }),
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
    }),
    CodeBlockLowlight.configure({
        lowlight,
        enableTabIndentation: true,
        tabSize: 2
    })
]

const ExpandRichInputDialog = ({ show, dialogProps, onCancel, onInputHintDialogClicked, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode

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
                                    <StyledEditorContent
                                        editor={editor}
                                        rows={15}
                                        disabled={dialogProps.disabled}
                                        isDarkMode={isDarkMode}
                                    />
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
