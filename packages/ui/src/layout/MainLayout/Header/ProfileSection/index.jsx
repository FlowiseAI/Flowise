import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, REMOVE_DIRTY } from '@/store/actions'
import { exportData, stringify } from '@/utils/exportImport'
import useNotifier from '@/utils/useNotifier'

// material-ui
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
    Tab,
    Tabs,
    Typography
} from '@mui/material'
import { alpha, lighten, useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

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

const importTypeLabels = {
    AgentFlow: 'Agent Flow',
    AgentFlowV2: 'Agent Flow V2',
    AssistantFlow: 'Assistant Flow',
    AssistantCustom: 'Custom Assistant',
    AssistantOpenAI: 'OpenAI Assistant',
    AssistantAzure: 'Azure Assistant',
    ChatFlow: 'Chat Flow',
    ChatMessage: 'Chat Message',
    ChatMessageFeedback: 'Chat Message Feedback',
    CustomTemplate: 'Custom Template',
    DocumentStore: 'Document Store',
    DocumentStoreFileChunk: 'Document Store File Chunk',
    Execution: 'Execution',
    Tool: 'Tool',
    Variable: 'Variable'
}

const childParentMappings = {
    ChatMessage: {
        parentIdField: 'chatflowid',
        parentTypes: [
            'AgentFlow',
            'AgentFlowV2',
            'AssistantCustom',
            'AssistantFlow',
            'AssistantOpenAI',
            'AssistantAzure',
            'ChatFlow'
        ]
    },
    ChatMessageFeedback: {
        parentIdField: 'chatflowid',
        parentTypes: [
            'AgentFlow',
            'AgentFlowV2',
            'AssistantCustom',
            'AssistantFlow',
            'AssistantOpenAI',
            'AssistantAzure',
            'ChatFlow'
        ]
    },
    Execution: {
        parentIdField: 'agentflowId',
        parentTypes: ['AgentFlowV2']
    },
    DocumentStoreFileChunk: {
        parentIdField: 'storeId',
        parentTypes: ['DocumentStore']
    }
}

const resolveParentDetails = (type, item, lookupById) => {
    const mapping = childParentMappings[type]
    if (!mapping || !item) return null

    const parentId = item[mapping.parentIdField]
    if (!parentId) return null

    const parentInfo = lookupById.get(parentId)
    if (parentInfo && (!mapping.parentTypes || mapping.parentTypes.includes(parentInfo.type))) {
        return {
            id: parentId,
            type: parentInfo.type,
            name: parentInfo.name,
            label: importTypeLabels[parentInfo.type] || parentInfo.type,
            isExisting: false
        }
    }

    const fallbackType = parentInfo?.type && (!mapping.parentTypes || mapping.parentTypes.includes(parentInfo.type))
        ? parentInfo.type
        : mapping.parentTypes && mapping.parentTypes.length === 1
        ? mapping.parentTypes[0]
        : parentInfo?.type

    return {
        id: parentId,
        type: fallbackType,
        name: parentInfo?.name,
        label: fallbackType ? importTypeLabels[fallbackType] || fallbackType : undefined,
        isExisting: !parentInfo
    }
}

const getConflictKey = (conflict = {}) => {
    const { type, existingId, importId, id, name } = conflict
    return [type, existingId, importId ?? id ?? name].filter(Boolean).join(':')
}

const getImportItemKey = (item = {}) => {
    const { type, importId, id, name } = item
    return [type, importId ?? id ?? name].filter(Boolean).join(':')
}

const getImportItemName = (type, item) => {
    if (!item) return ''
    if (item.name) return item.name
    if (item.label) return item.label
    if (item.title) return item.title
    if (item.details) {
        try {
            const parsedDetails = typeof item.details === 'string' ? JSON.parse(item.details) : item.details
            if (parsedDetails && typeof parsedDetails === 'object') {
                if (parsedDetails.name) return parsedDetails.name
                if (parsedDetails.title) return parsedDetails.title
            }
        } catch (error) {
            // ignore json parse error and fall back to id
        }
    }
    return item.id || `${type} item`
}

const CLONE_NAME_SUFFIX = ' - clone'

const appendCloneSuffix = (value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trimEnd()
    if (!trimmed) return value
    if (trimmed.toLowerCase().endsWith(CLONE_NAME_SUFFIX)) return trimmed
    return `${trimmed}${CLONE_NAME_SUFFIX}`
}

const applyCloneSuffixToObject = (object) => {
    if (!object || typeof object !== 'object') return { value: object, changed: false }
    const updated = { ...object }
    let changed = false
    const fields = ['name', 'label', 'title']
    fields.forEach((key) => {
        if (typeof updated[key] === 'string' && updated[key].trim().length > 0) {
            const nextValue = appendCloneSuffix(updated[key])
            if (nextValue !== updated[key]) {
                updated[key] = nextValue
                changed = true
            }
        }
    })
    return { value: updated, changed }
}

const applyCloneSuffixToItem = (item) => {
    if (!item || typeof item !== 'object') return item
    const updated = { ...item }
    let changed = false

    const fields = ['name', 'label', 'title']
    fields.forEach((key) => {
        if (typeof updated[key] === 'string' && updated[key].trim().length > 0) {
            const nextValue = appendCloneSuffix(updated[key])
            if (nextValue !== updated[key]) {
                updated[key] = nextValue
                changed = true
            }
        }
    })

    if (updated.details) {
        if (typeof updated.details === 'string') {
            try {
                const parsed = JSON.parse(updated.details)
                const { value: transformedDetails, changed: detailsChanged } = applyCloneSuffixToObject(parsed)
                if (detailsChanged) {
                    updated.details = JSON.stringify(transformedDetails)
                    changed = true
                }
            } catch (error) {
                // ignore malformed JSON details
            }
        } else if (typeof updated.details === 'object') {
            const { value: transformedDetails, changed: detailsChanged } = applyCloneSuffixToObject(updated.details)
            if (detailsChanged) {
                updated.details = transformedDetails
                changed = true
            }
        }
    }

    return changed ? updated : item
}

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
    newItems,
    decisions,
    conflictSelections,
    newItemSelections,
    onDecisionChange,
    onConflictSelectionChange,
    onNewItemSelectionChange,
    onToggleAllConflicts,
    onApplyAll,
    onToggleAllNewItems,
    onCancel,
    onConfirm,
    disableConfirm
}) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    const [activeTab, setActiveTab] = useState(0)
    const [expandedSections, setExpandedSections] = useState({})

    const allDuplicate =
        conflicts.length > 0 && conflicts.every((conflict) => decisions[getConflictKey(conflict)] === 'duplicate')
    const allConflictsSelected =
        conflicts.length > 0 && conflicts.every((conflict) => conflictSelections[getConflictKey(conflict)])
    const allNewItemsSelected =
        newItems.length > 0 && newItems.every((item) => newItemSelections[getImportItemKey(item)])

    const collapsibleTypes = useMemo(
        () =>
            new Set([
                'AgentFlow',
                'AgentFlowV2',
                'AssistantFlow',
                'AssistantCustom',
                'AssistantOpenAI',
                'AssistantAzure',
                'ChatFlow',
                'ChatMessage',
                'ChatMessageFeedback',
                'CustomTemplate',
                'DocumentStore',
                'DocumentStoreFileChunk',
                'Execution',
                'Tool',
                'Variable'
            ]),
        []
    )

    const parentGroupingTypes = useMemo(() => new Set(Object.keys(childParentMappings)), [])

    useEffect(() => {
        if (!show) return
        if (conflicts.length > 0) {
            setActiveTab(0)
            return
        }
        if (newItems.length > 0) {
            setActiveTab(1)
            return
        }
        setActiveTab(0)
    }, [show, conflicts.length, newItems.length])

    useEffect(() => {
        if (show) return
        setExpandedSections({})
    }, [show])

    const handleSectionToggle = useCallback((type, isExpanded) => {
        setExpandedSections((prev) => ({
            ...prev,
            [type]: isExpanded
        }))
    }, [])

    const typeDisplayConfig = useMemo(
        () => ({
            AgentFlow: { label: importTypeLabels.AgentFlow, color: theme.palette.info.main },
            AgentFlowV2: { label: importTypeLabels.AgentFlowV2, color: theme.palette.info.dark },
            AssistantFlow: { label: importTypeLabels.AssistantFlow, color: theme.palette.success.main },
            AssistantCustom: { label: importTypeLabels.AssistantCustom, color: theme.palette.warning.main },
            AssistantOpenAI: { label: importTypeLabels.AssistantOpenAI, color: theme.palette.primary.main },
            AssistantAzure: { label: importTypeLabels.AssistantAzure, color: theme.palette.secondary.main },
            ChatFlow: { label: importTypeLabels.ChatFlow, color: theme.palette.primary.dark },
            ChatMessage: { label: importTypeLabels.ChatMessage, color: theme.palette.primary.light },
            ChatMessageFeedback: {
                label: importTypeLabels.ChatMessageFeedback,
                color: theme.palette.info.main
            },
            CustomTemplate: { label: importTypeLabels.CustomTemplate, color: theme.palette.error.main },
            DocumentStore: { label: importTypeLabels.DocumentStore, color: theme.palette.secondary.dark },
            DocumentStoreFileChunk: {
                label: importTypeLabels.DocumentStoreFileChunk,
                color: theme.palette.secondary.light
            },
            Execution: { label: importTypeLabels.Execution, color: theme.palette.info.light },
            Tool: { label: importTypeLabels.Tool, color: theme.palette.success.dark },
            Variable: { label: importTypeLabels.Variable, color: theme.palette.warning.dark }
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

    const groupedNewItems = useMemo(() => {
        const groups = new Map()
        newItems.forEach((item) => {
            if (!groups.has(item.type)) {
                groups.set(item.type, [])
            }
            groups.get(item.type).push(item)
        })
        return Array.from(groups.entries())
    }, [newItems])

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
                            Flowise defaults to updating elements when a name conflict is detected. Use the tabs below to review
                            conflicts and new items before completing the import.
                        </Typography>
                        <Tabs
                            value={activeTab}
                            onChange={(event, value) => setActiveTab(value)}
                            variant='fullWidth'
                            sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}
                        >
                            <Tab label={`Conflicts (${conflicts.length})`} />
                            <Tab label={`New Items (${newItems.length})`} />
                        </Tabs>
                        {activeTab === 0 ? (
                            conflicts.length === 0 ? (
                                <Box>
                                    <Typography variant='subtitle2'>No conflicts detected</Typography>
                                    <Typography variant='body2' color='textSecondary'>
                                        All imported items without conflicts will be created automatically.
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
                                                    checked={allConflictsSelected}
                                                    onChange={(event) => onToggleAllConflicts(event.target.checked)}
                                                />
                                            }
                                            label='Select all'
                                        />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    color='primary'
                                                    checked={allDuplicate}
                                                    onChange={(event) =>
                                                        onApplyAll(event.target.checked ? 'duplicate' : 'update')
                                                    }
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
                                            const borderColor = alpha(
                                                accentColor,
                                                theme.palette.mode === 'dark' ? 0.4 : 0.25
                                            )
                                            const chipText = theme.palette.getContrastText(accentColor)

                                            const isCollapsible = collapsibleTypes.has(type)
                                            const headerContent = (
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
                                            )
                                            const renderItems = (
                                                <Stack spacing={1.5} sx={{ px: 2, py: 1.5 }}>
                                                    {items.map((conflict) => {
                                                        const key = getConflictKey(conflict)
                                                        const action = decisions[key] || 'update'
                                                        const isSelected = conflictSelections[key] || false
                                                        const existingLink = getExistingLink(conflict)
                                                        const rawName =
                                                            conflict.name ?? conflict.importId ?? conflict.type ?? ''
                                                        const baseName =
                                                            typeof rawName === 'string' ? rawName : String(rawName)
                                                        const displayName =
                                                            action === 'duplicate'
                                                                ? appendCloneSuffix(baseName)
                                                                : baseName
                                                        const inactiveBackground = lighten(
                                                            sectionBackground || alpha(theme.palette.action.disabledBackground, 0.3),
                                                            theme.palette.mode === 'dark' ? 0.08 : 0.24
                                                        )
                                                        const activeBackground = alpha(
                                                            accentColor,
                                                            theme.palette.mode === 'dark' ? 0.28 : 0.14
                                                        )
                                                        const activeBorder = alpha(
                                                            accentColor,
                                                            theme.palette.mode === 'dark' ? 0.7 : 0.5
                                                        )
                                                        const hoverBackground = lighten(
                                                            inactiveBackground,
                                                            theme.palette.mode === 'dark' ? 0.04 : 0.1
                                                        )

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
                                                                            ? activeBorder
                                                                            : alpha(theme.palette.divider, 0.4),
                                                                        borderRadius: 1.5,
                                                                        px: 2,
                                                                        py: 1.5,
                                                                        backgroundColor: isSelected
                                                                            ? activeBackground
                                                                            : inactiveBackground,
                                                                        transition: 'background-color 0.2s ease',
                                                                        '&:hover': {
                                                                            backgroundColor: isSelected
                                                                                ? activeBackground
                                                                                : hoverBackground
                                                                        }
                                                                    }}
                                                                >
                                                                    <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                                                                        <Checkbox
                                                                            color='primary'
                                                                            checked={isSelected}
                                                                            onChange={(event) =>
                                                                                onConflictSelectionChange(
                                                                                    conflict,
                                                                                    event.target.checked
                                                                                )
                                                                            }
                                                                        />
                                                                            <Stack spacing={0.5}>
                                                                                <Typography variant='subtitle2'>
                                                                                    {displayName}
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
                                                                        label={
                                                                            action === 'duplicate'
                                                                                ? 'Duplicate'
                                                                                : 'Update'
                                                                        }
                                                                    />
                                                                </Box>
                                                        )
                                                    })}
                                                </Stack>
                                            )

                                            if (isCollapsible) {
                                                const expanded = expandedSections[type] ?? false
                                                return (
                                                    <Accordion
                                                        key={`conflict-${type}`}
                                                        disableGutters
                                                        square
                                                        expanded={expanded}
                                                        onChange={(_, isExpanded) => handleSectionToggle(type, isExpanded)}
                                                        sx={{
                                                            border: '1px solid',
                                                            borderColor,
                                                            borderRadius: 2,
                                                            backgroundColor: sectionBackground,
                                                            boxShadow: 'none',
                                                            overflow: 'hidden',
                                                            '&:before': { display: 'none' },
                                                            '&.Mui-expanded': {
                                                                margin: 0
                                                            }
                                                        }}
                                                    >
                                                        <AccordionSummary
                                                            expandIcon={<ExpandMoreIcon />}
                                                            sx={{
                                                                px: 2,
                                                                py: 1.5,
                                                                '& .MuiAccordionSummary-content': {
                                                                    margin: 0,
                                                                    display: 'flex',
                                                                    flexDirection: { xs: 'column', sm: 'row' },
                                                                    justifyContent: 'space-between',
                                                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                                                    gap: 1
                                                                }
                                                            }}
                                                        >
                                                            {headerContent}
                                                        </AccordionSummary>
                                                        <AccordionDetails sx={{ px: 0, py: 0 }}>{renderItems}</AccordionDetails>
                                                    </Accordion>
                                                )
                                            }

                                            return (
                                                <Box
                                                    key={`conflict-${type}`}
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
                                                        {headerContent}
                                                    </Box>
                                                    {renderItems}
                                                </Box>
                                            )
                                        })}
                                    </Stack>
                                </Stack>
                            )
                        ) : newItems.length === 0 ? (
                            <Box>
                                <Typography variant='subtitle2'>No new items detected</Typography>
                                <Typography variant='body2' color='textSecondary'>
                                    Only existing items with conflicts require review.
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
                                                checked={allNewItemsSelected}
                                                onChange={(event) => onToggleAllNewItems(event.target.checked)}
                                            />
                                        }
                                        label='Select all'
                                    />
                                    <Typography variant='body2' color='textSecondary'>
                                        Selected items will be created in your workspace.
                                    </Typography>
                                </Stack>
                                <Stack spacing={1.5}>
                                    {groupedNewItems.map(([type, items]) => {
                                        const meta = typeDisplayConfig[type] || {
                                            label: type,
                                            color: theme.palette.grey[500]
                                        }
                                        const accentColor = meta.color || theme.palette.grey[500]
                                        const sectionBackground = alpha(
                                            accentColor,
                                            theme.palette.mode === 'dark' ? 0.16 : 0.08
                                        )
                                        const borderColor = alpha(
                                            accentColor,
                                            theme.palette.mode === 'dark' ? 0.4 : 0.25
                                        )
                                        const chipText = theme.palette.getContrastText(accentColor)

                                        const isCollapsible = collapsibleTypes.has(type)
                                        const headerContent = (
                                            <Stack direction='row' spacing={1} alignItems='center'>
                                                <Chip
                                                    size='small'
                                                    label={meta.label}
                                                    sx={{ backgroundColor: accentColor, color: chipText }}
                                                />
                                                <Typography variant='caption' color='textSecondary'>
                                                    {items.length} item{items.length > 1 ? 's' : ''}
                                                </Typography>
                                            </Stack>
                                        )
                                        const renderItems = (() => {
                                            const renderNewItemRow = (item) => {
                                                const key = getImportItemKey(item)
                                                const isSelected = newItemSelections[key] || false
                                                const inactiveBackground = lighten(
                                                    sectionBackground || alpha(theme.palette.action.disabledBackground, 0.3),
                                                    theme.palette.mode === 'dark' ? 0.08 : 0.24
                                                )
                                                const activeBackground = alpha(
                                                    accentColor,
                                                    theme.palette.mode === 'dark' ? 0.28 : 0.14
                                                )
                                                const activeBorder = alpha(
                                                    accentColor,
                                                    theme.palette.mode === 'dark' ? 0.7 : 0.5
                                                )
                                                const hoverBackground = lighten(
                                                    inactiveBackground,
                                                    theme.palette.mode === 'dark' ? 0.04 : 0.1
                                                )
                                                const detailParts = [`Import ID: ${item.importId}`]
                                                if (parentGroupingTypes.has(type) && item.parent) {
                                                    if (!item.parent.name && item.parent.id) {
                                                        detailParts.push(`Parent ID: ${item.parent.id}`)
                                                    }
                                                    if (item.parent.isExisting) {
                                                        detailParts.push('Parent in workspace')
                                                    }
                                                }

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
                                                                ? activeBorder
                                                                : alpha(theme.palette.divider, 0.4),
                                                            borderRadius: 1.5,
                                                            px: 2,
                                                            py: 1.5,
                                                            backgroundColor: isSelected
                                                                ? activeBackground
                                                                : inactiveBackground,
                                                            transition: 'background-color 0.2s ease',
                                                            '&:hover': {
                                                                backgroundColor: isSelected
                                                                    ? activeBackground
                                                                    : hoverBackground
                                                            }
                                                        }}
                                                    >
                                                        <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                                                            <Checkbox
                                                                color='primary'
                                                                checked={isSelected}
                                                                onChange={(event) =>
                                                                    onNewItemSelectionChange(
                                                                        item,
                                                                        event.target.checked
                                                                    )
                                                                }
                                                            />
                                                            <Stack spacing={0.5}>
                                                                <Typography variant='subtitle2'>
                                                                    {item.name}
                                                                </Typography>
                                                                <Typography variant='caption' color='textSecondary'>
                                                                    {detailParts.join(' • ')}
                                                                </Typography>
                                                            </Stack>
                                                        </Stack>
                                                    </Box>
                                                )
                                            }

                                            if (!parentGroupingTypes.has(type)) {
                                                return (
                                                    <Stack spacing={1.5} sx={{ px: 2, py: 1.5 }}>
                                                        {items.map((item) => renderNewItemRow(item))}
                                                    </Stack>
                                                )
                                            }

                                            const parentGroups = new Map()
                                            items.forEach((item) => {
                                                const parent = item.parent || null
                                                const parentKey = parent
                                                    ? `${parent.type || 'unknown'}:${parent.id || 'no-id'}`
                                                    : 'no-parent'
                                                if (!parentGroups.has(parentKey)) {
                                                    parentGroups.set(parentKey, { parent, items: [] })
                                                }
                                                parentGroups.get(parentKey).items.push(item)
                                            })

                                            const sortedParentGroups = Array.from(parentGroups.entries()).sort(([, groupA], [, groupB]) => {
                                                const labelA = groupA.parent?.name
                                                    || groupA.parent?.label
                                                    || groupA.parent?.id
                                                    || ''
                                                const labelB = groupB.parent?.name
                                                    || groupB.parent?.label
                                                    || groupB.parent?.id
                                                    || ''
                                                return labelA.localeCompare(labelB)
                                            })

                                            const getParentDisplayName = (parent) => {
                                                if (!parent) return 'Parent not found'
                                                if (parent.name) return parent.name
                                                if (parent.label && parent.id) return `${parent.label} (${parent.id})`
                                                if (parent.label) return parent.label
                                                if (parent.id) return `Parent ID: ${parent.id}`
                                                return 'Parent not found'
                                            }

                                            const getParentCaption = (parent) => {
                                                if (!parent) return 'No parent reference available'
                                                const details = []
                                                if (parent.label) details.push(parent.label)
                                                if (parent.id) details.push(`ID: ${parent.id}`)
                                                if (parent.isExisting) details.push('Existing workspace item')
                                                return details.join(' • ')
                                            }

                                            return (
                                                <Stack spacing={1.75} sx={{ px: 2, py: 1.5 }}>
                                                    {sortedParentGroups.map(([parentKey, group]) => {
                                                        const parent = group.parent
                                                        const caption = getParentCaption(parent)
                                                        const groupKeys = group.items.map((item) => getImportItemKey(item))
                                                        const groupSelections = groupKeys.map((key) => newItemSelections[key] || false)
                                                        const allGroupSelected = groupSelections.every((selected) => selected)
                                                        const someGroupSelected = groupSelections.some((selected) => selected)
                                                        const handleGroupToggle = (checked) => {
                                                            group.items.forEach((item) => {
                                                                const key = getImportItemKey(item)
                                                                const current = newItemSelections[key] || false
                                                                if (current !== checked) {
                                                                    onNewItemSelectionChange(item, checked)
                                                                }
                                                            })
                                                        }

                                                        return (
                                                            <Stack key={parentKey} spacing={1.25}>
                                                                <Stack
                                                                    direction={{ xs: 'column', sm: 'row' }}
                                                                    spacing={{ xs: 0.5, sm: 1 }}
                                                                    justifyContent='space-between'
                                                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                                >
                                                                    <Stack spacing={0.25}>
                                                                        <Typography variant='subtitle2'>
                                                                            {getParentDisplayName(parent)}
                                                                        </Typography>
                                                                        {caption && (
                                                                            <Typography variant='caption' color='textSecondary'>
                                                                                {caption}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Checkbox
                                                                                color='primary'
                                                                                checked={allGroupSelected}
                                                                                indeterminate={!allGroupSelected && someGroupSelected}
                                                                                onChange={(event) => handleGroupToggle(event.target.checked)}
                                                                            />
                                                                        }
                                                                        label='Select all'
                                                                    />
                                                                </Stack>
                                                                <Stack spacing={1.25}>
                                                                    {group.items.map((item) => renderNewItemRow(item))}
                                                                </Stack>
                                                            </Stack>
                                                        )
                                                    })}
                                                </Stack>
                                            )
                                        })()

                                        if (isCollapsible) {
                                            const expanded = expandedSections[type] ?? false
                                            return (
                                                <Accordion
                                                    key={`new-${type}`}
                                                    disableGutters
                                                    square
                                                    expanded={expanded}
                                                    onChange={(_, isExpanded) => handleSectionToggle(type, isExpanded)}
                                                    sx={{
                                                        border: '1px solid',
                                                        borderColor,
                                                        borderRadius: 2,
                                                        backgroundColor: sectionBackground,
                                                        boxShadow: 'none',
                                                        overflow: 'hidden',
                                                        '&:before': { display: 'none' },
                                                        '&.Mui-expanded': {
                                                            margin: 0
                                                        }
                                                    }}
                                                >
                                                    <AccordionSummary
                                                        expandIcon={<ExpandMoreIcon />}
                                                        sx={{
                                                            px: 2,
                                                            py: 1.5,
                                                            '& .MuiAccordionSummary-content': {
                                                                margin: 0,
                                                                display: 'flex',
                                                                flexDirection: { xs: 'column', sm: 'row' },
                                                                justifyContent: 'space-between',
                                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                                gap: 1
                                                            }
                                                        }}
                                                    >
                                                        {headerContent}
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ px: 0, py: 0 }}>{renderItems}</AccordionDetails>
                                                </Accordion>
                                            )
                                        }

                                        return (
                                            <Box
                                                key={`new-${type}`}
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
                                                    {headerContent}
                                                </Box>
                                                {renderItems}
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
    newItems: PropTypes.array,
    decisions: PropTypes.object,
    conflictSelections: PropTypes.object,
    newItemSelections: PropTypes.object,
    onDecisionChange: PropTypes.func,
    onConflictSelectionChange: PropTypes.func,
    onNewItemSelectionChange: PropTypes.func,
    onToggleAllConflicts: PropTypes.func,
    onApplyAll: PropTypes.func,
    onToggleAllNewItems: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    disableConfirm: PropTypes.bool
}

