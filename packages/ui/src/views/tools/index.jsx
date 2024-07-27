import { useEffect, useState, useRef } from 'react'

// material-ui
import { Box, Stack, Button, ButtonGroup, Skeleton, ToggleButtonGroup, ToggleButton } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ToolDialog from './ToolDialog'
import { ToolsTable } from '@/ui-component/table/ToolsListTable'

// API
import toolsApi from '@/api/tools'
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconFileUpload, IconLayoutGrid, IconList } from '@tabler/icons-react'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { useTheme } from '@mui/material/styles'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div role='tabpanel' hidden={value !== index} id={`tool-tabpanel-${index}`} aria-labelledby={`tool-tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

const Tools = () => {
    const theme = useTheme()
    const getAllToolsApi = useApi(toolsApi.getAllTools)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [view, setView] = useState(localStorage.getItem('toolsDisplayStyle') || 'card')

    const inputRef = useRef(null)

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('toolsDisplayStyle', nextView)
        setView(nextView)
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
                        <ViewHeader title='Tools'>
                            <ToggleButtonGroup
                                sx={{ borderRadius: 2, maxHeight: 40 }}
                                value={view}
                                color='primary'
                                exclusive
                                onChange={handleChange}
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
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Button
                                    variant='outlined'
                                    onClick={() => inputRef.current.click()}
                                    startIcon={<IconFileUpload />}
                                    sx={{ borderRadius: 2, height: 40 }}
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
                            </Box>
                            <ButtonGroup disableElevation aria-label='outlined primary button group'>
                                <StyledButton
                                    variant='contained'
                                    onClick={addNew}
                                    startIcon={<IconPlus />}
                                    sx={{ borderRadius: 2, height: 40 }}
                                >
                                    Create
                                </StyledButton>
                            </ButtonGroup>
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
                                            getAllToolsApi.data.map((data, index) => (
                                                <ItemCard data={data} key={index} onClick={() => edit(data)} />
                                            ))}
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
