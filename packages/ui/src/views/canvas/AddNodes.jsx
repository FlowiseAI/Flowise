import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'

// third-party

// project imports
import { StyledFab } from '@/ui-component/button/StyledFab'

// icons
import { IconPlus, IconMinus } from '@tabler/icons-react'
import LlamaindexPNG from '@/assets/images/llamaindex.png'
import LangChainPNG from '@/assets/images/langchain.png'
import utilNodesPNG from '@/assets/images/utilNodes.png'
import AAIPNG from '@/assets/images/aai.png'

// const
import { SET_COMPONENT_NODES } from '@/store/actions'

// Custom components
import CreateAgentButton from './CreateAgentButton'

// ==============================|| ADD NODES||============================== //
function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

const blacklistCategoriesForAgentCanvas = ['Agents', 'Memory', 'Record Manager', 'Utilities']

const agentMemoryNodes = ['agentMemory', 'sqliteAgentMemory', 'postgresAgentMemory', 'mySQLAgentMemory', 'answerAiAgentMemory']

// Show blacklisted nodes (exceptions) for agent canvas
const exceptionsForAgentCanvas = {
    Memory: agentMemoryNodes,
    Utilities: ['getVariable', 'setVariable', 'stickyNote']
}

// Hide some nodes from the chatflow canvas
const blacklistForChatflowCanvas = {
    Memory: agentMemoryNodes
}

