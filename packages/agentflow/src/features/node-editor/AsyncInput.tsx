import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { Box, CircularProgress, IconButton, TextField, Typography } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { IconEdit, IconRefresh } from '@tabler/icons-react'

import type { AsyncInputProps } from '@/atoms'
import { Dropdown } from '@/atoms'
import type { FlowNode, NodeOption } from '@/core/types'
import { getDefinedStateKeys, getUpstreamNodes } from '@/core/utils'
import { useAsyncOptions } from '@/infrastructure/api/hooks'
import { useAgentflowContext } from '@/infrastructure/store'

import { CreateCredentialDialog } from './CreateCredentialDialog'

const CREATE_NEW_SENTINEL = '-create-'

/**
 * Build the params object for useAsyncOptions.
 * Only includes inputValues when the loadMethod actually needs them (e.g. listToolInputArgs).
 * Including them unconditionally causes every keystroke in sibling text fields to change the
 * serialised paramsKey, triggering unnecessary refetches for all async dropdowns.
 */
function buildAsyncParams(
    loadMethod: string | undefined,
    nodeName: string | undefined,
    inputValues: Record<string, unknown> | undefined,
    stateKeys?: string[]
): Record<string, unknown> | undefined {
    const needsInputs = loadMethod === 'listToolInputArgs' || loadMethod === 'listActions' || loadMethod === 'listTables'
    const needsStateKeys = loadMethod === 'listRuntimeStateKeys'
    if (!nodeName && !(needsInputs && inputValues) && !needsStateKeys) return undefined
    return {
        ...(nodeName ? { nodeName } : {}),
        ...(needsInputs && inputValues ? { inputs: inputValues } : {}),
        ...(needsStateKeys && stateKeys ? { stateKeys } : {})
    }
}

/**
 * Returns all ancestor nodes for the given node ID as dropdown options.
 * Used directly by AsyncOptionsDropdown when loadMethod === 'listPreviousNodes',
 * bypassing useAsyncOptions entirely — no server call needed.
 */
function useFlowAncestorNodeOptions(nodeId?: string): NodeOption[] {
    const { state } = useAgentflowContext()
    if (!nodeId) return []
    return getUpstreamNodes(nodeId, state.nodes as FlowNode[], state.edges, /* includeStart */ true).map((n) => ({
        label: n.data.label,
        name: `${n.id}-${n.data.label}`,
        description: n.id
    }))
}

/**
 * Extract state keys from all nodes except the given node.
 * Excludes the current node to avoid a circular reference where a node's own
 * agentUpdateState feeds keys back into its own dropdown options.
 */
function useFlowStateKeys(excludeNodeName?: string): string[] {
    const { state } = useAgentflowContext()
    const nodes = excludeNodeName ? state.nodes.filter((n) => n.data?.name !== excludeNodeName) : state.nodes
    return getDefinedStateKeys(nodes as FlowNode[])
}

/** Wraps the three-step async option fetching setup into a single hook. */
function useAsyncOptionData(
    inputParam: AsyncInputProps['inputParam'],
    nodeName: string | undefined,
    inputValues: Record<string, unknown> | undefined
) {
    const stateKeys = useFlowStateKeys(nodeName)
    const params = buildAsyncParams(inputParam.loadMethod, nodeName, inputValues, stateKeys)
    return useAsyncOptions({
        loadMethod: inputParam.loadMethod,
        credentialNames: inputParam.credentialNames,
        params
    })
}

/** Error state with a retry button. Shared between single- and multi-select dropdowns. */
function AsyncFetchError({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='caption' color='error' sx={{ flexGrow: 1 }}>
                {error}
            </Typography>
            <IconButton size='small' onClick={onRetry} title='Retry' aria-label='retry'>
                <IconRefresh size={16} />
            </IconButton>
        </Box>
    )
}

/** Renders the image + label + description block for a single option. */
function OptionContent({ option }: { option: NodeOption }) {
    return (
        <>
            {option.imageSrc && (
                <Box
                    component='img'
                    src={option.imageSrc}
                    alt={option.label}
                    sx={{ width: 30, height: 30, padding: '1px', borderRadius: '50%', flexShrink: 0 }}
                />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant='h5'>{option.label}</Typography>
                {option.description && <Typography variant='caption'>{option.description}</Typography>}
            </Box>
        </>
    )
}

/** Loading spinner end adornment. Shared between single- and multi-select inputs. */
function LoadingEndAdornment({ loading, original }: { loading: boolean; original: React.ReactNode }) {
    return (
        <Fragment>
            {loading ? <CircularProgress color='inherit' size={20} /> : null}
            {original}
        </Fragment>
    )
}

/** Dropdown for listPreviousNodes — reads ancestor nodes from flow state, no server call. */
function PreviousNodesDropdown({ value, disabled, onChange, nodeId }: Pick<AsyncInputProps, 'value' | 'disabled' | 'onChange' | 'nodeId'>) {
    const options = useFlowAncestorNodeOptions(nodeId)
    const stringValue = typeof value === 'string' ? value : ''

    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    })

    // Clear stored value if the selected node no longer exists in the flow.
    // onChange is accessed via ref so an unstable parent callback can't retrigger this effect.
    useEffect(() => {
        if (stringValue && !options.some((o) => o.name === stringValue)) {
            onChangeRef.current('')
        }
    }, [stringValue, options])

    return <Dropdown value={stringValue} options={options} onSelect={onChange} disabled={disabled} />
}

