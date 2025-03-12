'use client'
import PropTypes from 'prop-types'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from '@/utils/navigation'
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import FlowListView from '@/ui-component/lists/FlowListView'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { IconPlus } from '@tabler/icons-react'

// API
import chatflowsApi from '@/api/chatflows'
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL } from '@/store/constant'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`agentflow-tabpanel-${index}`}
            aria-labelledby={`agentflow-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

const Agentflows = () => {
    const navigate = useNavigate()

    const [tabValue, setTabValue] = useState(0)
    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [images, setImages] = useState({})
    const [nodeTypes, setNodeTypes] = useState({})
    const [myAgentflows, setMyAgentflows] = useState([])
    const [answerAIAgentflows, setAnswerAIAgentflows] = useState([])
    const [communityAgentflows, setCommunityAgentflows] = useState([])

    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [categories, setCategories] = useState(['All'])

    const getAllAgentflowsApi = useApi(chatflowsApi.getAllAgentflows)
    const getMarketplaceAgentflowsApi = useApi(marketplacesApi.getAllTemplatesFromMarketplaces)

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('flowDisplayStyle', nextView)
        setView(nextView)
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    const onLoginClick = (username, password) => {
        localStorage.setItem('username', username)
        localStorage.setItem('password', password)
        navigate(0)
    }

    const addNew = () => {
        navigate('/agentcanvas')
    }

    const goToCanvas = (selectedAgentflow) => {
        navigate(`/agentcanvas/${selectedAgentflow.id}`)
    }

    const goToMarketplaceCanvas = (selectedAgentflow) => {
        navigate(`/marketplace/${selectedAgentflow.id}`, {
            state: selectedAgentflow
        })
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const handleCategoryChange = (event) => {
        setCategoryFilter(event.target.value)
    }

    useEffect(() => {
        getAllAgentflowsApi.request()
        getMarketplaceAgentflowsApi.request()
    }, [])

    useEffect(() => {
        if (getAllAgentflowsApi.error || getMarketplaceAgentflowsApi.error) {
            setError(getAllAgentflowsApi.error || getMarketplaceAgentflowsApi.error)
        }
    }, [getAllAgentflowsApi.error, getMarketplaceAgentflowsApi.error])

    useEffect(() => {
        setLoading(getAllAgentflowsApi.loading || getMarketplaceAgentflowsApi.loading)
    }, [getAllAgentflowsApi.loading, getMarketplaceAgentflowsApi.loading])

    useEffect(() => {
        if (getAllAgentflowsApi.data && getMarketplaceAgentflowsApi.data) {
            const processFlowData = (flows) => {
                const processedImages = {}
                const processedNodeTypes = {}
                flows.forEach((flow) => {
                    if (flow && flow.flowData) {
                        try {
                            const flowData = JSON.parse(flow.flowData)
                            const nodes = flowData.nodes || []
                            processedImages[flow.id] = []
                            processedNodeTypes[flow.id] = []
                            nodes.forEach((node) => {
                                if (node && node.data && node.data.category && node.data.name && node.data.label) {
                                    if (['Multi Agents', 'Chat Models', 'Tools', 'Document Loaders'].includes(node.data.category)) {
                                        const imageSrc = `${baseURL}/api/v1/node-icon/${node.data.name}`
                                        if (!processedImages[flow.id].includes(imageSrc)) {
                                            processedImages[flow.id].push(imageSrc)
                                            processedNodeTypes[flow.id].push(node.data.label)
                                        }
                                    }
                                }
                            })
                        } catch (error) {
                            console.error(`Error processing flow data for flow ${flow.id}:`, error)
                        }
                    }
                })
                return { processedImages, processedNodeTypes }
            }

            const myAgentflowsData = getAllAgentflowsApi.data
            const { processedImages: myImages, processedNodeTypes: myNodeTypes } = processFlowData(myAgentflowsData)
            setMyAgentflows(myAgentflowsData)

            const marketplaceAgentflows = getMarketplaceAgentflowsApi.data
            const answerAIFlows = marketplaceAgentflows.filter((flow) => flow.type === 'Agentflow')
            const communityFlows = marketplaceAgentflows.filter((flow) => flow.type === 'Agent Community')

            const { processedImages: answerAIImages, processedNodeTypes: answerAINodeTypes } = processFlowData(answerAIFlows)
            const { processedImages: communityImages, processedNodeTypes: communityNodeTypes } = processFlowData(communityFlows)

            setAnswerAIAgentflows(answerAIFlows)
            setCommunityAgentflows(communityFlows)

            setImages({ ...myImages, ...answerAIImages, ...communityImages })
            setNodeTypes({ ...myNodeTypes, ...answerAINodeTypes, ...communityNodeTypes })

            const allFlows = [...myAgentflowsData, ...answerAIFlows, ...communityFlows]
            const uniqueCategories = ['All', ...new Set(allFlows.flatMap((item) => (item?.category ? item.category.split(';') : [])))]
            setCategories(uniqueCategories)
        }
    }, [getAllAgentflowsApi.data, getMarketplaceAgentflowsApi.data])

    const filterFlows = (flows, search, categoryFilter) => {
        const searchRegex = new RegExp(search, 'i') // 'i' flag for case-insensitive search

        return flows.filter((flow) => {
            if (!flow) return false

            // Check category first
            const category = flow.category || ''
            if (categoryFilter !== 'All' && !category.includes(categoryFilter)) {
                return false
            }

            // If category matches, then check search
            const name = flow.name || flow.templateName || ''
            const description = flow.description || ''
            const searchText = `${name} ${description}`

            return searchRegex.test(searchText)
        })
    }

    const filteredMyAgentflows = useMemo(() => filterFlows(myAgentflows, search, categoryFilter), [myAgentflows, search, categoryFilter])

    const filteredAnswerAIAgentflows = useMemo(
        () => filterFlows(answerAIAgentflows, search, categoryFilter),
        [answerAIAgentflows, search, categoryFilter]
    )

    const filteredCommunityAgentflows = useMemo(
        () => filterFlows(communityAgentflows, search, categoryFilter),
        [communityAgentflows, search, categoryFilter]
    )

    return (
        <MainCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <ViewHeader
                    onSearchChange={onSearchChange}
                    search={true}
                    searchPlaceholder='Search Name, Description or Category'
                    title='Agentflows'
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
                    <StyledButton variant='contained' onClick={addNew} startIcon={<IconPlus />}>
                        Add New
                    </StyledButton>
                </ViewHeader>

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label='agentflow tabs'>
                        <Tab label='My Agentflows' />
                        <Tab label='AnswerAI Supported' />
                        <Tab label='Community' />
                    </Tabs>
                </Box>
                <TabPanel value={tabValue} index={0}>
                    <FlowListView
                        data={filteredMyAgentflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getAllAgentflowsApi}
                        setError={setError}
                        type='agentflows'
                        onItemClick={goToCanvas}
                    />
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                    <FlowListView
                        data={filteredAnswerAIAgentflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getMarketplaceAgentflowsApi}
                        setError={setError}
                        type='marketplace'
                        onItemClick={goToMarketplaceCanvas}
                    />
                </TabPanel>
                <TabPanel value={tabValue} index={2}>
                    <FlowListView
                        data={filteredCommunityAgentflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getMarketplaceAgentflowsApi}
                        setError={setError}
                        type='marketplace'
                        onItemClick={goToMarketplaceCanvas}
                    />
                </TabPanel>
            </Box>
        </MainCard>
    )
}

export default Agentflows
