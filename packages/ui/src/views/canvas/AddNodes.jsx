import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { debounce } from 'lodash'

// material-ui
import { useTheme } from '@mui/material/styles'
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    ClickAwayListener,
    Divider,
    InputAdornment,
    List,
    ListItemButton,
    ListItem,
    ListItemAvatar,
    ListItemText,
    OutlinedInput,
    Paper,
    Popper,
    Typography,
    Chip,
    Tab,
    Tabs
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledFab } from '@/ui-component/button/StyledFab'

// icons
import { IconPlus, IconSearch, IconMinus, IconX } from '@tabler/icons-react'
import LlamaindexPNG from '@/assets/images/llamaindex.png'
import LangChainPNG from '@/assets/images/langchain.png'
import UtilNodesPNG from '@/assets/images/utilNodes.png'

// const
import { baseURL } from '@/store/constant'
import { SET_COMPONENT_NODES } from '@/store/actions'

// ==============================|| ADD NODES||============================== //
function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

const blacklistCategoriesForAgentCanvas = ['Agents', 'Memory', 'Record Manager', 'Utilities']

const agentMemoryNodes = ['agentMemory', 'sqliteAgentMemory', 'postgresAgentMemory', 'mySQLAgentMemory']

// Show blacklisted nodes (exceptions) for agent canvas
const exceptionsForAgentCanvas = {
    Memory: agentMemoryNodes,
    Utilities: ['getVariable', 'setVariable', 'stickyNote']
}

// Hide some nodes from the chatflow canvas
const blacklistForChatflowCanvas = {
    Memory: agentMemoryNodes
}

const TAB_ICONS = [LangChainPNG, LlamaindexPNG, UtilNodesPNG]
const TAB_LABELS = ['LangChain', 'LlamaIndex', 'Utilities']

const NodeItem = memo(({ index, node, onDragStart, totalNodes }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const handleDragStart = (event) => onDragStart(event, node)

    return (
        <div onDragStart={handleDragStart} draggable>
            <ListItemButton
                sx={{
                    p: 0,
                    borderRadius: `${customization.borderRadius}px`,
                    cursor: 'move'
                }}
            >
                <ListItem alignItems='center' sx={{ alignItems: 'center', p: 1, gap: 2 }}>
                    <ListItemAvatar sx={{ minWidth: 'auto' }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: 'white'
                            }}
                        >
                            <img
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    padding: 10,
                                    objectFit: 'contain'
                                }}
                                alt={node.name}
                                src={`${baseURL}/api/v1/node-icon/${node.name}`}
                            />
                        </div>
                    </ListItemAvatar>
                    <ListItemText
                        primary={
                            <>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    <span>{node.label}</span>
                                    &nbsp;
                                    {node.badge && (
                                        <Chip
                                            sx={{
                                                width: 'max-content',
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                background:
                                                    node.badge === 'DEPRECATING' ? theme.palette.warning.main : theme.palette.teal.main,
                                                color: node.badge !== 'DEPRECATING' ? 'white' : 'inherit'
                                            }}
                                            size='small'
                                            label={node.badge}
                                        />
                                    )}
                                </Box>
                                {node.author && (
                                    <span
                                        style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        By {node.author}
                                    </span>
                                )}
                            </>
                        }
                        secondary={<Typography variant='subtitle2'>{node.description}</Typography>}
                    />
                </ListItem>
            </ListItemButton>
            {index === totalNodes - 1 ? null : <Divider />}
        </div>
    )
})
NodeItem.displayName = 'NodeItem'
NodeItem.propTypes = {
    index: PropTypes.number,
    node: PropTypes.object,
    onDragStart: PropTypes.func,
    totalNodes: PropTypes.number
}

