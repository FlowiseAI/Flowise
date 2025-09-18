import * as React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'

// material-ui
import {
    Box,
    Stack,
    Badge,
    ToggleButton,
    InputLabel,
    FormControl,
    Select,
    OutlinedInput,
    Checkbox,
    ListItemText,
    Skeleton,
    FormControlLabel,
    ToggleButtonGroup,
    MenuItem,
    Button,
    Tabs,
    Autocomplete,
    TextField,
    Chip,
    Tooltip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconLayoutGrid, IconList, IconX } from '@tabler/icons-react'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import WorkflowEmptySVG from '@/assets/images/workflow_empty.svg'
import ToolDialog from '@/views/tools/ToolDialog'
import { MarketplaceTable } from '@/ui-component/table/MarketplaceTable'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { TabPanel } from '@/ui-component/tabs/TabPanel'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { PermissionTab } from '@/ui-component/button/RBACButtons'
import { Available } from '@/ui-component/rbac/available'
import ShareWithWorkspaceDialog from '@/ui-component/dialog/ShareWithWorkspaceDialog'

// API
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import { useAuth } from '@/hooks/useAuth'

// Utils
import useNotifier from '@/utils/useNotifier'

// const
import { baseURL, AGENTFLOW_ICONS } from '@/store/constant'
import { gridSpacing } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

const badges = ['POPULAR', 'NEW']
const types = ['Chatflow', 'AgentflowV2', 'Tool']
const framework = ['Langchain', 'LlamaIndex']
const MenuProps = {
    PaperProps: {
        style: {
            width: 160
        }
    }
}

// ==============================|| Marketplace ||============================== //