const ImportDialog = ({ show, status, summary, onClose }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()

    const isProcessing = status === 'processing'

    const summaryGroups = useMemo(
        () => [
            { key: 'created', title: 'New items created', palette: theme.palette.success },
            { key: 'duplicated', title: 'Items duplicated', palette: theme.palette.info },
            { key: 'updated', title: 'Existing items updated', palette: theme.palette.primary },
            { key: 'skipped', title: 'Items skipped', palette: theme.palette.warning }
        ],
        [theme]
    )

    const totalSummaryItems = useMemo(() => {
        if (!summary) return 0
        return summaryGroups.reduce((total, group) => total + (summary[group.key]?.length || 0), 0)
    }, [summary, summaryGroups])

    const handleDialogClose = (event, reason) => {
        if (isProcessing) return
        if (onClose) onClose(event, reason)
    }

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='sm'
            onClose={handleDialogClose}
            aria-labelledby='import-dialog-title'
            aria-describedby='import-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='import-dialog-title'>
                {isProcessing ? 'Importing...' : 'Import complete'}
            </DialogTitle>
            <DialogContent dividers>
                {isProcessing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                        <img
                            style={{
                                objectFit: 'cover',
                                height: 'auto',
                                width: 'auto'
                            }}
                            src={ExportingGIF}
                            alt='ImportingGIF'
                        />
                        <Typography variant='body2' sx={{ mt: 2 }}>
                            Importing data might take a little while. You can continue working in the meantime.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={3} alignItems='center' sx={{ py: 1 }}>
                        <CheckCircleOutlineIcon color='success' sx={{ fontSize: 40 }} />
                        <Typography variant='body1' align='center'>
                            Your import finished successfully.
                        </Typography>
                        {summary && totalSummaryItems > 0 ? (
                            <Stack spacing={2} sx={{ width: '100%' }}>
                                {summaryGroups.map((group) => {
                                    const items = summary[group.key] || []
                                    if (!items.length) return null
                                    const backgroundColor = alpha(
                                        group.palette.main,
                                        theme.palette.mode === 'dark' ? 0.16 : 0.08
                                    )
                                    const borderColor = alpha(
                                        group.palette.main,
                                        theme.palette.mode === 'dark' ? 0.4 : 0.25
                                    )
                                    const hoverColor = lighten(
                                        backgroundColor,
                                        theme.palette.mode === 'dark' ? 0.08 : 0.18
                                    )

                                    return (
                                        <Stack key={group.key} spacing={1.5}>
                                            <Typography variant='subtitle2'>
                                                {group.title} ({items.length})
                                            </Typography>
                                            <Stack spacing={1.25}>
                                                {items.map((item) => {
                                                    const typeLabel = importTypeLabels[item.type] || item.type
                                                    const title = item.name || typeLabel || 'Untitled item'
                                                    const details = [typeLabel]
                                                    if (item.importId) details.push(`Import ID: ${item.importId}`)
                                                    if (item.existingId) details.push(`Existing ID: ${item.existingId}`)
                                                    if (group.key === 'skipped') {
                                                        if (item.reason === 'conflict') details.push('Conflict not selected')
                                                        if (item.reason === 'new') details.push('New item not selected')
                                                        if (item.reason === 'dependency') {
                                                            const parentLabel =
                                                                (item.parent && (item.parent.label || importTypeLabels[item.parent.type])) ||
                                                                (item.parent && item.parent.type) ||
                                                                'Parent'
                                                            const parentName = item.parent?.name ? ` (${item.parent.name})` : ''
                                                            details.push(`Parent not selected: ${parentLabel}${parentName}`)
                                                            if (item.parent?.id) {
                                                                details.push(`Parent ID: ${item.parent.id}`)
                                                            }
                                                        }
                                                    }
                                                    return (
                                                        <Box
                                                            key={`${group.key}-${item.type}-${item.importId || title}-${item.existingId || ''}`}
                                                            sx={{
                                                                border: '1px solid',
                                                                borderColor,
                                                                borderRadius: 1.5,
                                                                px: 2,
                                                                py: 1.25,
                                                                backgroundColor,
                                                                transition: 'background-color 0.2s ease',
                                                                '&:hover': {
                                                                    backgroundColor: hoverColor
                                                                }
                                                            }}
                                                        >
                                                            <Typography variant='subtitle2'>{title}</Typography>
                                                            <Typography variant='caption' color='textSecondary'>
                                                                {details.join(' • ')}
                                                            </Typography>
                                                        </Box>
                                                    )
                                                })}
                                            </Stack>
                                        </Stack>
                                    )
                                })}
                            </Stack>
                        ) : (
                            <Typography variant='body2' color='textSecondary' align='center'>
                                No items were selected for import.
                            </Typography>
                        )}
                    </Stack>
                )}
            </DialogContent>
            {!isProcessing && (
                <DialogActions>
                    <Button variant='contained' onClick={onClose} autoFocus>
                        Close
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ImportDialog.propTypes = {
    show: PropTypes.bool,
    status: PropTypes.oneOf(['idle', 'processing', 'success']),
    summary: PropTypes.shape({
        created: PropTypes.array,
        duplicated: PropTypes.array,
        updated: PropTypes.array,
        skipped: PropTypes.array
    }),
    onClose: PropTypes.func
}

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = ({ handleLogout }) => {
    const theme = useTheme()

    const customization = useSelector((state) => state.customization)

    const [open, setOpen] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [importReviewOpen, setImportReviewOpen] = useState(false)
    const [importConflicts, setImportConflicts] = useState([])
    const [importNewItems, setImportNewItems] = useState([])
    const [conflictDecisions, setConflictDecisions] = useState({})
    const [conflictSelections, setConflictSelections] = useState({})
    const [newItemSelections, setNewItemSelections] = useState({})
    const [pendingImportPayload, setPendingImportPayload] = useState(null)
    const [importSummary, setImportSummary] = useState(null)
    const [importStatus, setImportStatus] = useState('idle')
    const [shouldReloadAfterImport, setShouldReloadAfterImport] = useState(false)

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
                setImportNewItems([])
                setConflictDecisions({})
                setConflictSelections({})
                setNewItemSelections({})
                setImportSummary(null)
                setImportStatus('idle')
                setShouldReloadAfterImport(false)
                setImportReviewOpen(true)
                previewImportApi.request(body)
            } catch (error) {
                setImportReviewOpen(false)
                setPendingImportPayload(null)
                setConflictSelections({})
                setImportNewItems([])
                setNewItemSelections({})
                setImportSummary(null)
                setImportStatus('idle')
                setShouldReloadAfterImport(false)
                errorFailed(`Failed to read import file: ${getErrorMessage(error)}`)
            } finally {
                if (inputRef.current) inputRef.current.value = ''
            }
        }
        reader.onerror = () => {
            setImportReviewOpen(false)
            setPendingImportPayload(null)
            setConflictSelections({})
            setImportNewItems([])
            setNewItemSelections({})
            setImportSummary(null)
            setImportStatus('idle')
            setShouldReloadAfterImport(false)
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

    const handleNewItemSelectionChange = (item, isSelected) => {
        setNewItemSelections((prev) => ({
            ...prev,
            [getImportItemKey(item)]: isSelected
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

    const handleSelectAllNewItems = (isSelected) => {
        setNewItemSelections((prev) => {
            const updated = { ...prev }
            importNewItems.forEach((item) => {
                updated[getImportItemKey(item)] = isSelected
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
        setImportNewItems([])
        setConflictDecisions({})
        setConflictSelections({})
        setNewItemSelections({})
        setImportSummary(null)
        setImportStatus('idle')
        setShouldReloadAfterImport(false)
        if (inputRef.current) inputRef.current.value = ''
    }

    const handleImportDialogClose = () => {
        setImportDialogOpen(false)
        setImportStatus('idle')
        const shouldReload = shouldReloadAfterImport
        setShouldReloadAfterImport(false)
        setImportSummary(null)
        if (inputRef.current) inputRef.current.value = ''
        if (shouldReload) {
            navigate(0)
        }
    }

    const handleConfirmImport = () => {
        if (!pendingImportPayload) return
        const selectedConflicts = importConflicts.filter(
            (conflict) => conflictSelections[getConflictKey(conflict)]
        )
        const selectedNewItems = importNewItems.filter((item) => newItemSelections[getImportItemKey(item)])
        const payload = JSON.parse(JSON.stringify(pendingImportPayload))
        let duplicateConflicts = []
        let updatedConflicts = []
        selectedConflicts.forEach((conflict) => {
            const action = conflictDecisions[getConflictKey(conflict)] || 'update'
            const rawName = conflict.name ?? conflict.importId ?? conflict.type ?? ''
            const baseName = typeof rawName === 'string' ? rawName : String(rawName)
            const baseInfo = {
                type: conflict.type,
                name: baseName,
                importId: conflict.importId,
                existingId: conflict.existingId
            }
            if (action === 'duplicate') {
                const clonedName = appendCloneSuffix(baseName)
                if (clonedName && clonedName !== baseInfo.name) {
                    baseInfo.name = clonedName
                }
                const collection = payload[conflict.type]
                if (Array.isArray(collection)) {
                    const index = collection.findIndex((item) => item.id === conflict.importId)
                    if (index !== -1) {
                        const updatedItem = applyCloneSuffixToItem(collection[index])
                        if (updatedItem !== collection[index]) {
                            collection[index] = updatedItem
                        }
                    }
                }
                duplicateConflicts.push(baseInfo)
                return
            }
            updatedConflicts.push(baseInfo)
        })
        let createdItems = selectedNewItems.map((item) => ({
            type: item.type,
            name: item.name,
            importId: item.importId
        }))
        const skippedConflicts = importConflicts
            .filter((conflict) => !conflictSelections[getConflictKey(conflict)])
            .map((conflict) => ({
                type: conflict.type,
                name: conflict.name,
                importId: conflict.importId,
                existingId: conflict.existingId,
                reason: 'conflict'
            }))
        const skippedNew = importNewItems
            .filter((item) => !newItemSelections[getImportItemKey(item)])
            .map((item) => ({
                type: item.type,
                name: item.name,
                importId: item.importId,
                reason: 'new'
            }))
        let conflictResolutions = selectedConflicts.map((conflict) => ({
            type: conflict.type,
            importId: conflict.importId,
            existingId: conflict.existingId,
            action: conflictDecisions[getConflictKey(conflict)] || 'update'
        }))
        importConflicts.forEach((conflict) => {
            if (conflictSelections[getConflictKey(conflict)]) return
            const collection = payload[conflict.type]
            if (Array.isArray(collection)) {
                payload[conflict.type] = collection.filter((item) => item.id !== conflict.importId)
            }
        })
        importNewItems.forEach((item) => {
            if (newItemSelections[getImportItemKey(item)]) return
            const collection = payload[item.type]
            if (Array.isArray(collection)) {
                payload[item.type] = collection.filter((entry) => entry.id !== item.importId)
            }
        })

        const chatflowCollections = ['AgentFlow', 'AgentFlowV2', 'AssistantFlow', 'ChatFlow']
        const chatflowIdsInPayload = new Set()
        chatflowCollections.forEach((key) => {
            const collection = payload[key]
            if (!Array.isArray(collection)) return
            collection.forEach((item) => {
                if (item && item.id) {
                    chatflowIdsInPayload.add(item.id)
                }
            })
        })
        if (Array.isArray(payload.ChatMessage)) {
            payload.ChatMessage = payload.ChatMessage.filter((message) => {
                if (!message || !message.chatflowid) return false
                return chatflowIdsInPayload.has(message.chatflowid)
            })
        }
        if (Array.isArray(payload.ChatMessageFeedback)) {
            payload.ChatMessageFeedback = payload.ChatMessageFeedback.filter((feedback) => {
                if (!feedback || !feedback.chatflowid) return false
                return chatflowIdsInPayload.has(feedback.chatflowid)
            })
        }
        if (Array.isArray(payload.Execution)) {
            payload.Execution = payload.Execution.filter((execution) => {
                if (!execution || !execution.agentflowId) return false
                return chatflowIdsInPayload.has(execution.agentflowId)
            })
        }

        const documentStoreIdsInPayload = new Set()
        if (Array.isArray(payload.DocumentStore)) {
            payload.DocumentStore.forEach((store) => {
                if (store && store.id) {
                    documentStoreIdsInPayload.add(store.id)
                }
            })
        }
        if (Array.isArray(payload.DocumentStoreFileChunk)) {
            payload.DocumentStoreFileChunk = payload.DocumentStoreFileChunk.filter((chunk) => {
                if (!chunk || !chunk.storeId) return false
                return documentStoreIdsInPayload.has(chunk.storeId)
            })
        }
        setImportSummary({
            created: createdItems,
            duplicated: duplicateConflicts,
            updated: updatedConflicts,
            skipped: [...skippedConflicts, ...skippedNew, ...dependencyRemoved]
        })
        const body = {
            ...payload,
            conflictResolutions
        }
        setImportStatus('processing')
        setShouldReloadAfterImport(false)
        setImportDialogOpen(true)
        setImportReviewOpen(false)
        importAllApi.request(body)
    }

    const importAllSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        setImportStatus('success')
        setShouldReloadAfterImport(true)
        let message = 'Import All successful'
        if (importSummary) {
            const segments = []
            const createdCount = importSummary.created?.length || 0
            const duplicatedCount = importSummary.duplicated?.length || 0
            const updatedCount = importSummary.updated?.length || 0
            const skippedCount = importSummary.skipped?.length || 0
            if (createdCount > 0) {
                segments.push(
                    `${createdCount} new item${createdCount === 1 ? '' : 's'} created`
                )
            }
            if (duplicatedCount > 0) {
                segments.push(
                    `${duplicatedCount} item${duplicatedCount === 1 ? '' : 's'} duplicated`
                )
            }
            if (updatedCount > 0) {
                segments.push(
                    `${updatedCount} item${updatedCount === 1 ? '' : 's'} updated`
                )
            }
            if (skippedCount > 0) {
                segments.push(
                    `${skippedCount} item${skippedCount === 1 ? '' : 's'} skipped`
                )
            }
            if (segments.length > 0) {
                message = `Import complete: ${segments.join(', ')}.`
            }
        }
        enqueueSnackbar({
            message,
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
        const importLookupById = new Map()
        Object.entries(pendingImportPayload).forEach(([type, items]) => {
            if (!Array.isArray(items)) return
            items.forEach((item) => {
                if (!item || !item.id) return
                const name = getImportItemName(type, item)
                importLookupById.set(item.id, { type, name })
            })
        })
        const conflictKeys = new Set(conflicts.map((conflict) => getImportItemKey(conflict)))
        const newItems = []
        Object.entries(pendingImportPayload).forEach(([type, items]) => {
            if (!Array.isArray(items)) return
            items.forEach((item) => {
                if (!item || !item.id) return
                const key = getImportItemKey({ type, importId: item.id })
                if (conflictKeys.has(key)) return
                const lookup = importLookupById.get(item.id)
                newItems.push({
                    type,
                    importId: item.id,
                    name: lookup?.name ?? getImportItemName(type, item),
                    parent: resolveParentDetails(type, item, importLookupById)
                })
            })
        })
        newItems.sort((a, b) => {
            if (a.type === b.type) {
                const nameA = a.name || ''
                const nameB = b.name || ''
                return nameA.localeCompare(nameB)
            }
            return a.type.localeCompare(b.type)
        })
        const initialNewSelections = {}
        newItems.forEach((item) => {
            initialNewSelections[getImportItemKey(item)] = false
        })
        setImportNewItems(newItems)
        setNewItemSelections(initialNewSelections)
    }, [previewImportApi.data, previewImportApi.loading, importReviewOpen, pendingImportPayload])

    useEffect(() => {
        if (!previewImportApi.error) return
        setImportReviewOpen(false)
        setPendingImportPayload(null)
        setImportConflicts([])
        setConflictDecisions({})
        setConflictSelections({})
        setImportNewItems([])
        setNewItemSelections({})
        setImportSummary(null)
        setImportStatus('idle')
        setShouldReloadAfterImport(false)
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
            setImportNewItems([])
            setConflictDecisions({})
            setConflictSelections({})
            setNewItemSelections({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.data])

    useEffect(() => {
        if (importAllApi.error) {
            setImportDialogOpen(false)
            setPendingImportPayload(null)
            setImportConflicts([])
            setImportNewItems([])
            setConflictDecisions({})
            setConflictSelections({})
            setNewItemSelections({})
            setImportSummary(null)
            setImportStatus('idle')
            setShouldReloadAfterImport(false)
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
                                                {isAuthenticated && !currentUser.isSSO && (
                                                    <ListItemButton
                                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                        onClick={() => {
                                                            setOpen(false)
                                                            navigate('/account')
                                                        }}
                                                    >
                                                        <ListItemIcon>
                                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                                        </ListItemIcon>
                                                        <ListItemText primary={<Typography variant='body2'>Account Settings</Typography>} />
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
                newItems={importNewItems}
                decisions={conflictDecisions}
                conflictSelections={conflictSelections}
                newItemSelections={newItemSelections}
                onDecisionChange={handleConflictDecisionChange}
                onConflictSelectionChange={handleConflictSelectionChange}
                onNewItemSelectionChange={handleNewItemSelectionChange}
                onToggleAllConflicts={handleSelectAllConflicts}
                onApplyAll={handleApplyAllConflicts}
                onToggleAllNewItems={handleSelectAllNewItems}
                onCancel={handleImportReviewCancel}
                onConfirm={handleConfirmImport}
                disableConfirm={!pendingImportPayload}
            />
            <ImportDialog
                show={importDialogOpen}
                status={importStatus}
                summary={importSummary}
                onClose={handleImportDialogClose}
            />
        </>
    )
}

ProfileSection.propTypes = {
    handleLogout: PropTypes.func
}

export default ProfileSection
