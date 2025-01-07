import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'

// material-ui
import { Box, Stack, Skeleton } from '@mui/material'
import { IconLayoutGrid, IconList, IconX } from '@tabler/icons-react'

// components
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import WorkflowEmptySVG from '@/assets/images/workflow_empty.svg'
import ToolDialog from '@/views/tools/ToolDialog'
import { MarketplaceTable } from '@/ui-component/table/MarketplaceTable'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// const
import { baseURL } from '@/store/constant'
import { gridSpacing } from '@/store/constant'
import useNotifier from '@/utils/useNotifier'
import { IconChevronDown } from '@tabler/icons-react'
import { capitalizeWord } from '@/utils/genericHelper'

const badges = ['Popular', 'New']
const types = ['Chatflow', 'Agentflow', 'Tool']
const framework = ['Langchain', 'LlamaIndex']

const COMMUNITY_TEMPLATES_TAB_VALUE = 'community-templates'
const MY_TEMPLATES_TAB_VALUE = 'my-templates'

// ==============================|| Marketplace ||============================== //

const Marketplace = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    useNotifier()

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

    const getAllCustomTemplatesApi = useApi(marketplacesApi.getAllCustomTemplates)
    const [activeTabValue, setActiveTabValue] = useState(COMMUNITY_TEMPLATES_TAB_VALUE)
    const [templateImages, setTemplateImages] = useState({})
    const [templateUsecases, setTemplateUsecases] = useState([])
    const [eligibleTemplateUsecases, setEligibleTemplateUsecases] = useState([])
    const [selectedTemplateUsecases, setSelectedTemplateUsecases] = useState([])
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const { confirm } = useConfirm()

    const handleTabChange = (event, newValue) => {
        if (newValue === MY_TEMPLATES_TAB_VALUE && !getAllCustomTemplatesApi.data) {
            getAllCustomTemplatesApi.request()
        }
        setActiveTabValue(newValue)
    }

    const clearAllUsecases = () => {
        if (activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE) setSelectedUsecases([])
        else setSelectedTemplateUsecases([])
    }

    const handleBadgeFilterChange = (value) => {
        setBadgeFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        const data = activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data
        getEligibleUsecases(data, {
            typeFilter,
            badgeFilter: typeof value === 'string' ? value.split(',') : value,
            frameworkFilter,
            search
        })
    }

    const handleTypeFilterChange = (value) => {
        setTypeFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        const data = activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data
        getEligibleUsecases(data, {
            typeFilter: typeof value === 'string' ? value.split(',') : value,
            badgeFilter,
            frameworkFilter,
            search
        })
    }

    const handleFrameworkFilterChange = (value) => {
        setFrameworkFilter(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        )
        const data = activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data
        getEligibleUsecases(data, {
            typeFilter,
            badgeFilter,
            frameworkFilter: typeof value === 'string' ? value.split(',') : value,
            search
        })
    }

    const handleViewChange = (nextView) => {
        if (nextView === null) return
        localStorage.setItem('mpDisplayStyle', nextView)
        setView(nextView)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
        const data = activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE ? getAllTemplatesMarketplacesApi.data : getAllCustomTemplatesApi.data

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
        return badgeFilter.length > 0 ? badgeFilter.includes(capitalizeWord(data.badge)) : true
    }

    function filterByType(data) {
        return typeFilter.length > 0 ? typeFilter.includes(data.type) : true
    }

    function filterByFramework(data) {
        return frameworkFilter.length > 0 ? (data.framework || []).some((item) => frameworkFilter.includes(item)) : true
    }

    function filterByUsecases(data) {
        if (activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE)
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
        if (activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE) setEligibleUsecases(Array.from(new Set(usecases)).sort())
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

    useEffect(() => {
        setLoading(getAllCustomTemplatesApi.loading)
    }, [getAllCustomTemplatesApi.loading])

    useEffect(() => {
        if (getAllCustomTemplatesApi.data) {
            try {
                const flows = getAllCustomTemplatesApi.data
                const usecases = []
                const tImages = {}
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
                        for (let j = 0; j < nodes.length; j += 1) {
                            const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                            if (!tImages[flows[i].id].includes(imageSrc)) {
                                tImages[flows[i].id].push(imageSrc)
                            }
                        }
                    }
                }
                setTemplateImages(tImages)
                setTemplateUsecases(Array.from(new Set(usecases)).sort())
                setEligibleTemplateUsecases(Array.from(new Set(usecases)).sort())
            } catch (e) {
                console.error(e)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllCustomTemplatesApi.data])

    useEffect(() => {
        if (getAllCustomTemplatesApi.error) {
            setError(getAllCustomTemplatesApi.error)
        }
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
                                    <DropdownMenu>
                                        <DropdownMenuTrigger size='sm' variant='outline'>
                                            {badgeFilter.length === 0 ? (
                                                <>
                                                    Tags
                                                    <IconChevronDown />
                                                </>
                                            ) : (
                                                <>
                                                    {badgeFilter.length > 1
                                                        ? `${badgeFilter[0]} + ${badgeFilter.length - 1}`
                                                        : `${badgeFilter[0]}`}
                                                    <button
                                                        className='!w-4 !h-4 bg-accent rounded-full p-1 flex items-center justify-center'
                                                        onClick={() => handleBadgeFilterChange([])}
                                                    >
                                                        <IconX className='!w-3 !h-3' />
                                                    </button>
                                                </>
                                            )}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='end' className='w-32'>
                                            {badges.map((name) => (
                                                <DropdownMenuCheckboxItem
                                                    checked={badgeFilter.includes(name)}
                                                    className='w-full'
                                                    onCheckedChange={(checked) => {
                                                        handleBadgeFilterChange(
                                                            checked ? [...badgeFilter, name] : badgeFilter.filter((item) => item !== name)
                                                        )
                                                    }}
                                                    key={name}
                                                >
                                                    {name}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger size='sm' variant='outline'>
                                            {typeFilter.length === 0 ? (
                                                <>
                                                    Type
                                                    <IconChevronDown />
                                                </>
                                            ) : (
                                                <>
                                                    {typeFilter.length > 1
                                                        ? `${typeFilter[0]} + ${typeFilter.length - 1}`
                                                        : `${typeFilter[0]}`}
                                                    <button
                                                        className='!w-4 !h-4 bg-accent rounded-full p-1 flex items-center justify-center'
                                                        onClick={() => handleTypeFilterChange([])}
                                                    >
                                                        <IconX className='!w-3 !h-3' />
                                                    </button>
                                                </>
                                            )}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='end' className='w-32'>
                                            {types.map((name) => (
                                                <DropdownMenuCheckboxItem
                                                    checked={typeFilter.includes(name)}
                                                    className='w-full'
                                                    onCheckedChange={(checked) => {
                                                        handleTypeFilterChange(
                                                            checked ? [...typeFilter, name] : typeFilter.filter((item) => item !== name)
                                                        )
                                                    }}
                                                    key={name}
                                                >
                                                    {name}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger size='sm' variant='outline'>
                                            {frameworkFilter.length === 0 ? (
                                                <>
                                                    Frameworks
                                                    <IconChevronDown />
                                                </>
                                            ) : (
                                                <>
                                                    {frameworkFilter.length > 1
                                                        ? `${frameworkFilter[0]} + ${frameworkFilter.length - 1}`
                                                        : `${frameworkFilter[0]}`}
                                                    <button
                                                        className='!w-4 !h-4 bg-accent rounded-full p-1 flex items-center justify-center'
                                                        onClick={() => handleFrameworkFilterChange([])}
                                                    >
                                                        <IconX className='!w-3 !h-3' />
                                                    </button>
                                                </>
                                            )}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='end' className='w-40'>
                                            {framework.map((name) => (
                                                <DropdownMenuCheckboxItem
                                                    checked={frameworkFilter.includes(name)}
                                                    className='w-full'
                                                    onCheckedChange={(checked) => {
                                                        handleFrameworkFilterChange(
                                                            checked
                                                                ? [...frameworkFilter, name]
                                                                : frameworkFilter.filter((item) => item !== name)
                                                        )
                                                    }}
                                                    key={name}
                                                >
                                                    {name}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            }
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder='Search Name/Description/Node'
                            title='Marketplace'
                        >
                            <ToggleGroup
                                type='single'
                                defaultValue='card'
                                className='p-0 gap-0 rounded-md border border-border box-border divide-x divide-border overflow-hidden shrink-0'
                                onValueChange={handleViewChange}
                                size='sm'
                                value={view}
                            >
                                <ToggleGroupItem value='card' aria-label='Grid view' className='rounded-none'>
                                    <IconLayoutGrid />
                                </ToggleGroupItem>
                                <ToggleGroupItem value='list' aria-label='List view' className='rounded-none'>
                                    <IconList />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </ViewHeader>
                        <Tabs defaultValue={COMMUNITY_TEMPLATES_TAB_VALUE} onChange={handleTabChange} value={activeTabValue}>
                            <Box className='w-full flex items-center justify-between pb-2.5'>
                                <TabsList className='bg-transparent p-0 gap-2'>
                                    <TabsTrigger
                                        className='hover:bg-accent'
                                        selectedClassName='bg-accent text-accent-foreground shadow-sm'
                                        value={COMMUNITY_TEMPLATES_TAB_VALUE}
                                    >
                                        Community Templates
                                    </TabsTrigger>
                                    <TabsTrigger
                                        className='hover:bg-accent'
                                        selectedClassName='bg-accent text-accent-foreground shadow-sm'
                                        value={MY_TEMPLATES_TAB_VALUE}
                                    >
                                        My Templates
                                    </TabsTrigger>
                                </TabsList>
                                <DropdownMenu>
                                    <DropdownMenuTrigger size='sm' variant='outline'>
                                        {activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE ? (
                                            selectedUsecases.length === 0 ? (
                                                <>
                                                    Use Cases
                                                    <IconChevronDown />
                                                </>
                                            ) : (
                                                <>
                                                    {selectedUsecases.length > 1
                                                        ? `${selectedUsecases[0]} + ${selectedUsecases.length - 1}`
                                                        : `${selectedUsecases[0]}`}
                                                    <button
                                                        className='!w-4 !h-4 bg-accent rounded-full p-1 flex items-center justify-center'
                                                        onClick={() => clearAllUsecases()}
                                                    >
                                                        <IconX className='!w-3 !h-3' />
                                                    </button>
                                                </>
                                            )
                                        ) : selectedTemplateUsecases.length === 0 ? (
                                            <>
                                                Use Cases
                                                <IconChevronDown />
                                            </>
                                        ) : (
                                            <>
                                                {selectedTemplateUsecases.length > 1
                                                    ? `${selectedTemplateUsecases[0]} + ${selectedTemplateUsecases.length - 1}`
                                                    : `${selectedTemplateUsecases[0]}`}
                                                <button
                                                    className='!w-4 !h-4 bg-accent rounded-full p-1 flex items-center justify-center'
                                                    onClick={() => clearAllUsecases()}
                                                >
                                                    <IconX className='!w-3 !h-3' />
                                                </button>
                                            </>
                                        )}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end' className='w-56'>
                                        {activeTabValue === COMMUNITY_TEMPLATES_TAB_VALUE
                                            ? usecases.map((usecase, index) => (
                                                  <DropdownMenuCheckboxItem
                                                      disabled={eligibleUsecases.length === 0 ? true : !eligibleUsecases.includes(usecase)}
                                                      checked={selectedUsecases.includes(usecase)}
                                                      className='w-full'
                                                      onCheckedChange={(checked) => {
                                                          setSelectedUsecases(
                                                              checked
                                                                  ? [...selectedUsecases, usecase]
                                                                  : selectedUsecases.filter((item) => item !== usecase)
                                                          )
                                                      }}
                                                      key={index}
                                                  >
                                                      {usecase}
                                                  </DropdownMenuCheckboxItem>
                                              ))
                                            : templateUsecases.map((usecase, index) => (
                                                  <DropdownMenuCheckboxItem
                                                      disabled={
                                                          eligibleTemplateUsecases.length === 0
                                                              ? true
                                                              : !eligibleTemplateUsecases.includes(usecase)
                                                      }
                                                      checked={selectedTemplateUsecases.includes(usecase)}
                                                      className='w-full'
                                                      onCheckedChange={(checked) => {
                                                          setSelectedTemplateUsecases(
                                                              checked
                                                                  ? [...selectedTemplateUsecases, usecase]
                                                                  : selectedTemplateUsecases.filter((item) => item !== usecase)
                                                          )
                                                      }}
                                                      key={index}
                                                  >
                                                      {usecase}
                                                  </DropdownMenuCheckboxItem>
                                              ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </Box>
                            <TabsContent value={COMMUNITY_TEMPLATES_TAB_VALUE}>
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
                                                            {(data.type === 'Chatflow' || data.type === 'Agentflow') && (
                                                                <Link className='w-full h-full' to={`/marketplace/${data.id}`}>
                                                                    <ItemCard data={data} images={images[data.id]} />
                                                                </Link>
                                                            )}
                                                            {data.type === 'Tool' && (
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
                            </TabsContent>
                            <TabsContent value={MY_TEMPLATES_TAB_VALUE}>
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
                                                            {(data.type === 'Chatflow' || data.type === 'Agentflow') && (
                                                                <Link className='w-full h-full' to={`/marketplace/${data.id}`}>
                                                                    <ItemCard data={data} images={templateImages[data.id]} />
                                                                </Link>
                                                            )}
                                                            {data.type === 'Tool' && (
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
                                        onDelete={onDeleteCustomTemplate}
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
                            </TabsContent>
                        </Tabs>
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
            <ConfirmDialog />
        </>
    )
}

export default Marketplace