const AddNodes = ({ nodesData, node, isAgentCanvas, setNodes: setReactFlowNodes, setEdges, setDirtyReactFlow }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    const [searchValue, setSearchValue] = useState('')
    const [nodes, setNodes] = useState({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState({})
    const [tabValue, setTabValue] = useState(0)
    const [showCreateAgentDialog, setShowCreateAgentDialog] = useState(true)

    const anchorRef = useRef(null)
    const prevOpen = useRef(open)
    const ps = useRef()

    const scrollTop = () => {
        const curr = ps.current
        if (curr) {
            curr.scrollTop = 0
        }
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
        filterSearch(searchValue, newValue)
    }

    const addException = (category) => {
        let nodes = []
        if (category) {
            const nodeNames = exceptionsForAgentCanvas[category] || []
            nodes = nodesData.filter((nd) => nd.category === category && nodeNames.includes(nd.name))
        } else {
            for (const category in exceptionsForAgentCanvas) {
                const nodeNames = exceptionsForAgentCanvas[category]
                nodes.push(...nodesData.filter((nd) => nd.category === category && nodeNames.includes(nd.name)))
            }
        }
        return nodes
    }

    const getSearchedNodes = (value) => {
        if (isAgentCanvas) {
            const nodes = nodesData.filter((nd) => !blacklistCategoriesForAgentCanvas.includes(nd.category))
            nodes.push(...addException())
            const passed = nodes.filter((nd) => {
                const passesName = nd.name.toLowerCase().includes(value.toLowerCase())
                const passesLabel = nd.label.toLowerCase().includes(value.toLowerCase())
                const passesCategory = nd.category.toLowerCase().includes(value.toLowerCase())
                return passesName || passesCategory || passesLabel
            })
            return passed
        }
        let nodes = nodesData.filter((nd) => nd.category !== 'Multi Agents' && nd.category !== 'Sequential Agents')

        for (const category in blacklistForChatflowCanvas) {
            const nodeNames = blacklistForChatflowCanvas[category]
            nodes = nodes.filter((nd) => !nodeNames.includes(nd.name))
        }

        const passed = nodes.filter((nd) => {
            const passesName = nd.name.toLowerCase().includes(value.toLowerCase())
            const passesLabel = nd.label.toLowerCase().includes(value.toLowerCase())
            const passesCategory = nd.category.toLowerCase().includes(value.toLowerCase())
            return passesName || passesCategory || passesLabel
        })
        return passed
    }

    const filterSearch = (value, newTabValue) => {
        setSearchValue(value)
        setTimeout(() => {
            if (value) {
                const returnData = getSearchedNodes(value)
                groupByCategory(returnData, newTabValue ?? tabValue, true)
                scrollTop()
            } else if (value === '') {
                groupByCategory(nodesData, newTabValue ?? tabValue)
                scrollTop()
            }
        }, 500)
    }

    const groupByTags = (nodes, newTabValue = 0) => {
        const aaiNodes = nodes.filter((nd) => nd.tags && nd.tags.includes('AAI'))
        const langchainNodes = nodes.filter((nd) => !nd.tags || !nd.tags.includes('AAI'))
        const llmaindexNodes = nodes.filter((nd) => nd.tags && nd.tags.includes('LlamaIndex'))
        const utilitiesNodes = nodes.filter((nd) => nd.tags && nd.tags.includes('Utilities'))
        if (newTabValue === 0) {
            return aaiNodes
        } else if (newTabValue === 1) {
            return langchainNodes
        } else if (newTabValue === 2) {
            return llmaindexNodes
        } else {
            return utilitiesNodes
        }
    }

    const groupByCategory = (nodes, newTabValue, isFilter) => {
        if (isAgentCanvas) {
            const accordianCategories = {}
            const result = nodes.reduce(function (r, a) {
                r[a.category] = r[a.category] || []
                r[a.category].push(a)
                accordianCategories[a.category] = isFilter ? true : false
                return r
            }, Object.create(null))

            const filteredResult = {}
            for (const category in result) {
                // Filter out blacklisted categories
                if (!blacklistCategoriesForAgentCanvas.includes(category)) {
                    // Filter out LlamaIndex nodes
                    const nodes = result[category].filter((nd) => !nd.tags || !nd.tags.includes('LlamaIndex'))
                    if (!nodes.length) continue

                    filteredResult[category] = nodes
                }

                // Allow exceptionsForAgentCanvas
                if (Object.keys(exceptionsForAgentCanvas).includes(category)) {
                    filteredResult[category] = addException(category)
                }
            }
            setNodes(filteredResult)
            accordianCategories['Multi Agents'] = true
            accordianCategories['Sequential Agents'] = true
            accordianCategories['Memory'] = true
            setCategoryExpanded(accordianCategories)
        } else {
            const taggedNodes = groupByTags(nodes, newTabValue)
            const accordianCategories = {}
            const result = taggedNodes.reduce(function (r, a) {
                r[a.category] = r[a.category] || []
                r[a.category].push(a)
                accordianCategories[a.category] = isFilter ? true : false
                return r
            }, Object.create(null))

            const filteredResult = {}
            for (const category in result) {
                if (category === 'Multi Agents' || category === 'Sequential Agents') {
                    continue
                }
                if (Object.keys(blacklistForChatflowCanvas).includes(category)) {
                    const nodes = blacklistForChatflowCanvas[category]
                    result[category] = result[category].filter((nd) => !nodes.includes(nd.name))
                }
                filteredResult[category] = result[category]
            }

            setNodes(filteredResult)
            setCategoryExpanded(accordianCategories)
        }
    }

    const handleAccordionChange = (category) => (event, isExpanded) => {
        const accordianCategories = { ...categoryExpanded }
        accordianCategories[category] = isExpanded
        setCategoryExpanded(accordianCategories)
    }

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const onDragStart = (event, node) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
    }

    const getImage = (tabValue) => {
        if (tabValue === 0) {
            return AAIPNG
        } else if (tabValue === 1) {
            return LangChainPNG
        } else if (tabValue === 2) {
            return LlamaindexPNG
        } else {
            return utilNodesPNG
        }
    }

    const handleAgentDialogClose = () => {
        setOpen(false)
    }

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }

        prevOpen.current = open
    }, [open])

    useEffect(() => {
        if (node) setOpen(false)
    }, [node])

    useEffect(() => {
        if (nodesData) {
            groupByCategory(nodesData)
            dispatch({ type: SET_COMPONENT_NODES, componentNodes: nodesData })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesData, dispatch])

    return (
        <>
            <StyledFab
                sx={{ left: 20, top: 20 }}
                ref={anchorRef}
                size='small'
                color='primary'
                aria-label='add'
                title='Add Node'
                onClick={handleToggle}
            >
                {open ? <IconMinus /> : <IconPlus />}
            </StyledFab>
            <CreateAgentButton
                nodesData={nodesData}
                canvasPublic={false}
                openFromAddNodes={open}
                setNodes={setReactFlowNodes}
                setEdges={setEdges}
                setDirtyReactFlow={setDirtyReactFlow}
                onClose={handleAgentDialogClose}
            />
        </>
    )
}

AddNodes.propTypes = {
    nodesData: PropTypes.array,
    node: PropTypes.object,
    isAgentCanvas: PropTypes.bool,
    setNodes: PropTypes.func,
    setEdges: PropTypes.func,
    setDirtyReactFlow: PropTypes.func
}

export default AddNodes
