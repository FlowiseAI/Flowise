import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { styled } from '@mui/material/styles'
import { Box } from '@mui/material'
import Mention from '@tiptap/extension-mention'
import { suggestionOptions } from './suggestionOption'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'

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

// Add styled component for editor wrapper
const StyledEditorContent = styled(EditorContent)(({ theme, rows, disabled }) => ({
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
        }
    }
}))

export const RichInput = ({ inputParam, value, nodes, edges, nodeId, onChange, disabled = false }) => {
    const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
    const [availableState, setAvailableState] = useState([])
    const [nodeData, setNodeData] = useState({})
    const [isNodeInsideInteration, setIsNodeInsideInteration] = useState(false)

    useEffect(() => {
        if (!disabled && nodes && edges && nodeId && inputParam) {
            const nodesForVariable = inputParam?.acceptVariable ? getAvailableNodesForVariable(nodes, edges, nodeId, inputParam.id) : []
            setAvailableNodesForVariable(nodesForVariable)

            const startAgentflowNode = nodes.find((node) => node.data.name === 'startAgentflow')
            const state = startAgentflowNode?.data?.inputs?.startState
            setAvailableState(state)

            const agentflowNode = nodes.find((node) => node.data.id === nodeId)
            setNodeData(agentflowNode?.data)

            setIsNodeInsideInteration(nodes.find((node) => node.data.id === nodeId)?.extent === 'parent')
        }
    }, [disabled, inputParam, nodes, edges, nodeId])

    const editor = useEditor(
        {
            extensions: [
                ...extensions(
                    availableNodesForVariable,
                    availableState,
                    inputParam?.acceptNodeOutputAsVariable,
                    nodes,
                    nodeData,
                    isNodeInsideInteration
                ),
                Placeholder.configure({ placeholder: inputParam?.placeholder })
            ],
            content: value,
            onUpdate: ({ editor }) => {
                onChange(editor.getHTML())
            },
            editable: !disabled
        },
        [availableNodesForVariable]
    )

    return (
        <Box sx={{ mt: 1, border: '' }}>
            <StyledEditorContent editor={editor} rows={inputParam?.rows} disabled={disabled} />
        </Box>
    )
}

RichInput.propTypes = {
    inputParam: PropTypes.object,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    nodes: PropTypes.array,
    edges: PropTypes.array,
    nodeId: PropTypes.string
}
