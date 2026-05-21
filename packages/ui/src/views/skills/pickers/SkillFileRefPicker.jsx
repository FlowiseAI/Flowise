import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'

import { Box, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemText, OutlinedInput, Typography } from '@mui/material'
import { IconFileText } from '@tabler/icons-react'

import { pathFor } from '../utils/treeUtils'
import { buildSkillRef } from '../utils/placeholderUtils'

// Modal that lists every file node in the current skill and lets the user
// pick one. Returns a canonical `{{skill.<nodeId>}}` placeholder.
const SkillFileRefPicker = ({ open, nodes, onClose, onPick }) => {
    const [query, setQuery] = useState('')

    const files = useMemo(() => {
        const q = query.trim().toLowerCase()
        const all = nodes.filter((n) => n.node_type === 'file')
        if (!q) return all
        return all.filter((n) => (n.name || '').toLowerCase().includes(q) || pathFor(nodes, n.id).toLowerCase().includes(q))
    }, [nodes, query])

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle sx={{ fontSize: '1rem' }}>Insert file reference</DialogTitle>
            <DialogContent>
                <OutlinedInput
                    fullWidth
                    size='small'
                    placeholder='Search files…'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    sx={{ mb: 2 }}
                />
                <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                    {files.length === 0 ? (
                        <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                            No files match.
                        </Typography>
                    ) : (
                        <List dense disablePadding>
                            {files.map((n) => (
                                <ListItemButton
                                    key={n.id}
                                    onClick={() => {
                                        onPick?.(buildSkillRef(n.id))
                                        onClose?.()
                                    }}
                                >
                                    <IconFileText size={16} />
                                    <ListItemText
                                        primary={n.name}
                                        secondary={pathFor(nodes, n.id)}
                                        sx={{ pl: 1 }}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    )
}

SkillFileRefPicker.propTypes = {
    open: PropTypes.bool,
    nodes: PropTypes.array,
    onClose: PropTypes.func,
    onPick: PropTypes.func
}

export default SkillFileRefPicker
