import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    ClickAwayListener,
    Divider,
    Fade,
    InputAdornment,
    List,
    OutlinedInput,
    Paper,
    Popper,
    Stack,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconMinus, IconPlus, IconSearch, IconX } from '@tabler/icons-react'

import { MainCard } from '@/atoms'
import { tokens } from '@/core/theme/tokens'
import type { NodeData } from '@/core/types'
import { useApiContext } from '@/infrastructure/store'

import { NodeListItem } from './NodeListItem'
import { debounce, groupNodesByCategory, searchNodes } from './search'
import { StyledFab } from './StyledFab'
import { useDrawerMaxHeight } from './useDrawerMaxHeight'

const Z_INDEX_DRAWER = 1000

export interface AddNodesDrawerProps {
    /** Available nodes to display */
    nodes: NodeData[]
    /** Callback when a node drag starts */
    onDragStart?: (event: React.DragEvent, node: NodeData) => void
    /** Callback when a node is clicked (alternative to drag) */
    onNodeClick?: (node: NodeData) => void
}

/**
 * Add Nodes Drawer - Slide-out panel with draggable nodes
 */
function AddNodesDrawerComponent({ nodes, onDragStart, onNodeClick }: AddNodesDrawerProps) {
    const theme = useTheme()
    const { apiBaseUrl } = useApiContext()

    const [searchValue, setSearchValue] = useState('')
    const [filteredNodes, setFilteredNodes] = useState<Record<string, NodeData[]>>({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState<Record<string, boolean>>({})

    const anchorRef = useRef<HTMLButtonElement>(null)
    const paperRef = useRef<HTMLDivElement>(null)
    const prevOpen = useRef(open)
    const drawerMaxHeight = useDrawerMaxHeight(open, paperRef)

    // Group nodes by category
    const groupNodes = useCallback((nodeList: NodeData[], expandAll = false) => {
        const grouped = groupNodesByCategory(nodeList)
        setFilteredNodes(grouped)

        // Set category expansion state
        const expanded: Record<string, boolean> = {}
        Object.keys(grouped).forEach((category) => {
            expanded[category] = expandAll
        })
        // Always expand 'Agent Flows' by default
        if (expanded['Agent Flows'] !== undefined) {
            expanded['Agent Flows'] = true
        }
        setCategoryExpanded(expanded)
    }, [])

    // Debounced search
    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                if (value.trim()) {
                    const results = searchNodes(nodes, value)
                    groupNodes(results, true) // Expand all when searching
                } else {
                    groupNodes(nodes, false)
                }
            }, 300),
        [nodes, groupNodes]
    )

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setSearchValue(value)
        debouncedSearch(value)
    }

    const handleClearSearch = () => {
        setSearchValue('')
        groupNodes(nodes, false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const handleClose = (event: Event | React.SyntheticEvent) => {
        if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
            return
        }
        setOpen(false)
    }

    const handleAccordionChange = (category: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setCategoryExpanded((prev) => ({
            ...prev,
            [category]: isExpanded
        }))
    }

    const handleDragStart = (event: React.DragEvent, node: NodeData) => {
        onDragStart?.(event, node)
    }

    const handleNodeClick = (node: NodeData) => {
        onNodeClick?.(node)
    }

    // Initialize nodes on mount
    useEffect(() => {
        if (nodes.length > 0) {
            groupNodes(nodes, false)
        }
    }, [nodes, groupNodes])

    // Focus management
    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current?.focus()
        }
        prevOpen.current = open
    }, [open])

    return (
        <>
            <StyledFab
                ref={anchorRef}
                size='small'
                color='primary'
                aria-label='add'
                title='Add Node'
                onClick={handleToggle}
                sx={{
                    position: 'absolute',
                    left: 20,
                    top: 20,
                    zIndex: Z_INDEX_DRAWER
                }}
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
                sx={{ zIndex: Z_INDEX_DRAWER }}
            >
                {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={200}>
                        <Paper
                            ref={paperRef}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: drawerMaxHeight,
                                overflow: 'hidden'
                            }}
                        >
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard
                                    border={false}
                                    content={false}
                                    boxShadow
                                    shadow={theme.shadows[16]}
                                    sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                                >
                                    <Box sx={{ p: 2, flexShrink: 0 }}>
                                        <Stack>
                                            <Typography variant='h4'>Add Nodes</Typography>
                                        </Stack>
                                        <OutlinedInput
                                            sx={{ width: '100%', pr: 2, pl: 2, my: 2 }}
                                            id='input-search-node'
                                            value={searchValue}
                                            onChange={handleSearchChange}
                                            placeholder='Search nodes'
                                            startAdornment={
                                                <InputAdornment position='start'>
                                                    <IconSearch stroke={1.5} size='1rem' color={theme.palette.grey[500]} />
                                                </InputAdornment>
                                            }
                                            endAdornment={
                                                searchValue && (
                                                    <InputAdornment
                                                        position='end'
                                                        sx={{
                                                            cursor: 'pointer',
                                                            color: theme.palette.grey[500],
                                                            '&:hover': {
                                                                color: theme.palette.grey[900]
                                                            }
                                                        }}
                                                        onClick={handleClearSearch}
                                                        title='Clear Search'
                                                    >
                                                        <IconX stroke={1.5} size='1rem' />
                                                    </InputAdornment>
                                                )
                                            }
                                            aria-describedby='search-helper-text'
                                            inputProps={{
                                                'aria-label': 'search nodes'
                                            }}
                                        />
                                        <Divider />
                                    </Box>

                                    <Box
                                        sx={{
                                            flex: 1,
                                            minHeight: 0,
                                            overflowY: 'auto',
                                            overflowX: 'hidden'
                                        }}
                                    >
                                        <Box sx={{ p: 2, pt: 0 }}>
                                            <List
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 370,
                                                    py: 0,
                                                    borderRadius: tokens.borderRadius.lg,
                                                    '& .MuiListItemSecondaryAction-root': {
                                                        top: 22
                                                    },
                                                    '& .MuiDivider-root': {
                                                        my: 0
                                                    }
                                                }}
                                            >
                                                {Object.keys(filteredNodes)
                                                    .sort()
                                                    .map((category) => (
                                                        <Accordion
                                                            expanded={categoryExpanded[category] || false}
                                                            onChange={handleAccordionChange(category)}
                                                            key={category}
                                                            disableGutters
                                                            sx={{
                                                                '&:before': { display: 'none' },
                                                                boxShadow: 'none'
                                                            }}
                                                        >
                                                            <AccordionSummary
                                                                expandIcon={<ExpandMoreIcon />}
                                                                aria-controls={`nodes-accordian-${category}`}
                                                                id={`nodes-accordian-header-${category}`}
                                                            >
                                                                <Typography variant='h5'>{category}</Typography>
                                                            </AccordionSummary>
                                                            <AccordionDetails sx={{ p: 0 }}>
                                                                {filteredNodes[category].map((node, index) => (
                                                                    <NodeListItem
                                                                        key={node.name}
                                                                        node={node}
                                                                        apiBaseUrl={apiBaseUrl}
                                                                        isLast={index === filteredNodes[category].length - 1}
                                                                        onDragStart={handleDragStart}
                                                                        onClick={handleNodeClick}
                                                                    />
                                                                ))}
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    ))}
                                            </List>
                                        </Box>
                                    </Box>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Fade>
                )}
            </Popper>
        </>
    )
}

export const AddNodesDrawer = memo(AddNodesDrawerComponent)
export default AddNodesDrawer
