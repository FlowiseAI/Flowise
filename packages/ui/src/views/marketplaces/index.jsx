import * as React from 'react'
import { useEffect, useState } from 'react'
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
    Button
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
            id={`attachment-tabpanel-${index}`}
            aria-labelledby={`attachment-tab-${index}`}
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

const badges = ['POPULAR', 'NEW']
const types = ['Chatflow', 'Agentflow', 'Tool']
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
    const [badgeFilter, setBadgeFilter] = useState([])
    const [typeFilter, setTypeFilter] = useState([])
    const [frameworkFilter, setFrameworkFilter] = useState([])

    const clearAllUsecases = () => {
        setSelectedUsecases([])
    }

    const handleBadgeFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setBadgeFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        getEligibleUsecases({ typeFilter, badgeFilter: typeof value === 'string' ? value.split(',') : value, frameworkFilter, search })
    }

    const handleTypeFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setTypeFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        getEligibleUsecases({ typeFilter: typeof value === 'string' ? value.split(',') : value, badgeFilter, frameworkFilter, search })
    }

    const handleFrameworkFilterChange = (event) => {
        const {
            target: { value }
        } = event
        setFrameworkFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        getEligibleUsecases({ typeFilter, badgeFilter, frameworkFilter: typeof value === 'string' ? value.split(',') : value, search })
    }

    const handleViewChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('mpDisplayStyle', nextView)
        setView(nextView)
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

    function filterByType(data) {
        return typeFilter.length > 0 ? typeFilter.includes(data.type) : true
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
        navigate(`/marketplace/${selectedChatflow.id}`, { state: selectedChatflow })
    }

    useEffect(() => {
        getAllTemplatesMarketplacesApi.request()

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
                                            input={<OutlinedInput label='Badge' />}
                                            renderValue={(selected) => selected.join(', ')}
                                            MenuProps={MenuProps}
                                            sx={SelectStyles}
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
                        <Stack direction='row' sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            {usecases.map((usecase, index) => (
                                <FormControlLabel
                                    key={index}
                                    size='small'
                                    control={
                                        <Checkbox
                                            disabled={eligibleUsecases.length === 0 ? true : !eligibleUsecases.includes(usecase)}
                                            color='success'
                                            checked={selectedUsecases.includes(usecase)}
                                            onChange={(event) => {
                                                setSelectedUsecases(
                                                    event.target.checked
                                                        ? [...selectedUsecases, usecase]
                                                        : selectedUsecases.filter((item) => item !== usecase)
                                                )
                                            }}
                                        />
                                    }
                                    label={usecase}
                                />
                            ))}
                        </Stack>
                        {selectedUsecases.length > 0 && (
                            <Button
                                sx={{ width: 'max-content', borderRadius: '20px' }}
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
                                                            {(data.type === 'Chatflow' || data.type === 'Agentflow') && (
                                                                <ItemCard
                                                                    onClick={() => goToCanvas(data)}
                                                                    data={data}
                                                                    images={images[data.id]}
                                                                />
                                                            )}
                                                            {data.type === 'Tool' && (
                                                                <ItemCard data={data} onClick={() => goToTool(data)} />
                                                            )}
                                                        </Badge>
                                                    )}
                                                    {!data.badge && (data.type === 'Chatflow' || data.type === 'Agentflow') && (
                                                        <ItemCard onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
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

                        {!isLoading && (!getAllTemplatesMarketplacesApi.data || getAllTemplatesMarketplacesApi.data.length === 0) && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '16vh', width: 'auto' }}
                                        src={WorkflowEmptySVG}
                                        alt='WorkflowEmptySVG'
                                    />
                                </Box>
                                <div>No Marketplace Yet</div>
                            </Stack>
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
            ></ToolDialog>
        </>
    )
}

export default Marketplace
