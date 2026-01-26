import React, { useState, useRef, useEffect, memo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

// Material UI
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
    Chip,
    Fab
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// Third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// Icons
import { IconPlus, IconSearch, IconMinus, IconX, IconSparkles } from '@tabler/icons-react'

// Local
import { AGENTFLOW_ICONS } from '../constants/agentflow'
import { SET_COMPONENT_NODES, RootState } from '../store'
import AgentflowGeneratorDialog from './AgentflowGeneratorDialog'

interface AddNodesProps {
    nodesData: any[]
    node?: any
    isAgentCanvas?: boolean
    isAgentflowv2?: boolean
    onFlowGenerated?: () => void
}

const blacklistCategoriesForAgentCanvas = ['Agents', 'Memory', 'Record Manager', 'Utilities']

const agentMemoryNodes = ['agentMemory', 'sqliteAgentMemory', 'postgresAgentMemory', 'mySQLAgentMemory']

// Show blacklisted nodes (exceptions) for agent canvas
const exceptionsForAgentCanvas: Record<string, string[]> = {
    Memory: agentMemoryNodes,
    Utilities: ['getVariable', 'setVariable', 'stickyNote']
}

const AddNodes: React.FC<AddNodesProps> = ({ nodesData, node, isAgentCanvas = false, isAgentflowv2 = false, onFlowGenerated }) => {
    const theme = useTheme()
    const customization = useSelector((state: RootState) => state.customization)
    const dispatch = useDispatch()

    const [searchValue, setSearchValue] = useState('')
    const [nodes, setNodes] = useState<Record<string, any[]>>({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState<Record<string, boolean>>({})

    const [openDialog, setOpenDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const anchorRef = useRef<HTMLButtonElement>(null)
    const prevOpen = useRef(open)
    const ps = useRef<any>()

    const scrollTop = () => {
        const curr = ps.current
        if (curr) {
            curr.scrollTop = 0
        }
    }

    const addException = (category?: string) => {
        let nodes: any[] = []
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

    // Fuzzy search utility function that calculates similarity score
    const fuzzyScore = (searchTerm: string, text: string): number => {
        const search = ((searchTerm ?? '') + '').trim().toLowerCase()
        if (!search) return 0
        const target = ((text ?? '') + '').toLowerCase()

        let score = 0
        let searchIndex = 0
        let firstMatchIndex = -1
        let lastMatchIndex = -1
        let consecutiveMatches = 0

        // Check for exact substring match
        const exactMatchIndex = target.indexOf(search)
        if (exactMatchIndex !== -1) {
            score = 1000
            // Bonus for match at start of string
            if (exactMatchIndex === 0) {
                score += 200
            }
            // Bonus for match at start of word
            else if (target[exactMatchIndex - 1] === ' ' || target[exactMatchIndex - 1] === '-' || target[exactMatchIndex - 1] === '_') {
                score += 100
            }
            // Penalty for how far into the string the match is
            score -= exactMatchIndex * 2
            // Penalty for length difference (shorter target = better match)
            score -= (target.length - search.length) * 3
            return score
        }

        // Fuzzy matching with character-by-character scoring
        for (let i = 0; i < target.length && searchIndex < search.length; i++) {
            if (target[i] === search[searchIndex]) {
                // Base score for character match
                score += 10

                // Bonus for consecutive matches
                if (lastMatchIndex === i - 1) {
                    consecutiveMatches++
                    score += 5 + consecutiveMatches * 2 // Increasing bonus for longer sequences
                } else {
                    consecutiveMatches = 0
                }

                // Bonus for match at start of string
                if (i === 0) {
                    score += 20
                }

                // Bonus for match after space or special character (word boundary)
                if (i > 0 && (target[i - 1] === ' ' || target[i - 1] === '-' || target[i - 1] === '_')) {
                    score += 15
                }

                if (firstMatchIndex === -1) firstMatchIndex = i
                lastMatchIndex = i
                searchIndex++
            }
        }

        // Return 0 if not all characters were matched
        if (searchIndex < search.length) {
            return 0
        }

        // Penalty for length difference (favor shorter targets)
        score -= Math.max(0, target.length - search.length) * 2
        // Penalty for gaps between first/last matched span
        const span = lastMatchIndex - firstMatchIndex + 1
        const gaps = Math.max(0, span - search.length)
        score -= gaps * 3

        return score
    }

    // Score and sort nodes by fuzzy search relevance
    const scoreAndSortNodes = (nodes: any[], searchValue: string) => {
        // Return all nodes unsorted if search is empty
        if (!searchValue || searchValue.trim() === '') {
            return nodes
        }

        // Calculate fuzzy scores for each node
        const nodesWithScores = nodes.map((nd) => {
            const nameScore = fuzzyScore(searchValue, nd.name)
            const labelScore = fuzzyScore(searchValue, nd.label)
            const categoryScore = fuzzyScore(searchValue, nd.category) * 0.5 // Lower weight for category
            const maxScore = Math.max(nameScore, labelScore, categoryScore)

            return { node: nd, score: maxScore }
        })

        // Filter nodes with score > 0 and sort by score (highest first)
        return nodesWithScores
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.node)
    }

    const getSearchedNodes = (value: string) => {
        if (isAgentCanvas) {
            const nodes = nodesData.filter((nd) => !blacklistCategoriesForAgentCanvas.includes(nd.category))
            nodes.push(...addException())
            return scoreAndSortNodes(nodes, value)
        }
        return scoreAndSortNodes(nodesData, value)
    }

    const filterSearch = (value: string) => {
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

    const groupByCategory = (nodes: any[], isFilter?: boolean) => {
        const accordianCategories: Record<string, boolean> = {}
        const result = nodes.reduce(function (r: Record<string, any[]>, a: any) {
            r[a.category] = r[a.category] || []
            r[a.category].push(a)
            accordianCategories[a.category] = isFilter ? true : false
            return r
        }, Object.create(null))

        const filteredResult: Record<string, any[]> = {}
        for (const category in result) {
            // For agentflow v2, only show Agent Flows category
            if (isAgentflowv2) {
                if (category !== 'Agent Flows') {
                    continue
                }
            }

            // Filter out blacklisted categories
            if (!blacklistCategoriesForAgentCanvas.includes(category)) {
                filteredResult[category] = result[category]
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
        accordianCategories['Agent Flows'] = true
        setCategoryExpanded(accordianCategories)
    }

    const handleAccordionChange = (category: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        const accordianCategories = { ...categoryExpanded }
        accordianCategories[category] = isExpanded
        setCategoryExpanded(accordianCategories)
    }

    const handleClose = (event: MouseEvent | TouchEvent) => {
        if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const onDragStart = (event: React.DragEvent, node: any) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
    }

    const renderIcon = (node: any) => {
        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === node.name)

        if (!foundIcon) return null
        return <foundIcon.icon size={30} color={node.color} />
    }

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current?.focus()
        }

        prevOpen.current = open
    }, [open])

    useEffect(() => {
        if (node) setOpen(false)
    }, [node])

    useEffect(() => {
        if (nodesData) {
            groupByCategory(nodesData)
            dispatch(SET_COMPONENT_NODES(nodesData))
        }
    }, [nodesData, dispatch])

    // Handle dialog open/close
    const handleOpenDialog = () => {
        setOpenDialog(true)
        setDialogProps({
            title: 'What would you like to build?',
            description:
                'Enter your prompt to generate an agentflow. Performance may vary with different models. Only nodes and edges are generated, you will need to fill in the input fields for each node.'
        })
    }

    const handleCloseDialog = () => {
        setOpenDialog(false)
    }

    const handleConfirmDialog = () => {
        setOpenDialog(false)
        if (onFlowGenerated) {
            onFlowGenerated()
        }
    }

    return (
        <>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Fab ref={anchorRef} size='small' color='primary' aria-label='add' title='Add Node' onClick={handleToggle}>
                    {open ? <IconMinus /> : <IconPlus />}
                </Fab>
                {isAgentflowv2 && (
                    <Fab
                        onClick={handleOpenDialog}
                        size='small'
                        color='primary'
                        aria-label='generate'
                        title='Generate Agentflow'
                        sx={{
                            background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)'
                            }
                        }}
                    >
                        <IconSparkles />
                    </Fab>
                )}
            </Box>

            <AgentflowGeneratorDialog
                show={openDialog}
                dialogProps={dialogProps}
                onCancel={handleCloseDialog}
                onConfirm={handleConfirmDialog}
            />

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
                        },
                        {
                            name: 'preventOverflow',
                            options: {
                                boundary: 'viewport',
                                padding: 8
                            }
                        }
                    ]
                }}
                sx={{ zIndex: 100 }}
            >
                {({ TransitionProps }) => (
                    <Paper
                        sx={{
                            transformOrigin: 'top right',
                            transition: theme.transitions.create(['opacity', 'transform'], {
                                easing: theme.transitions.easing.easeOut,
                                duration: theme.transitions.duration.enteringScreen
                            }),
                            ...(open && {
                                opacity: 1,
                                transform: 'scale(1)'
                            }),
                            ...(!open && {
                                opacity: 0,
                                transform: 'scale(0.95)'
                            })
                        }}
                        elevation={16}
                    >
                        <ClickAwayListener onClickAway={handleClose}>
                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: theme.palette.divider,
                                    borderRadius: `${customization.borderRadius}px`,
                                    boxShadow: theme.shadows[16]
                                }}
                            >
                                <Box sx={{ p: 2 }}>
                                    <Stack>
                                        <Typography variant='h6'>Add Nodes</Typography>
                                    </Stack>
                                    <OutlinedInput
                                        autoFocus
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
                                    containerRef={(el: any) => {
                                        ps.current = el
                                    }}
                                    style={{
                                        height: '100%',
                                        maxHeight: 'calc(100vh - 300px)',
                                        overflowX: 'hidden'
                                    }}
                                >
                                    <Box sx={{ p: 2, pt: 0 }}>
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
                                                                    <Typography variant='subtitle1' fontWeight={600}>
                                                                        {category.split(';')[0]}
                                                                    </Typography>
                                                                    &nbsp;
                                                                    <Chip
                                                                        sx={{
                                                                            width: 'max-content',
                                                                            fontWeight: 700,
                                                                            fontSize: '0.65rem',
                                                                            background:
                                                                                category.split(';')[1] === 'DEPRECATING'
                                                                                    ? theme.palette.warning.main
                                                                                    : '#00bfa5',
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
                                                                <Typography variant='subtitle1' fontWeight={600}>
                                                                    {category}
                                                                </Typography>
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
                                                                                        height: 'auto',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center'
                                                                                    }}
                                                                                >
                                                                                    {renderIcon(node)}
                                                                                </div>
                                                                            </ListItemAvatar>
                                                                            <ListItemText
                                                                                sx={{ ml: 1 }}
                                                                                primary={
                                                                                    <>
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
                                                                                                                ? theme.palette.warning.main
                                                                                                                : '#00bfa5',
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
                                                                                secondary={node.description}
                                                                            />
                                                                        </ListItem>
                                                                    </ListItemButton>
                                                                    {index === nodes[category].length - 1 ? null : <Divider />}
                                                                </div>
                                                            ))}
                                                        </AccordionDetails>
                                                    </Accordion>
                                                ))}
                                        </List>
                                    </Box>
                                </PerfectScrollbar>
                            </Box>
                        </ClickAwayListener>
                    </Paper>
                )}
            </Popper>
        </>
    )
}

export default memo(AddNodes)
