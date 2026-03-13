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
import { baseURL } from '@/store/constant'

const defaultState = {
    chatflowId: '',
    channelAccountId: '',
    webhookPath: '',
    enabled: true
}

const getErrorMessage = (error, fallback) => {
    const responseData = error?.response?.data
    if (typeof responseData === 'string') return responseData
    if (typeof responseData?.message === 'string') return responseData.message
    return fallback
}

const getWebhookUrl = (provider, webhookPath) => {
    if (!provider || !webhookPath?.trim()) return ''
    return `${baseURL}/api/v1/channel-webhooks/${provider}/${webhookPath.trim()}`
}

const formatFlowType = (type) => {
    if (type === 'CHATFLOW') return 'Chatflow'
    if (type === 'AGENTFLOW') return 'Agentflow'
    if (type === 'MULTIAGENT') return 'Multi Agent'
    return 'Flow'
}

const ChannelBindingDialog = ({ open, mode, binding, accounts, chatflows, initialChatflowId, onClose, onSaved, onNotify }) => {
    const [form, setForm] = useState(defaultState)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) {
            setForm(defaultState)
            setIsSubmitting(false)
            return
        }

        if (mode === 'edit' && binding) {
            setForm({
                chatflowId: binding.chatflowId || '',
                channelAccountId: binding.channelAccountId || '',
                webhookPath: binding.webhookPath || '',
                enabled: binding.enabled !== false
            })
        } else {
            const hasInitialChatflow = initialChatflowId && chatflows.some((chatflow) => chatflow.id === initialChatflowId)
            setForm({
                ...defaultState,
                chatflowId: hasInitialChatflow ? initialChatflowId : chatflows[0]?.id || '',
                channelAccountId: accounts[0]?.id || ''
            })
        }
    }, [accounts, binding, chatflows, initialChatflowId, mode, open])

    const selectedAccount = useMemo(
        () => accounts.find((account) => account.id === form.channelAccountId),
        [accounts, form.channelAccountId]
    )

    const webhookUrl = useMemo(
        () => getWebhookUrl(selectedAccount?.provider, form.webhookPath),
        [selectedAccount?.provider, form.webhookPath]
    )

    const canSave = useMemo(() => {
        if (!form.chatflowId.trim()) return false
        if (!form.channelAccountId.trim()) return false
        return true
    }, [form.channelAccountId, form.chatflowId])

    const handleSave = async () => {
        if (!canSave || isSubmitting) return
        setIsSubmitting(true)

        try {
            const payload = {
                chatflowId: form.chatflowId,
                channelAccountId: form.channelAccountId,
                enabled: form.enabled
            }

            if (form.webhookPath.trim()) {
                payload.webhookPath = form.webhookPath.trim()
            }

            if (mode === 'edit' && binding?.id) {
                await channelsApi.updateChannelBinding(binding.id, payload)
            } else {
                await channelsApi.createChannelBinding(payload)
            }
            onSaved()
        } catch (error) {
            onNotify(getErrorMessage(error, 'Failed to save channel binding'), 'error', true)
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyWebhookUrl = async () => {
        if (!webhookUrl) return
        try {
            await navigator.clipboard.writeText(webhookUrl)
            onNotify('Webhook URL copied', 'success')
        } catch {
            onNotify('Failed to copy webhook URL', 'error', true)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>{mode === 'edit' ? 'Edit Flow Binding' : 'Add Flow Binding'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        select
                        label='Flow'
                        value={form.chatflowId}
                        onChange={(event) => setForm((prev) => ({ ...prev, chatflowId: event.target.value }))}
                        fullWidth
                        required
                        helperText={chatflows.length ? undefined : 'No chatflows or agentflows found'}
                    >
                        {chatflows.map((chatflow) => (
                            <MenuItem key={chatflow.id} value={chatflow.id}>
                                {chatflow.name} ({formatFlowType(chatflow.type)})
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        label='Channel Account'
                        value={form.channelAccountId}
                        onChange={(event) => setForm((prev) => ({ ...prev, channelAccountId: event.target.value }))}
                        fullWidth
                        required
                        helperText={accounts.length ? undefined : 'No channel accounts found'}
                    >
                        {accounts.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                                {account.name} ({account.provider})
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label='Webhook Path'
                        placeholder='Leave empty to auto-generate'
                        value={form.webhookPath}
                        onChange={(event) => setForm((prev) => ({ ...prev, webhookPath: event.target.value }))}
                        fullWidth
                    />
                    <TextField
                        label='Webhook URL'
                        value={
                            webhookUrl ||
                            (selectedAccount?.provider
                                ? `${baseURL}/api/v1/channel-webhooks/${selectedAccount.provider}/<auto-generated>`
                                : '')
                        }
                        fullWidth
                        InputProps={{ readOnly: true }}
                    />
                    <Button onClick={copyWebhookUrl} disabled={!webhookUrl} variant='outlined'>
                        Copy Webhook URL
                    </Button>
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

ChannelBindingDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    mode: PropTypes.oneOf(['create', 'edit']).isRequired,
    binding: PropTypes.object,
    accounts: PropTypes.arrayOf(PropTypes.object),
    chatflows: PropTypes.arrayOf(PropTypes.object),
    initialChatflowId: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
    onNotify: PropTypes.func.isRequired
}

ChannelBindingDialog.defaultProps = {
    binding: null,
    accounts: [],
    chatflows: [],
    initialChatflowId: ''
}

export default ChannelBindingDialog
