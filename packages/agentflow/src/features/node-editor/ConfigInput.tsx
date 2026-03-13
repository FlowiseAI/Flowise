import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconSettings } from '@tabler/icons-react'

import { type AsyncInputProps, NodeInputHandler } from '@/atoms'
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
        defaults[p.name] = p.default ?? ''
    }
    return defaults
}

/** Read the current selection value from parent data, handling array context. */
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
        return undefined
    }
    return data.inputValues?.[paramName] as string | undefined
}

/** Read existing config from parent data, handling array context. */
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
        return undefined
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
    /** Evaluated input params with display flags. */
    const [configInputParams, setConfigInputParams] = useState<InputParam[]>([])
    /** The current config values (what gets persisted to parent). */
    const [configInputValues, setConfigInputValues] = useState<Record<string, unknown>>({})

    // Refs to avoid stale closures and prevent reactive loops
    const onConfigChangeRef = useRef(onConfigChange)
    onConfigChangeRef.current = onConfigChange
    const loadedSelectionRef = useRef<string | null>(null)

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

    // ── Load node definition when selection changes ───────────────────────────

    useEffect(() => {
        if (!currentSelection) {
            if (loadedSelectionRef.current !== null) {
                loadedSelectionRef.current = null
                setConfigNodeData(null)
                setConfigInputParams([])
                setConfigInputValues({})
            }
            return
        }

        // Skip if already loaded for this selection
        if (loadedSelectionRef.current === currentSelection) return

        let cancelled = false

        const load = async () => {
            try {
                const nodeDefn = await nodesApi.getNodeByName(currentSelection)
                if (cancelled) return

                // initNode with isAgentflow=false so it doesn't create agentflow output anchors
                const initialized = initNode(nodeDefn, `${currentSelection}_0`, false)
                const paramDefs = (initialized.inputs ?? []) as InputParam[]

                // Check for existing config in parent
                const existingConfig = readExistingConfig(data, inputParam.name, arrayIndex, parentArrayParam)

                let mergedValues: Record<string, unknown>
                if (existingConfig && existingConfig[inputParam.name] === currentSelection) {
                    // Existing config matches current selection — reuse it
                    mergedValues = { ...existingConfig, [inputParam.name]: currentSelection }
                } else {
                    // No config or model changed — use defaults
                    mergedValues = { ...initializeDefaults(paramDefs), [inputParam.name]: currentSelection }
                }

                const visibleParams = evaluateFieldVisibility(paramDefs, mergedValues)

                loadedSelectionRef.current = currentSelection
                setConfigNodeData(initialized)
                setConfigInputParams(visibleParams)
                setConfigInputValues(mergedValues)

                // Persist initial config to parent
                persistConfig(mergedValues)
            } catch {
                // API error — clear config
                loadedSelectionRef.current = null
                setConfigNodeData(null)
                setConfigInputParams([])
                setConfigInputValues({})
            }
        }

        load()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSelection, nodesApi])

    // ── Internal change handler ───────────────────────────────────────────────

    const handleInternalChange = useCallback(
        ({ inputParam: changedParam, newValue }: { inputParam: InputParam; newValue: unknown }) => {
            setConfigInputValues((prev) => {
                const updated = { ...prev, [changedParam.name]: newValue }

                // Re-evaluate visibility
                const paramDefs = (configNodeData?.inputs ?? []) as InputParam[]
                const visibleParams = evaluateFieldVisibility(paramDefs, updated)
                setConfigInputParams(visibleParams)

                // Persist to parent
                persistConfig(updated)

                return updated
            })
        },
        [configNodeData, persistConfig]
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
                borderColor: theme.palette.grey[900] + 25,
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