const Marketplace = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    useNotifier()

    const theme = useTheme()
    const { error, setError } = useError()

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [icons, setIcons] = useState({})
    const [usecases, setUsecases] = useState([])
    const [eligibleUsecases, setEligibleUsecases] = useState([])
    const [selectedUsecases, setSelectedUsecases] = useState([])

    const [showToolDialog, setShowToolDialog] = useState(false)
    const [toolDialogProps, setToolDialogProps] = useState({})

    const getAllTemplatesMarketplacesApi = useApi(marketplacesApi.getAllTemplatesFromMarketplaces)

    const [view, setView] = React.useState(localStorage.getItem('mpDisplayStyle') || 'card')
    const [search, setSearch] = useState('')
    const [badgeFilter, setBadgeFilter] = useState([])
    const [typeFilter, setTypeFilter] = useState([])
    const [frameworkFilter, setFrameworkFilter] = useState([])

    const getAllCustomTemplatesApi = useApi(marketplacesApi.getAllCustomTemplates)
    const [activeTabValue, setActiveTabValue] = useState(0)
    const [templateImages, setTemplateImages] = useState({})
    const [templateIcons, setTemplateIcons] = useState({})
    const [templateUsecases, setTemplateUsecases] = useState([])
    const [eligibleTemplateUsecases, setEligibleTemplateUsecases] = useState([])
    const [selectedTemplateUsecases, setSelectedTemplateUsecases] = useState([])
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const { confirm } = useConfirm()
    const { hasPermission } = useAuth()

    const [showShareTemplateDialog, setShowShareTemplateDialog] = useState(false)
    const [shareTemplateDialogProps, setShareTemplateDialogProps] = useState({})

    const share = (template) => {
        const dialogProps = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Share',
            data: {
                id: template.id,
                name: template.name,
                title: 'Share Custom Template',
                itemType: 'custom_template'
            }
        }
        setShareTemplateDialogProps(dialogProps)
        setShowShareTemplateDialog(true)
    }

    const getSelectStyles = (borderColor, isDarkMode) => ({
        '& .MuiOutlinedInput-notchedOutline': {
            borderRadius: 2,
            borderColor: borderColor
        },
        '& .MuiSvgIcon-root': {
            color: isDarkMode ? '#fff' : 'inherit'
        }
    })

    const handleTabChange = (event, newValue) => {
        if (newValue === 1 && !getAllCustomTemplatesApi.data) {
            getAllCustomTemplatesApi.request()
        }
        setActiveTabValue(newValue)
    }

    const clearAllUsecases = () => {
        if (activeTabValue === 0) setSelectedUsecases([])
        else setSelectedTemplateUsecases([])
    }

    const handleBadgeFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setBadgeFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        const data = activeTabValue === 0 ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data
        getEligibleUsecases(data, {
            typeFilter,
            badgeFilter: typeof value === 'string' ? value.split(',') : value,
            frameworkFilter,
            search
        })
    }

    const handleTypeFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setTypeFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        const data = activeTabValue === 0 ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data
        getEligibleUsecases(data, {
            typeFilter: typeof value === 'string' ? value.split(',') : value,
            badgeFilter,
            frameworkFilter,
            search
        })
    }

    const handleFrameworkFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setFrameworkFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        const data = activeTabValue === 0 ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data
        getEligibleUsecases(data, {
            typeFilter,
            badgeFilter,
            frameworkFilter: typeof value === 'string' ? value.split(',') : value,
            search
        })
    }

    const handleViewChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('mpDisplayStyle', nextView)
        setView(nextView)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
        const data = activeTabValue === 0 ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data

        getEligibleUsecases(data, { typeFilter, badgeFilter, frameworkFilter, search: event.target.value })
    }

    const onDeleteCustomTemplate = async (template) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete Custom Template ${template.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await marketplacesApi.deleteCustomTemplate(template.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Custom Template deleted successfully!',
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
                    getAllCustomTemplatesApi.request()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete custom template: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }`,
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
        }
    }

    function filterFlows(data) {
        return (
            (data.categories ? data.categories.join(',') : '').toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            data.templateName.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            (data.description && data.description.toLowerCase().indexOf(search.toLowerCase()) > -1)
        )
    }

    function filterByBadge(data) {
        return badgeFilter.length > 0 ? badgeFilter.includes(data.badge) : true
    }

    function filterByType(data) {
        return typeFilter.length > 0 ? typeFilter.includes(data.type) : true
    }

    function filterByFramework(data) {
        return frameworkFilter.length > 0 ? (data.framework || []).some((item) => frameworkFilter.includes(item)) : true
    }

    function filterByUsecases(data) {
        if (activeTabValue === 0)
            return selectedUsecases.length > 0 ? (data.usecases || []).some((item) => selectedUsecases.includes(item)) : true
        else
            return selectedTemplateUsecases.length > 0
                ? (data.usecases || []).some((item) => selectedTemplateUsecases.includes(item))
                : true
    }

    const getEligibleUsecases = (data, filter) => {
        if (!data) return

        let filteredData = data
        if (filter.badgeFilter.length > 0) filteredData = filteredData.filter((data) => filter.badgeFilter.includes(data.badge))
        if (filter.typeFilter.length > 0) filteredData = filteredData.filter((data) => filter.typeFilter.includes(data.type))
        if (filter.frameworkFilter.length > 0)
            filteredData = filteredData.filter((data) => (data.framework || []).some((item) => filter.frameworkFilter.includes(item)))
        if (filter.search) {
            filteredData = filteredData.filter(
                (data) =>
                    (data.categories ? data.categories.join(',') : '').toLowerCase().indexOf(filter.search.toLowerCase()) > -1 ||
                    data.templateName.toLowerCase().indexOf(filter.search.toLowerCase()) > -1 ||
                    (data.description && data.description.toLowerCase().indexOf(filter.search.toLowerCase()) > -1)
            )
        }

        const usecases = []
        for (let i = 0; i < filteredData.length; i += 1) {
            if (filteredData[i].flowData) {
                usecases.push(...filteredData[i].usecases)
            }
        }
        if (activeTabValue === 0) setEligibleUsecases(Array.from(new Set(usecases)).sort())
        else setEligibleTemplateUsecases(Array.from(new Set(usecases)).sort())
    }

    const onUseTemplate = (selectedTool) => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'IMPORT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: selectedTool
        }
        setToolDialogProps(dialogProp)
        setShowToolDialog(true)
    }

    const goToTool = (selectedTool) => {
        const dialogProp = {
            title: selectedTool.templateName,
            type: 'TEMPLATE',
            data: selectedTool
        }
        setToolDialogProps(dialogProp)
        setShowToolDialog(true)
    }

    const goToCanvas = (selectedChatflow) => {
        if (selectedChatflow.type === 'AgentflowV2') {
            navigate(`/v2/marketplace/${selectedChatflow.id}`, { state: selectedChatflow })
        } else {
            navigate(`/marketplace/${selectedChatflow.id}`, { state: selectedChatflow })
        }
    }

    useEffect(() => {
        if (hasPermission('templates:marketplace')) {
            getAllTemplatesMarketplacesApi.request()
        } else if (hasPermission('templates:custom')) {
            setActiveTabValue(1)
            getAllCustomTemplatesApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllTemplatesMarketplacesApi.loading)
    }, [getAllTemplatesMarketplacesApi.loading])

    useEffect(() => {
        if (getAllTemplatesMarketplacesApi.data) {
            try {
                const flows = getAllTemplatesMarketplacesApi.data
                const usecases = []
                const images = {}
                const icons = {}
                for (let i = 0; i < flows.length; i += 1) {
                    if (flows[i].flowData) {
                        const flowDataStr = flows[i].flowData
                        const flowData = JSON.parse(flowDataStr)
                        usecases.push(...flows[i].usecases)
                        const nodes = flowData.nodes || []
                        images[flows[i].id] = []
                        icons[flows[i].id] = []
                        for (let j = 0; j < nodes.length; j += 1) {
                            if (nodes[j].data.name === 'stickyNote' || nodes[j].data.name === 'stickyNoteAgentflow') continue
                            const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodes[j].data.name)
                            if (foundIcon) {
                                icons[flows[i].id].push(foundIcon)
                            } else {
                                const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                                if (!images[flows[i].id].some((img) => img.imageSrc === imageSrc)) {
                                    images[flows[i].id].push({
                                        imageSrc,
                                        label: nodes[j].data.name
                                    })
                                }
                            }
                        }
                    }
                }
                setImages(images)
                setIcons(icons)
                setUsecases(Array.from(new Set(usecases)).sort())
                setEligibleUsecases(Array.from(new Set(usecases)).sort())
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllTemplatesMarketplacesApi.data])

    useEffect(() => {
        if (getAllTemplatesMarketplacesApi.error && setError) {
            setError(getAllTemplatesMarketplacesApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllTemplatesMarketplacesApi.error])

    useEffect(() => {
        setLoading(getAllCustomTemplatesApi.loading)
    }, [getAllCustomTemplatesApi.loading])

    useEffect(() => {
        if (getAllCustomTemplatesApi.data) {
            try {
                const flows = getAllCustomTemplatesApi.data
                const usecases = []
                const tImages = {}
                const tIcons = {}
                for (let i = 0; i < flows.length; i += 1) {
                    if (flows[i].flowData) {
                        const flowDataStr = flows[i].flowData
                        const flowData = JSON.parse(flowDataStr)
                        usecases.push(...flows[i].usecases)
                        if (flows[i].framework) {
                            flows[i].framework = [flows[i].framework] || []
                        }
                        const nodes = flowData.nodes || []
                        tImages[flows[i].id] = []
                        tIcons[flows[i].id] = []
                        for (let j = 0; j < nodes.length; j += 1) {
                            const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodes[j].data.name)
                            if (foundIcon) {
                                tIcons[flows[i].id].push(foundIcon)
                            } else {
                                const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                                if (!tImages[flows[i].id].includes(imageSrc)) {
                                    tImages[flows[i].id].push(imageSrc)
                                }
                            }
                        }
                    }
                }
                setTemplateImages(tImages)
                setTemplateIcons(tIcons)
                setTemplateUsecases(Array.from(new Set(usecases)).sort())
                setEligibleTemplateUsecases(Array.from(new Set(usecases)).sort())
            } catch (e) {
                console.error(e)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllCustomTemplatesApi.data])

    useEffect(() => {
        if (getAllCustomTemplatesApi.error && setError) {
            setError(getAllCustomTemplatesApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllCustomTemplatesApi.error])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column'>
                        <ViewHeader
                            filters={
                                <>
                                    <FormControl
                                        sx={{
                                            borderRadius: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'end',
                                            minWidth: 120
                                        }}
                                    >
                                        <InputLabel size='small' id='filter-badge-label'>
                                            Tag
                                        </InputLabel>
                                        <Select
                                            labelId='filter-badge-label'
                                            id='filter-badge-checkbox'
                                            size='small'
                                            multiple
                                            value={badgeFilter}
                                            onChange={handleBadgeFilterChange}
                                            input={<OutlinedInput label='Tag' />}
                                            renderValue={(selected) => selected.join(', ')}
                                            MenuProps={MenuProps}
                                            sx={getSelectStyles(theme.palette.grey[900] + 25, theme?.customization?.isDarkMode)}
                                        >
                                            {badges.map((name) => (
                                                <MenuItem
                                                    key={name}
                                                    value={name}
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}
                                                >
                                                    <Checkbox checked={badgeFilter.indexOf(name) > -1} sx={{ p: 0 }} />
                                                    <ListItemText primary={name} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl
                                        sx={{
                                            borderRadius: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'end',
                                            minWidth: 120
                                        }}
                                    >
                                        <InputLabel size='small' id='type-badge-label'>
                                            Type
                                        </InputLabel>
                                        <Select
                                            size='small'
                                            labelId='type-badge-label'
                                            id='type-badge-checkbox'
                                            multiple
                                            value={typeFilter}
                                            onChange={handleTypeFilterChange}
                                            input={<OutlinedInput label='Type' />}
                                            renderValue={(selected) => selected.join(', ')}
                                            MenuProps={MenuProps}
                                            sx={getSelectStyles(theme.palette.grey[900] + 25, theme?.customization?.isDarkMode)}
                                        >
                                            {types.map((name) => (
                                                <MenuItem
                                                    key={name}
                                                    value={name}
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}
                                                >
                                                    <Checkbox checked={typeFilter.indexOf(name) > -1} sx={{ p: 0 }} />
                                                    <ListItemText primary={name} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl
                                        sx={{
                                            borderRadius: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'end',
                                            minWidth: 120
                                        }}
                                    >
                                        <InputLabel size='small' id='type-fw-label'>
                                            Framework
                                        </InputLabel>
                                        <Select
                                            size='small'
                                            labelId='type-fw-label'
                                            id='type-fw-checkbox'
                                            multiple
                                            value={frameworkFilter}
                                            onChange={handleFrameworkFilterChange}
                                            input={<OutlinedInput label='Framework' />}
                                            renderValue={(selected) => selected.join(', ')}
                                            MenuProps={MenuProps}
                                            sx={getSelectStyles(theme.palette.grey[900] + 25, theme?.customization?.isDarkMode)}
                                        >
                                            {framework.map((name) => (
                                                <MenuItem
                                                    key={name}
                                                    value={name}
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}
                                                >
                                                    <Checkbox checked={frameworkFilter.indexOf(name) > -1} sx={{ p: 0 }} />
                                                    <ListItemText primary={name} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </>
                            }
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder='Search Name/Description/Node'
                            title='Marketplace'
                            description='Explore and use pre-built templates'
                        >
                            <ToggleButtonGroup
                                sx={{ borderRadius: 2, height: '100%' }}
                                value={view}
                                color='primary'
                                exclusive
                                onChange={handleViewChange}
                            >
                                <ToggleButton
                                    sx={{
                                        borderColor: theme.palette.grey[900] + 25,
                                        borderRadius: 2,
                                        color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                                    }}
                                    variant='contained'
                                    value='card'
                                    title='Card View'
                                >
                                    <IconLayoutGrid />
                                </ToggleButton>
                                <ToggleButton
                                    sx={{
                                        borderColor: theme.palette.grey[900] + 25,
                                        borderRadius: 2,
                                        color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                                    }}
                                    variant='contained'
                                    value='list'
                                    title='List View'
                                >
                                    <IconList />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </ViewHeader>
                        {hasPermission('templates:marketplace') && hasPermission('templates:custom') && (
                            <Stack direction='row' justifyContent='space-between' sx={{ mb: 2 }}>
                                <Tabs value={activeTabValue} onChange={handleTabChange} textColor='primary' aria-label='tabs'>
                                    <PermissionTab permissionId='templates:marketplace' value={0} label='Community Templates' />
                                    <PermissionTab permissionId='templates:custom' value={1} label='My Templates' />
                                </Tabs>
                                <Autocomplete
                                    id='useCases'
                                    multiple
                                    size='small'
                                    options={usecases}
                                    value={selectedUsecases}
                                    onChange={(_, newValue) => setSelectedUsecases(newValue)}
                                    disableCloseOnSelect
                                    getOptionLabel={(option) => option}
                                    isOptionEqualToValue={(option, value) => option === value}
                                    renderOption={(props, option, { selected }) => {
                                        const isDisabled = eligibleUsecases.length > 0 && !eligibleUsecases.includes(option)

                                        return (
                                            <li {...props} style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}>
                                                <Checkbox checked={selected} color='success' disabled={isDisabled} />
                                                <ListItemText primary={option} />
                                            </li>
                                        )
                                    }}
                                    renderInput={(params) => <TextField {...params} label='Usecases' />}
                                    sx={{
                                        width: 300
                                    }}
                                    limitTags={2}
                                    renderTags={(value, getTagProps) => {
                                        const totalTags = value.length
                                        const limitTags = 2

                                        return (
                                            <>
                                                {value.slice(0, limitTags).map((option, index) => (
                                                    <Chip
                                                        {...getTagProps({ index })}
                                                        key={index}
                                                        label={option}
                                                        sx={{
                                                            height: 24,
                                                            '& .MuiSvgIcon-root': {
                                                                fontSize: 16,
                                                                background: 'None'
                                                            }
                                                        }}
                                                    />
                                                ))}

                                                {totalTags > limitTags && (
                                                    <Tooltip
                                                        title={
                                                            <ol style={{ paddingLeft: '20px' }}>
                                                                {value.slice(limitTags).map((item, i) => (
                                                                    <li key={i}>{item}</li>
                                                                ))}
                                                            </ol>
                                                        }
                                                        placement='top'
                                                    >
                                                        +{totalTags - limitTags}
                                                    </Tooltip>
                                                )}
                                            </>
                                        )
                                    }}
                                    slotProps={{
                                        paper: {
                                            sx: {
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                                            }
                                        }
                                    }}
                                />
                            </Stack>
                        )}
                        <Available permission='templates:marketplace'>
                            <TabPanel value={activeTabValue} index={0}>
                                {!view || view === 'card' ? (
                                    <>
                                        {isLoading ? (
                                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                                <Skeleton variant='rounded' height={160} />
                                                <Skeleton variant='rounded' height={160} />
                                                <Skeleton variant='rounded' height={160} />
                                            </Box>
                                        ) : (
                                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                                {getAllTemplatesMarketplacesApi.data
                                                    ?.filter(filterByBadge)
                                                    .filter(filterByType)
                                                    .filter(filterFlows)
                                                    .filter(filterByFramework)
                                                    .filter(filterByUsecases)
                                                    .map((data, index) => (
                                                        <Box key={index}>
                                                            {data.badge && (
                                                                <Badge
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        '& .MuiBadge-badge': {
                                                                            right: 20
                                                                        }
                                                                    }}
                                                                    badgeContent={data.badge}
                                                                    color={data.badge === 'POPULAR' ? 'primary' : 'error'}
                                                                >
                                                                    {(data.type === 'Chatflow' ||
                                                                        data.type === 'Agentflow' ||
                                                                        data.type === 'AgentflowV2') && (
                                                                        <ItemCard
                                                                            onClick={() => goToCanvas(data)}
                                                                            data={data}
                                                                            images={images[data.id]}
                                                                            icons={icons[data.id]}
                                                                        />
                                                                    )}
                                                                    {data.type === 'Tool' && (
                                                                        <ItemCard data={data} onClick={() => goToTool(data)} />
                                                                    )}
                                                                </Badge>
                                                            )}
                                                            {!data.badge &&
                                                                (data.type === 'Chatflow' ||
                                                                    data.type === 'Agentflow' ||
                                                                    data.type === 'AgentflowV2') && (
                                                                    <ItemCard
                                                                        onClick={() => goToCanvas(data)}
                                                                        data={data}
                                                                        images={images[data.id]}
                                                                        icons={icons[data.id]}
                                                                    />
                                                                )}
                                                            {!data.badge && data.type === 'Tool' && (
                                                                <ItemCard data={data} onClick={() => goToTool(data)} />
                                                            )}
                                                        </Box>
                                                    ))}
                                            </Box>
                                        )}
                                    </>
                                ) : (
                                    <MarketplaceTable
                                        data={getAllTemplatesMarketplacesApi.data}
                                        filterFunction={filterFlows}
                                        filterByType={filterByType}
                                        filterByBadge={filterByBadge}
                                        filterByFramework={filterByFramework}
                                        filterByUsecases={filterByUsecases}
                                        goToTool={goToTool}
                                        goToCanvas={goToCanvas}
                                        isLoading={isLoading}
                                        setError={setError}
                                    />
                                )}

                                {!isLoading &&
                                    (!getAllTemplatesMarketplacesApi.data || getAllTemplatesMarketplacesApi.data.length === 0) && (
                                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                            <Box sx={{ p: 2, height: 'auto' }}>
                                                <img
                                                    style={{ objectFit: 'cover', height: '25vh', width: 'auto' }}
                                                    src={WorkflowEmptySVG}
                                                    alt='WorkflowEmptySVG'
                                                />
                                            </Box>
                                            <div>No Marketplace Yet</div>
                                        </Stack>
                                    )}
                            </TabPanel>
                        </Available>
                        <Available permission='templates:custom'>
                            <TabPanel value={activeTabValue} index={1}>
                                <Stack direction='row' sx={{ gap: 2, my: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {templateUsecases.map((usecase, index) => (
                                        <FormControlLabel
                                            key={index}
                                            size='small'
                                            control={
                                                <Checkbox
                                                    disabled={
                                                        eligibleTemplateUsecases.length === 0
                                                            ? true
                                                            : !eligibleTemplateUsecases.includes(usecase)
                                                    }
                                                    color='success'
                                                    checked={selectedTemplateUsecases.includes(usecase)}
                                                    onChange={(event) => {
                                                        setSelectedTemplateUsecases(
                                                            event.target.checked
                                                                ? [...selectedTemplateUsecases, usecase]
                                                                : selectedTemplateUsecases.filter((item) => item !== usecase)
                                                        )
                                                    }}
                                                />
                                            }
                                            label={usecase}
                                        />
                                    ))}
                                </Stack>
                                {selectedTemplateUsecases.length > 0 && (
                                    <Button
                                        sx={{ width: 'max-content', mb: 2, borderRadius: '20px' }}
                                        variant='outlined'
                                        onClick={() => clearAllUsecases()}
                                        startIcon={<IconX />}
                                    >
                                        Clear All
                                    </Button>
                                )}
                                {!view || view === 'card' ? (
                                    <>
                                        {isLoading ? (
                                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                                <Skeleton variant='rounded' height={160} />
                                                <Skeleton variant='rounded' height={160} />
                                                <Skeleton variant='rounded' height={160} />
                                            </Box>
                                        ) : (
                                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                                {getAllCustomTemplatesApi.data
                                                    ?.filter(filterByBadge)
                                                    .filter(filterByType)
                                                    .filter(filterFlows)
                                                    .filter(filterByFramework)
                                                    .filter(filterByUsecases)
                                                    .map((data, index) => (
                                                        <Box key={index}>
                                                            {data.badge && (
                                                                <Badge
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        '& .MuiBadge-badge': {
                                                                            right: 20
                                                                        }
                                                                    }}
                                                                    badgeContent={data.badge}
                                                                    color={data.badge === 'POPULAR' ? 'primary' : 'error'}
                                                                >
                                                                    {(data.type === 'Chatflow' ||
                                                                        data.type === 'Agentflow' ||
                                                                        data.type === 'AgentflowV2') && (
                                                                        <ItemCard
                                                                            onClick={() => goToCanvas(data)}
                                                                            data={data}
                                                                            images={templateImages[data.id]}
                                                                            icons={templateIcons[data.id]}
                                                                        />
                                                                    )}
                                                                    {data.type === 'Tool' && (
                                                                        <ItemCard data={data} onClick={() => goToTool(data)} />
                                                                    )}
                                                                </Badge>
                                                            )}
                                                            {!data.badge &&
                                                                (data.type === 'Chatflow' ||
                                                                    data.type === 'Agentflow' ||
                                                                    data.type === 'AgentflowV2') && (
                                                                    <ItemCard
                                                                        onClick={() => goToCanvas(data)}
                                                                        data={data}
                                                                        images={templateImages[data.id]}
                                                                        icons={templateIcons[data.id]}
                                                                    />
                                                                )}
                                                            {!data.badge && data.type === 'Tool' && (
                                                                <ItemCard data={data} onClick={() => goToTool(data)} />
                                                            )}
                                                        </Box>
                                                    ))}
                                            </Box>
                                        )}
                                    </>
                                ) : (
                                    <MarketplaceTable
                                        data={getAllCustomTemplatesApi.data}
                                        filterFunction={filterFlows}
                                        filterByType={filterByType}
                                        filterByBadge={filterByBadge}
                                        filterByFramework={filterByFramework}
                                        filterByUsecases={filterByUsecases}
                                        goToTool={goToTool}
                                        goToCanvas={goToCanvas}
                                        isLoading={isLoading}
                                        setError={setError}
                                        onDelete={hasPermission('templates:custom-delete') ? onDeleteCustomTemplate : null}
                                        onShare={hasPermission('templates:custom-share') ? share : null}
                                    />
                                )}
                                {!isLoading && (!getAllCustomTemplatesApi.data || getAllCustomTemplatesApi.data.length === 0) && (
                                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                        <Box sx={{ p: 2, height: 'auto' }}>
                                            <img
                                                style={{ objectFit: 'cover', height: '25vh', width: 'auto' }}
                                                src={WorkflowEmptySVG}
                                                alt='WorkflowEmptySVG'
                                            />
                                        </Box>
                                        <div>No Saved Custom Templates</div>
                                    </Stack>
                                )}
                            </TabPanel>
                        </Available>
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showToolDialog}
                dialogProps={toolDialogProps}
                onCancel={() => setShowToolDialog(false)}
                onConfirm={() => setShowToolDialog(false)}
                onUseTemplate={(tool) => onUseTemplate(tool)}
            ></ToolDialog>
            {showShareTemplateDialog && (
                <ShareWithWorkspaceDialog
                    show={showShareTemplateDialog}
                    dialogProps={shareTemplateDialogProps}
                    onCancel={() => setShowShareTemplateDialog(false)}
                    setError={setError}
                ></ShareWithWorkspaceDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default Marketplace
