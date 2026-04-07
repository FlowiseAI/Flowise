import { useEffect, useMemo, useRef } from 'react'

import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { mergeAttributes } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import { createLowlight } from 'lowlight'

import type { JsonNode } from '@/atoms/utils/'
import { escapeXmlTags, getEditorMarkdown, isHtmlContent, restoreTextMentions, unescapeXmlTags } from '@/atoms/utils/'
import { CustomMention } from '@/core/primitives/customMention'
import { tokens } from '@/core/theme/tokens'

import { createSuggestionConfig } from './suggestionConfig'
import type { SuggestionItem } from './SuggestionDropdown'

export type { SuggestionItem }

const lowlight = createLowlight()
lowlight.register('javascript', javascript)
lowlight.register('json', json)
lowlight.register('python', python)
lowlight.register('typescript', typescript)

export interface VariableInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    /** Number of visible text rows. When set, renders as a multiline editor. */
    rows?: number
    /** Available variables for autocomplete when typing `{{` */
    suggestionItems?: SuggestionItem[]
    /** Auto-focus the editor on mount */
    autoFocus?: boolean
    /** Called with the live editor instance once it is ready (and null on unmount). Used by ExpandTextDialog to call getMarkdown() on mode switch. */
    onEditorReady?: (editor: Editor | null) => void
}

/* ── Styled wrapper matching RichTextEditor styling ── */

const StyledEditorContent = styled(EditorContent, {
    shouldForwardProp: (prop) => !['rows', 'disabled'].includes(prop as string)
})<{ rows?: number; disabled?: boolean }>(({ theme, rows, disabled }) => {
    const mode = theme.palette.mode === 'dark' ? 'dark' : 'light'
    const sh = tokens.colors.syntaxHighlight

    return {
        '& .ProseMirror': {
            padding: '10px 14px',
            height: rows ? `${rows * tokens.typography.rowHeightRem}rem` : `${tokens.typography.singleLineHeightRem}rem`,
            overflowY: rows ? 'auto' : 'hidden',
            overflowX: rows ? 'auto' : 'hidden',
            lineHeight: rows ? `${tokens.typography.rowHeightRem}em` : `${tokens.typography.singleLineLineHeightEm}em`,
            fontWeight: 500,
            color: disabled ? theme.palette.action.disabled : theme.palette.grey[900],
            border: `1px solid ${theme.palette.grey[900]}25`,
            borderRadius: '10px',
            backgroundColor:
                (theme.palette as { textBackground?: { main: string } }).textBackground?.main ?? theme.palette.background.paper,
            boxSizing: 'border-box',
            whiteSpace: rows ? 'pre-wrap' : 'nowrap',

            '&:hover': {
                borderColor: disabled ? `${theme.palette.grey[900]}25` : theme.palette.text.primary,
                cursor: disabled ? 'default' : 'text'
            },
            '&:focus': {
                borderColor: disabled ? `${theme.palette.grey[900]}25` : theme.palette.primary.main,
                outline: 'none'
            },

            // Placeholder
            '& p.is-editor-empty:first-of-type::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: disabled ? theme.palette.action.disabled : theme.palette.text.primary,
                opacity: disabled ? 0.6 : 0.4,
                pointerEvents: 'none',
                height: 0
            },

            // Mention (variable) chip styling — matches original UI green style
            '& .mention': {
                backgroundColor: mode === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.08)',
                borderRadius: '4px',
                padding: '1px 4px',
                fontWeight: 600,
                color: mode === 'dark' ? '#81c784' : '#2e7d32',
                whiteSpace: 'nowrap'
            },

            // Block element spacing
            '& p, & h1, & h2, & h3, & h4, & h5, & h6, & ul, & ol, & pre, & blockquote': {
                margin: '0.75em 0'
            },
            '& > :first-of-type': { marginTop: '0.25em' },
            '& > :last-of-type': { marginBottom: '0.25em' },

            // List indentation
            '& ul, & ol': { paddingLeft: '1.5em' },
            '& li': { marginBottom: '0.25em' },
            '& li > p': { margin: '0.25em 0' },

            // Code block styling
            '& pre': {
                backgroundColor: sh.background[mode],
                color: sh.text[mode],
                borderRadius: '8px',
                padding: '0.75em 1em',
                overflow: 'auto',
                '& code': { fontFamily: 'monospace', fontSize: '0.9em' }
            },

            // Syntax highlight colors
            '& .hljs-comment, & .hljs-quote': { color: sh.comment[mode] },
            '& .hljs-variable, & .hljs-template-variable, & .hljs-attr': { color: sh.variable[mode] },
            '& .hljs-number, & .hljs-literal': { color: sh.number[mode] },
            '& .hljs-string, & .hljs-regexp': { color: sh.string[mode] },
            '& .hljs-title, & .hljs-section, & .hljs-selector-id': { color: sh.title[mode] },
            '& .hljs-keyword, & .hljs-selector-tag, & .hljs-built_in': { color: sh.keyword[mode] },
            '& .hljs-operator, & .hljs-symbol': { color: sh.operator[mode] },
            '& .hljs-punctuation': { color: sh.punctuation[mode] }
        }
    }
})

