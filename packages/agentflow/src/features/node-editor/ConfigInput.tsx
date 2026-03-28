import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { IconSettings } from '@tabler/icons-react'

import { type AsyncInputProps, NodeInputHandler } from '@/atoms'
import { getDefaultValueForType } from '@/core/primitives'
import type { InputParam, NodeData } from '@/core/types'
import { evaluateFieldVisibility, initNode } from '@/core/utils'
import { useApiContext } from '@/infrastructure/store'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ConfigInputProps {
    data: NodeData // The parent node's data
    inputParam: InputParam // The inputParam with loadConfig: true (e.g., the "agentModel" param).
    disabled?: boolean
    arrayIndex?: number | null // For array-based configs: the index of the array item.
    parentArrayParam?: InputParam | null // For array-based configs: the parent array param definition.
    onConfigChange: (
        // Callback to persist config values to the parent node's inputValues.
        configKey: string,
        configValues: Record<string, unknown>,
        arrayContext?: { parentParamName: string; arrayIndex: number }
    ) => void
    AsyncInputComponent?: ComponentType<AsyncInputProps> // Injected async input component
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Initialize default values for a set of input params. */
function initializeDefaults(params: InputParam[]): Record<string, unknown> {
    const defaults: Record<string, unknown> = {}
    for (const p of params) {
        defaults[p.name] = getDefaultValueForType(p)
    }
    return defaults
}

/** Read the current selection value from parent data, handling array context.
 *  When data is already scoped to the array item (ArrayInput passes itemData),
 *  the parent array won't exist in data.inputValues — fall back to direct read. */
function readCurrentValue(
    data: NodeData,
    paramName: string,
    arrayIndex?: number | null,
    parentArrayParam?: InputParam | null
): string | undefined {
    if (arrayIndex != null && parentArrayParam) {
        const arr = data.inputValues?.[parentArrayParam.name]
        if (Array.isArray(arr) && arr[arrayIndex]) {
            return arr[arrayIndex][paramName] as string | undefined
        }
        // data may already be scoped to the array item (via ArrayInput's itemData)
        return data.inputValues?.[paramName] as string | undefined
    }
    return data.inputValues?.[paramName] as string | undefined
}

/** Read existing config from parent data, handling array context.
 *  Falls back to direct read when data is already item-scoped. */
function readExistingConfig(
    data: NodeData,
    paramName: string,
    arrayIndex?: number | null,
    parentArrayParam?: InputParam | null
): Record<string, unknown> | undefined {
    const configKey = `${paramName}Config`
    if (arrayIndex != null && parentArrayParam) {
        const arr = data.inputValues?.[parentArrayParam.name]
        if (Array.isArray(arr) && arr[arrayIndex]) {
            return arr[arrayIndex][configKey] as Record<string, unknown> | undefined
        }
        // data may already be scoped to the array item (via ArrayInput's itemData)
        return data.inputValues?.[configKey] as Record<string, unknown> | undefined
    }
    return data.inputValues?.[configKey] as Record<string, unknown> | undefined
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfigInput({
    data,
    inputParam,
    disabled = false,
    arrayIndex = null,
    parentArrayParam = null,
    onConfigChange,
    AsyncInputComponent
}: ConfigInputProps) {
    const theme = useTheme()
    const { nodesApi } = useApiContext()

    const [expanded, setExpanded] = useState(false)
    /** The fetched & initialized sub-node data (input definitions + label). */
    const [configNodeData, setConfigNodeData] = useState<NodeData | null>(null)

    // Refs to avoid stale closures and prevent reactive loops
    const onConfigChangeRef = useRef(onConfigChange)
    onConfigChangeRef.current = onConfigChange
    const dataRef = useRef(data)
    dataRef.current = data

    // ── Derive current selection from parent ──────────────────────────────────

    const currentSelection = readCurrentValue(data, inputParam.name, arrayIndex, parentArrayParam) || ''

    // ── Persist helper (called imperatively, not via useEffect) ───────────────

    const persistConfig = useCallback(
        (values: Record<string, unknown>) => {
            const configKey = `${inputParam.name}Config`
            const arrayCtx = parentArrayParam && arrayIndex != null ? { parentParamName: parentArrayParam.name, arrayIndex } : undefined
            onConfigChangeRef.current(configKey, values, arrayCtx)
        },
        [inputParam.name, parentArrayParam, arrayIndex]
    )

    // ── Derive config values from parent (single source of truth) ───────────

    const configInputValues = useMemo((): Record<string, unknown> => {
        if (!configNodeData) return {}
        const existing = readExistingConfig(data, inputParam.name, arrayIndex, parentArrayParam)
        if (existing && existing[inputParam.name] === currentSelection) {
            return existing
        }
        // No saved config or selection mismatch — fall back to defaults
        const paramDefs = (configNodeData.inputs ?? []) as InputParam[]
        return { ...initializeDefaults(paramDefs), [inputParam.name]: currentSelection }
    }, [configNodeData, data, inputParam.name, arrayIndex, parentArrayParam, currentSelection])

    // ── Derive visible params from definitions + current values ──────────────

    const configInputParams = useMemo((): InputParam[] => {
        if (!configNodeData) return []
        const paramDefs = (configNodeData.inputs ?? []) as InputParam[]
        return evaluateFieldVisibility(paramDefs, configInputValues)
    }, [configNodeData, configInputValues])

    // ── Fetch node definition when selection changes ─────────────────────────

    useEffect(() => {
        if (!currentSelection) {
            setConfigNodeData(null)
            return
        }

        let cancelled = false

        const load = async () => {
            try {
                const nodeDefn = await nodesApi.getNodeByName(currentSelection)
                if (cancelled) return

                // initNode with isAgentflow=false so it doesn't create agentflow output anchors
                const initialized = initNode(nodeDefn, `${currentSelection}_0`, false)
                setConfigNodeData(initialized)

                // Persist initial config to parent
                const paramDefs = (initialized.inputs ?? []) as InputParam[]
                const existing = readExistingConfig(dataRef.current, inputParam.name, arrayIndex, parentArrayParam)
                const values =
                    existing && existing[inputParam.name] === currentSelection
                        ? existing
                        : { ...initializeDefaults(paramDefs), [inputParam.name]: currentSelection }
                persistConfig(values)
            } catch {
                setConfigNodeData(null)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [currentSelection, nodesApi, inputParam.name, arrayIndex, parentArrayParam, persistConfig])

    // ── Internal change handler ───────────────────────────────────────────────

    const handleInternalChange = useCallback(
        ({ inputParam: changedParam, newValue }: { inputParam: InputParam; newValue: unknown }) => {
            persistConfig({ ...configInputValues, [changedParam.name]: newValue })
        },
        [configInputValues, persistConfig]
    )

    // ── Render ────────────────────────────────────────────────────────────────

    if (!configNodeData || configInputParams.length === 0) return null

    const configData: NodeData = {
        ...configNodeData,
        inputValues: configInputValues
    }

    return (
        <Box
            sx={{
                p: 0,
                mt: 1,
                mb: 1,
                border: 1,
                borderColor: alpha(theme.palette.grey[900], 0.25),
                borderRadius: 2
            }}
        >
            <Accordion sx={{ background: 'transparent' }} expanded={expanded} onChange={(_, isExpanded) => setExpanded(isExpanded)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: 'transparent' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <IconSettings stroke={1.5} size='1.3rem' />
                        <Typography sx={{ ml: 1 }}>{configNodeData.label} Parameters</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    {configInputParams
                        .filter((p) => p.display !== false)
                        .map((p, index) => (
                            <NodeInputHandler
                                key={index}
                                inputParam={p}
                                data={configData}
                                disabled={disabled}
                                isAdditionalParams={true}
                                onDataChange={handleInternalChange}
                                AsyncInputComponent={AsyncInputComponent}
                            />
                        ))}
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}
