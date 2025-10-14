import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, REMOVE_DIRTY } from '@/store/actions'
import { exportData, stringify } from '@/utils/exportImport'
import useNotifier from '@/utils/useNotifier'

// material-ui
import {
    Avatar,
    Box,
    Button,
    ButtonBase,
    Checkbox,
    Chip,
    ClickAwayListener,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Link,
    Switch,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popper,
    Stack,
    Typography
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import { PermissionListItemButton } from '@/ui-component/button/RBACButtons'
import MainCard from '@/ui-component/cards/MainCard'
import AboutDialog from '@/ui-component/dialog/AboutDialog'
import Transitions from '@/ui-component/extended/Transitions'

// assets
import ExportingGIF from '@/assets/images/Exporting.gif'
import { IconFileExport, IconFileUpload, IconInfoCircle, IconLogout, IconSettings, IconUserEdit, IconX } from '@tabler/icons-react'
import './index.css'

// API
import exportImportApi from '@/api/exportimport'

// Hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'
import { getErrorMessage } from '@/utils/errorHandler'

const dataToExport = [
    'Agentflows',
    'Agentflows V2',
    'Assistants Custom',
    'Assistants OpenAI',
    'Assistants Azure',
    'Chatflows',
    'Chat Messages',
    'Chat Feedbacks',
    'Custom Templates',
    'Document Stores',
    'Executions',
    'Tools',
    'Variables'
]

const getConflictKey = (conflict) => `${conflict.type}:${conflict.importId}`

const ExportDialog = ({ show, onCancel, onExport }) => {
    const portalElement = document.getElementById('portal')

    const [selectedData, setSelectedData] = useState(dataToExport)
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        if (show) setIsExporting(false)

        return () => {
            setIsExporting(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            onClose={!isExporting ? onCancel : undefined}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='export-dialog-title'
            aria-describedby='export-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='export-dialog-title'>
                {!isExporting ? 'Select Data to Export' : 'Exporting..'}
            </DialogTitle>
            <DialogContent>
                {!isExporting && (
                    <Stack
                        direction='row'
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 1
                        }}
                    >
                        {dataToExport.map((data, index) => (
                            <FormControlLabel
                                key={index}
                                size='small'
                                control={
                                    <Checkbox
                                        color='success'
                                        checked={selectedData.includes(data)}
                                        onChange={(event) => {
                                            setSelectedData(
                                                event.target.checked
                                                    ? [...selectedData, data]
                                                    : selectedData.filter((item) => item !== data)
                                            )
                                        }}
                                    />
                                }
                                label={data}
                            />
                        ))}
                    </Stack>
                )}
                {isExporting && (
                    <Box sx={{ height: 'auto', display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <img
                                style={{
                                    objectFit: 'cover',
                                    height: 'auto',
                                    width: 'auto'
                                }}
                                src={ExportingGIF}
                                alt='ExportingGIF'
                            />
                            <span>Exporting data might takes a while</span>
                        </div>
                    </Box>
                )}
            </DialogContent>
            {!isExporting && (
                <DialogActions>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        disabled={selectedData.length === 0}
                        variant='contained'
                        onClick={() => {
                            setIsExporting(true)
                            onExport(selectedData)
                        }}
                    >
                        Export
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ExportDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    onExport: PropTypes.func
}

const ImportReviewDialog = ({
    show,
    loading,
    conflicts,
    decisions,
    selections,
    onDecisionChange,
    onSelectionChange,
    onToggleAllSelections,
    onApplyAll,
    onCancel,
    onConfirm,
    disableConfirm
}) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()

    const allDuplicate =
        conflicts.length > 0 && conflicts.every((conflict) => decisions[getConflictKey(conflict)] === 'duplicate')
    const allSelected = conflicts.length > 0 && conflicts.every((conflict) => selections[getConflictKey(conflict)])

    const typeDisplayConfig = useMemo(
        () => ({
            AgentFlow: { label: 'Agent Flow', color: theme.palette.info.main },
            AgentFlowV2: { label: 'Agent Flow V2', color: theme.palette.info.dark },
            AssistantFlow: { label: 'Assistant Flow', color: theme.palette.success.main },
            AssistantCustom: { label: 'Custom Assistant', color: theme.palette.warning.main },
            AssistantOpenAI: { label: 'OpenAI Assistant', color: theme.palette.primary.main },
            AssistantAzure: { label: 'Azure Assistant', color: theme.palette.secondary.main },
            ChatFlow: { label: 'Chat Flow', color: theme.palette.primary.dark },
            CustomTemplate: { label: 'Custom Template', color: theme.palette.error.main },
            DocumentStore: { label: 'Document Store', color: theme.palette.secondary.dark },
            Tool: { label: 'Tool', color: theme.palette.success.dark },
            Variable: { label: 'Variable', color: theme.palette.warning.dark }
        }),
        [theme]
    )

    const groupedConflicts = useMemo(() => {
        const groups = new Map()
        conflicts.forEach((conflict) => {
            if (!groups.has(conflict.type)) {
                groups.set(conflict.type, [])
            }
            groups.get(conflict.type).push(conflict)
        })
        return Array.from(groups.entries())
    }, [conflicts])

    const getExistingLink = (conflict) => {
        const linkMap = {
            AgentFlow: `/agentcanvas/${conflict.existingId}`,
            AgentFlowV2: `/v2/agentcanvas/${conflict.existingId}`,
            AssistantFlow: `/canvas/${conflict.existingId}`,
            AssistantCustom: `/assistants/custom/${conflict.existingId}`,
            AssistantOpenAI: '/assistants/openai',
            AssistantAzure: '/assistants/openai',
            ChatFlow: `/canvas/${conflict.existingId}`,
            CustomTemplate: '/marketplaces',
            DocumentStore: `/document-stores/${conflict.existingId}`,
            Tool: '/tools',
            Variable: '/variables'
        }
        return linkMap[conflict.type]
    }

    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='md' aria-labelledby='import-review-dialog-title'>
            <DialogTitle sx={{ fontSize: '1rem' }} id='import-review-dialog-title'>
                Review Import
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant='body2' color='textSecondary'>
                            Analyzing imported data. This may take a moment.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant='body2'>
                            Flowise defaults to updating elements when a name conflict is detected. Use the controls below to
                            choose whether each conflicting element should be updated or duplicated.
                        </Typography>
                        {conflicts.length === 0 ? (
                            <Box>
                                <Typography variant='subtitle2'>No conflicts detected</Typography>
                                <Typography variant='body2' color='textSecondary'>
                                    All imported items will be added or updated automatically.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={2}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    justifyContent='space-between'
                                    spacing={1.5}
                                >
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                color='primary'
                                                checked={allSelected}
                                                onChange={(event) => onToggleAllSelections(event.target.checked)}
                                            />
                                        }
                                        label='Select all'
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                color='primary'
                                                checked={allDuplicate}
                                                onChange={(event) => onApplyAll(event.target.checked ? 'duplicate' : 'update')}
                                            />
                                        }
                                        label={
                                            allDuplicate
                                                ? 'Duplicate all conflicts'
                                                : 'Update conflicts by default'
                                        }
                                    />
                                </Stack>
                                <Stack spacing={1.5}>
                                    {groupedConflicts.map(([type, items]) => {
                                        const meta = typeDisplayConfig[type] || {
                                            label: type,
                                            color: theme.palette.grey[500]
                                        }
                                        const accentColor = meta.color || theme.palette.grey[500]
                                        const sectionBackground = alpha(
                                            accentColor,
                                            theme.palette.mode === 'dark' ? 0.16 : 0.08
                                        )
                                        const borderColor = alpha(accentColor, theme.palette.mode === 'dark' ? 0.4 : 0.25)
                                        const chipText = theme.palette.getContrastText(accentColor)

                                        return (
                                            <Box
                                                key={type}
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor,
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    backgroundColor: sectionBackground
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: { xs: 'column', sm: 'row' },
                                                        justifyContent: 'space-between',
                                                        alignItems: { xs: 'flex-start', sm: 'center' },
                                                        gap: 1,
                                                        px: 2,
                                                        py: 1.5,
                                                        borderBottom: items.length ? '1px solid' : 'none',
                                                        borderColor
                                                    }}
                                                >
                                                    <Stack direction='row' spacing={1} alignItems='center'>
                                                        <Chip
                                                            size='small'
                                                            label={meta.label}
                                                            sx={{ backgroundColor: accentColor, color: chipText }}
                                                        />
                                                        <Typography variant='caption' color='textSecondary'>
                                                            {items.length} conflict{items.length > 1 ? 's' : ''}
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                                <Stack spacing={1.5} sx={{ px: 2, py: 1.5 }}>
                                                    {items.map((conflict) => {
                                                        const key = getConflictKey(conflict)
                                                        const action = decisions[key] || 'update'
                                                        const isSelected = selections[key] || false
                                                        const existingLink = getExistingLink(conflict)

                                                        return (
                                                            <Box
                                                                key={key}
                                                                sx={{
                                                                    display: 'flex',
                                                                    flexDirection: { xs: 'column', sm: 'row' },
                                                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                                                    justifyContent: 'space-between',
                                                                    gap: 2,
                                                                    border: '1px solid',
                                                                    borderColor: isSelected
                                                                        ? 'divider'
                                                                        : alpha(theme.palette.divider, 0.4),
                                                                    borderRadius: 1.5,
                                                                    px: 2,
                                                                    py: 1.5,
                                                                    backgroundColor: isSelected
                                                                        ? theme.palette.background.paper
                                                                        : alpha(theme.palette.action.disabledBackground, 0.3),
                                                                    transition: 'background-color 0.2s ease'
                                                                }}
                                                            >
                                                                <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                                                                    <Checkbox
                                                                        color='primary'
                                                                        checked={isSelected}
                                                                        onChange={(event) =>
                                                                            onSelectionChange(conflict, event.target.checked)
                                                                        }
                                                                    />
                                                                    <Stack spacing={0.5}>
                                                                        <Typography variant='subtitle2'>
                                                                            {conflict.name}
                                                                        </Typography>
                                                                        <Typography variant='caption' color='textSecondary'>
                                                                            Existing ID:{' '}
                                                                            {existingLink ? (
                                                                                <Link
                                                                                    component={RouterLink}
                                                                                    to={existingLink}
                                                                                    target='_blank'
                                                                                    rel='noopener noreferrer'
                                                                                    sx={{ fontSize: '0.75rem' }}
                                                                                >
                                                                                    {conflict.existingId}
                                                                                </Link>
                                                                            ) : (
                                                                                conflict.existingId
                                                                            )}
                                                                        </Typography>
                                                                    </Stack>
                                                                </Stack>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Switch
                                                                            color='primary'
                                                                            checked={action === 'duplicate'}
                                                                            onChange={(event) =>
                                                                                onDecisionChange(
                                                                                    conflict,
                                                                                    event.target.checked
                                                                                        ? 'duplicate'
                                                                                        : 'update'
                                                                                )
                                                                            }
                                                                            disabled={!isSelected}
                                                                        />
                                                                    }
                                                                    label={action === 'duplicate' ? 'Duplicate' : 'Update'}
                                                                />
                                                            </Box>
                                                        )
                                                    })}
                                                </Stack>
                                            </Box>
                                        )
                                    })}
                                </Stack>
                            </Stack>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button variant='contained' onClick={onConfirm} disabled={loading || disableConfirm}>
                    Import
                </Button>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ImportReviewDialog.propTypes = {
    show: PropTypes.bool,
    loading: PropTypes.bool,
    conflicts: PropTypes.array,
    decisions: PropTypes.object,
    selections: PropTypes.object,
    onDecisionChange: PropTypes.func,
    onSelectionChange: PropTypes.func,
    onToggleAllSelections: PropTypes.func,
    onApplyAll: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    disableConfirm: PropTypes.bool
}

const ImportDialog = ({ show }) => {
    const portalElement = document.getElementById('portal')

    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='sm' aria-labelledby='import-dialog-title' aria-describedby='import-dialog-description'>
            <DialogTitle sx={{ fontSize: '1rem' }} id='import-dialog-title'>
                Importing...
            </DialogTitle>
            <DialogContent>
                <Box sx={{ height: 'auto', display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <img
                            style={{
                                objectFit: 'cover',
                                height: 'auto',
                                width: 'auto'
                            }}
                            src={ExportingGIF}
                            alt='ImportingGIF'
                        />
                        <span>Importing data might takes a while</span>
                    </div>
                </Box>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ImportDialog.propTypes = {
    show: PropTypes.bool
}

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = ({ handleLogout }) => {
    const theme = useTheme()

    const customization = useSelector((state) => state.customization)
    const { isCloud } = useConfig()

    const [open, setOpen] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [importReviewOpen, setImportReviewOpen] = useState(false)
    const [importConflicts, setImportConflicts] = useState([])
    const [conflictDecisions, setConflictDecisions] = useState({})
    const [conflictSelections, setConflictSelections] = useState({})
    const [pendingImportPayload, setPendingImportPayload] = useState(null)

    const anchorRef = useRef(null)
    const inputRef = useRef()

    const navigate = useNavigate()
    const currentUser = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const previewImportApi = useApi(exportImportApi.previewImportData)
    const importAllApi = useApi(exportImportApi.importData)
    const exportAllApi = useApi(exportImportApi.exportData)
    const prevOpen = useRef(open)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const errorFailed = (message) => {
        enqueueSnackbar({
            message: message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const fileChange = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                if (!evt?.target?.result) {
                    throw new Error('Empty file')
                }
                const body = JSON.parse(evt.target.result)
                setPendingImportPayload(body)
                setImportConflicts([])
                setConflictDecisions({})
                setConflictSelections({})
                setImportReviewOpen(true)
                previewImportApi.request(body)
            } catch (error) {
                setImportReviewOpen(false)
                setPendingImportPayload(null)
                setConflictSelections({})
                errorFailed(`Failed to read import file: ${getErrorMessage(error)}`)
            } finally {
                if (inputRef.current) inputRef.current.value = ''
            }
        }
        reader.onerror = () => {
            setImportReviewOpen(false)
            setPendingImportPayload(null)
            setConflictSelections({})
            errorFailed('Failed to read import file')
            if (inputRef.current) inputRef.current.value = ''
        }
        reader.readAsText(file)
    }

    const handleConflictDecisionChange = (conflict, action) => {
        setConflictDecisions((prev) => ({
            ...prev,
            [getConflictKey(conflict)]: action
        }))
    }

    const handleConflictSelectionChange = (conflict, isSelected) => {
        setConflictSelections((prev) => ({
            ...prev,
            [getConflictKey(conflict)]: isSelected
        }))
    }

    const handleSelectAllConflicts = (isSelected) => {
        setConflictSelections((prev) => {
            const updated = { ...prev }
            importConflicts.forEach((conflict) => {
                updated[getConflictKey(conflict)] = isSelected
            })
            return updated
        })
    }

    const handleApplyAllConflicts = (action) => {
        setConflictDecisions((prev) => {
            const updated = { ...prev }
            importConflicts.forEach((conflict) => {
                updated[getConflictKey(conflict)] = action
            })
            return updated
        })
    }

    const handleImportReviewCancel = () => {
        setImportReviewOpen(false)
        setPendingImportPayload(null)
        setImportConflicts([])
        setConflictDecisions({})
        setConflictSelections({})
        if (inputRef.current) inputRef.current.value = ''
    }

    const handleConfirmImport = () => {
        if (!pendingImportPayload) return
        const selectedConflicts = importConflicts.filter(
            (conflict) => conflictSelections[getConflictKey(conflict)]
        )
        const conflictResolutions = selectedConflicts.map((conflict) => ({
            type: conflict.type,
            importId: conflict.importId,
            existingId: conflict.existingId,
            action: conflictDecisions[getConflictKey(conflict)] || 'update'
        }))
        const payload = JSON.parse(JSON.stringify(pendingImportPayload))
        importConflicts.forEach((conflict) => {
            if (conflictSelections[getConflictKey(conflict)]) return
            const collection = payload[conflict.type]
            if (Array.isArray(collection)) {
                payload[conflict.type] = collection.filter((item) => item.id !== conflict.importId)
            }
        })
        const body = {
            ...payload,
            conflictResolutions
        }
        setImportDialogOpen(true)
        setImportReviewOpen(false)
        importAllApi.request(body)
    }

    const importAllSuccess = () => {
        setImportDialogOpen(false)
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `Import All successful`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const importAll = () => {
        inputRef.current.click()
    }

    useEffect(() => {
        if (previewImportApi.loading) return
        if (!importReviewOpen) return
        if (!pendingImportPayload) return
        if (!previewImportApi.data) return
        const conflicts = previewImportApi.data.conflicts || []
        setImportConflicts(conflicts)
        const initialDecisions = {}
        const initialSelections = {}
        conflicts.forEach((conflict) => {
            initialDecisions[getConflictKey(conflict)] = 'update'
            initialSelections[getConflictKey(conflict)] = false
        })
        setConflictDecisions(initialDecisions)
        setConflictSelections(initialSelections)
    }, [previewImportApi.data, previewImportApi.loading, importReviewOpen, pendingImportPayload])

    useEffect(() => {
        if (!previewImportApi.error) return
        setImportReviewOpen(false)
        setPendingImportPayload(null)
        setImportConflicts([])
        setConflictDecisions({})
        setConflictSelections({})
        let errMsg = 'Invalid Imported File'
        let error = previewImportApi.error
        if (error?.response?.data) {
            errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
        }
        errorFailed(`Failed to analyze import: ${errMsg}`)
        if (inputRef.current) inputRef.current.value = ''
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewImportApi.error])

    const onExport = (data) => {
        const body = {}
        if (data.includes('Agentflows')) body.agentflow = true
        if (data.includes('Agentflows V2')) body.agentflowv2 = true
        if (data.includes('Assistants Custom')) body.assistantCustom = true
        if (data.includes('Assistants OpenAI')) body.assistantOpenAI = true
        if (data.includes('Assistants Azure')) body.assistantAzure = true
        if (data.includes('Chatflows')) body.chatflow = true
        if (data.includes('Chat Messages')) body.chat_message = true
        if (data.includes('Chat Feedbacks')) body.chat_feedback = true
        if (data.includes('Custom Templates')) body.custom_template = true
        if (data.includes('Document Stores')) body.document_store = true
        if (data.includes('Executions')) body.execution = true
        if (data.includes('Tools')) body.tool = true
        if (data.includes('Variables')) body.variable = true

        exportAllApi.request(body)
    }

    useEffect(() => {
        if (importAllApi.data) {
            importAllSuccess()
            setPendingImportPayload(null)
            setImportConflicts([])
            setConflictDecisions({})
            setConflictSelections({})
            navigate(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.data])

    useEffect(() => {
        if (importAllApi.error) {
            setImportDialogOpen(false)
            setPendingImportPayload(null)
            setImportConflicts([])
            setConflictDecisions({})
            setConflictSelections({})
            let errMsg = 'Invalid Imported File'
            let error = importAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to import: ${errMsg}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.error])

    useEffect(() => {
        if (exportAllApi.data) {
            setExportDialogOpen(false)
            try {
                const dataStr = stringify(exportData(exportAllApi.data))
                //const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
                const blob = new Blob([dataStr], { type: 'application/json' })
                const dataUri = URL.createObjectURL(blob)

                const linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportAllApi.data.FileDefaultName)
                linkElement.click()
            } catch (error) {
                errorFailed(`Failed to export all: ${getErrorMessage(error)}`)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.data])

    useEffect(() => {
        if (exportAllApi.error) {
            setExportDialogOpen(false)
            let errMsg = 'Internal Server Error'
            let error = exportAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to export: ${errMsg}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.error])

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }
        prevOpen.current = open
    }, [open])

    return (
        <>
            <ButtonBase ref={anchorRef} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Avatar
                    variant='rounded'
                    sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        transition: 'all .2s ease-in-out',
                        background: theme.palette.secondary.light,
                        color: theme.palette.secondary.dark,
                        '&:hover': {
                            background: theme.palette.secondary.dark,
                            color: theme.palette.secondary.light
                        }
                    }}
                    onClick={handleToggle}
                    color='inherit'
                >
                    <IconSettings stroke={1.5} size='1.3rem' />
                </Avatar>
            </ButtonBase>
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 14]
                            }
                        }
                    ]
                }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    {isAuthenticated && currentUser ? (
                                        <Box sx={{ p: 2 }}>
                                            <Typography component='span' variant='h4'>
                                                {currentUser.name}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 2 }}>
                                            <Typography component='span' variant='h4'>
                                                User
                                            </Typography>
                                        </Box>
                                    )}
                                    <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                                        <Box sx={{ p: 2 }}>
                                            <Divider />
                                            <List
                                                component='nav'
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 250,
                                                    minWidth: 200,
                                                    backgroundColor: theme.palette.background.paper,
                                                    borderRadius: '10px',
                                                    [theme.breakpoints.down('md')]: {
                                                        minWidth: '100%'
                                                    },
                                                    '& .MuiListItemButton-root': {
                                                        mt: 0.5
                                                    }
                                                }}
                                            >
                                                <PermissionListItemButton
                                                    permissionId='workspace:export'
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        setExportDialogOpen(true)
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileExport stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Export</Typography>} />
                                                </PermissionListItemButton>
                                                <PermissionListItemButton
                                                    permissionId='workspace:import'
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        importAll()
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileUpload stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Import</Typography>} />
                                                </PermissionListItemButton>
                                                <input ref={inputRef} type='file' hidden onChange={fileChange} accept='.json' />
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        setOpen(false)
                                                        setAboutDialogOpen(true)
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconInfoCircle stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Version</Typography>} />
                                                </ListItemButton>
                                                {isAuthenticated && !currentUser.isSSO && !isCloud && (
                                                    <ListItemButton
                                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                        onClick={() => {
                                                            setOpen(false)
                                                            navigate('/user-profile')
                                                        }}
                                                    >
                                                        <ListItemIcon>
                                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                                        </ListItemIcon>
                                                        <ListItemText primary={<Typography variant='body2'>Update Profile</Typography>} />
                                                    </ListItemButton>
                                                )}
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={handleLogout}
                                                >
                                                    <ListItemIcon>
                                                        <IconLogout stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Logout</Typography>} />
                                                </ListItemButton>
                                            </List>
                                        </Box>
                                    </PerfectScrollbar>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
            <ExportDialog show={exportDialogOpen} onCancel={() => setExportDialogOpen(false)} onExport={(data) => onExport(data)} />
            <ImportReviewDialog
                show={importReviewOpen}
                loading={previewImportApi.loading}
                conflicts={importConflicts}
                decisions={conflictDecisions}
                selections={conflictSelections}
                onDecisionChange={handleConflictDecisionChange}
                onSelectionChange={handleConflictSelectionChange}
                onToggleAllSelections={handleSelectAllConflicts}
                onApplyAll={handleApplyAllConflicts}
                onCancel={handleImportReviewCancel}
                onConfirm={handleConfirmImport}
                disableConfirm={!pendingImportPayload}
            />
            <ImportDialog show={importDialogOpen} />
        </>
    )
}

ProfileSection.propTypes = {
    handleLogout: PropTypes.func
}

export default ProfileSection
