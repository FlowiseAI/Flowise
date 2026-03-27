import { Fragment, useCallback, useState } from 'react'

import { Box, CircularProgress, IconButton, TextField, Typography } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { IconEdit, IconRefresh } from '@tabler/icons-react'

import type { AsyncInputProps } from '@/atoms'
import type { NodeOption } from '@/core/types'
import { useAsyncOptions } from '@/infrastructure/api/hooks'

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
    inputValues: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
    const needsInputs = loadMethod === 'listToolInputArgs'
    if (!nodeName && !(needsInputs && inputValues)) return undefined
    return { ...(nodeName ? { nodeName } : {}), ...(needsInputs && inputValues ? { inputs: inputValues } : {}) }
}

function AsyncOptionsInput({ inputParam, value, disabled, onChange, nodeName, inputValues }: AsyncInputProps) {
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
                {selectedCredentialId && (
                    <IconButton title='Edit Credential' color='primary' size='small' onClick={() => setEditDialogOpen(true)}>
                        <IconEdit size={18} />
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
    const params = buildAsyncParams(inputParam.loadMethod, nodeName, inputValues)
    const { options, loading, error, refetch } = useAsyncOptions({
        loadMethod: inputParam.loadMethod,
        credentialNames: inputParam.credentialNames,
        params
    })

    if (error) {
        return (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='caption' color='error' sx={{ flexGrow: 1 }}>
                    {error}
                </Typography>
                <IconButton size='small' onClick={refetch} title='Retry' aria-label='retry'>
                    <IconRefresh size={16} />
                </IconButton>
            </Box>
        )
    }

    // Append "- Create New -" sentinel for credential dropdowns
    const displayOptions = isCredential ? [...options, { label: '- Create New -', name: CREATE_NEW_SENTINEL }] : options

    const matchedValue = displayOptions.find((o) => o.name === value) ?? null

    return (
        <Autocomplete<NodeOption>
            size='small'
            disabled={disabled}
            options={displayOptions}
            value={matchedValue}
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
                        endAdornment: (
                            <Fragment>
                                {loading ? <CircularProgress color='inherit' size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </Fragment>
                        )
                    }}
                />
            )}
        />
    )
}

function AsyncMultiOptionsInput({ inputParam, value, disabled, onChange, nodeName, inputValues }: AsyncInputProps) {
    const params = buildAsyncParams(inputParam.loadMethod, nodeName, inputValues)
    const { options, loading, error, refetch } = useAsyncOptions({
        loadMethod: inputParam.loadMethod,
        credentialNames: inputParam.credentialNames,
        params
    })

    if (error) {
        return (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='caption' color='error' sx={{ flexGrow: 1 }}>
                    {error}
                </Typography>
                <IconButton size='small' onClick={refetch} title='Retry' aria-label='retry'>
                    <IconRefresh size={16} />
                </IconButton>
            </Box>
        )
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
            sx={{ mt: 1 }}
            renderOption={(props, option) => (
                <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <Fragment>
                                {loading ? <CircularProgress color='inherit' size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </Fragment>
                        )
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
