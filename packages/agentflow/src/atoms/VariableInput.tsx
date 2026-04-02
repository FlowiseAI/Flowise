import { useEffect, useMemo, useRef } from 'react'

import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { mergeAttributes } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import { createLowlight } from 'lowlight'

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
    /** Number of visible text rows. When set, renders as a multiline editor and uses markdown serialization. */
    rows?: number
    /** Available variables for autocomplete when typing `{{` */
    suggestionItems?: SuggestionItem[]
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

/**
 * Detects whether a string is TipTap-generated HTML (starts with a known block element).
 * Plain-text prompts stored before the rich-text editor was introduced do NOT match this
 * pattern, even when they contain XML-like custom tags such as `<question>`.
 */
const isTiptapHtml = (content: string): boolean => {
    if (!content) return false
    return /<(?:p|h[1-6]|ul|ol|pre|blockquote|hr)\b/i.test(content.trim())
}

/**
 * Converts plain text (which may contain XML-like tags such as `<question>`) to safe
 * TipTap HTML by escaping angle brackets so ProseMirror treats them as literal text
 * rather than HTML elements. Each newline becomes a separate `<p>` block.
 *
 * The server-side `resolveVariables` utility in buildAgentflow.ts runs Turndown on HTML
 * content before variable substitution, which correctly decodes `&lt;`/`&gt;` back to
 * `<`/`>`, so XML-structured prompts reach the LLM unchanged.
 */
const plainTextToTiptapHtml = (text: string): string => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return escaped
        .split('\n')
        .map((line) => `<p>${line}</p>`)
        .join('')
}

/** Normalises a stored value for safe consumption by TipTap's `setContent`. */
const toTiptapContent = (value: string): string => {
    if (!value) return ''
    if (isTiptapHtml(value)) return value
    return plainTextToTiptapHtml(value)
}

/**
 * A TipTap-based text input with `{{ variable }}` mention support.
 *
 * When the user types `{{`, a suggestion dropdown appears anchored to the cursor
 * with available variables. Selecting a variable inserts it as a styled mention chip
 * that renders as `{{variableName}}` in the output text.
 *
 * Serialization matches the UI's RichInput behavior:
 * This is the agentflow equivalent of the UI package's RichInput component.
 */
export function VariableInput({ value, onChange, placeholder, disabled = false, rows, suggestionItems }: VariableInputProps) {
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const suggestionConfig = useMemo(
        () => (suggestionItems?.length ? createSuggestionConfig(suggestionItems) : undefined),
        [suggestionItems]
    )

    const extensions = useMemo(
        () => [
            StarterKit.configure({
                codeBlock: false
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
        [placeholder, suggestionConfig]
    )

    const editor = useEditor({
        extensions,
        content: toTiptapContent(value || ''),
        editable: !disabled,
        onUpdate: ({ editor: ed }) => {
            // Always use HTML serialization. The @tiptap/markdown v3 getMarkdown()
            // returns empty strings (known issue with the MarkdownManager in v3.20.4).
            // HTML round-trips correctly because the Mention extension's parseHTML
            // matches on span[data-type="mention"] with data-id/data-label attributes.
            onChangeRef.current(ed.getHTML())
        }
    })

    // Sync external value changes into the editor (e.g. when parent state updates).
    // Use toTiptapContent so that plain-text values with XML-like tags are safely
    // escaped before ProseMirror parses them — otherwise unknown tags are stripped.
    useEffect(() => {
        if (editor && toTiptapContent(value) !== editor.getHTML()) {
            editor.commands.setContent(toTiptapContent(value), { emitUpdate: false })
        }
    }, [editor, value])

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
