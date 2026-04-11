import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

import {
    Box,
    Button,
    Typography,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    OutlinedInput,
    FormHelperText,
    Select,
    MenuItem,
    FormControl,
    Chip,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTheme } from '@mui/material/styles'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import { StatusBadge } from '@/ui-component/table/MCPServersTable'

// Icons
import { IconX, IconPlugConnected, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'

// API
import customMcpServersApi from '@/api/custommcpservers'

// Hooks
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { MCP_SERVER_STATUS, MCP_AUTH_TYPE } from '@/store/constant'
import { generateRandomGradient } from '@/utils/genericHelper'

const CustomMcpServerDialog = ({ show, dialogProps, onCancel, onConfirm, onAuthorize }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const theme = useTheme()

    useNotifier()
    const { confirm } = useConfirm()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [serverId, setServerId] = useState('')
    const [serverName, setServerName] = useState('')
    const [serverUrl, setServerUrl] = useState('')
    const [iconSrc, setIconSrc] = useState('')
    const [color, setColor] = useState('')
    const [authType, setAuthType] = useState(MCP_AUTH_TYPE.NONE)
    const [headers, setHeaders] = useState([{ key: '', value: '' }])
    const [status, setStatus] = useState(MCP_SERVER_STATUS.PENDING)
    const [discoveredTools, setDiscoveredTools] = useState([])
    const [authorizing, setAuthorizing] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [serverUrlError, setServerUrlError] = useState('')

    const validateServerUrl = (url) => {
        if (!url) {
            setServerUrlError('Server URL is required')
            return false
        }
        try {
            const parsed = new URL(url)
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                setServerUrlError('Only http and https URLs are allowed')
                return false
            }
        } catch {
            setServerUrlError('Enter a valid URL (e.g. https://example.com/mcp)')
            return false
        }
        setServerUrlError('')
        return true
    }

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setServerId(dialogProps.data.id)
            setServerName(dialogProps.data.name)
            setServerUrl(dialogProps.data.serverUrl)
            setIconSrc(dialogProps.data.iconSrc || '')
            setColor(dialogProps.data.color || '')
            setAuthType(dialogProps.data.authType || MCP_AUTH_TYPE.NONE)
            setStatus(dialogProps.data.status || MCP_SERVER_STATUS.PENDING)
            // Parse discovered tools
            if (dialogProps.data.tools) {
                try {
                    const parsed = JSON.parse(dialogProps.data.tools)
                    const tools = Array.isArray(parsed?.tools) ? parsed.tools : []
                    setDiscoveredTools(tools)
                } catch {
                    setDiscoveredTools([])
                }
            } else {
                setDiscoveredTools([])
            }
            // Parse header fields from authConfig
            if (dialogProps.data.authType === MCP_AUTH_TYPE.CUSTOM_HEADERS && dialogProps.data.authConfig?.headers) {
                const hdrs = dialogProps.data.authConfig.headers
                const entries = Object.entries(hdrs).map(([key, value]) => ({ key, value }))
                setHeaders(entries.length > 0 ? entries : [{ key: '', value: '' }])
            } else {
                setHeaders([{ key: '', value: '' }])
            }
            setIsEditing(false)
            setServerUrlError('')
        } else if (dialogProps.type === 'ADD') {
            setServerId('')
            setServerName('')
            setServerUrl('')
            setIconSrc('')
            setColor('')
            setAuthType(MCP_AUTH_TYPE.NONE)
            setHeaders([{ key: '', value: '' }])
            setStatus(MCP_SERVER_STATUS.PENDING)
            setDiscoveredTools([])
            setServerUrlError('')
            setIsEditing(true)
        }
    }, [dialogProps])

    const showSnackbar = (message, variant = 'success') => {
        enqueueSnackbar({
            message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                ),
                ...(variant === 'error' && { persist: true })
            }
        })
    }

    const getErrorMsg = (error) =>
        typeof error.response?.data === 'object' ? error.response.data.message : error.response?.data || error.message

    const addNewServer = async () => {
        if (!validateServerUrl(serverUrl)) return
        try {
            const body = {
                name: serverName,
                serverUrl,
                iconSrc: iconSrc || undefined,
                color: color || generateRandomGradient(),
                authType
            }
            if (authType === MCP_AUTH_TYPE.CUSTOM_HEADERS) {
                const hdrs = {}
                headers.forEach(({ key, value }) => {
                    if (key) hdrs[key] = value
                })
                if (Object.keys(hdrs).length > 0) body.authConfig = { headers: hdrs }
            }
            const resp = await customMcpServersApi.createCustomMcpServer(body)
            if (resp.data) {
                showSnackbar('MCP Server added')
                onConfirm(resp.data.id)
            }
        } catch (error) {
            showSnackbar(`Failed to add MCP Server: ${getErrorMsg(error)}`, 'error')
            onCancel()
        }
    }

    const saveServer = async () => {
        if (!validateServerUrl(serverUrl)) return
        try {
            const body = {
                name: serverName,
                serverUrl,
                iconSrc: iconSrc || undefined,
                color: color || undefined,
                authType
            }
            if (authType === MCP_AUTH_TYPE.CUSTOM_HEADERS) {
                const hdrs = {}
                headers.forEach(({ key, value }) => {
                    if (key) hdrs[key] = value
                })
                if (Object.keys(hdrs).length > 0) body.authConfig = { headers: hdrs }
            } else {
                body.authConfig = null // Clear authConfig if switching to no authentication
            }
            const resp = await customMcpServersApi.updateCustomMcpServer(serverId, body)
            if (resp.data) {
                showSnackbar('MCP Server saved')
                onConfirm(resp.data.id)
            }
        } catch (error) {
            showSnackbar(`Failed to save MCP Server: ${getErrorMsg(error)}`, 'error')
            onCancel()
        }
    }

    const authorizeServer = async () => {
        const targetId = serverId
        if (!targetId) return
        setAuthorizing(true)
        try {
            const resp = await customMcpServersApi.authorizeCustomMcpServer(targetId)
            if (resp.data) {
                setStatus(resp.data.status)
                if (resp.data.tools) {
                    try {
                        const parsed = JSON.parse(resp.data.tools) || {}
                        const tools = Array.isArray(parsed?.tools) ? parsed.tools : []
                        setDiscoveredTools(tools)
                        showSnackbar(`Connected! Discovered ${tools.length} tools`)
                        onAuthorize(targetId)
                    } catch {
                        setDiscoveredTools([])
                    }
                }
            }
        } catch (error) {
            setStatus(MCP_SERVER_STATUS.ERROR)
            showSnackbar(`Authorization failed: ${getErrorMsg(error)}`, 'error')
        } finally {
            setAuthorizing(false)
        }
    }

    const cancelEditing = () => {
        if (dialogProps.data) {
            setServerName(dialogProps.data.name)
            setServerUrl(dialogProps.data.serverUrl)
            setIconSrc(dialogProps.data.iconSrc || '')
            setColor(dialogProps.data.color || '')
            setAuthType(dialogProps.data.authType || MCP_AUTH_TYPE.NONE)
            if (dialogProps.data.authType === MCP_AUTH_TYPE.CUSTOM_HEADERS && dialogProps.data.authConfig?.headers) {
                const hdrs = dialogProps.data.authConfig.headers
                const entries = Object.entries(hdrs).map(([key, value]) => ({ key, value }))
                setHeaders(entries.length > 0 ? entries : [{ key: '', value: '' }])
            } else {
                setHeaders([{ key: '', value: '' }])
            }
            setServerUrlError('')
        }
        setIsEditing(false)
    }

    const deleteServer = async () => {
        const isConfirmed = await confirm({
            title: 'Delete MCP Server',
            description: `Delete MCP server "${serverName}"?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        })
        if (isConfirmed) {
            try {
                const resp = await customMcpServersApi.deleteCustomMcpServer(serverId)
                if (resp.data) {
                    showSnackbar('MCP Server deleted')
                    onConfirm()
                }
            } catch (error) {
                showSnackbar(`Failed to delete MCP Server: ${getErrorMsg(error)}`, 'error')
                onCancel()
            }
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='mcp-server-dialog-title'
            aria-describedby='mcp-server-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='mcp-server-dialog-title'>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='h4' sx={{ fontWeight: 600 }}>
                            {dialogProps.type === 'ADD' ? 'Add Custom MCP Server' : serverName || 'Custom MCP Server'}
                        </Typography>
                        {dialogProps.type === 'EDIT' && <StatusBadge status={status} />}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {dialogProps.type === 'EDIT' && !isEditing && (
                            <StyledButton
                                variant='outlined'
                                size='small'
                                startIcon={<IconEdit size={16} />}
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </StyledButton>
                        )}
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', position: 'relative', px: 3, pb: 3 }}>
                {/* View Mode (read-only) */}
                {dialogProps.type === 'EDIT' && !isEditing && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                Server Name
                            </Typography>
                            <Typography variant='body1'>{serverName}</Typography>
                        </Box>
                        <Box>
                            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                Server URL
                            </Typography>
                            <Typography variant='body1' sx={{ wordBreak: 'break-all' }}>
                                {serverUrl}
                            </Typography>
                        </Box>
                        {iconSrc && (
                            <Box>
                                <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                    Icon Source
                                </Typography>
                                <Typography variant='body1'>{iconSrc}</Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                Authentication
                            </Typography>
                            <Typography variant='body1'>
                                {authType === MCP_AUTH_TYPE.NONE ? 'No Authentication' : 'Custom Headers'}
                            </Typography>
                        </Box>
                        {authType === MCP_AUTH_TYPE.CUSTOM_HEADERS && headers.some((h) => h.key) && (
                            <Box>
                                <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                    Headers
                                </Typography>
                                {headers
                                    .filter((h) => h.key)
                                    .map((h, idx) => (
                                        <Typography key={idx} variant='body1' sx={{ fontFamily: 'monospace' }}>
                                            {h.key}: ••••••••
                                        </Typography>
                                    ))}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Edit Mode (input fields) */}
                {isEditing && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Box>
                            <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                <Typography variant='overline'>
                                    Server Name
                                    <span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <TooltipWithParser title='Display name for the MCP server (max 40 characters)' />
                            </Stack>
                            <OutlinedInput
                                id='serverName'
                                type='string'
                                fullWidth
                                placeholder='My Server Name'
                                value={serverName}
                                name='serverName'
                                inputProps={{ maxLength: 40 }}
                                onChange={(e) => setServerName(e.target.value)}
                            />
                        </Box>
                        <Box>
                            <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                <Typography variant='overline'>
                                    Server URL
                                    <span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <TooltipWithParser title='The HTTP(S) endpoint of the MCP server (SSE or Streamable HTTP)' />
                            </Stack>
                            <OutlinedInput
                                id='serverUrl'
                                type='string'
                                fullWidth
                                placeholder='https://example.com/mcp'
                                value={serverUrl}
                                name='serverUrl'
                                error={!!serverUrlError}
                                onChange={(e) => {
                                    setServerUrl(e.target.value)
                                    if (serverUrlError) validateServerUrl(e.target.value)
                                }}
                                onBlur={(e) => validateServerUrl(e.target.value)}
                            />
                            {serverUrlError && <FormHelperText error>{serverUrlError}</FormHelperText>}
                        </Box>
                        <Box>
                            <Stack sx={{ position: 'relative' }} direction='row'>
                                <Typography variant='overline'>Icon Source</Typography>
                            </Stack>
                            <OutlinedInput
                                id='iconSrc'
                                type='string'
                                fullWidth
                                placeholder='https://example.com/icon.svg'
                                value={iconSrc}
                                name='iconSrc'
                                onChange={(e) => setIconSrc(e.target.value)}
                            />
                        </Box>

                        {/* Authentication */}
                        <Box>
                            <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                <Typography variant='overline'>Authentication</Typography>
                                <TooltipWithParser title='Authentication method to connect to the MCP server' />
                            </Stack>
                            <FormControl fullWidth>
                                <Select value={authType} onChange={(e) => setAuthType(e.target.value)} size='small'>
                                    <MenuItem value={MCP_AUTH_TYPE.NONE}>No Authentication</MenuItem>
                                    <MenuItem value={MCP_AUTH_TYPE.CUSTOM_HEADERS}>Custom Headers</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        {authType === MCP_AUTH_TYPE.CUSTOM_HEADERS && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {headers.map((header, index) => (
                                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                                        <Box sx={{ flex: 1 }}>
                                            {index === 0 && <Typography variant='overline'>Header Key</Typography>}
                                            <OutlinedInput
                                                fullWidth
                                                placeholder='Authorization'
                                                value={header.key}
                                                onChange={(e) => {
                                                    const updated = [...headers]
                                                    updated[index] = { ...updated[index], key: e.target.value }
                                                    setHeaders(updated)
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            {index === 0 && <Typography variant='overline'>Header Value</Typography>}
                                            <OutlinedInput
                                                fullWidth
                                                placeholder='Bearer <token>'
                                                value={header.value}
                                                onChange={(e) => {
                                                    const updated = [...headers]
                                                    updated[index] = { ...updated[index], value: e.target.value }
                                                    setHeaders(updated)
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', pb: 0.5 }}>
                                            {headers.length > 1 && (
                                                <Button
                                                    size='small'
                                                    color='error'
                                                    sx={{ minWidth: 36, p: 0.5 }}
                                                    onClick={() => setHeaders(headers.filter((_, i) => i !== index))}
                                                >
                                                    <IconTrash size={18} />
                                                </Button>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                                <Box>
                                    <Button
                                        size='small'
                                        startIcon={<IconPlus size={16} />}
                                        onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                                    >
                                        Add Header
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Discovered Tools */}
                {dialogProps.type === 'EDIT' && !isEditing && discoveredTools.length > 0 && (
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant='overline'>Discovered Tools</Typography>
                                <Chip
                                    label={discoveredTools.length}
                                    size='small'
                                    color='primary'
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {discoveredTools.map((tool, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: theme.palette.grey[300],
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.5
                                        }}
                                    >
                                        <Typography
                                            variant='subtitle2'
                                            sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}
                                        >
                                            {tool.name}
                                        </Typography>
                                        {tool.description && (
                                            <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                                {tool.description}
                                            </Typography>
                                        )}
                                        {tool.inputSchema?.properties && (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                                {Object.keys(tool.inputSchema.properties).map((param) => (
                                                    <Chip
                                                        key={param}
                                                        label={param}
                                                        size='small'
                                                        variant='outlined'
                                                        sx={{ height: 20, fontSize: '0.65rem', fontFamily: 'monospace' }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
                <Box>
                    {dialogProps.type === 'EDIT' && (
                        <StyledPermissionButton permissionId={'tools:delete'} color='error' variant='contained' onClick={deleteServer}>
                            Delete
                        </StyledPermissionButton>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {dialogProps.type === 'EDIT' && !isEditing && (
                        <StyledButton
                            variant='outlined'
                            onClick={authorizeServer}
                            disabled={authorizing}
                            startIcon={authorizing ? <CircularProgress size={16} /> : <IconPlugConnected />}
                        >
                            {authorizing ? 'Connecting...' : 'Authorize'}
                        </StyledButton>
                    )}
                    {isEditing && (
                        <>
                            {dialogProps.type === 'EDIT' && (
                                <StyledButton variant='outlined' onClick={cancelEditing}>
                                    Cancel
                                </StyledButton>
                            )}
                            <StyledPermissionButton
                                permissionId={'tools:update,tools:create'}
                                disabled={!(serverName && serverUrl) || !!serverUrlError}
                                variant='contained'
                                onClick={() => (dialogProps.type === 'ADD' ? addNewServer() : saveServer())}
                            >
                                {dialogProps.type === 'ADD' ? 'Add' : 'Save'}
                            </StyledPermissionButton>
                        </>
                    )}
                </Box>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

CustomMcpServerDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    onAuthorize: PropTypes.func
}

export default CustomMcpServerDialog
