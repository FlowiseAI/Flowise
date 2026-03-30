import { useCallback, useEffect, useState } from 'react'

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    OutlinedInput,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconAlertTriangle, IconArrowsMaximize } from '@tabler/icons-react'
import DOMPurify from 'dompurify'
import parser from 'html-react-parser'

import { CredentialIcon, CredentialTypeSelector } from '@/atoms/CredentialTypeSelector'
import { Dropdown } from '@/atoms/Dropdown'
import { JsonInput } from '@/atoms/JsonInput'
import { SwitchInput } from '@/atoms/SwitchInput'
import { TooltipWithParser } from '@/atoms/TooltipWithParser'
import { getDefaultValueForType } from '@/core/primitives'
import type { ComponentCredentialSchema, CredentialSchemaInput } from '@/core/types'
import { useApiContext } from '@/infrastructure/store/ApiContext'

export interface CreateCredentialDialogProps {
    open: boolean
    credentialNames: string[]
    onClose: () => void
    onCreated: (credentialId: string) => void
    /** When set, the dialog opens in edit mode for the given credential ID. */
    editCredentialId?: string
}

/**
 * Dialog for creating or editing a credential from within the node editor.
 * Fetches the credential schema from the backend and renders a dynamic form.
 */
export function CreateCredentialDialog({ open, credentialNames, onClose, onCreated, editCredentialId }: CreateCredentialDialogProps) {
    const { credentialsApi, apiBaseUrl } = useApiContext()
    const theme = useTheme()
    const isEditMode = !!editCredentialId

    const [schemas, setSchemas] = useState<ComponentCredentialSchema[]>([])
    const [selectedSchema, setSelectedSchema] = useState<ComponentCredentialSchema | null>(null)
    const [credentialName, setCredentialName] = useState('')
    const [formValues, setFormValues] = useState<Record<string, unknown>>({})
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Stable string key for credentialNames — a new array reference on every render
    // (e.g. inline credentialNames={['openAIApi']}) would otherwise restart the effect.
    // Using the joined string as the dependency ensures value-based comparison.
    const credentialNamesKey = credentialNames.join('\0')

    const selectSchema = useCallback((schema: ComponentCredentialSchema) => {
        setSelectedSchema(schema)
        setCredentialName('')
        // Initialize default values for each input
        const defaults: Record<string, unknown> = {}
        for (const input of schema.inputs ?? []) {
            if (input.hidden) continue
            defaults[input.name] = getDefaultValueForType(input)
        }
        setFormValues(defaults)
    }, [])

    // Fetch credential schema(s) when dialog opens, and load existing data in edit mode
    useEffect(() => {
        if (!open) return

        let cancelled = false

        async function fetchSchemas() {
            setLoading(true)
            setError(null)
            setSchemas([])
            setSelectedSchema(null)
            setCredentialName('')
            setFormValues({})

            // Reconstruct names from the stable key to avoid depending on the array reference
            const names = credentialNamesKey.split('\0')

            try {
                if (names.length === 1) {
                    const schema = await credentialsApi.getComponentCredentialSchema(names[0])
                    if (!cancelled) {
                        setSchemas([schema])
                        selectSchema(schema)
                    }
                } else {
                    const results = await Promise.all(names.map((name) => credentialsApi.getComponentCredentialSchema(name)))
                    if (!cancelled) {
                        setSchemas(results)
                    }
                }

                // In edit mode, fetch existing credential and populate the form
                if (editCredentialId && !cancelled) {
                    const existing = await credentialsApi.getCredentialById(editCredentialId)
                    if (!cancelled) {
                        setCredentialName(existing.name)
                        if (existing.plainDataObj) {
                            setFormValues(existing.plainDataObj)
                        }
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load credential schema')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchSchemas()

        return () => {
            cancelled = true
        }
    }, [open, credentialNamesKey, credentialsApi, selectSchema, editCredentialId])

    const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
        setFormValues((prev) => ({ ...prev, [fieldName]: value }))
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!selectedSchema || !credentialName.trim()) return

        setSubmitting(true)
        setError(null)

        try {
            const plainDataObj: Record<string, unknown> = {}
            for (const key of Object.keys(formValues)) {
                const input = selectedSchema.inputs?.find((i) => i.name === key)
                const val = formValues[key]
                if (input?.type === 'number' && typeof val === 'string' && val) {
                    plainDataObj[key] = Number(val)
                } else {
                    plainDataObj[key] = val
                }
            }

            const body = {
                name: credentialName.trim(),
                credentialName: selectedSchema.name,
                plainDataObj
            }
            const result = isEditMode
                ? await credentialsApi.updateCredential(editCredentialId!, body)
                : await credentialsApi.createCredential(body)
            onCreated(result.id)
        } catch (err) {
            setError(err instanceof Error ? err.message : isEditMode ? 'Failed to update credential' : 'Failed to create credential')
        } finally {
            setSubmitting(false)
        }
    }, [selectedSchema, credentialName, formValues, credentialsApi, onCreated, isEditMode, editCredentialId])

    const handleClose = useCallback(() => {
        if (!submitting) onClose()
    }, [submitting, onClose])

    // Check if all required fields have values
    const hasEmptyRequiredFields = selectedSchema?.inputs
        ?.filter((input) => !input.hidden && !input.optional)
        .some((input) => {
            const val = formValues[input.name]
            return val === undefined || val === null || val === ''
        })

    // Schema selection step (multiple credential types)
    const showSelection = !loading && !selectedSchema && schemas.length > 1

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth={showSelection ? 'md' : 'sm'}>
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }}>
                {selectedSchema ? (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <div style={{ marginRight: 10 }}>
                            <CredentialIcon name={selectedSchema.name} apiBaseUrl={apiBaseUrl} />
                        </div>
                        {selectedSchema.label}
                    </div>
                ) : (
                    'Add New Credential'
                )}
            </DialogTitle>
            <DialogContent
                sx={showSelection ? { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', px: 3, pb: 3 } : undefined}
            >
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {showSelection && <CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={selectSchema} />}

                {selectedSchema && (
                    <>
                        {selectedSchema.description && (
                            <Box sx={{ pl: 2, pr: 2 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        borderRadius: 10,
                                        background: theme.palette.warningBanner.background,
                                        padding: 10,
                                        marginTop: 10,
                                        marginBottom: 10
                                    }}
                                >
                                    <span style={{ color: theme.palette.warningBanner.text }}>
                                        {parser(DOMPurify.sanitize(selectedSchema.description))}
                                    </span>
                                </div>
                            </Box>
                        )}

                        <Box sx={{ p: 2 }}>
                            <Typography variant='overline'>
                                Credential Name
                                <span style={{ color: theme.palette.error.main }}>&nbsp;*</span>
                            </Typography>
                            <OutlinedInput
                                fullWidth
                                type='string'
                                placeholder={selectedSchema.label}
                                value={credentialName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredentialName(e.target.value)}
                                autoFocus
                            />
                        </Box>

                        {(selectedSchema.inputs ?? [])
                            .filter((input) => !input.hidden)
                            .map((input) => (
                                <CredentialField
                                    key={input.name}
                                    input={input}
                                    value={formValues[input.name]}
                                    onChange={(value) => handleFieldChange(input.name, value)}
                                />
                            ))}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                {selectedSchema && (
                    <Button
                        variant='contained'
                        onClick={handleSubmit}
                        disabled={!credentialName.trim() || hasEmptyRequiredFields || submitting}
                    >
                        {submitting ? (isEditMode ? 'Saving...' : 'Adding...') : isEditMode ? 'Save' : 'Add'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Dynamic form field renderer
// ---------------------------------------------------------------------------

interface CredentialFieldProps {
    input: CredentialSchemaInput
    value: unknown
    onChange: (value: unknown) => void
    disabled?: boolean
}

function CredentialField({ input, value, onChange, disabled = false }: CredentialFieldProps) {
    const theme = useTheme()
    const [expandOpen, setExpandOpen] = useState(false)
    const showExpand = input.type === 'string' && !!input.rows

    return (
        <Box sx={{ p: 2 }}>
            {/* Label row — always rendered */}
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <Typography>
                    {input.label}
                    {!input.optional && <span style={{ color: theme.palette.error.main }}>&nbsp;*</span>}
                    {input.description && <TooltipWithParser title={input.description} />}
                </Typography>
                <div style={{ flexGrow: 1 }} />
                {showExpand && (
                    <IconButton
                        size='small'
                        sx={{ height: 25, width: 25 }}
                        title='Expand'
                        color='primary'
                        onClick={() => setExpandOpen(true)}
                    >
                        <IconArrowsMaximize />
                    </IconButton>
                )}
            </div>

            {/* Warning banner — rendered when present */}
            {input.warning && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        borderRadius: 10,
                        background: theme.palette.warningBanner.background,
                        padding: 10,
                        marginTop: 10,
                        marginBottom: 10
                    }}
                >
                    <IconAlertTriangle size={36} color={theme.palette.warning.main} />
                    <span style={{ color: theme.palette.warningBanner.text, marginLeft: 10 }}>{input.warning}</span>
                </div>
            )}

            {/* Input — conditional on type */}
            {input.type === 'boolean' && (
                <SwitchInput disabled={disabled} value={value as boolean | undefined} onChange={(checked) => onChange(checked)} />
            )}
            {(input.type === 'string' || input.type === 'password' || input.type === 'number') && (
                <OutlinedInput
                    disabled={disabled}
                    fullWidth
                    type={input.type === 'password' ? 'password' : input.type === 'number' ? 'number' : 'text'}
                    multiline={!!input.rows}
                    rows={input.rows}
                    placeholder={input.placeholder}
                    value={(value as string) ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                />
            )}
            {input.type === 'json' && (
                <JsonInput disabled={disabled} value={(value as string) ?? '{}'} onChange={(json) => onChange(json)} />
            )}
            {input.type === 'options' && input.options && (
                <Dropdown
                    disabled={disabled}
                    name={input.name}
                    options={input.options}
                    onSelect={(newValue) => onChange(newValue)}
                    value={(value as string) ?? 'choose an option'}
                />
            )}

            {/* Expand dialog for multiline string fields */}
            {showExpand && (
                <Dialog open={expandOpen} onClose={() => setExpandOpen(false)} fullWidth maxWidth='md'>
                    <DialogTitle>{input.label}</DialogTitle>
                    <DialogContent>
                        <OutlinedInput
                            disabled={disabled}
                            fullWidth
                            multiline
                            minRows={12}
                            placeholder={input.placeholder}
                            value={(value as string) ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setExpandOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    )
}
