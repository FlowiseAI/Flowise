import * as React from 'react'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

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
    Typography,
    Tabs,
    Tab
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

// API
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL } from '@/store/constant'
import { gridSpacing } from '@/store/constant'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`marketplace-tabpanel-${index}`}
            aria-labelledby={`marketplace-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

function a11yProps(index) {
    return {
        id: `marketplace-tab-${index}`,
        'aria-controls': `marketplace-tabpanel-${index}`
    }
}

const badges = ['POPULAR', 'NEW']
const framework = ['Langchain', 'LlamaIndex']
const MenuProps = {
    PaperProps: {
        style: {
            width: 160
        }
    }
}
const SelectStyles = {
    '& .MuiOutlinedInput-notchedOutline': {
        borderRadius: 2
    }
}

// ==============================|| Marketplace ||============================== //

const Marketplace = () => {
    const navigate = useNavigate()
    const theme = useTheme()

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [images, setImages] = useState({})
    const [usecases, setUsecases] = useState([])
    const [eligibleUsecases, setEligibleUsecases] = useState([])
    const [selectedUsecases, setSelectedUsecases] = useState([])

    const [showToolDialog, setShowToolDialog] = useState(false)
    const [toolDialogProps, setToolDialogProps] = useState({})

    const getAllTemplatesMarketplacesApi = useApi(marketplacesApi.getAllTemplatesFromMarketplaces)

    const [view, setView] = React.useState(localStorage.getItem('mpDisplayStyle') || 'card')
    const [search, setSearch] = useState('')
    const [tabValue, setTabValue] = useState(0)

    const [badgeFilter, setBadgeFilter] = useState([])
    const [frameworkFilter, setFrameworkFilter] = useState([])

    const marketplaceCategories = useMemo(() => {
        const filteredData = getAllTemplatesMarketplacesApi.data?.filter(filterByBadge).filter(filterFlows).filter(filterByFramework) ?? []

        return {
            Chatflow: filteredData.filter((item) => item.type === 'Chatflow'),
            Agentflow: filteredData.filter((item) => item.type === 'Agentflow'),
            Tool: filteredData.filter((item) => item.type === 'Tool'),
            AnswerAI: filteredData.filter((item) => item.type === 'AnswerAI')
        }
    }, [filterByBadge, filterByFramework, filterFlows, getAllTemplatesMarketplacesApi.data])

    const handleBadgeFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setBadgeFilter(typeof value === 'string' ? value.split(',') : value)
    }

    const handleFrameworkFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setFrameworkFilter(typeof value === 'string' ? value.split(',') : value)
    }

    const handleViewChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('mpDisplayStyle', nextView)
        setView(nextView)
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
        getEligibleUsecases({ typeFilter, badgeFilter, frameworkFilter, search: event.target.value })
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

    function filterByFramework(data) {
        return frameworkFilter.length > 0 ? (data.framework || []).some((item) => frameworkFilter.includes(item)) : true
    }

    function filterByUsecases(data) {
        return selectedUsecases.length > 0 ? (data.usecases || []).some((item) => selectedUsecases.includes(item)) : true
    }

    const getEligibleUsecases = (filter) => {
        if (!getAllTemplatesMarketplacesApi.data) return

        let filteredData = getAllTemplatesMarketplacesApi.data
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
        setEligibleUsecases(Array.from(new Set(usecases)).sort())
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
        navigate(`/marketplace/${selectedChatflow.id}`, {
            state: selectedChatflow,
            parentChatflowId: selectedChatflow.id,
            name: selectedChatflow.name
        })
    }

    useEffect(() => {
        getAllTemplatesMarketplacesApi.request()
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
                for (let i = 0; i < flows.length; i += 1) {
                    if (flows[i].flowData) {
                        const flowDataStr = flows[i].flowData
                        const flowData = JSON.parse(flowDataStr)
                        usecases.push(...flows[i].usecases)
                        const nodes = flowData.nodes || []
                        images[flows[i].id] = []
                        for (let j = 0; j < nodes.length; j += 1) {
                            const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                            if (!images[flows[i].id].includes(imageSrc)) {
                                images[flows[i].id].push(imageSrc)
                            }
                        }
                    }
                }
                setImages(images)
                setUsecases(Array.from(new Set(usecases)).sort())
                setEligibleUsecases(Array.from(new Set(usecases)).sort())
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllTemplatesMarketplacesApi.data])

    useEffect(() => {
        if (getAllTemplatesMarketplacesApi.error) {
            setError(getAllTemplatesMarketplacesApi.error)
        }
    }, [getAllTemplatesMarketplacesApi.error])

    const renderContent = (category, data) => {
        if (isLoading) {
            return (
                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                </Box>
            )
        }

        if (!data || data.length === 0) {
            return (
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                    <Box sx={{ p: 2, height: 'auto' }}>
                        <img style={{ objectFit: 'cover', height: '16vh', width: 'auto' }} src={WorkflowEmptySVG} alt='WorkflowEmptySVG' />
                    </Box>
                    <div>No {category} Available</div>
                </Stack>
            )
        }

        return (
            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                {data.map((item, index) => (
                    <Box key={index}>
                        <Badge
                            sx={{
                                width: '100%',
                                height: '100%',
                                '& .MuiBadge-badge': {
                                    right: 20
                                }
                            }}
                            color={item.badge === 'POPULAR' ? 'primary' : 'error'}
                        >
                            <ItemCard
                                onClick={() => (category === 'Tool' ? goToTool(item) : goToCanvas(item))}
                                data={item}
                                images={images[item.id]}
                            />
                        </Badge>
                    </Box>
                ))}
            </Box>
        )
    }

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
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
                                            input={<OutlinedInput label='Badge' />}
                                            renderValue={(selected) => selected.join(', ')}
                                            MenuProps={MenuProps}
                                            sx={SelectStyles}
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
                                            input={<OutlinedInput label='Badge' />}
                                            renderValue={(selected) => selected.join(', ')}
                                            MenuProps={MenuProps}
                                            sx={SelectStyles}
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

                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label='marketplace tabs'>
                                <Tab label='AnswerAI' {...a11yProps(0)} />
                                <Tab label='Templates' {...a11yProps(1)} />
                                <Tab label='Agentflows' {...a11yProps(2)} />
                                <Tab label='Tools' {...a11yProps(3)} />
                            </Tabs>
                        </Box>

                        {!view || view === 'card' ? (
                            <>
                                <TabPanel value={tabValue} index={0}>
                                    {renderContent('AnswerAI', marketplaceCategories.AnswerAI)}
                                </TabPanel>
                                <TabPanel value={tabValue} index={1}>
                                    {renderContent('Chatflow', marketplaceCategories.Chatflow)}
                                </TabPanel>
                                <TabPanel value={tabValue} index={2}>
                                    {renderContent('Agentflow', marketplaceCategories.Agentflow)}
                                </TabPanel>
                                <TabPanel value={tabValue} index={3}>
                                    {renderContent('Tool', marketplaceCategories.Tool)}
                                </TabPanel>
                            </>
                        ) : (
                            <>
                                <TabPanel value={tabValue} index={0}>
                                    <MarketplaceTable
                                        data={marketplaceCategories.Tool}
                                        filterFunction={filterFlows}
                                        filterByBadge={filterByBadge}
                                        filterByFramework={filterByFramework}
                                        goToTool={goToTool}
                                        isLoading={isLoading}
                                        setError={setError}
                                    />
                                </TabPanel>
                                <TabPanel value={tabValue} index={1}>
                                    <MarketplaceTable
                                        data={marketplaceCategories.Chatflow}
                                        filterFunction={filterFlows}
                                        filterByBadge={filterByBadge}
                                        filterByFramework={filterByFramework}
                                        goToCanvas={goToCanvas}
                                        isLoading={isLoading}
                                        setError={setError}
                                    />
                                </TabPanel>
                                <TabPanel value={tabValue} index={2}>
                                    <MarketplaceTable
                                        data={marketplaceCategories.Agentflow}
                                        filterFunction={filterFlows}
                                        filterByBadge={filterByBadge}
                                        filterByFramework={filterByFramework}
                                        goToCanvas={goToCanvas}
                                        isLoading={isLoading}
                                        setError={setError}
                                    />
                                </TabPanel>
                                <TabPanel value={tabValue} index={3}>
                                    <MarketplaceTable
                                        data={marketplaceCategories.AnswerAI}
                                        filterFunction={filterFlows}
                                        filterByBadge={filterByBadge}
                                        filterByFramework={filterByFramework}
                                        goToTool={goToTool}
                                        isLoading={isLoading}
                                        setError={setError}
                                    />
                                </TabPanel>
                            </>
                        )}
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showToolDialog}
                dialogProps={toolDialogProps}
                onCancel={() => setShowToolDialog(false)}
                onConfirm={() => setShowToolDialog(false)}
                onUseTemplate={(tool) => onUseTemplate(tool)}
            />
        </>
    )
}

export default Marketplace
