import { useEffect, useMemo, useRef } from 'react'

import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// Individual language imports instead of lowlight/common to tree-shake highlight.js
// (~400 KB savings by shipping 4 languages instead of 37)
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import { createLowlight } from 'lowlight'

import { tokens } from '@/core/theme/tokens'

const lowlight = createLowlight()
lowlight.register('javascript', javascript)
lowlight.register('json', json)
lowlight.register('python', python)
lowlight.register('typescript', typescript)

export interface RichTextEditorProps {
    /** HTML content */
    value: string
    /** Called with the updated HTML string on every edit */
    onChange: (html: string) => void
    placeholder?: string
    disabled?: boolean
    /** Number of visible text rows (controls editor height) */
    rows?: number
    /** Auto-focus when the editor mounts */
    autoFocus?: boolean
}

/* ── TipTap extensions (no mention/variable support — that belongs in features/) ── */

// Use .extend() to set enableTabIndentation/tabSize because the v2 types from
// @tiptap/extension-code-block (peer dep) don't include these v3-only options.
// See: https://github.com/ueberdosis/tiptap/issues/7613
const CustomCodeBlock = CodeBlockLowlight.extend({
    addOptions() {
        return { ...this.parent?.(), lowlight, enableTabIndentation: true, tabSize: 2 }
    }
})

const buildExtensions = (placeholder?: string) => [
    StarterKit.configure({ codeBlock: false }),
    CustomCodeBlock,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : [])
]

/* ── Styled wrapper ── */

const StyledEditorContent = styled(EditorContent, {
    shouldForwardProp: (prop) => prop !== 'rows'
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

            // Block element spacing (ProseMirror resets default margins)
            '& p, & h1, & h2, & h3, & h4, & h5, & h6, & ul, & ol, & pre, & blockquote': {
                margin: '0.75em 0'
            },
            // Only collapse margins on the very first/last child of the editor
            '& > :first-of-type': { marginTop: '0.25em' },
            '& > :last-of-type': { marginBottom: '0.25em' },

            // List indentation & item spacing
            '& ul, & ol': {
                paddingLeft: '1.5em'
            },
            '& li': {
                marginBottom: '0.25em'
            },
            '& li > p': {
                margin: '0.25em 0'
            },

            // Placeholder styling
            '& p.is-editor-empty:first-of-type::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: disabled ? theme.palette.action.disabled : theme.palette.text.primary,
                opacity: disabled ? 0.6 : 0.4,
                pointerEvents: 'none',
                height: 0
            },

            // Code block styling
            '& pre': {
                backgroundColor: sh.background[mode],
                color: sh.text[mode],
                borderRadius: '8px',
                padding: '0.75em 1em',
                overflow: 'auto',
                '& code': {
                    fontFamily: 'monospace',
                    fontSize: '0.9em'
                }
            },

            // Syntax highlight colors (lowlight adds .hljs-* classes)
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
 * A TipTap-based rich text editor atom with code block syntax highlighting.
 *
 * This is a "dumb" UI primitive — it receives all data via props and owns no
 * business logic. Variable/mention support lives in the features layer.
 */
export function RichTextEditor({ value, onChange, placeholder, disabled = false, rows, autoFocus = false }: RichTextEditorProps) {
    // Keep a ref to the latest onChange so the TipTap onUpdate callback never goes stale
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const extensions = useMemo(() => buildExtensions(placeholder), [placeholder])

    const editor = useEditor({
        extensions,
        content: value,
        editable: !disabled,
        autofocus: autoFocus ? 'end' : false,
        onUpdate: ({ editor: ed }: { editor: { getHTML: () => string } }) => {
            onChangeRef.current(ed.getHTML())
        }
    })

    // Sync external value changes into the editor (e.g. when parent state updates)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, false)
        }
    }, [editor, value])

    // Sync editable state when disabled prop changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled)
        }
    }, [editor, disabled])

    return (
        <Box data-testid='rich-text-editor'>
            <StyledEditorContent editor={editor} rows={rows} disabled={disabled} />
        </Box>
    )
}
