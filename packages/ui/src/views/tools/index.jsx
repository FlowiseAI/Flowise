'use client'
import PropTypes from 'prop-types'
import { useEffect, useState, useRef, useMemo } from 'react'
import { Box, Stack, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button, Skeleton } from '@mui/material'
import MainCard from '@/ui-component/cards/MainCard'
import ToolDialog from './ToolDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import FlowListView from '@/ui-component/lists/FlowListView'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { useFlags } from 'flagsmith/react'

// API
import toolsApi from '@/api/tools'
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileUpload } from '@tabler/icons-react'

// project imports
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'
import { ToolsTable } from '@/ui-component/table/ToolsListTable'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div role='tabpanel' hidden={value !== index} id={`tool-tabpanel-${index}`} aria-labelledby={`tool-tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

const Tools = () => {
    const [tabValue, setTabValue] = useState(0)
    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [categories, setCategories] = useState(['All'])
    const [myTools, setMyTools] = useState([])
    const [marketplaceTools, setMarketplaceTools] = useState([])
    const [organizationTools, setOrganizationTools] = useState([])
    const flags = useFlags(['org:manage'])
    const [view, setView] = useState(typeof window !== 'undefined' ? localStorage.getItem('toolsDisplayStyle') || 'card' : 'card')

    const inputRef = useRef(null)

    const getAllToolsApi = useApi(toolsApi.getAllTools)
    const getMarketplaceToolsApi = useApi(marketplacesApi.getAllTemplatesFromMarketplaces)

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const handleCategoryChange = (event) => {
        setCategoryFilter(event.target.value)
    }

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Tool',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
        }
    }
    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('toolsDisplayStyle', nextView)
        setView(nextView)
    }
    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedTool) => {
        const dialogProp = {
            title: 'Edit Tool',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const goToTool = (selectedTool) => {
        const dialogProp = {
            title: selectedTool.templateName,
            type: 'TEMPLATE',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllToolsApi.request()
    }

    function filterTools(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }
    const onUseTemplate = (selectedTool) => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'IMPORT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }
    useEffect(() => {
        getAllToolsApi.request()
        getMarketplaceToolsApi.request()
    }, [])

    useEffect(() => {
        if (getAllToolsApi.data && getMarketplaceToolsApi.data) {
            const allTools = getAllToolsApi.data
            setMyTools(allTools.filter((tool) => tool.isOwner))
            setOrganizationTools(allTools.filter((tool) => !tool.isOwner))
            setMarketplaceTools(getMarketplaceToolsApi.data.filter((tool) => tool.type === 'Tool'))

            const uniqueCategories = [
                'All',
                ...new Set(allTools.concat(getMarketplaceToolsApi.data).flatMap((item) => (item?.category ? item.category.split(';') : [])))
            ]
            setCategories(uniqueCategories)
        }
    }, [getAllToolsApi.data, getMarketplaceToolsApi.data])

    useEffect(() => {
        setLoading(getAllToolsApi.loading || getMarketplaceToolsApi.loading)
    }, [getAllToolsApi.loading, getMarketplaceToolsApi.loading])

    useEffect(() => {
        if (getAllToolsApi.error || getMarketplaceToolsApi.error) {
            setError(getAllToolsApi.error || getMarketplaceToolsApi.error)
        }
    }, [getAllToolsApi.error, getMarketplaceToolsApi.error])

    useEffect(() => {
        if (getAllToolsApi.data) {
            const allTools = getAllToolsApi.data
            setMyTools(allTools.filter((tool) => tool.isOwner))
            setOrganizationTools(allTools.filter((tool) => !tool.isOwner))
        }
    }, [getAllToolsApi.data])

    // const filterTools = (tools, search, categoryFilter) => {
    //     const searchRegex = new RegExp(search, 'i') // 'i' flag for case-insensitive search

    //     return tools.filter((tool) => {
    //         if (!tool) return false

    //         // Check category first
    //         const category = tool.category || ''
    //         if (categoryFilter !== 'All' && !category.includes(categoryFilter)) {
    //             return false
    //         }

    //         // If category matches, then check search
    //         const name = tool.name || tool.templateName || ''
    //         const description = tool.description || ''
    //         const searchText = `${name} ${description}`

    //         return searchRegex.test(searchText)
    //     })
    // }

    // const filteredMyTools = useMemo(() => filterTools(myTools, search, categoryFilter), [myTools, search, categoryFilter])
    // const filteredMarketplaceTools = useMemo(
    //     () => filterTools(marketplaceTools, search, categoryFilter),
    //     [marketplaceTools, search, categoryFilter]
    // )
    // const filteredOrganizationTools = useMemo(
    //     () => filterTools(organizationTools, search, categoryFilter),
    //     [organizationTools, search, categoryFilter]
    // )

    const isAdmin = flags?.['org:manage']?.enabled

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Tools' title='Tools'>
                            <Button sx={{ borderRadius: 2, maxHeight: 40 }} value={view} color='primary' exclusive onChange={handleChange}>
                                Load
                            </Button>
                            <input
                                style={{ display: 'none' }}
                                ref={inputRef}
                                type='file'
                                hidden
                                accept='.json'
                                onChange={(e) => handleFileUpload(e)}
                            />
                            <StyledButton
                                variant='contained'
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                sx={{ borderRadius: 2, height: 40 }}
                            >
                                Create
                            </StyledButton>
                        </ViewHeader>
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
                                        {getAllToolsApi.data &&
                                            getAllToolsApi.data
                                                ?.filter(filterTools)
                                                .map((data, index) => <ItemCard data={data} key={index} onClick={() => edit(data)} />)}
                                    </Box>
                                )}
                            </>
                        ) : (
                            <ToolsTable data={getAllToolsApi.data} isLoading={isLoading} onSelect={edit} />
                        )}
                        {!isLoading && (!getAllToolsApi.data || getAllToolsApi.data.length === 0) && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={ToolEmptySVG}
                                        alt='ToolEmptySVG'
                                    />
                                </Box>
                                <div>No Tools Created Yet</div>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                onUseTemplate={onUseTemplate}
                setError={setError}
            />
        </>
    )
}

export default Tools
