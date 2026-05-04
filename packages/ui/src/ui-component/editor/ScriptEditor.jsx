import PropTypes from 'prop-types'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { EditorView } from '@codemirror/view'
import { useTheme } from '@mui/material/styles'

// Companion to CodeEditor for non-JS/JSON script-style files. Currently
// supports Python and POSIX shell; falls back to plain text with no grammar
// when an unknown `lang` is passed so the component is safe to use as a
// generic monospaced editor.
const SHELL_LANGS = new Set(['sh', 'bash', 'shell'])

const buildLanguageExtension = (lang) => {
    if (lang === 'py' || lang === 'python') return python()
    if (SHELL_LANGS.has(lang)) return StreamLanguage.define(shell)
    return null
}

export const ScriptEditor = ({
    value,
    height,
    theme,
    lang,
    placeholder,
    disabled = false,
    autoFocus = false,
    basicSetup = {},
    onValueChange
}) => {
    const colorTheme = useTheme()

    const customStyle = EditorView.baseTheme({
        '&': {
            color: '#191b1f',
            padding: '10px'
        },
        '.cm-placeholder': {
            color: 'rgba(120, 120, 120, 0.5)'
        },
        '.cm-content': {
            fontFamily: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`,
            fontSize: '0.85rem',
            letterSpacing: '0em',
            fontWeight: 400,
            lineHeight: '1.5em',
            color: colorTheme.darkTextPrimary
        }
    })

    const languageExtension = buildLanguageExtension(lang)
    const extensions = [EditorView.lineWrapping, customStyle]
    if (languageExtension) extensions.unshift(languageExtension)

    return (
        <CodeMirror
            placeholder={placeholder}
            value={value}
            height={height ?? 'calc(100vh - 220px)'}
            theme={theme === 'dark' ? vscodeDark : 'none'}
            extensions={extensions}
            onChange={onValueChange}
            readOnly={disabled}
            editable={!disabled}
            // eslint-disable-next-line
            autoFocus={autoFocus}
            basicSetup={basicSetup}
        />
    )
}

ScriptEditor.propTypes = {
    value: PropTypes.string,
    height: PropTypes.string,
    theme: PropTypes.string,
    lang: PropTypes.string,
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
    autoFocus: PropTypes.bool,
    basicSetup: PropTypes.object,
    onValueChange: PropTypes.func
}
