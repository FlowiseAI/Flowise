import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
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
    AccordionDetails,
    Collapse,
    IconButton,
    InputAdornment,
    Tooltip
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTheme } from '@mui/material/styles'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import { StatusBadge } from '@/ui-component/table/MCPServersTable'

// Icons
import {
    IconX,
    IconPlugConnected,
    IconEdit,
    IconPlus,
    IconTrash,
    IconSearch,
    IconEye,
    IconAlertTriangle,
    IconWorld,
    IconTool
} from '@tabler/icons-react'

// API
import customMcpServersApi from '@/api/custommcpservers'

// Hooks
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { MCP_SERVER_STATUS, MCP_AUTH_TYPE } from '@/store/constant'
import { generateRandomGradient } from '@/utils/genericHelper'

// Server-side masking placeholder. Must match REDACTED_VALUE in the service.
const MASK_TOKEN = '************'

// Pick an icon matching the current UI theme. MCP tool icons annotate themselves
// with `theme: 'light' | 'dark'` — `light` means the glyph is dark (for light
// backgrounds), `dark` means the glyph is light (for dark backgrounds).
const pickToolIcon = (icons, isDarkMode) => {
    if (!Array.isArray(icons) || icons.length === 0) return null
    const desired = isDarkMode ? 'dark' : 'light'
    return icons.find((i) => i?.theme === desired) || icons[0]
}

const TYPE_CHIP_COLOR = {
    light: {
        string: '#2E7D32',
        number: '#1565C0',
        integer: '#1565C0',
        boolean: '#6A1B9A',
        object: '#E65100',
        array: '#00838F'
    },
    dark: {
        string: '#81C784',
        number: '#64B5F6',
        integer: '#64B5F6',
        boolean: '#CE93D8',
        object: '#FFB74D',
        array: '#4DD0E1'
    }
}

const HintChip = ({ icon: Icon, label, tooltip, bg, fg }) => (
    <Tooltip title={tooltip} arrow>
        <Chip
            icon={<Icon size={12} />}
            label={label}
            size='small'
            sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: 0.3,
                bgcolor: bg,
                color: fg,
                '& .MuiChip-icon': { color: fg, marginLeft: '4px' }
            }}
        />
    </Tooltip>
)

HintChip.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    tooltip: PropTypes.string,
    bg: PropTypes.string,
    fg: PropTypes.string
}

