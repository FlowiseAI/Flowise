import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

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
    Stack,
    Typography,
    Chip
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import Transitions from 'ui-component/extended/Transitions'
import { StyledFab } from 'ui-component/button/StyledFab'

// icons
import { IconPlus, IconSearch, IconMinus, IconX } from '@tabler/icons'

// const
import { baseURL } from 'store/constant'
import { SET_COMPONENT_NODES } from 'store/actions'

// ==============================|| ADD NODES||============================== //

const AddNodes = ({ nodesData, node }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    const [searchValue, setSearchValue] = useState('')
    const [nodes, setNodes] = useState({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState({})

    const anchorRef = useRef(null)
    const prevOpen = useRef(open)
    const ps = useRef()

    // Temporary method to handle Deprecating Vector Store and New ones
    const categorizeVectorStores = (nodes, accordianCategories, isFilter) => {
        const obj = { ...nodes }
        const vsNodes = obj['Vector Stores'] ?? []
        const deprecatingNodes = []
        const newNodes = []
        for (const vsNode of vsNodes) {
            if (vsNode.badge === 'DEPRECATING') deprecatingNodes.push(vsNode)
            else newNodes.push(vsNode)
        }
        delete obj['Vector Stores']
        if (deprecatingNodes.length) {
            obj['Vector Stores;DEPRECATING'] = deprecatingNodes
            accordianCategories['Vector Stores;DEPRECATING'] = isFilter ? true : false
        }
        if (newNodes.length) {
            obj['Vector Stores;NEW'] = newNodes
            accordianCategories['Vector Stores;NEW'] = isFilter ? true : false
        }
        setNodes(obj)
    }

    const scrollTop = () => {
        const curr = ps.current
        if (curr) {
            curr.scrollTop = 0
        }
    }

    const getSearchedNodes = (value) => {
        const passed = nodesData.filter((nd) => {
            const passesQuery = nd.name.toLowerCase().includes(value.toLowerCase())
            const passesCategory = nd.category.toLowerCase().includes(value.toLowerCase())
            return passesQuery || passesCategory
        })
        return passed
    }

    const filterSearch = (value) => {
        setSearchValue(value)
        setTimeout(() => {
            if (value) {
                const returnData = getSearchedNodes(value)
                groupByCategory(returnData, true)
                scrollTop()
            } else if (value === '') {
                groupByCategory(nodesData)
                scrollTop()
            }
        }, 500)
    }

    const groupByCategory = (nodes, isFilter) => {
        const accordianCategories = {}
        const result = nodes.reduce(function (r, a) {
            r[a.category] = r[a.category] || []
            r[a.category].push(a)
            accordianCategories[a.category] = isFilter ? true : false
            return r
        }, Object.create(null))
        setNodes(result)
        categorizeVectorStores(result, accordianCategories, isFilter)
        setCategoryExpanded(accordianCategories)
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
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [-40, 14]
                            }
                        }
                    ]
                }}
                sx={{ zIndex: 1000 }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    <Box sx={{ p: 2 }}>
                                        <Stack>
                                            <Typography variant='h4'>Add Nodes</Typography>
                                        </Stack>
                                        <OutlinedInput
                                            sx={{ width: '100%', pr: 2, pl: 2, my: 2 }}
                                            id='input-search-node'
                                            value={searchValue}
                                            onChange={(e) => filterSearch(e.target.value)}
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
                                                        onClick={() => filterSearch('')}
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
                                        <Divider />
                                    </Box>
                                    <PerfectScrollbar
                                        containerRef={(el) => {
                                            ps.current = el
                                        }}
                                        style={{ height: '100%', maxHeight: 'calc(100vh - 320px)', overflowX: 'hidden' }}
                                    >
                                        <Box sx={{ p: 2 }}>
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
                                                    .map((category) =>
                                                        category === 'Vector Stores' ? (
                                                            <></>
                                                        ) : (
                                                            <Accordion
                                                                expanded={categoryExpanded[category] || false}
                                                                onChange={handleAccordionChange(category)}
                                                                key={category}
                                                                disableGutters
                                                            >
                                                                <AccordionSummary
                                                                    expandIcon={<ExpandMoreIcon />}
                                                                    aria-controls={`nodes-accordian-${category}`}
                                                                    id={`nodes-accordian-header-${category}`}
                                                                >
                                                                    {category.split(';').length > 1 ? (
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                flexDirection: 'row',
                                                                                alignItems: 'center'
                                                                            }}
                                                                        >
                                                                            <Typography variant='h5'>{category.split(';')[0]}</Typography>
                                                                            &nbsp;
                                                                            <Chip
                                                                                sx={{
                                                                                    width: 'max-content',
                                                                                    fontWeight: 700,
                                                                                    fontSize: '0.65rem',
                                                                                    background:
                                                                                        category.split(';')[1] === 'DEPRECATING'
                                                                                            ? theme.palette.warning.main
                                                                                            : theme.palette.teal.main,
                                                                                    color:
                                                                                        category.split(';')[1] !== 'DEPRECATING'
                                                                                            ? 'white'
                                                                                            : 'inherit'
                                                                                }}
                                                                                size='small'
                                                                                label={category.split(';')[1]}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <Typography variant='h5'>{category}</Typography>
                                                                    )}
                                                                </AccordionSummary>
                                                                <AccordionDetails>
                                                                    {nodes[category].map((node, index) => (
                                                                        <div
                                                                            key={node.name}
                                                                            onDragStart={(event) => onDragStart(event, node)}
                                                                            draggable
                                                                        >
                                                                            <ListItemButton
                                                                                sx={{
                                                                                    p: 0,
                                                                                    borderRadius: `${customization.borderRadius}px`,
                                                                                    cursor: 'move'
                                                                                }}
                                                                            >
                                                                                <ListItem alignItems='center'>
                                                                                    <ListItemAvatar>
                                                                                        <div
                                                                                            style={{
                                                                                                width: 50,
                                                                                                height: 50,
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
                                                                                        sx={{ ml: 1 }}
                                                                                        primary={
                                                                                            <div
                                                                                                style={{
                                                                                                    display: 'flex',
                                                                                                    flexDirection: 'row',
                                                                                                    alignItems: 'center'
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
                                                                                                                node.badge === 'DEPRECATING'
                                                                                                                    ? theme.palette.warning
                                                                                                                          .main
                                                                                                                    : theme.palette.teal
                                                                                                                          .main,
                                                                                                            color:
                                                                                                                node.badge !== 'DEPRECATING'
                                                                                                                    ? 'white'
                                                                                                                    : 'inherit'
                                                                                                        }}
                                                                                                        size='small'
                                                                                                        label={node.badge}
                                                                                                    />
                                                                                                )}
                                                                                            </div>
                                                                                        }
                                                                                        secondary={node.description}
                                                                                    />
                                                                                </ListItem>
                                                                            </ListItemButton>
                                                                            {index === nodes[category].length - 1 ? null : <Divider />}
                                                                        </div>
                                                                    ))}
                                                                </AccordionDetails>
                                                            </Accordion>
                                                        )
                                                    )}
                                            </List>
                                        </Box>
                                    </PerfectScrollbar>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </>
    )
}

AddNodes.propTypes = {
    nodesData: PropTypes.array,
    node: PropTypes.object
}

export default AddNodes