const CategoryAccordion = memo(({ category, categoryNodes, expanded, onAccordionChange, onDragStart }) => {
    const categoryName = category.split(';')[0]
    const categoryBadge = category.split(';')[1]

    const theme = useTheme()

    return (
        <Accordion expanded={expanded} onChange={(e, expanded) => onAccordionChange(category, expanded)} key={category} disableGutters>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`nodes-accordian-${category}`}
                id={`nodes-accordian-header-${category}`}
                sx={{ py: 1 }}
            >
                {categoryBadge ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}
                    >
                        <Typography variant='h5'>{categoryName}</Typography>
                        &nbsp;
                        <Chip
                            sx={{
                                width: 'max-content',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                background: categoryBadge === 'DEPRECATING' ? theme.palette.warning.main : theme.palette.teal.main,
                                color: categoryBadge !== 'DEPRECATING' ? 'white' : 'inherit'
                            }}
                            size='small'
                            label={categoryBadge}
                        />
                    </div>
                ) : (
                    <Typography variant='h5'>{categoryName}</Typography>
                )}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, px: 1 }}>
                {categoryNodes.map((node, index) => (
                    <NodeItem index={index} key={node.name} node={node} onDragStart={onDragStart} totalNodes={categoryNodes.length} />
                ))}
            </AccordionDetails>
        </Accordion>
    )
})
CategoryAccordion.displayName = 'CategoryAccordion'
CategoryAccordion.propTypes = {
    category: PropTypes.string,
    categoryNodes: PropTypes.array,
    expanded: PropTypes.bool,
    onAccordionChange: PropTypes.func,
    onDragStart: PropTypes.func
}

