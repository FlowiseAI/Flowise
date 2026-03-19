import { useCallback, useEffect, useRef, useState } from 'react'

import { FormControl, Popover } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ReactJson from 'flowise-react-json-view'

import type { VariableItem } from './SelectVariable'
import { SelectVariable } from './SelectVariable'

export interface JsonInputProps {
    value: string
    onChange: (json: string) => void
    disabled?: boolean
    /** Variable items for per-key injection. When provided, clicking a JSON key opens the variable picker. */
    variableItems?: VariableItem[]
}

const JSON_STYLE = { padding: 10, borderRadius: 10, marginTop: 8 }

function safeParse(str: string): object {
    try {
        return str ? JSON.parse(str) : {}
    } catch {
        return {}
    }
}

/**
 * Interactive JSON tree editor atom.
 *
 * Stores data as a JSON **string** — parses on mount, stringifies on every edit.
 * Falls back to `{}` for empty or invalid input.
 *
 * When `variableItems` is provided, clicking a JSON key opens a popover to
 * inject a variable into that specific key (matching the original Flowise behaviour).
 */
export function JsonInput({ value, onChange, disabled = false, variableItems }: JsonInputProps) {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'

    const [myValue, setMyValue] = useState<object>(() => safeParse(value))
    const myValueRef = useRef(myValue)
    myValueRef.current = myValue

    // Sync internal state when the value prop changes externally
    useEffect(() => {
        const parsed = safeParse(value)
        if (JSON.stringify(parsed) !== JSON.stringify(myValueRef.current)) {
            setMyValue(parsed)
        }
    }, [value])

    // ── Per-key variable popover state ───────────────────────────────────────
    const mouseUpKeyRef = useRef('')
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    // Counter that increments on variable injection to force ReactJson remount.
    // ReactJson doesn't re-render when `src` changes via setState — it manages
    // its own internal tree. Bumping the key forces a fresh mount with the new data.
    const [remountKey, setRemountKey] = useState(0)
    const openPopOver = Boolean(anchorEl)

    const handleClosePopOver = useCallback(() => {
        setAnchorEl(null)
    }, [])

    const setNewVal = useCallback(
        (val: string) => {
            setMyValue((prev) => {
                const updated = { ...prev, [mouseUpKeyRef.current]: val }
                onChange(JSON.stringify(updated))
                return updated
            })
            setRemountKey((k) => k + 1)
        },
        [onChange]
    )

    // ── Clipboard ────────────────────────────────────────────────────────────
    const onClipboardCopy = useCallback((e: { src: unknown }) => {
        const src = e.src
        if (Array.isArray(src) || typeof src === 'object') {
            navigator.clipboard.writeText(JSON.stringify(src, null, '  '))
        } else {
            navigator.clipboard.writeText(String(src))
        }
    }, [])

    const hasVariables = variableItems && variableItems.length > 0
    const jsonTheme = isDarkMode ? 'ocean' : 'rjv-default'

    return (
        <>
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                {disabled && (
                    <ReactJson
                        theme={jsonTheme}
                        style={JSON_STYLE}
                        src={myValue}
                        name={false}
                        quotesOnKeys={false}
                        displayDataTypes={false}
                        enableClipboard={onClipboardCopy}
                    />
                )}
                {!disabled && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                            }
                        }}
                        role='button'
                        aria-label='JSON Editor'
                        tabIndex={0}
                    >
                        <ReactJson
                            key={remountKey}
                            theme={jsonTheme}
                            style={JSON_STYLE}
                            src={myValue}
                            name={false}
                            quotesOnKeys={false}
                            displayDataTypes={false}
                            enableClipboard={onClipboardCopy}
                            onMouseUp={(event: { name: string; currentTarget: HTMLElement }) => {
                                if (hasVariables) {
                                    mouseUpKeyRef.current = event.name
                                    setAnchorEl(event.currentTarget)
                                }
                            }}
                            onEdit={(edit: { updated_src: object }) => {
                                setMyValue(edit.updated_src)
                                onChange(JSON.stringify(edit.updated_src))
                            }}
                            onAdd={() => {
                                // no-op: new keys are added visually but not persisted until user edits the value
                            }}
                            onDelete={(deleteobj: { updated_src: object }) => {
                                setMyValue(deleteobj.updated_src)
                                onChange(JSON.stringify(deleteobj.updated_src))
                            }}
                        />
                    </div>
                )}
            </FormControl>
            {hasVariables && (
                <Popover
                    open={openPopOver}
                    anchorEl={anchorEl}
                    onClose={handleClosePopOver}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{ paper: { sx: { width: 320, maxHeight: 400 } } }}
                >
                    <SelectVariable
                        items={variableItems!}
                        onSelect={(val) => {
                            setNewVal(val)
                            handleClosePopOver()
                        }}
                    />
                </Popover>
            )}
        </>
    )
}