function AsyncOptionsInput({ inputParam, value, disabled, onChange, nodeName, nodeId, inputValues }: AsyncInputProps) {
    const isCredential = !!inputParam.credentialNames?.length
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)
    // Holds the credential ID that was just created/edited. Passed directly to
    // the remounted AsyncOptionsDropdown so it doesn't depend on the parent
    // state cascade (which may not have flushed yet when inside ConfigInput).
    const [pendingValue, setPendingValue] = useState<string | null>(null)

    const effectiveValue = pendingValue ?? value
    const selectedCredentialId = isCredential && typeof effectiveValue === 'string' && effectiveValue ? effectiveValue : null

    const handleCreated = useCallback(
        (newCredentialId: string) => {
            setCreateDialogOpen(false)
            onChange(newCredentialId)
            setPendingValue(newCredentialId)
            setReloadKey((k) => k + 1)
        },
        [onChange]
    )

    const handleEdited = useCallback(
        (credentialId: string) => {
            setEditDialogOpen(false)
            onChange(credentialId)
            setPendingValue(credentialId)
            setReloadKey((k) => k + 1)
        },
        [onChange]
    )

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 1 }}>
                {inputParam.loadMethod === 'listPreviousNodes' ? (
                    <PreviousNodesDropdown
                        value={pendingValue ?? value}
                        disabled={disabled}
                        onChange={(v) => {
                            setPendingValue(null)
                            onChange(v)
                        }}
                        nodeId={nodeId}
                    />
                ) : (
                    <AsyncOptionsDropdown
                        key={reloadKey}
                        inputParam={inputParam}
                        value={pendingValue ?? value}
                        disabled={disabled}
                        onChange={(v) => {
                            setPendingValue(null)
                            onChange(v)
                        }}
                        nodeName={nodeName}
                        inputValues={inputValues}
                        isCredential={isCredential}
                        onCreateNew={() => setCreateDialogOpen(true)}
                    />
                )}
                {selectedCredentialId && (
                    <IconButton title='Edit Credential' color='primary' size='small' onClick={() => setEditDialogOpen(true)}>
                        <IconEdit size={18} />
                    </IconButton>
                )}
                {inputParam.refresh && (
                    <IconButton
                        title='Refresh'
                        color='primary'
                        size='small'
                        onClick={() => setReloadKey((k) => k + 1)}
                        aria-label='refresh'
                    >
                        <IconRefresh size={18} />
                    </IconButton>
                )}
            </Box>
            {isCredential && (
                <CreateCredentialDialog
                    open={createDialogOpen}
                    credentialNames={inputParam.credentialNames!}
                    onClose={() => setCreateDialogOpen(false)}
                    onCreated={handleCreated}
                />
            )}
            {isCredential && selectedCredentialId && (
                <CreateCredentialDialog
                    open={editDialogOpen}
                    credentialNames={inputParam.credentialNames!}
                    onClose={() => setEditDialogOpen(false)}
                    onCreated={handleEdited}
                    editCredentialId={selectedCredentialId}
                />
            )}
        </>
    )
}