const AddNodes = ({ nodesData, node, isAgentCanvas }) => {
    const theme = useTheme()
    const dispatch = useDispatch()

    const [searchValue, setSearchValue] = useState('')
    const [nodes, setNodes] = useState({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState({})
    const [tabValue, setTabValue] = useState(0)

    const anchorRef = useRef(null)
    const prevOpen = useRef(open)
    const ps = useRef()

    const scrollTop = () => {
        const curr = ps.current
        if (curr) {
            curr.scrollTop = 0
        }
    }

    const addException = useCallback(
        (category) => {
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
        },
        [nodesData]
    )

    const getSearchedNodes = useCallback(
        (value) => {
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
        },
        [addException, isAgentCanvas, nodesData]
    )

    const groupByTags = (nodes, newTabValue = 0) => {
        const langchainNodes = nodes.filter((nd) => !nd.tags)
        const llmaindexNodes = nodes.filter((nd) => nd.tags && nd.tags.includes('LlamaIndex'))
        const utilitiesNodes = nodes.filter((nd) => nd.tags && nd.tags.includes('Utilities'))
        if (newTabValue === 0) {
            return langchainNodes
        } else if (newTabValue === 1) {
            return llmaindexNodes
        } else {
            return utilitiesNodes
        }
    }

    const groupByCategory = useCallback(
        (nodes, newTabValue, isFilter) => {
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
        },
        [addException, isAgentCanvas]
    )

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const debouncedSearch = useMemo(
        () =>
            debounce((value, newTabValue) => {
                const returnData = value ? getSearchedNodes(value) : nodesData
                groupByCategory(returnData, newTabValue ?? tabValue, !!value)
                scrollTop()
            }, 300),
        [getSearchedNodes, groupByCategory, nodesData, tabValue]
    )

    const onAccordionChange = useCallback(
        (category, isExpanded) => {
            const accordianCategories = { ...categoryExpanded }
            accordianCategories[category] = isExpanded
            setCategoryExpanded(accordianCategories)
        },
        [categoryExpanded]
    )

    const onDragStart = useCallback((event, node) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
    }, [])

    const onSearchValueChange = useCallback(
        (value, newTabValue) => {
            setSearchValue(value)
            debouncedSearch(value, newTabValue)
        },
        [debouncedSearch]
    )

    const onTabChange = useCallback(
        (event, newValue) => {
            setTabValue(newValue)
            onSearchValueChange(searchValue, newValue)
        },
        [onSearchValueChange, searchValue]
    )

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
            <StyledFab ref={anchorRef} size='small' color='primary' aria-label='add' title='Add Node' onClick={handleToggle}>
                {open ? <IconMinus /> : <IconPlus />}
            </StyledFab>
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 16]
                            }
                        }
                    ]
                }}
                sx={{ zIndex: 1000 }}
            >
                <Paper>
                    <ClickAwayListener onClickAway={handleClose}>
                        <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                            <Box sx={{ p: 2 }}>
                                <OutlinedInput
                                    // eslint-disable-next-line
                                    autoFocus
                                    sx={{ width: '100%', pr: 2, pl: 2 }}
                                    id='input-search-node'
                                    value={searchValue}
                                    onChange={(e) => onSearchValueChange(e.target.value)}
                                    placeholder='Search nodes'
                                    startAdornment={
                                        <InputAdornment position='start'>
                                            <IconSearch stroke={1.5} size='1rem' color={theme.palette.grey[500]} />
                                        </InputAdornment>
                                    }
                                    endAdornment={
                                        <InputAdornment
                                            position='end'
                                            sx={{
                                                cursor: 'pointer',
                                                color: theme.palette.grey[500],
                                                '&:hover': {
                                                    color: theme.palette.grey[900]
                                                }
                                            }}
                                            title='Clear Search'
                                        >
                                            <IconX
                                                stroke={1.5}
                                                size='1rem'
                                                onClick={() => onSearchValueChange('')}
                                                style={{
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </InputAdornment>
                                    }
                                    aria-describedby='search-helper-text'
                                    inputProps={{
                                        'aria-label': 'weight'
                                    }}
                                />
                            </Box>
                            {!isAgentCanvas && (
                                <Tabs
                                    sx={{ position: 'relative', minHeight: '50px', height: '50px' }}
                                    variant='fullWidth'
                                    value={tabValue}
                                    onChange={onTabChange}
                                    aria-label='tabs'
                                >
                                    {TAB_LABELS.map((item, index) => (
                                        <Tab
                                            icon={
                                                <div
                                                    style={{
                                                        borderRadius: '50%'
                                                    }}
                                                >
                                                    <img
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            objectFit: 'contain'
                                                        }}
                                                        src={TAB_ICONS[index]}
                                                        alt={item}
                                                    />
                                                </div>
                                            }
                                            iconPosition='start'
                                            sx={{ minHeight: '50px', height: '50px' }}
                                            key={index}
                                            label={item}
                                            {...a11yProps(index)}
                                        ></Tab>
                                    ))}
                                </Tabs>
                            )}
                            <Divider />
                            <PerfectScrollbar
                                containerRef={(el) => {
                                    ps.current = el
                                }}
                                style={{
                                    height: '100%',
                                    maxHeight: `calc(100vh - ${isAgentCanvas ? '300' : '380'}px)`,
                                    overflowX: 'hidden'
                                }}
                            >
                                <Box sx={{ p: 0 }}>
                                    <List
                                        sx={{
                                            width: '100%',
                                            maxWidth: 370,
                                            py: 0,
                                            borderRadius: '10px',
                                            [theme.breakpoints.down('md')]: {
                                                maxWidth: 370
                                            },
                                            '& .MuiListItemSecondaryAction-root': {
                                                top: 22
                                            },
                                            '& .MuiDivider-root': {
                                                my: 0
                                            },
                                            '& .list-container': {
                                                pl: 7
                                            }
                                        }}
                                    >
                                        {Object.keys(nodes)
                                            .sort()
                                            .map((category) => (
                                                <CategoryAccordion
                                                    category={category}
                                                    categoryNodes={nodes[category]}
                                                    expanded={categoryExpanded[category] || false}
                                                    key={category}
                                                    onAccordionChange={onAccordionChange}
                                                    onDragStart={onDragStart}
                                                />
                                            ))}
                                    </List>
                                </Box>
                            </PerfectScrollbar>
                        </MainCard>
                    </ClickAwayListener>
                </Paper>
            </Popper>
        </>
    )
}

AddNodes.propTypes = {
    nodesData: PropTypes.array,
    node: PropTypes.object,
    isAgentCanvas: PropTypes.bool
}

export default memo(AddNodes)
