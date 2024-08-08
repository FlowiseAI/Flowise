import Editor from '@monaco-editor/react'
import { MutableRefObject, useEffect, useRef } from 'react'

//
// So... typings weren't working when I implemented Monaco, and we had to ship,
// so these placeholder types were put in place so tests passed... please fix
// these before going production. imo Monaco provides typings, they just didn't
// work when we tried them (VSCode wouldn't recognize them, tslint complained.)
//

export type MonacoEditorA = MutableRefObject<any>
export type MonacoEditorB = MutableRefObject<any>
export type MonacoTextModal = any

export type MonacoOnInitializePane = (monacoEditorRef: MonacoEditorA, editorRef: MonacoEditorB, model: MonacoTextModal) => void

export type HandlebarsEditorProps = {
    code: string
    setCode?: any //Dispatch<SetStateAction<string>>;
    editorOptions?: any
    contextFields?: any
    readOnly?: boolean
    onInitializePane?: MonacoOnInitializePane
}

const defaultEditorOptions = {
    minimap: {
        enabled: false
    },
    wordWrap: 'on',
    scrollbar: {
        horizontalScrollbarSize: 4,
        verticalScrollbarSize: 4
    },
    padding: '16px',
    scrollBeyondLastLine: false,
    autoIndent: 'full',
    contextmenu: true,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 24,
    hideCursorInOverviewRuler: true,
    matchBrackets: 'always',
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: true,
    cursorStyle: 'line',
    automaticLayout: true
}

const HandlebarsEditor = (props: HandlebarsEditorProps): JSX.Element => {
    const { code, setCode, editorOptions = {}, contextFields, onInitializePane, readOnly = true } = props
    const options = { ...defaultEditorOptions, ...editorOptions }
    const monacoEditorRef = useRef<any | null>(null)
    const editorRef = useRef<any | null>(null)

    // monaco takes years to mount, so this may fire repeatedly without refs set
    useEffect(() => {
        if (monacoEditorRef?.current) {
            // again, monaco takes years to mount and load, so this may load as null
            const model: any = monacoEditorRef.current.getModels()

            if (model?.length > 0 && onInitializePane) {
                // finally, do editor's document initialization here
                onInitializePane(monacoEditorRef, editorRef, model)
            }
        }
    })

    return (
        <Editor
            height='50vh'
            language='handlebars'
            onChange={(value, _event) => {
                setCode ? setCode(value ?? '') : null
            }}
            onMount={(editor, monaco) => {
                const suggestionsProvider: any = {
                    provideCompletionItems: (model: any, position: any) => {
                        const suggestions = []

                        // Iterate over the context object and its properties
                        for (const variable in contextFields) {
                            if (typeof contextFields[variable] === 'object') {
                                // If the property is an object, iterate over its properties
                                for (const subVariable in contextFields[variable] as Record<string, unknown>) {
                                    suggestions.push({
                                        label: `${variable}.${subVariable}`,
                                        kind: monaco.languages.CompletionItemKind.Variable,
                                        insertText: `${variable}.${subVariable}`
                                    })
                                }
                            } else {
                                suggestions.push({
                                    label: variable,
                                    kind: monaco.languages.CompletionItemKind.Variable,
                                    insertText: variable
                                })
                            }
                        }

                        return { suggestions }
                    }
                }
                monaco.languages.registerCompletionItemProvider('handlebars', suggestionsProvider)
                monacoEditorRef.current = monaco.editor
                editorRef.current = editor
            }}
            options={{ ...options, readOnly }}
            theme='vs-dark'
            value={code}
            className='handlebars-editor'
        />
    )
}

export default HandlebarsEditor
