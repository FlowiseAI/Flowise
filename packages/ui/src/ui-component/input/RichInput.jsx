import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { styled } from '@mui/material/styles'
import { Box } from '@mui/material'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { suggestionOptions } from './suggestionOption'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'
import { CustomMention } from '@/utils/customMention'

const lowlight = createLowlight(common)

// Detect if content is legacy HTML (from old getHTML() storage) vs markdown
const isHtmlContent = (content) => {
    if (!content || typeof content !== 'string') return false
    return /<(?:p|div|span|h[1-6]|ul|ol|li|br|code|pre|blockquote|table|strong|em)\b/i.test(content)
}

// define your extension array
const extensions = (
    availableNodesForVariable,
    availableState,
    acceptNodeOutputAsVariable,
    nodes,
    nodeData,
    isNodeInsideInteration,
    useMarkdown
) => [
    Markdown,
    StarterKit.configure({
        codeBlock: false,
        ...(!useMarkdown && { link: false })
    }),
    CustomMention.configure({
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

export const RichInput = ({ inputParam, value, nodes, edges, nodeId, onChange, disabled = false }) => {
    const useMarkdown = !!inputParam?.rows
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode
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
                    isNodeInsideInteration,
                    useMarkdown
                ),
                Placeholder.configure({ placeholder: inputParam?.placeholder })
            ],
            content: '',
            onUpdate: ({ editor }) => {
                if (useMarkdown) {
                    try {
                        onChange(editor.getMarkdown())
                    } catch {
                        onChange(editor.getHTML())
                    }
                } else {
                    onChange(editor.getHTML())
                }
            },
            editable: !disabled
        },
        [availableNodesForVariable]
    )

    // Load initial content after editor is ready, detecting HTML vs markdown
    useEffect(() => {
        if (editor && value) {
            if (!useMarkdown || isHtmlContent(value)) {
                editor.commands.setContent(value)
            } else {
                editor.commands.setContent(value, { contentType: 'markdown' })
            }
        }
    }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Box sx={{ mt: 1, border: '' }}>
            <StyledEditorContent editor={editor} rows={inputParam?.rows} disabled={disabled} isDarkMode={isDarkMode} />
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