const DiscoveredToolRow = ({ tool, expanded, onToggle, isDarkMode, theme }) => {
    const icon = pickToolIcon(tool?.icons, isDarkMode)
    const title = tool?.annotations?.title
    const props = tool?.inputSchema?.properties || {}
    const required = Array.isArray(tool?.inputSchema?.required) ? tool.inputSchema.required : []
    const paramNames = Object.keys(props)
    const readOnly = tool?.annotations?.readOnlyHint === true
    const destructive = tool?.annotations?.destructiveHint === true
    const openWorld = tool?.annotations?.openWorldHint === true

    return (
        <Box
            sx={{
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: expanded ? theme.palette.primary.main : theme.palette.divider,
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                transition: 'border-color 120ms ease',
                overflow: 'hidden'
            }}
        >
            {/* Header — always visible, click to expand */}
            <Box
                onClick={onToggle}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }
                }}
            >
                {expanded ? <ExpandMoreIcon fontSize='small' /> : <ChevronRightIcon fontSize='small' />}

                {icon?.src ? (
                    <Box component='img' src={icon.src} alt='' sx={{ width: 20, height: 20, flexShrink: 0, borderRadius: 0.5 }} />
                ) : (
                    <Box
                        sx={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            borderRadius: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                        }}
                    >
                        <IconTool size={12} />
                    </Box>
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {tool.name}
                    </Typography>
                    {title && title !== tool.name && (
                        <Typography
                            sx={{
                                fontSize: '0.7rem',
                                color: 'text.secondary',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {title}
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    {readOnly && (
                        <HintChip
                            icon={IconEye}
                            label='READ-ONLY'
                            tooltip='This tool does not modify any data'
                            bg={isDarkMode ? 'rgba(46,125,50,0.18)' : 'rgba(46,125,50,0.12)'}
                            fg={isDarkMode ? '#81C784' : '#2E7D32'}
                        />
                    )}
                    {destructive && (
                        <HintChip
                            icon={IconAlertTriangle}
                            label='DESTRUCTIVE'
                            tooltip='This tool may perform destructive actions'
                            bg={isDarkMode ? 'rgba(211,47,47,0.2)' : 'rgba(211,47,47,0.12)'}
                            fg={isDarkMode ? '#EF9A9A' : '#C62828'}
                        />
                    )}
                    {openWorld && (
                        <HintChip
                            icon={IconWorld}
                            label='EXTERNAL'
                            tooltip='This tool interacts with external systems'
                            bg={isDarkMode ? 'rgba(25,118,210,0.18)' : 'rgba(25,118,210,0.1)'}
                            fg={isDarkMode ? '#90CAF9' : '#1565C0'}
                        />
                    )}
                    <Tooltip title={`${paramNames.length} parameter${paramNames.length === 1 ? '' : 's'}`} arrow>
                        <Chip
                            label={paramNames.length}
                            size='small'
                            variant='outlined'
                            sx={{ height: 20, fontSize: '0.65rem', minWidth: 28 }}
                        />
                    </Tooltip>
                </Box>
            </Box>

            {/* Body — parameter details */}
            <Collapse in={expanded} unmountOnExit>
                <Box
                    sx={{
                        px: 1.75,
                        pt: 1,
                        pb: 1.5,
                        borderTop: '1px solid',
                        borderColor: theme.palette.divider
                    }}
                >
                    {tool.description && (
                        <Typography
                            variant='body2'
                            sx={{ color: 'text.secondary', fontSize: '0.78rem', mb: paramNames.length > 0 ? 1.25 : 0 }}
                        >
                            {tool.description}
                        </Typography>
                    )}

                    {paramNames.length > 0 && (
                        <Box>
                            <Typography
                                variant='caption'
                                sx={{
                                    display: 'block',
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                    mb: 0.75
                                }}
                            >
                                Parameters
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {paramNames.map((pname) => {
                                    const p = props[pname] || {}
                                    const isRequired = required.includes(pname)
                                    const typePalette = isDarkMode ? TYPE_CHIP_COLOR.dark : TYPE_CHIP_COLOR.light
                                    const typeColor = typePalette[p.type] || theme.palette.text.secondary
                                    return (
                                        <Box
                                            key={pname}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.35,
                                                p: 1,
                                                borderRadius: 1,
                                                bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                <Typography
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {pname}
                                                </Typography>
                                                {isRequired ? (
                                                    <Typography
                                                        sx={{ fontSize: '0.62rem', color: theme.palette.error.main, fontWeight: 700 }}
                                                    >
                                                        REQUIRED
                                                    </Typography>
                                                ) : (
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.62rem',
                                                            fontWeight: 600,
                                                            color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'text.secondary',
                                                            letterSpacing: 0.3
                                                        }}
                                                    >
                                                        OPTIONAL
                                                    </Typography>
                                                )}
                                                {p.type && (
                                                    <Chip
                                                        label={p.type}
                                                        size='small'
                                                        sx={{
                                                            height: 17,
                                                            fontSize: '0.6rem',
                                                            fontFamily: 'monospace',
                                                            bgcolor: 'transparent',
                                                            color: typeColor,
                                                            border: `1px solid ${typeColor}`,
                                                            '& .MuiChip-label': { px: 0.75 }
                                                        }}
                                                    />
                                                )}
                                                {Array.isArray(p.enum) &&
                                                    p.enum.map((v) => (
                                                        <Chip
                                                            key={String(v)}
                                                            label={String(v)}
                                                            size='small'
                                                            variant='outlined'
                                                            sx={{
                                                                height: 17,
                                                                fontSize: '0.6rem',
                                                                fontFamily: 'monospace',
                                                                '& .MuiChip-label': { px: 0.75 }
                                                            }}
                                                        />
                                                    ))}
                                                {p.default !== undefined && (
                                                    <Typography
                                                        sx={{ fontSize: '0.62rem', color: 'text.secondary', fontFamily: 'monospace' }}
                                                    >
                                                        default: {JSON.stringify(p.default)}
                                                    </Typography>
                                                )}
                                            </Box>
                                            {p.description && (
                                                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                                                    {p.description}
                                                </Typography>
                                            )}
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    )
}

DiscoveredToolRow.propTypes = {
    tool: PropTypes.object.isRequired,
    expanded: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
    isDarkMode: PropTypes.bool,
    theme: PropTypes.object.isRequired
}

const CustomMcpServerDialog = ({ show, dialogProps, onCancel, onConfirm, onAuthorize, onCreated }) => {
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
    const [toolSearch, setToolSearch] = useState('')
    const [expandedToolIndex, setExpandedToolIndex] = useState(null)

    const isDarkMode = useSelector((state) => state.customization?.isDarkMode)

    const filteredTools = useMemo(() => {
        const q = toolSearch.trim().toLowerCase()
        if (!q) return discoveredTools
        return discoveredTools.filter((t) => {
            const title = t?.annotations?.title || ''
            return (
                (t?.name || '').toLowerCase().includes(q) ||
                (t?.description || '').toLowerCase().includes(q) ||
                title.toLowerCase().includes(q)
            )
        })
    }, [discoveredTools, toolSearch])

    const validateServerUrl = (url) => {
        if (!url) {
            setServerUrlError('Server URL is required')
            return false
        }
        // In EDIT mode the form is prefilled with the masked URL. Leaving it
        // untouched is valid — the backend recognises the exact mask form and
        // preserves the stored value. Only flag partial/edited masks.
        const maskedOriginal = dialogProps.type === 'EDIT' ? dialogProps.data?.serverUrl : undefined
        if (url === maskedOriginal) {
            setServerUrlError('')
            return true
        }
        if (url.includes(MASK_TOKEN)) {
            setServerUrlError('URL still contains the masked placeholder. Clear the field and retype the full URL.')
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

    // Fetch discovered tools via the dedicated endpoint when editing an existing server —
    // the list/detail payloads no longer include the full tools blob.
    useEffect(() => {
        if (!show || dialogProps.type !== 'EDIT' || !dialogProps.data?.id) return
        let cancelled = false
        ;(async () => {
            try {
                const resp = await customMcpServersApi.getCustomMcpServerTools(dialogProps.data.id)
                if (!cancelled) setDiscoveredTools(Array.isArray(resp.data) ? resp.data : [])
            } catch {
                if (!cancelled) setDiscoveredTools([])
            }
        })()
        return () => {
            cancelled = true
        }
    }, [show, dialogProps.type, dialogProps.data?.id])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setServerId(dialogProps.data.id)
            setServerName(dialogProps.data.name)
            setServerUrl(dialogProps.data.serverUrl)
            setIconSrc(dialogProps.data.iconSrc || '')
            setColor(dialogProps.data.color || '')
            setAuthType(dialogProps.data.authType || MCP_AUTH_TYPE.NONE)
            setStatus(dialogProps.data.status || MCP_SERVER_STATUS.PENDING)
            // Tools are loaded asynchronously via the dedicated endpoint — see the effect below.
            setDiscoveredTools([])
            setToolSearch('')
            setExpandedToolIndex(null)
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
            setToolSearch('')
            setExpandedToolIndex(null)
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

        // Step 1: create
        let createdId
        try {
            const resp = await customMcpServersApi.createCustomMcpServer(body)
            createdId = resp?.data?.id
            if (!createdId) throw new Error('Create returned no id')
        } catch (error) {
            showSnackbar(`Failed to add MCP Server: ${getErrorMsg(error)}`, 'error')
            onCancel()
            return
        }

        // Step 2: authorize
        setAuthorizing(true)
        try {
            const auth = await customMcpServersApi.authorizeCustomMcpServer(createdId)
            let toolsCount = 0
            if (auth?.data?.tools) {
                try {
                    const parsed = JSON.parse(auth.data.tools) || {}
                    toolsCount = Array.isArray(parsed?.tools) ? parsed.tools.length : 0
                } catch {
                    /* ignore */
                }
            }
            showSnackbar(`MCP Server added and connected! Discovered ${toolsCount} tools`)
            if (typeof onCreated === 'function') onCreated(createdId)
            else onConfirm(createdId) // fallback if parent didn't wire onCreated
        } catch (error) {
            showSnackbar(`Added, but failed to connect: ${getErrorMsg(error)}`, 'error')
            if (typeof onCreated === 'function') onCreated(createdId)
        } finally {
            setAuthorizing(false)
        }
    }

    const saveServer = async () => {
        if (!validateServerUrl(serverUrl)) return
        const body = {
            name: serverName,
            serverUrl,
            iconSrc: iconSrc || undefined,
            color: color || undefined,
            authType
        }
        if (authType === MCP_AUTH_TYPE.CUSTOM_HEADERS) {
            const hdrs = {}
            for (const { key, value } of headers) {
                if (!key) continue
                // Partial mask in a value is almost certainly an editing mistake
                // (user typed over part of the placeholder). Exact MASK_TOKEN is
                // the documented "keep existing" signal — pass it through.
                if (value && value !== MASK_TOKEN && value.includes(MASK_TOKEN)) {
                    showSnackbar(`Header "${key}" value still contains redacted characters. Clear and retype the full value.`, 'error')
                    return
                }
                hdrs[key] = value
            }
            if (Object.keys(hdrs).length > 0) body.authConfig = { headers: hdrs }
        } else {
            body.authConfig = null // Clear authConfig if switching to no authentication
        }

        // Step 1: update
        try {
            await customMcpServersApi.updateCustomMcpServer(serverId, body)
        } catch (error) {
            showSnackbar(`Failed to save MCP Server: ${getErrorMsg(error)}`, 'error')
            onCancel()
            return
        }

        // Step 2: authorize with the new config
        setAuthorizing(true)
        try {
            const resp = await customMcpServersApi.authorizeCustomMcpServer(serverId)
            let toolsCount = 0
            if (resp?.data?.tools) {
                try {
                    const parsed = JSON.parse(resp.data.tools) || {}
                    const tools = Array.isArray(parsed?.tools) ? parsed.tools : []
                    setDiscoveredTools(tools)
                    toolsCount = tools.length
                } catch {
                    setDiscoveredTools([])
                }
            }
            setStatus(resp?.data?.status || MCP_SERVER_STATUS.AUTHORIZED)
            setIsEditing(false)
            showSnackbar(`Saved and reconnected! Discovered ${toolsCount} tools`)
        } catch (error) {
            setStatus(MCP_SERVER_STATUS.ERROR)
            setIsEditing(false)
            showSnackbar(`Saved, but failed to reconnect: ${getErrorMsg(error)}`, 'error')
        } finally {
            setAuthorizing(false)
            // Notify parent to refresh the list — status changed either way.
            if (typeof onAuthorize === 'function') onAuthorize(serverId)
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
            if (typeof onAuthorize === 'function') onAuthorize(targetId)
        }
    }

    // Masked values stay visible in the form so the user keeps context. Fields
    // left untouched still carry the masked placeholder; the backend recognises
    // the exact mask form and preserves the stored value. Partial edits that
    // leave `************` somewhere in the middle are rejected on save (see
    // validateServerUrl + saveServer + backend).
    const startEditing = () => {
        setServerUrlError('')
        setIsEditing(true)
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
                            <StyledButton variant='outlined' size='small' startIcon={<IconEdit size={16} />} onClick={startEditing}>
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
                        <AccordionDetails sx={{ p: 1.25, pt: 0.5 }}>
                            {/* Search bar — hidden until there are enough tools to justify it */}
                            {discoveredTools.length > 5 && (
                                <OutlinedInput
                                    fullWidth
                                    size='small'
                                    value={toolSearch}
                                    onChange={(e) => setToolSearch(e.target.value)}
                                    placeholder='Filter tools by name, title, or description'
                                    startAdornment={
                                        <InputAdornment position='start' sx={{ color: 'text.secondary' }}>
                                            <IconSearch size={16} stroke={1.75} />
                                        </InputAdornment>
                                    }
                                    endAdornment={
                                        toolSearch ? (
                                            <InputAdornment position='end'>
                                                <IconButton size='small' onClick={() => setToolSearch('')} sx={{ color: 'text.secondary' }}>
                                                    <IconX size={14} stroke={1.75} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null
                                    }
                                    sx={{ mb: 1, fontSize: '0.8rem' }}
                                />
                            )}

                            {/* Expand/collapse all controls */}
                            {filteredTools.length > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75, px: 0.5 }}>
                                    <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        {toolSearch
                                            ? `${filteredTools.length} of ${discoveredTools.length} tools`
                                            : `${discoveredTools.length} tools`}
                                    </Typography>
                                    <Button
                                        size='small'
                                        onClick={() => setExpandedToolIndex(expandedToolIndex === 'all' ? null : 'all')}
                                        sx={{ fontSize: '0.7rem', minWidth: 0, textTransform: 'none' }}
                                    >
                                        {expandedToolIndex === 'all' ? 'Collapse all' : 'Expand all'}
                                    </Button>
                                </Box>
                            )}

                            {filteredTools.length === 0 ? (
                                <Typography
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.8rem',
                                        textAlign: 'center',
                                        py: 2
                                    }}
                                >
                                    No tools match &ldquo;{toolSearch}&rdquo;
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {filteredTools.map((tool, index) => {
                                        const key = tool?.name || index
                                        const isExpanded = expandedToolIndex === 'all' || expandedToolIndex === key
                                        return (
                                            <DiscoveredToolRow
                                                key={key}
                                                tool={tool}
                                                expanded={isExpanded}
                                                onToggle={() =>
                                                    setExpandedToolIndex((curr) => {
                                                        if (curr === 'all') return key
                                                        return curr === key ? null : key
                                                    })
                                                }
                                                isDarkMode={isDarkMode}
                                                theme={theme}
                                            />
                                        )
                                    })}
                                </Box>
                            )}
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
                                <Button variant='outlined' onClick={cancelEditing}>
                                    Cancel
                                </Button>
                            )}
                            <StyledPermissionButton
                                permissionId={'tools:update,tools:create'}
                                disabled={!(serverName && serverUrl) || !!serverUrlError || authorizing}
                                variant='contained'
                                onClick={() => (dialogProps.type === 'ADD' ? addNewServer() : saveServer())}
                                startIcon={authorizing ? <CircularProgress size={14} color='inherit' /> : undefined}
                            >
                                {dialogProps.type === 'ADD'
                                    ? authorizing
                                        ? 'Connecting…'
                                        : 'Add & Connect'
                                    : authorizing
                                    ? 'Reconnecting…'
                                    : 'Save & Reconnect'}
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
    onAuthorize: PropTypes.func,
    onCreated: PropTypes.func
}

export default CustomMcpServerDialog
