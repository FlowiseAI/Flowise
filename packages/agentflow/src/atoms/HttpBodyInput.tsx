import { type ComponentType, useMemo } from 'react'

import { Box } from '@mui/material'

import type { InputParam, NodeData } from '@/core/types'

import { ArrayInput, type ArrayInputProps } from './ArrayInput'
import { type AsyncInputProps, type ConfigInputComponentProps } from './NodeInputHandler'
import { RichTextEditor } from './RichTextEditor.lazy'

/** Body-type values that render a textarea (string) editor. */
const TEXT_BODY_TYPES = new Set(['json', 'raw'])

/** Body-type values that render a key-value array editor. */
const KV_BODY_TYPES = new Set(['formData', 'xWwwFormUrlencoded'])

/** Default key-value array sub-field definitions matching the HTTP node spec. */
const KV_ARRAY_FIELDS: InputParam[] = [
    { id: 'body-key', name: 'key', label: 'Key', type: 'string', default: '' } satisfies InputParam,
    { id: 'body-value', name: 'value', label: 'Value', type: 'string', default: '', acceptVariable: true } satisfies InputParam
]

export interface HttpBodyInputProps {
    /** The body InputParam definition. */
    inputParam: InputParam
    /** Current node data (must include inputValues with bodyType). */
    data: NodeData
    /** Whether editing is disabled. */
    disabled?: boolean
    /** Called when the body value changes. */
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
    /** Pre-computed item parameters for the array editor (from field visibility). */
    itemParameters?: InputParam[][]
    /** Injected async input component (for variable support in array items). */
    AsyncInputComponent?: ComponentType<AsyncInputProps>
    /** Injected config input component (for array items). */
    ConfigInputComponent?: ComponentType<ConfigInputComponentProps>
    /** Callback for config value changes. */
    onConfigChange?: ArrayInputProps['onConfigChange']
}

/**
 * Conditional body editor for the HTTP node.
 *
 * Renders different editors based on the sibling `bodyType` field value:
 * - `json` or `raw`: a RichTextEditor textarea (4 rows, with variable support)
 * - `formData` or `xWwwFormUrlencoded`: a key-value ArrayInput editor
 *
 * Returns `null` when bodyType is not set or not recognized.
 */
export function HttpBodyInput({
    inputParam,
    data,
    disabled = false,
    onDataChange,
    itemParameters,
    AsyncInputComponent,
    ConfigInputComponent,
    onConfigChange
}: HttpBodyInputProps) {
    const bodyType = data.inputValues?.bodyType as string | undefined
    const value = data.inputValues?.[inputParam.name]

    // Build an array-typed inputParam for key-value mode
    const arrayInputParam = useMemo<InputParam>(
        () => ({
            ...inputParam,
            type: 'array',
            array: inputParam.array ?? KV_ARRAY_FIELDS
        }),
        [inputParam]
    )

    if (!bodyType) return null

    const handleTextChange = (html: string) => {
        onDataChange?.({ inputParam, newValue: html })
    }

    if (TEXT_BODY_TYPES.has(bodyType)) {
        const textValue = typeof value === 'string' ? value : ''
        return (
            <Box sx={{ mt: 1 }}>
                <RichTextEditor
                    value={textValue}
                    onChange={handleTextChange}
                    placeholder={inputParam.placeholder}
                    disabled={disabled}
                    rows={inputParam.rows || 4}
                />
            </Box>
        )
    }

    if (KV_BODY_TYPES.has(bodyType)) {
        return (
            <Box sx={{ mt: 1 }}>
                <ArrayInput
                    inputParam={arrayInputParam}
                    data={data}
                    disabled={disabled}
                    onDataChange={onDataChange}
                    itemParameters={itemParameters}
                    AsyncInputComponent={AsyncInputComponent}
                    ConfigInputComponent={ConfigInputComponent}
                    onConfigChange={onConfigChange}
                />
            </Box>
        )
    }

    // Unrecognized bodyType
    return null
}
