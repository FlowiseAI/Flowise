import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import moment from 'moment'

import {
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Typography
} from '@mui/material'

import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'

import channelsApi from '@/api/channels'
import credentialsApi from '@/api/credentials'
import chatflowsApi from '@/api/chatflows'

import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { useError } from '@/store/context/ErrorContext'
import { baseURL } from '@/store/constant'

import ChannelAccountDialog from './ChannelAccountDialog'
import ChannelBindingDialog from './ChannelBindingDialog'

import { IconCopy, IconEdit, IconPlus, IconTrash, IconX } from '@tabler/icons-react'

const parseConfig = (value) => {
    if (!value || typeof value !== 'string') return {}
    try {
        const parsed = JSON.parse(value)
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

const getWebhookUrl = (provider, webhookPath) => `${baseURL}/api/v1/channel-webhooks/${provider}/${webhookPath}`

const normalizeFlowResponse = (response) => {
    if (Array.isArray(response)) return response
    if (Array.isArray(response?.data)) return response.data
    return []
}

const formatFlowType = (type) => {
    if (type === 'CHATFLOW') return 'Chatflow'
    if (type === 'AGENTFLOW') return 'Agentflow'
    if (type === 'MULTIAGENT') return 'Multi Agent'
    return 'Flow'
}

const Channels = () => {
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()
    const { confirm } = useConfirm()
    const location = useLocation()
    const navigate = useNavigate()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [tab, setTab] = useState('accounts')
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const [accounts, setAccounts] = useState([])
    const [bindings, setBindings] = useState([])
    const [credentials, setCredentials] = useState([])
    const [chatflows, setChatflows] = useState([])

    const [accountDialogState, setAccountDialogState] = useState({ open: false, mode: 'create', account: null })
    const [bindingDialogState, setBindingDialogState] = useState({ open: false, mode: 'create', binding: null, initialChatflowId: '' })

    const getAccountsApi = useApi(channelsApi.getChannelAccounts)
    const getBindingsApi = useApi(channelsApi.getChannelBindings)
    const getCredentialsApi = useApi(credentialsApi.getAllCredentials)
    const getChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const getAgentflowsApi = useApi(chatflowsApi.getAllAgentflows)
    const getMultiAgentflowsApi = useApi(chatflowsApi.getAllAgentflows)

    const refresh = () => {
        getAccountsApi.request()
        getBindingsApi.request()
        getCredentialsApi.request()
        getChatflowsApi.request({ page: 1, limit: 1000 })
        getAgentflowsApi.request('AGENTFLOW', { page: 1, limit: 1000 })
        getMultiAgentflowsApi.request('MULTIAGENT', { page: 1, limit: 1000 })
    }

    useEffect(() => {
        refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setIsLoading(
            getAccountsApi.loading ||
                getBindingsApi.loading ||
                getCredentialsApi.loading ||
                getChatflowsApi.loading ||
                getAgentflowsApi.loading ||
                getMultiAgentflowsApi.loading
        )
    }, [
        getAccountsApi.loading,
        getBindingsApi.loading,
        getCredentialsApi.loading,
        getChatflowsApi.loading,
        getAgentflowsApi.loading,
        getMultiAgentflowsApi.loading
    ])

    useEffect(() => {
        if (getAccountsApi.error) setError(getAccountsApi.error)
    }, [getAccountsApi.error, setError])
    useEffect(() => {
        if (getBindingsApi.error) setError(getBindingsApi.error)
    }, [getBindingsApi.error, setError])
    useEffect(() => {
        if (getCredentialsApi.error) setError(getCredentialsApi.error)
    }, [getCredentialsApi.error, setError])
    useEffect(() => {
        if (getChatflowsApi.error) setError(getChatflowsApi.error)
    }, [getChatflowsApi.error, setError])
    useEffect(() => {
        if (getAgentflowsApi.error) setError(getAgentflowsApi.error)
    }, [getAgentflowsApi.error, setError])
    useEffect(() => {
        if (getMultiAgentflowsApi.error) setError(getMultiAgentflowsApi.error)
    }, [getMultiAgentflowsApi.error, setError])

    useEffect(() => {
        if (getAccountsApi.data) setAccounts(getAccountsApi.data)
    }, [getAccountsApi.data])
    useEffect(() => {
        if (getBindingsApi.data) setBindings(getBindingsApi.data)
    }, [getBindingsApi.data])
    useEffect(() => {
        if (getCredentialsApi.data) setCredentials(getCredentialsApi.data)
    }, [getCredentialsApi.data])

    useEffect(() => {
        const chatflowsData = normalizeFlowResponse(getChatflowsApi.data)
        const agentflowsData = normalizeFlowResponse(getAgentflowsApi.data)
        const multiAgentflowsData = normalizeFlowResponse(getMultiAgentflowsApi.data)
        const combined = [...chatflowsData, ...agentflowsData, ...multiAgentflowsData]
        setChatflows(combined)
    }, [getChatflowsApi.data, getAgentflowsApi.data, getMultiAgentflowsApi.data])

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search)
        const openBinding = searchParams.get('openBinding')
        const flowId = searchParams.get('flowId') || ''

        if (openBinding !== '1') return

        setBindingDialogState({
            open: true,
            mode: 'create',
            binding: null,
            initialChatflowId: flowId
        })

        navigate('/channels', { replace: true })
    }, [location.search, navigate])

    const accountMap = useMemo(() => {
        const map = new Map()
        accounts.forEach((account) => map.set(account.id, account))
        return map
    }, [accounts])

    const chatflowMap = useMemo(() => {
        const map = new Map()
        chatflows.forEach((chatflow) => map.set(chatflow.id, chatflow))
        return map
    }, [chatflows])

    const filteredAccounts = useMemo(() => {
        if (!search.trim()) return accounts
        const lowered = search.toLowerCase()
        return accounts.filter((account) => {
            const config = parseConfig(account.config)
            return (
                account.name?.toLowerCase().includes(lowered) ||
                account.provider?.toLowerCase().includes(lowered) ||
                account.id?.toLowerCase().includes(lowered) ||
                JSON.stringify(config).toLowerCase().includes(lowered)
            )
        })
    }, [accounts, search])

    const filteredBindings = useMemo(() => {
        if (!search.trim()) return bindings
        const lowered = search.toLowerCase()
        return bindings.filter((binding) => {
            const account = accountMap.get(binding.channelAccountId)
            const chatflow = chatflowMap.get(binding.chatflowId)
            return (
                binding.id?.toLowerCase().includes(lowered) ||
                binding.provider?.toLowerCase().includes(lowered) ||
                binding.webhookPath?.toLowerCase().includes(lowered) ||
                account?.name?.toLowerCase().includes(lowered) ||
                chatflow?.name?.toLowerCase().includes(lowered)
            )
        })
    }, [accountMap, bindings, chatflowMap, search])

    const notify = (message, variant = 'success', persist = false) => {
        enqueueSnackbar({
            message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant,
                persist,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const onSearchChange = (event) => setSearch(event.target.value)

    const copyWebhookUrl = async (provider, webhookPath) => {
        try {
            await navigator.clipboard.writeText(getWebhookUrl(provider, webhookPath))
            notify('Webhook URL copied')
        } catch {
            notify('Failed to copy webhook URL', 'error', true)
        }
    }

    const handleDeleteAccount = async (account) => {
        const isConfirmed = await confirm({
            title: 'Delete',
            description: `Delete channel account ${account.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        })
        if (!isConfirmed) return

        try {
            await channelsApi.deleteChannelAccount(account.id)
            notify('Channel account deleted')
            refresh()
        } catch (deleteError) {
            notify(getErrorMessage(deleteError, 'Failed to delete channel account'), 'error', true)
        }
    }

    const handleDeleteBinding = async (binding) => {
        const isConfirmed = await confirm({
            title: 'Delete',
            description: `Delete binding ${binding.id}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        })
        if (!isConfirmed) return

        try {
            await channelsApi.deleteChannelBinding(binding.id)
            notify('Channel binding deleted')
            refresh()
        } catch (deleteError) {
            notify(getErrorMessage(deleteError, 'Failed to delete channel binding'), 'error', true)
        }
    }

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader
                        onSearchChange={onSearchChange}
                        search={true}
                        searchPlaceholder={tab === 'accounts' ? 'Search accounts' : 'Search bindings'}
                        title='Channels'
                        description='Manage provider accounts and bind them to chatflows/agentflows with dedicated webhooks'
                    >
                        {tab === 'accounts' ? (
                            <Button
                                variant='contained'
                                sx={{ borderRadius: 2, height: 40 }}
                                startIcon={<IconPlus />}
                                onClick={() => setAccountDialogState({ open: true, mode: 'create', account: null })}
                            >
                                Add Account
                            </Button>
                        ) : (
                            <Button
                                variant='contained'
                                sx={{ borderRadius: 2, height: 40 }}
                                startIcon={<IconPlus />}
                                onClick={() => setBindingDialogState({ open: true, mode: 'create', binding: null, initialChatflowId: '' })}
                            >
                                Add Binding
                            </Button>
                        )}
                    </ViewHeader>

                    <Box>
                        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
                            <Tab label={`Accounts (${accounts.length})`} value='accounts' />
                            <Tab label={`Bindings (${bindings.length})`} value='bindings' />
                        </Tabs>
                    </Box>

                    {tab === 'accounts' && (
                        <TableContainer
                            component={Paper}
                            sx={{
                                border: 1,
                                borderColor: (theme) => theme.palette.grey[900] + 25,
                                borderRadius: 2
                            }}
                        >
                            <Table>
                                <TableHead
                                    sx={{
                                        backgroundColor: customization.isDarkMode ? 'inherit' : (theme) => theme.palette.grey[100]
                                    }}
                                >
                                    <TableRow>
                                        <StyledTableCell>Name</StyledTableCell>
                                        <StyledTableCell>Provider</StyledTableCell>
                                        <StyledTableCell>Credential</StyledTableCell>
                                        <StyledTableCell>Config</StyledTableCell>
                                        <StyledTableCell>Status</StyledTableCell>
                                        <StyledTableCell>Updated</StyledTableCell>
                                        <StyledTableCell>Actions</StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading &&
                                        Array.from({ length: 3 }).map((_, index) => (
                                            <StyledTableRow key={`loading-account-${index}`}>
                                                <StyledTableCell colSpan={7}>
                                                    <Skeleton variant='rectangular' height={24} />
                                                </StyledTableCell>
                                            </StyledTableRow>
                                        ))}
                                    {!isLoading &&
                                        filteredAccounts.map((account) => {
                                            const config = parseConfig(account.config)
                                            return (
                                                <StyledTableRow key={account.id} hover>
                                                    <StyledTableCell>{account.name}</StyledTableCell>
                                                    <StyledTableCell sx={{ textTransform: 'capitalize' }}>
                                                        {account.provider}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        {credentials.find((d) => d.id === account.credentialId)?.name ||
                                                            account.credentialId}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Typography
                                                            variant='body2'
                                                            sx={{
                                                                maxWidth: 320,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                        >
                                                            {JSON.stringify(config)}
                                                        </Typography>
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Chip
                                                            size='small'
                                                            label={account.enabled ? 'ENABLED' : 'DISABLED'}
                                                            color={account.enabled ? 'success' : 'default'}
                                                        />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        {moment(account.updatedDate).format('DD/MM/YYYY HH:mm')}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <IconButton
                                                            title='Edit'
                                                            color='primary'
                                                            onClick={() => setAccountDialogState({ open: true, mode: 'edit', account })}
                                                        >
                                                            <IconEdit />
                                                        </IconButton>
                                                        <IconButton
                                                            title='Delete'
                                                            color='error'
                                                            onClick={() => handleDeleteAccount(account)}
                                                        >
                                                            <IconTrash />
                                                        </IconButton>
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                            )
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {tab === 'bindings' && (
                        <TableContainer
                            component={Paper}
                            sx={{
                                border: 1,
                                borderColor: (theme) => theme.palette.grey[900] + 25,
                                borderRadius: 2
                            }}
                        >
                            <Table>
                                <TableHead
                                    sx={{
                                        backgroundColor: customization.isDarkMode ? 'inherit' : (theme) => theme.palette.grey[100]
                                    }}
                                >
                                    <TableRow>
                                        <StyledTableCell>Flow</StyledTableCell>
                                        <StyledTableCell>Account</StyledTableCell>
                                        <StyledTableCell>Provider</StyledTableCell>
                                        <StyledTableCell>Webhook URL</StyledTableCell>
                                        <StyledTableCell>Status</StyledTableCell>
                                        <StyledTableCell>Updated</StyledTableCell>
                                        <StyledTableCell>Actions</StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading &&
                                        Array.from({ length: 3 }).map((_, index) => (
                                            <StyledTableRow key={`loading-binding-${index}`}>
                                                <StyledTableCell colSpan={7}>
                                                    <Skeleton variant='rectangular' height={24} />
                                                </StyledTableCell>
                                            </StyledTableRow>
                                        ))}
                                    {!isLoading &&
                                        filteredBindings.map((binding) => {
                                            const account = accountMap.get(binding.channelAccountId)
                                            const chatflow = chatflowMap.get(binding.chatflowId)
                                            const webhookUrl = getWebhookUrl(binding.provider, binding.webhookPath)
                                            return (
                                                <StyledTableRow key={binding.id} hover>
                                                    <StyledTableCell>
                                                        {chatflow
                                                            ? `${chatflow.name} (${formatFlowType(chatflow.type)})`
                                                            : binding.chatflowId}
                                                    </StyledTableCell>
                                                    <StyledTableCell>{account?.name || binding.channelAccountId}</StyledTableCell>
                                                    <StyledTableCell sx={{ textTransform: 'capitalize' }}>
                                                        {binding.provider}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Stack direction='row' alignItems='center' spacing={1}>
                                                            <Typography
                                                                variant='body2'
                                                                sx={{
                                                                    maxWidth: 320,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            >
                                                                {webhookUrl}
                                                            </Typography>
                                                            <IconButton
                                                                title='Copy Webhook URL'
                                                                size='small'
                                                                color='success'
                                                                onClick={() => copyWebhookUrl(binding.provider, binding.webhookPath)}
                                                            >
                                                                <IconCopy />
                                                            </IconButton>
                                                        </Stack>
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Chip
                                                            size='small'
                                                            label={binding.enabled ? 'ENABLED' : 'DISABLED'}
                                                            color={binding.enabled ? 'success' : 'default'}
                                                        />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        {moment(binding.updatedDate).format('DD/MM/YYYY HH:mm')}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <IconButton
                                                            title='Edit'
                                                            color='primary'
                                                            onClick={() =>
                                                                setBindingDialogState({
                                                                    open: true,
                                                                    mode: 'edit',
                                                                    binding,
                                                                    initialChatflowId: ''
                                                                })
                                                            }
                                                        >
                                                            <IconEdit />
                                                        </IconButton>
                                                        <IconButton
                                                            title='Delete'
                                                            color='error'
                                                            onClick={() => handleDeleteBinding(binding)}
                                                        >
                                                            <IconTrash />
                                                        </IconButton>
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                            )
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {!isLoading && tab === 'accounts' && filteredAccounts.length === 0 && (
                        <Typography variant='body2' sx={{ textAlign: 'center', py: 2 }}>
                            No channel accounts found.
                        </Typography>
                    )}
                    {!isLoading && tab === 'bindings' && filteredBindings.length === 0 && (
                        <Typography variant='body2' sx={{ textAlign: 'center', py: 2 }}>
                            No channel bindings found.
                        </Typography>
                    )}
                </Stack>
            )}

            <ChannelAccountDialog
                open={accountDialogState.open}
                mode={accountDialogState.mode}
                account={accountDialogState.account}
                credentials={credentials}
                onClose={() => setAccountDialogState({ open: false, mode: 'create', account: null })}
                onSaved={() => {
                    setAccountDialogState({ open: false, mode: 'create', account: null })
                    refresh()
                    notify('Channel account saved')
                }}
                onError={(message) => notify(message, 'error', true)}
            />
            <ChannelBindingDialog
                open={bindingDialogState.open}
                mode={bindingDialogState.mode}
                binding={bindingDialogState.binding}
                accounts={accounts}
                chatflows={chatflows}
                initialChatflowId={bindingDialogState.initialChatflowId}
                onClose={() => setBindingDialogState({ open: false, mode: 'create', binding: null, initialChatflowId: '' })}
                onSaved={() => {
                    setBindingDialogState({ open: false, mode: 'create', binding: null, initialChatflowId: '' })
                    refresh()
                    notify('Channel binding saved')
                }}
                onNotify={notify}
            />
            <ConfirmDialog />
        </MainCard>
    )
}

export default Channels
