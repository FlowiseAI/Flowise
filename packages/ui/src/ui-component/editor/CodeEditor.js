import PropTypes from 'prop-types'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { sublime } from '@uiw/codemirror-theme-sublime'
import { EditorView } from '@codemirror/view'

export const CodeEditor = ({ value, height, theme, lang, placeholder, disabled = false, basicSetup = {}, onValueChange }) => {
    const customStyle = EditorView.baseTheme({
        '&': {
            color: '#191b1f',
            padding: '10px'
        },
        '.cm-placeholder': {
            color: 'rgba(120, 120, 120, 0.5)'
        }
    })

    return (
        <CodeMirror
            placeholder={placeholder}
            value={value}
            height={height ?? 'calc(100vh - 220px)'}
            theme={theme === 'dark' ? (lang === 'js' ? vscodeDark : sublime) : 'none'}
            extensions={
                lang === 'js'
                    ? [javascript({ jsx: true }), EditorView.lineWrapping, customStyle]
                    : [json(), EditorView.lineWrapping, customStyle]
            }
            onChange={onValueChange}
            readOnly={disabled}
            editable={!disabled}
            basicSetup={basicSetup}
        />
    )
}

CodeEditor.propTypes = {
    value: PropTypes.string,
    height: PropTypes.string,
    theme: PropTypes.string,
    lang: PropTypes.string,
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
    basicSetup: PropTypes.object,
    onValueChange: PropTypes.func
}
