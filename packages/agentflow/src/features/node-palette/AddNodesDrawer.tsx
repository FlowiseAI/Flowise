import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Chip,
    ClickAwayListener,
    Divider,
    Fade,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    OutlinedInput,
    Paper,
    Popper,
    Stack,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconMinus, IconPlus, IconSearch, IconX } from '@tabler/icons-react'

import { MainCard } from '@/atoms'
import { AGENTFLOW_ICONS } from '@/core'
import type { NodeData } from '@/core/types'
import { useApiContext, useConfigContext } from '@/infrastructure/store'

import { debounce, groupNodesByCategory, searchNodes } from './search'
import { StyledFab } from './StyledFab'

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
    const { isDarkMode: _isDarkMode } = useConfigContext()

    const [searchValue, setSearchValue] = useState('')
    const [filteredNodes, setFilteredNodes] = useState<Record<string, NodeData[]>>({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState<Record<string, boolean>>({})

    const anchorRef = useRef<HTMLButtonElement>(null)
    const prevOpen = useRef(open)

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
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
        onDragStart?.(event, node)
    }

    const handleNodeClick = (node: NodeData) => {
        onNodeClick?.(node)
    }

    const renderIcon = (node: NodeData) => {
        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === node.name)
        if (foundIcon) {
            const IconComponent = foundIcon.icon
            return <IconComponent size={30} color={node.color} />
        }
        return null
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
                    zIndex: 1000
                }}
            >
                {open ? <IconMinus /> : <IconPlus />}
            </StyledFab>

            <Popper
                placement='bottom-start'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                modifiers={[
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 14]
                        }
                    }
                ]}
                sx={{ zIndex: 1000 }}
            >
                {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={200}>
                        <Paper elevation={16}>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard
                                    border={false}
                                    sx={{
                                        boxShadow: theme.shadows[16],
                                        width: 370,
                                        maxWidth: '90vw'
                                    }}
                                >
                                    <Box sx={{ p: 2 }}>
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
                                            maxHeight: 'calc(100vh - 300px)',
                                            overflowY: 'auto',
                                            overflowX: 'hidden'
                                        }}
                                    >
                                        <Box sx={{ p: 2, pt: 0 }}>
                                            <List
                                                sx={{
                                                    width: '100%',
                                                    py: 0,
                                                    borderRadius: '10px',
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
                                                                    <div
                                                                        key={node.name}
                                                                        onDragStart={(event) => handleDragStart(event, node)}
                                                                        draggable
                                                                    >
                                                                        <ListItemButton
                                                                            sx={{
                                                                                p: 0,
                                                                                borderRadius: '8px',
                                                                                cursor: 'grab',
                                                                                '&:active': { cursor: 'grabbing' }
                                                                            }}
                                                                            onClick={() => handleNodeClick(node)}
                                                                        >
                                                                            <ListItem alignItems='center'>
                                                                                {node.color && !node.icon ? (
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
                                                                                ) : (
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
                                                                                                src={`${apiBaseUrl}/api/v1/node-icon/${node.name}`}
                                                                                            />
                                                                                        </div>
                                                                                    </ListItemAvatar>
                                                                                )}
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
                                                                                            {typeof node.badge === 'string' &&
                                                                                                node.badge && (
                                                                                                    <>
                                                                                                        &nbsp;
                                                                                                        <Chip
                                                                                                            sx={{
                                                                                                                width: 'max-content',
                                                                                                                fontWeight: 700,
                                                                                                                fontSize: '0.65rem',
                                                                                                                background:
                                                                                                                    node.badge ===
                                                                                                                    'DEPRECATING'
                                                                                                                        ? theme.palette
                                                                                                                              .warning.main
                                                                                                                        : theme.palette
                                                                                                                              .success.main,
                                                                                                                color:
                                                                                                                    node.badge !==
                                                                                                                    'DEPRECATING'
                                                                                                                        ? 'white'
                                                                                                                        : 'inherit'
                                                                                                            }}
                                                                                                            size='small'
                                                                                                            label={node.badge}
                                                                                                        />
                                                                                                    </>
                                                                                                )}
                                                                                        </div>
                                                                                    }
                                                                                    secondary={node.description}
                                                                                />
                                                                            </ListItem>
                                                                        </ListItemButton>
                                                                        {index === filteredNodes[category].length - 1 ? null : <Divider />}
                                                                    </div>
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
