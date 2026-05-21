import PropTypes from 'prop-types'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { Box } from '@mui/material'

import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import { ScriptEditor } from '@/ui-component/editor/ScriptEditor'
import { normaliseExt } from '../utils/extUtils'

// CodeEditor is the JS/JSON editor; ScriptEditor handles Python, POSIX
// shell, and plain text (fallback when the extension isn't recognised).
// We keep that contract strict — no overloading CodeEditor with extra
// grammars — so each editor stays small and focused.
const JS_FAMILY = new Set(['js', 'jsx', 'mjs', 'ts', 'tsx'])
const JSON_EXTS = new Set(['json'])
const PYTHON_EXTS = new Set(['py'])
const SHELL_EXTS = new Set(['sh', 'bash'])

const pickEditor = (extension) => {
    const ext = normaliseExt(extension)
    if (JS_FAMILY.has(ext)) return { kind: 'code', lang: 'js' }
    if (JSON_EXTS.has(ext)) return { kind: 'code', lang: 'json' }
    if (PYTHON_EXTS.has(ext)) return { kind: 'script', lang: 'py' }
    if (SHELL_EXTS.has(ext)) return { kind: 'script', lang: 'sh' }
    return { kind: 'script', lang: 'plain' }
}

const SkillCodeEditor = ({ value, extension, onChange, onBlur, disabled, placeholder }) => {
    const customization = useSelector((state) => state.customization)
    const { kind, lang } = useMemo(() => pickEditor(extension), [extension])
    const themeName = customization?.isDarkMode ? 'dark' : 'light'

    return (
        <Box
            onBlur={onBlur}
            sx={{
                display: 'flex',
                flex: 1,
                minHeight: 0,
                width: '100%',
                '& > div': { flex: 1, minHeight: 0, width: '100%' },
                '& .cm-theme, & .cm-theme-light, & .cm-theme-dark, & .cm-editor': {
                    height: '100%'
                }
            }}
        >
            {kind === 'code' ? (
                <CodeEditor
                    value={value || ''}
                    lang={lang}
                    theme={themeName}
                    placeholder={placeholder}
                    disabled={disabled}
                    height='100%'
                    onValueChange={(next) => onChange?.(next)}
                />
            ) : (
                <ScriptEditor
                    value={value || ''}
                    lang={lang}
                    theme={themeName}
                    placeholder={placeholder}
                    disabled={disabled}
                    height='100%'
                    onValueChange={(next) => onChange?.(next)}
                />
            )}
        </Box>
    )
}

SkillCodeEditor.propTypes = {
    value: PropTypes.string,
    extension: PropTypes.string,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string
}

export default SkillCodeEditor