/** Inner component that owns the useAsyncOptions hook. Remounted via key to force a fresh fetch. */
function AsyncOptionsDropdown({
    inputParam,
    value,
    disabled,
    onChange,
    nodeName,
    inputValues,
    isCredential,
    onCreateNew
}: AsyncInputProps & { isCredential: boolean; onCreateNew: () => void }) {
    const { options, loading, error, refetch } = useAsyncOptionData(inputParam, nodeName, inputValues)

    // Append "- Create New -" sentinel for credential dropdowns
    const displayOptions = isCredential ? [...options, { label: '- Create New -', name: CREATE_NEW_SENTINEL }] : options
    const matchedValue = displayOptions.find((o) => o.name === value) ?? null

    // Controlled input text — synced to the matched option label so it clears
    // when a previously selected key is removed from the Start node.
    const [inputText, setInputText] = useState(matchedValue?.label ?? '')
    useEffect(() => {
        setInputText(matchedValue?.label ?? '')
    }, [matchedValue?.label])

    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    })

    // Clear the stored value if it no longer matches any available option.
    // onChange is accessed via ref so an unstable parent callback can't retrigger this effect.
    useEffect(() => {
        if (!loading && value && typeof value === 'string' && !options.some((o) => o.name === value)) {
            onChangeRef.current('')
        }
    }, [loading, value, options])

    if (error) {
        return <AsyncFetchError error={error} onRetry={refetch} />
    }

    return (
        <Autocomplete<NodeOption>
            size='small'
            disabled={disabled}
            options={displayOptions}
            value={matchedValue}
            inputValue={inputText}
            onInputChange={(_e, newValue, reason) => {
                // Allow typing to filter; reset clears text
                if (reason === 'input' || reason === 'clear') {
                    setInputText(newValue)
                }
            }}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.name === v.name}
            onChange={(_e, selection) => {
                if (selection?.name === CREATE_NEW_SENTINEL) {
                    onCreateNew()
                    return
                }
                onChange(selection?.name ?? '')
            }}
            loading={loading}
            noOptionsText={loading ? 'Loading…' : 'No options available'}
            sx={{ flexGrow: 1 }}
            renderOption={(props, option) => (
                <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.name === CREATE_NEW_SENTINEL ? (
                        <Typography variant='h5' color='primary'>
                            {option.label}
                        </Typography>
                    ) : (
                        <OptionContent option={option} />
                    )}
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <>
                                {matchedValue?.imageSrc && (
                                    <Box
                                        component='img'
                                        src={matchedValue.imageSrc}
                                        alt={matchedValue.label}
                                        sx={{ width: 32, height: 32, borderRadius: '50%', mr: 0.5, flexShrink: 0 }}
                                    />
                                )}
                                {params.InputProps.startAdornment}
                            </>
                        ),
                        endAdornment: <LoadingEndAdornment loading={loading} original={params.InputProps.endAdornment} />
                    }}
                />
            )}
        />
    )
}

function AsyncMultiOptionsInput({ inputParam, value, disabled, onChange, nodeName, inputValues }: AsyncInputProps) {
    const [reloadKey, setReloadKey] = useState(0)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 1 }}>
            <AsyncMultiOptionsDropdown
                key={reloadKey}
                inputParam={inputParam}
                value={value}
                disabled={disabled}
                onChange={onChange}
                nodeName={nodeName}
                inputValues={inputValues}
            />
            {inputParam.refresh && (
                <IconButton title='Refresh' color='primary' size='small' onClick={() => setReloadKey((k) => k + 1)} aria-label='refresh'>
                    <IconRefresh size={18} />
                </IconButton>
            )}
        </Box>
    )
}

/** Inner multi-select component. Remounted via key to force a fresh fetch. */
function AsyncMultiOptionsDropdown({ inputParam, value, disabled, onChange, nodeName, inputValues }: AsyncInputProps) {
    const { options, loading, error, refetch } = useAsyncOptionData(inputParam, nodeName, inputValues)

    if (error) {
        return <AsyncFetchError error={error} onRetry={refetch} />
    }

    // Stored as JSON-serialized array of names, e.g. '["option1","option2"]'
    let selectedNames: string[] = []
    if (typeof value === 'string' && value.startsWith('[')) {
        try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
                selectedNames = parsed
            }
        } catch {
            selectedNames = []
        }
    } else if (Array.isArray(value)) {
        selectedNames = value.filter((item): item is string => typeof item === 'string')
    }

    const selectedOptions = options.filter((o) => selectedNames.includes(o.name))

    return (
        <Autocomplete<NodeOption, true>
            multiple
            filterSelectedOptions
            size='small'
            disabled={disabled}
            options={options}
            value={selectedOptions}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.name === v.name}
            onChange={(_e, selection) => {
                const names = selection.map((s) => s.name)
                onChange(names.length > 0 ? JSON.stringify(names) : '')
            }}
            loading={loading}
            noOptionsText={loading ? 'Loading…' : 'No options available'}
            sx={{ flexGrow: 1 }}
            renderOption={(props, option) => (
                <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <OptionContent option={option} />
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: <LoadingEndAdornment loading={loading} original={params.InputProps.endAdornment} />
                    }}
                />
            )}
        />
    )
}

/** Dispatches to single- or multi-select based on inputParam.type. */
export function AsyncInput(props: AsyncInputProps) {
    if (props.inputParam.type === 'asyncMultiOptions') {
        return <AsyncMultiOptionsInput {...props} />
    }
    return <AsyncOptionsInput {...props} />
}
