'use client'
import PropTypes from 'prop-types'
import { useEffect, useState, useRef, useMemo } from 'react'
import { Box, Stack, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material'
import MainCard from '@/ui-component/cards/MainCard'
import ToolDialog from './ToolDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import FlowListView from '@/ui-component/lists/FlowListView'
import { StyledButton } from '@/ui-component/button/StyledButton'

// API
import toolsApi from '@/api/tools'
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileUpload } from '@tabler/icons-react'

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
        setLoading(getAllToolsApi.loading || getMarketplaceToolsApi.loading)
    }, [getAllToolsApi.loading, getMarketplaceToolsApi.loading])

    useEffect(() => {
        if (getAllToolsApi.error || getMarketplaceToolsApi.error) {
            setError(getAllToolsApi.error || getMarketplaceToolsApi.error)
        }
    }, [getAllToolsApi.error, getMarketplaceToolsApi.error])

    useEffect(() => {
        if (getAllToolsApi.data && getMarketplaceToolsApi.data) {
            setMyTools(getAllToolsApi.data)
            setMarketplaceTools(getMarketplaceToolsApi.data.filter((tool) => tool.type === 'Tool'))

            const allTools = [...getAllToolsApi.data, ...getMarketplaceToolsApi.data.filter((tool) => tool.type === 'Tool')]
            const uniqueCategories = ['All', ...new Set(allTools.flatMap((item) => (item?.category ? item.category.split(';') : [])))]
            setCategories(uniqueCategories)
        }
    }, [getAllToolsApi.data, getMarketplaceToolsApi.data])

    const filterTools = (tools, search, categoryFilter) => {
        const searchRegex = new RegExp(search, 'i') // 'i' flag for case-insensitive search

        return tools.filter((tool) => {
            if (!tool) return false

            // Check category first
            const category = tool.category || ''
            if (categoryFilter !== 'All' && !category.includes(categoryFilter)) {
                return false
            }

            // If category matches, then check search
            const name = tool.name || tool.templateName || ''
            const description = tool.description || ''
            const searchText = `${name} ${description}`

            return searchRegex.test(searchText)
        })
    }

    const filteredMyTools = useMemo(() => filterTools(myTools, search, categoryFilter), [myTools, search, categoryFilter])

    const filteredMarketplaceTools = useMemo(
        () => filterTools(marketplaceTools, search, categoryFilter),
        [marketplaceTools, search, categoryFilter]
    )
    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder='Search Name, Description or Category'
                            title='Tools'
                        >
                            <FormControl sx={{ minWidth: 120, mr: 1 }}>
                                <InputLabel id='category-filter-label'>Category</InputLabel>
                                <Select
                                    size='small'
                                    labelId='category-filter-label'
                                    value={categoryFilter}
                                    onChange={handleCategoryChange}
                                    label='Category'
                                >
                                    {categories.map((category) => (
                                        <MenuItem key={category} value={category}>
                                            {category}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant='outlined'
                                onClick={() => inputRef.current.click()}
                                startIcon={<IconFileUpload />}
                                sx={{ borderRadius: 2, height: 40, mr: 1 }}
                            >
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

                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label='tool tabs'>
                                <Tab label='My Tools' />
                                <Tab label='Marketplace Tools' />
                            </Tabs>
                        </Box>
                        <TabPanel value={tabValue} index={0}>
                            <FlowListView
                                data={filteredMyTools}
                                isLoading={isLoading}
                                updateFlowsApi={getAllToolsApi}
                                setError={setError}
                                type='tools'
                                onItemClick={edit}
                            />
                        </TabPanel>
                        <TabPanel value={tabValue} index={1}>
                            <FlowListView
                                data={filteredMarketplaceTools}
                                isLoading={isLoading}
                                updateFlowsApi={getMarketplaceToolsApi}
                                setError={setError}
                                type='marketplace'
                                onItemClick={goToTool}
                            />
                        </TabPanel>
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
