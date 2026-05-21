import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'

import {
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    ListItemText,
    OutlinedInput,
    Typography
} from '@mui/material'
import { IconTool } from '@tabler/icons-react'

import toolsApi from '@/api/tools'

import { buildToolRef } from '../utils/placeholderUtils'

// Modal that lists custom Flowise tools and lets the user pick one. Returns
// a canonical `{{tool.custom.<name>.<uuid>}}` placeholder. Only `custom`
// provider is wired here (MCP / builtin tools can be added later).
const SkillToolRefPicker = ({ open, onClose, onPick }) => {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (!open) return
        let cancelled = false
        setLoading(true)
        toolsApi
            .getAllTools()
            .then((r) => {
                if (!cancelled) setTools(r.data || [])
            })
            .catch(() => {
                if (!cancelled) setTools([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [open])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return tools
        return tools.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
    }, [tools, query])

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle sx={{ fontSize: '1rem' }}>Insert tool reference</DialogTitle>
            <DialogContent>
                <OutlinedInput
                    fullWidth
                    size='small'
                    placeholder='Search tools…'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    sx={{ mb: 2 }}
                />
                <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : filtered.length === 0 ? (
                        <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
                            No tools available.
                        </Typography>
                    ) : (
                        <List dense disablePadding>
                            {filtered.map((t) => (
                                <ListItemButton
                                    key={t.id}
                                    onClick={() => {
                                        onPick?.(buildToolRef({ provider: 'custom', toolName: t.name, uuid: t.id }))
                                        onClose?.()
                                    }}
                                >
                                    <IconTool size={16} />
                                    <ListItemText
                                        primary={t.name}
                                        secondary={t.description}
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

SkillToolRefPicker.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    onPick: PropTypes.func
}

export default SkillToolRefPicker
