'use client'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from '@/utils/navigation'
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import FlowListView from '@/ui-component/lists/FlowListView'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { IconPlus } from '@tabler/icons-react'
import { useLocation } from '@/utils/navigation'
import dynamic from 'next/dynamic'
const MarketplaceLandingDialog = dynamic(() => import('./MarketplaceLandingDialog'), { ssr: false })
// API
import chatflowsApi from '@/api/chatflows'
import marketplacesApi from '@/api/marketplaces'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL } from '@/store/constant'
import { useAuth0 } from '@auth0/auth0-react'
import { useFlags } from 'flagsmith/react'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`chatflow-tabpanel-${index}`}
            aria-labelledby={`chatflow-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    )
}

const Chatflows = () => {
    const navigate = useNavigate()
    const { user } = useAuth0()
    const flags = useFlags(['org:manage'])
    const [tabValue, setTabValue] = useState(0)
    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [images, setImages] = useState({})
    const [nodeTypes, setNodeTypes] = useState({})
    const [myChatflows, setMyChatflows] = useState([])
    const [answerAIChatflows, setAnswerAIChatflows] = useState([])
    const [communityChatflows, setCommunityChatflows] = useState([])
    const [organizationChatflows, setOrganizationChatflows] = useState([])

    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [categories, setCategories] = useState(['All'])

    const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState(null)

    const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const getMarketplaceChatflowsApi = useApi(marketplacesApi.getAllTemplatesFromMarketplaces)

    const location = useLocation()

    useEffect(() => {
        // Check if there's a templateId in the URL when the component mounts
        const searchParams = new URLSearchParams(location.search)
        const templateId = searchParams.get('templateId')
        if (templateId) {
            setSelectedTemplateId(templateId)
            setIsMarketplaceDialogOpen(true)
        }
    }, [location])

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    const addNew = () => {
        navigate('/canvas')
    }

    const goToCanvas = (selectedChatflow) => {
        navigate(`/canvas/${selectedChatflow.id}`)
    }

    const goToMarketplaceCanvas = (selectedChatflow) => {
        setSelectedTemplateId(selectedChatflow.id)
        setIsMarketplaceDialogOpen(true)
        // Update the URL without navigating
        window.history.pushState(null, '', `/sidekick-studio/marketplace/${selectedChatflow.id}`)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const handleCategoryChange = (event) => {
        setCategoryFilter(event.target.value)
    }

    useEffect(() => {
        getAllChatflowsApi.request()
        getMarketplaceChatflowsApi.request()
    }, [user])

    useEffect(() => {
        if (getAllChatflowsApi.error || getMarketplaceChatflowsApi.error) {
            setError(getAllChatflowsApi.error || getMarketplaceChatflowsApi.error)
        }
    }, [getAllChatflowsApi.error, getMarketplaceChatflowsApi.error])

    useEffect(() => {
        setLoading(getAllChatflowsApi.loading || getMarketplaceChatflowsApi.loading)
    }, [getAllChatflowsApi.loading, getMarketplaceChatflowsApi.loading])

    useEffect(() => {
        if (getAllChatflowsApi.data && getMarketplaceChatflowsApi.data) {
            const processFlowData = (flows) => {
                const processedImages = {}
                const processedNodeTypes = {}
                flows.forEach((flow) => {
                    if (flow && flow.flowData) {
                        const flowData = JSON.parse(flow.flowData)
                        const nodes = flowData.nodes || []
                        processedImages[flow.id] = []
                        processedNodeTypes[flow.id] = []
                        nodes.forEach((node) => {
                            if (['Agents', 'Chains', 'Chat Models', 'Tools', 'Document Loaders'].includes(node.data.category)) {
                                const imageSrc = `${baseURL}/api/v1/node-icon/${node.data.name}`
                                if (!processedImages[flow.id].includes(imageSrc)) {
                                    processedImages[flow.id].push(imageSrc)
                                    processedNodeTypes[flow.id].push(node.data.label)
                                }
                            }
                        })
                    }
                })
                return { processedImages, processedNodeTypes }
            }

            const myChatflowsData = getAllChatflowsApi.data
            const { processedImages: myImages, processedNodeTypes: myNodeTypes } = processFlowData(myChatflowsData)
            setMyChatflows(myChatflowsData?.filter((flow) => flow.isOwner))
            setOrganizationChatflows(myChatflowsData?.filter((flow) => !flow.isOwner))
            const marketplaceChatflows = getMarketplaceChatflowsApi.data
            const answerAIFlows = marketplaceChatflows.filter((flow) => flow.type === 'Chatflow')
            const communityFlows = marketplaceChatflows.filter((flow) => flow.type === 'Chatflow Community')

            const { processedImages: answerAIImages, processedNodeTypes: answerAINodeTypes } = processFlowData(answerAIFlows)
            const { processedImages: communityImages, processedNodeTypes: communityNodeTypes } = processFlowData(communityFlows)

            setAnswerAIChatflows(answerAIFlows)
            setCommunityChatflows(communityFlows)

            setImages({ ...myImages, ...answerAIImages, ...communityImages })
            setNodeTypes({ ...myNodeTypes, ...answerAINodeTypes, ...communityNodeTypes })

            const allFlows = [...myChatflowsData, ...answerAIFlows, ...communityFlows]
            const uniqueCategories = ['All', ...new Set(allFlows.flatMap((item) => (item?.category ? item.category.split(';') : [])))]
            setCategories(uniqueCategories)
        }
    }, [flags, user, getAllChatflowsApi.data, getMarketplaceChatflowsApi.data])

    const filterChatflows = (flows, search, categoryFilter) => {
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

    const filteredMyChatflows = useMemo(() => filterChatflows(myChatflows, search, categoryFilter), [myChatflows, search, categoryFilter])

    const filteredAnswerAIChatflows = useMemo(
        () => filterChatflows(answerAIChatflows, search, categoryFilter),
        [answerAIChatflows, search, categoryFilter]
    )

    const filteredCommunityChatflows = useMemo(
        () => filterChatflows(communityChatflows, search, categoryFilter),
        [communityChatflows, search, categoryFilter]
    )

    const filteredOrganizationChatflows = useMemo(
        () => filterChatflows(organizationChatflows, search, categoryFilter),
        [organizationChatflows, search, categoryFilter]
    )

    const handleCloseMarketplaceDialog = () => {
        setIsMarketplaceDialogOpen(false)
        setSelectedTemplateId(null)
        // Remove the templateId from the URL when closing the dialog
        window.history.pushState(null, '', window.location.pathname)
    }

    return (
        <MainCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <ViewHeader
                    onSearchChange={onSearchChange}
                    search={true}
                    searchPlaceholder='Search Name, Description or Category'
                    title='Chatflows'
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
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label='chatflow tabs'>
                        <Tab label='My Chatflows' />
                        <Tab label='AnswerAI Supported' />
                        <Tab label='Community' />
                        {flags?.['org:manage']?.enabled ? <Tab label='Organization Chatflows' /> : null}
                    </Tabs>
                </Box>
                <TabPanel value={tabValue} index={0}>
                    <FlowListView
                        data={filteredMyChatflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getAllChatflowsApi}
                        setError={setError}
                        type='chatflows'
                        onItemClick={goToCanvas}
                    />
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                    <FlowListView
                        data={filteredAnswerAIChatflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getMarketplaceChatflowsApi}
                        setError={setError}
                        type='marketplace'
                        onItemClick={goToMarketplaceCanvas}
                    />
                </TabPanel>
                <TabPanel value={tabValue} index={2}>
                    <FlowListView
                        data={filteredCommunityChatflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getMarketplaceChatflowsApi}
                        setError={setError}
                        type='marketplace'
                        onItemClick={goToMarketplaceCanvas}
                    />
                </TabPanel>
                <TabPanel value={tabValue} index={3}>
                    <FlowListView
                        data={filteredOrganizationChatflows}
                        images={images}
                        nodeTypes={nodeTypes}
                        isLoading={isLoading}
                        updateFlowsApi={getMarketplaceChatflowsApi}
                        setError={setError}
                        type='chatflows'
                        onItemClick={goToCanvas}
                    />
                </TabPanel>
            </Box>
            <MarketplaceLandingDialog
                open={isMarketplaceDialogOpen}
                onClose={handleCloseMarketplaceDialog}
                templateId={selectedTemplateId}
            />
        </MainCard>
    )
}

export default Chatflows
