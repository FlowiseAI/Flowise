import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField
} from '@mui/material'

import channelsApi from '@/api/channels'

const PROVIDERS = [
    { label: 'Telegram', value: 'telegram' },
    { label: 'WhatsApp', value: 'whatsapp' },
    { label: 'Instagram', value: 'instagram' }
]

const defaultState = {
    name: '',
    provider: 'telegram',
    credentialId: '',
    enabled: true,
    config: {
        disableWebPagePreview: false,
        phoneNumberId: '',
        instagramUserId: ''
    }
}

const parseConfig = (configString) => {
    if (!configString || typeof configString !== 'string') return {}
    try {
        const parsed = JSON.parse(configString)
        return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
        return {}
    }
}

const getErrorMessage = (error, fallback) => {
    const responseData = error?.response?.data
    if (typeof responseData === 'string') return responseData
    if (typeof responseData?.message === 'string') return responseData.message
    return fallback
}

const getCredentialTypeByProvider = (provider) => {
    if (provider === 'telegram') return 'channelTelegram'
    if (provider === 'whatsapp') return 'channelWhatsApp'
    if (provider === 'instagram') return 'channelInstagram'
    return 'channelTelegram'
}

const buildPayload = (form) => {
    const payload = {
        name: form.name.trim(),
        provider: form.provider,
        credentialId: form.credentialId,
        enabled: form.enabled,
        config: {}
    }

    if (form.provider === 'telegram') {
        payload.config.disableWebPagePreview = !!form.config.disableWebPagePreview
    }
    if (form.provider === 'whatsapp') {
        payload.config.phoneNumberId = form.config.phoneNumberId.trim()
    }
    if (form.provider === 'instagram') {
        payload.config.instagramUserId = form.config.instagramUserId.trim()
    }

    return payload
}

const ChannelAccountDialog = ({ open, mode, account, credentials, onClose, onSaved, onError }) => {
    const [form, setForm] = useState(defaultState)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) {
            setForm(defaultState)
            setIsSubmitting(false)
            return
        }

        if (mode === 'edit' && account) {
            const parsedConfig = parseConfig(account.config)
            setForm({
                name: account.name || '',
                provider: account.provider || 'telegram',
                credentialId: account.credentialId || '',
                enabled: account.enabled !== false,
                config: {
                    disableWebPagePreview: !!parsedConfig.disableWebPagePreview,
                    phoneNumberId: typeof parsedConfig.phoneNumberId === 'string' ? parsedConfig.phoneNumberId : '',
                    instagramUserId: typeof parsedConfig.instagramUserId === 'string' ? parsedConfig.instagramUserId : ''
                }
            })
        } else {
            setForm(defaultState)
        }
    }, [account, mode, open])

    const filteredCredentials = useMemo(() => {
        const expectedType = getCredentialTypeByProvider(form.provider)
        return credentials.filter((credential) => credential.credentialName === expectedType)
    }, [credentials, form.provider])

    useEffect(() => {
        if (!open) return
        const credentialExists = filteredCredentials.some((credential) => credential.id === form.credentialId)
        if (!credentialExists) {
            setForm((prev) => ({ ...prev, credentialId: filteredCredentials[0]?.id || '' }))
        }
    }, [filteredCredentials, form.credentialId, open])

    const canSave = useMemo(() => {
        if (!form.name.trim()) return false
        if (!form.provider.trim()) return false
        if (!form.credentialId.trim()) return false
        return true
    }, [form])

    const handleSave = async () => {
        if (!canSave || isSubmitting) return
        setIsSubmitting(true)
        try {
            const payload = buildPayload(form)
            if (mode === 'edit' && account?.id) {
                await channelsApi.updateChannelAccount(account.id, payload)
            } else {
                await channelsApi.createChannelAccount(payload)
            }
            onSaved()
        } catch (error) {
            onError(getErrorMessage(error, 'Failed to save channel account'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>{mode === 'edit' ? 'Edit Channel Account' : 'Add Channel Account'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label='Account Name'
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        fullWidth
                        required
                    />
                    <TextField
                        select
                        label='Provider'
                        value={form.provider}
                        onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))}
                        fullWidth
                        required
                    >
                        {PROVIDERS.map((provider) => (
                            <MenuItem key={provider.value} value={provider.value}>
                                {provider.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        label='Credential'
                        value={form.credentialId}
                        onChange={(event) => setForm((prev) => ({ ...prev, credentialId: event.target.value }))}
                        fullWidth
                        required
                        helperText={
                            filteredCredentials.length
                                ? undefined
                                : `No ${getCredentialTypeByProvider(form.provider)} credentials found. Create one in Credentials first.`
                        }
                    >
                        {filteredCredentials.map((credential) => (
                            <MenuItem key={credential.id} value={credential.id}>
                                {credential.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    {form.provider === 'telegram' && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!form.config.disableWebPagePreview}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            config: { ...prev.config, disableWebPagePreview: event.target.checked }
                                        }))
                                    }
                                />
                            }
                            label='Disable Web Page Preview'
                        />
                    )}
                    {form.provider === 'whatsapp' && (
                        <TextField
                            label='Phone Number ID (Optional Override)'
                            value={form.config.phoneNumberId}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, config: { ...prev.config, phoneNumberId: event.target.value } }))
                            }
                            fullWidth
                            helperText='Optional. Defaults to phoneNumberId in the selected WhatsApp credential.'
                        />
                    )}
                    {form.provider === 'instagram' && (
                        <TextField
                            label='Instagram User ID (Optional Override)'
                            value={form.config.instagramUserId}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, config: { ...prev.config, instagramUserId: event.target.value } }))
                            }
                            fullWidth
                            helperText='Optional. Defaults to instagramUserId in the selected Instagram credential.'
                        />
                    )}

                    <FormControlLabel
                        control={
                            <Switch
                                checked={form.enabled}
                                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                            />
                        }
                        label='Enabled'
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button variant='contained' onClick={handleSave} disabled={!canSave || isSubmitting}>
                    {mode === 'edit' ? 'Save' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

ChannelAccountDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    mode: PropTypes.oneOf(['create', 'edit']).isRequired,
    account: PropTypes.object,
    credentials: PropTypes.arrayOf(PropTypes.object),
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired
}

ChannelAccountDialog.defaultProps = {
    account: null,
    credentials: []
}

export default ChannelAccountDialog