function loadContent(ed: Editor, content: string, hasMentions: boolean): void {
    if (isHtmlContent(content)) {
        ed.commands.setContent(content, { emitUpdate: false, contentType: 'html' })
    } else {
        ed.commands.setContent(escapeXmlTags(content), { emitUpdate: false, contentType: 'markdown' })
        ed.commands.setContent(restoreTextMentions(ed.getJSON() as JsonNode, hasMentions)[0], { emitUpdate: false })
    }
}

/**
 * A TipTap-based text input with `{{ variable }}` mention support.
 *
 * When the user types `{{`, a suggestion dropdown appears anchored to the cursor
 * with available variables. Selecting a variable inserts it as a styled mention chip
 * that renders as `{{variableName}}` in the markdown output.
 *
 * Content is stored and emitted as markdown. The CustomMention extension's
 * markdownTokenizer/parseMarkdown/renderMarkdown hooks ensure `{{variable}}` syntax
 * survives markdown round-trips intact. Legacy HTML values are accepted for backward
 * compatibility — TipTap renders them correctly and subsequent edits emit markdown.
 *
 * This is the agentflow equivalent of the UI package's RichInput component.
 */
export function VariableInput({
    value,
    onChange,
    placeholder,
    disabled = false,
    rows,
    suggestionItems,
    autoFocus = false,
    onEditorReady
}: VariableInputProps) {
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    // Track the last value we emitted (or loaded) to avoid re-setting content
    // when the parent echoes our own onChange value back as the new prop.
    const lastEmittedRef = useRef<string>(value || '')

    // Capture initial value for the mount effect below so we can depend only on
    // `editor` without suppressing the exhaustive-deps rule.
    const initialValueRef = useRef(value)

    const useMarkdown = !!rows

    const suggestionConfig = useMemo(
        () => (suggestionItems?.length ? createSuggestionConfig(suggestionItems) : undefined),
        [suggestionItems]
    )
    const suggestionConfigRef = useRef(suggestionConfig)
    useEffect(() => {
        suggestionConfigRef.current = suggestionConfig
    }, [suggestionConfig])

    const extensions = useMemo(
        () => [
            Markdown,
            StarterKit.configure({
                codeBlock: false,
                ...(!useMarkdown && { link: false })
            }),
            CodeBlockLowlight.configure({ lowlight, enableTabIndentation: true, tabSize: 2 }),
            ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
            ...(suggestionConfig
                ? [
                      CustomMention.configure({
                          HTMLAttributes: { class: 'mention' },
                          renderHTML({ options, node }) {
                              return [
                                  'span',
                                  mergeAttributes(this.HTMLAttributes ?? {}, options.HTMLAttributes),
                                  `${options.suggestion?.char ?? '{{'}${node.attrs.label ?? node.attrs.id}}}`
                              ]
                          },
                          suggestion: suggestionConfig,
                          deleteTriggerWithBackspace: true
                      })
                  ]
                : [])
        ],
        [placeholder, suggestionConfig, useMarkdown]
    )

    const editor = useEditor({
        extensions,
        content: '',
        editable: !disabled,
        autofocus: autoFocus ? 'end' : false,
        onUpdate: ({ editor: ed }) => {
            const emitted = unescapeXmlTags(getEditorMarkdown(ed))
            lastEmittedRef.current = emitted
            onChangeRef.current(emitted)
        }
    })

    // Load initial content once the editor is ready, detecting legacy HTML vs markdown.
    // Reads from a ref so only `editor` needs to be in the dep array.
    useEffect(() => {
        if (!editor || !initialValueRef.current) return
        loadContent(editor, initialValueRef.current, !!suggestionConfigRef.current)
        lastEmittedRef.current = initialValueRef.current
    }, [editor])

    // Sync genuine external value changes (e.g. parent resets the field programmatically).
    useEffect(() => {
        if (editor && value !== lastEmittedRef.current) {
            loadContent(editor, value, !!suggestionConfigRef.current)
            lastEmittedRef.current = value
        }
    }, [editor, value])

    // Notify parent when the editor instance is ready (used by ExpandTextDialog to flush
    // the current editor state to markdown when switching to Source mode).
    useEffect(() => {
        onEditorReady?.(editor)
        return () => onEditorReady?.(null)
    }, [editor, onEditorReady])

    // Sync editable state
    useEffect(() => {
        if (editor) editor.setEditable(!disabled)
    }, [editor, disabled])

    return (
        <Box data-testid='variable-input' sx={{ mt: 1 }}>
            <StyledEditorContent editor={editor} rows={rows} disabled={disabled} />
        </Box>
    )
}
