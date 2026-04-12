import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material'
import { IconLinkPlus, IconTrash, IconPlus, IconX } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import channelsApi from '@/api/channels'
import credentialsApi from '@/api/credentials'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ChannelAccountDialog from '@/views/channels/ChannelAccountDialog'

const formatProviderLabel = (provider) => {
    if (provider === 'whatsapp') return 'WhatsApp'
    if (provider === 'instagram') return 'Instagram'
    if (provider === 'telegram') return 'Telegram'
    return provider
}

const getErrorMessage = (error, fallback) => {
    const responseData = error?.response?.data
    if (typeof responseData === 'string') return responseData
    if (typeof responseData?.message === 'string') return responseData.message
    return fallback
}

const ChannelBindings = ({ dialogProps }) => {
    const dispatch = useDispatch()
    useNotifier()
    const { confirm } = useConfirm()

    const chatflowId = dialogProps?.chatflow?.id || ''

    const getBindingsApi = useApi(channelsApi.getChannelBindings)
    const getAccountsApi = useApi(channelsApi.getChannelAccounts)
    const getCredentialsApi = useApi(credentialsApi.getAllCredentials)

    const [bindings, setBindings] = useState([])
    const [accounts, setAccounts] = useState([])
    const [credentials, setCredentials] = useState([])
    const [selectedAccountId, setSelectedAccountId] = useState('')
    const [accountDialogOpen, setAccountDialogOpen] = useState(false)

    const notify = useCallback(
        (message, variant = 'success', persist = false) => {
            dispatch(
                enqueueSnackbarAction({
                    message,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant,
                        persist,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => dispatch(closeSnackbarAction(key))}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            )
        },
        [dispatch]
    )

    const refresh = () => {
        if (!chatflowId) return
        getBindingsApi.request({ chatflowId })
        getAccountsApi.request()
        getCredentialsApi.request()
    }

    useEffect(() => {
        refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatflowId])

    useEffect(() => {
        if (getBindingsApi.data) setBindings(getBindingsApi.data)
    }, [getBindingsApi.data])

    useEffect(() => {
        if (getAccountsApi.data) setAccounts(getAccountsApi.data)
    }, [getAccountsApi.data])

    useEffect(() => {
        if (getCredentialsApi.data) setCredentials(getCredentialsApi.data)
    }, [getCredentialsApi.data])

    useEffect(() => {
        if (getBindingsApi.error?.response?.status && getBindingsApi.error.response.status !== 403) {
            notify(getErrorMessage(getBindingsApi.error, 'Failed to load channel bindings'), 'error', true)
        }
    }, [getBindingsApi.error, notify])

    useEffect(() => {
        if (getAccountsApi.error?.response?.status && getAccountsApi.error.response.status !== 403) {
            notify(getErrorMessage(getAccountsApi.error, 'Failed to load channel accounts'), 'error', true)
        }
    }, [getAccountsApi.error, notify])

    const accountMap = useMemo(() => {
        const map = new Map()
        accounts.forEach((account) => map.set(account.id, account))
        return map
    }, [accounts])

    const attachedAccountIds = useMemo(() => new Set(bindings.map((binding) => binding.channelAccountId)), [bindings])

    const attachableAccounts = useMemo(
        () => accounts.filter((account) => account.enabled !== false && !attachedAccountIds.has(account.id)),
        [accounts, attachedAccountIds]
    )

    useEffect(() => {
        const selectedStillValid = attachableAccounts.some((account) => account.id === selectedAccountId)
        if (!selectedStillValid) {
            setSelectedAccountId(attachableAccounts[0]?.id || '')
        }
    }, [attachableAccounts, selectedAccountId])

    const handleAttach = async () => {
        if (!selectedAccountId || !chatflowId) return
        try {
            await channelsApi.createChannelBinding({
                chatflowId,
                channelAccountId: selectedAccountId,
                enabled: true
            })
            notify('Channel account attached')
            refresh()
        } catch (error) {
            notify(getErrorMessage(error, 'Failed to attach channel account'), 'error', true)
        }
    }

    const handleDetach = async (binding) => {
        const account = accountMap.get(binding.channelAccountId)
        const isConfirmed = await confirm({
            title: 'Detach Channel',
            description: `Detach ${account?.name || 'channel account'} from this flow?`,
            confirmButtonName: 'Detach',
            cancelButtonName: 'Cancel'
        })
        if (!isConfirmed) return

        try {
            await channelsApi.deleteChannelBinding(binding.id)
            notify('Channel account detached')
            refresh()
        } catch (error) {
            notify(getErrorMessage(error, 'Failed to detach channel account'), 'error', true)
        }
    }

    if (!chatflowId) {
        return <Typography variant='body2'>Save the flow first to manage channel bindings.</Typography>
    }

    return (
        <Stack spacing={2}>
            <Typography variant='body2' color='text.secondary'>
                Attach existing channel accounts or create new ones for this flow. Duplicate account-flow bindings are not allowed.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <FormControl sx={{ minWidth: 260 }} size='small'>
                    <InputLabel id='channel-account-select-label'>Attach Existing Account</InputLabel>
                    <Select
                        labelId='channel-account-select-label'
                        value={selectedAccountId}
                        label='Attach Existing Account'
                        onChange={(event) => setSelectedAccountId(event.target.value)}
                    >
                        {attachableAccounts.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                                {account.name} ({formatProviderLabel(account.provider)})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant='contained'
                    startIcon={<IconLinkPlus size={16} />}
                    disabled={!selectedAccountId || attachableAccounts.length === 0}
                    onClick={handleAttach}
                >
                    Attach
                </Button>
                <Button variant='outlined' startIcon={<IconPlus size={16} />} onClick={() => setAccountDialogOpen(true)}>
                    New Account
                </Button>
            </Stack>

            {bindings.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                    No channel accounts attached yet.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {bindings.map((binding) => {
                        const account = accountMap.get(binding.channelAccountId)
                        return (
                            <Box
                                key={binding.id}
                                sx={{
                                    border: 1,
                                    borderColor: (theme) => theme.palette.grey[900] + 25,
                                    borderRadius: 1.5,
                                    p: 1.25
                                }}
                            >
                                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={1}>
                                    <Stack direction='row' spacing={1} alignItems='center' useFlexGap sx={{ flexWrap: 'wrap' }}>
                                        <Typography variant='subtitle2'>{account?.name || binding.channelAccountId}</Typography>
                                        <Chip size='small' label={formatProviderLabel(binding.provider)} />
                                        <Chip
                                            size='small'
                                            label={binding.enabled ? 'Enabled' : 'Disabled'}
                                            color={binding.enabled ? 'success' : 'default'}
                                        />
                                    </Stack>
                                    <Button
                                        color='error'
                                        variant='outlined'
                                        size='small'
                                        startIcon={<IconTrash size={16} />}
                                        onClick={() => handleDetach(binding)}
                                    >
                                        Detach
                                    </Button>
                                </Stack>
                            </Box>
                        )
                    })}
                </Stack>
            )}

            <ChannelAccountDialog
                open={accountDialogOpen}
                mode='create'
                account={null}
                credentials={credentials}
                onClose={() => setAccountDialogOpen(false)}
                onSaved={() => {
                    setAccountDialogOpen(false)
                    notify('Channel account created')
                    refresh()
                }}
                onError={(message) => notify(message, 'error', true)}
            />
        </Stack>
    )
}

export default ChannelBindings

ChannelBindings.propTypes = {
    dialogProps: PropTypes.shape({
        chatflow: PropTypes.shape({
            id: PropTypes.string
        })
    })
}

ChannelBindings.defaultProps = {
    dialogProps: {}
}
