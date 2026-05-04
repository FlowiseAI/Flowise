import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

import { Alert, Box, Chip, CircularProgress, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { IconFileText, IconTool } from '@tabler/icons-react'

import skillsApi from '@/api/skills'

import { indexNodes, pathFor } from '../utils/treeUtils'

// Two modes:
//   selectedNodeId absent  → whole-skill dependencies (aggregated)
//   selectedNodeId present → direct + transitive for that node
const SkillDependenciesPanel = ({ skillId, selectedNodeId, nodes }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)
    const nodeIndex = indexNodes(nodes || [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            if (!skillId) return
            setLoading(true)
            setError('')
            try {
                const resp = selectedNodeId
                    ? await skillsApi.getNodeDependencies(skillId, selectedNodeId)
                    : await skillsApi.getSkillDependencies(skillId)
                if (!cancelled) setData(resp.data)
            } catch (err) {
                if (!cancelled) {
                    const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
                    setError(msg || 'Failed to load dependencies')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [skillId, selectedNodeId])

    const renderToolList = (tools = []) => {
        if (!tools.length) {
            return (
                <Typography variant='body2' color='text.secondary' sx={{ py: 1 }}>
                    No tools referenced.
                </Typography>
            )
        }
        return (
            <List dense disablePadding>
                {tools.map((t, i) => {
                    const label = typeof t === 'string' ? t : `${t.provider}.${t.toolName}`
                    return (
                        <ListItem key={`${label}-${i}`} sx={{ px: 0 }}>
                            <Chip size='small' icon={<IconTool size={14} />} label={label} variant='outlined' />
                        </ListItem>
                    )
                })}
            </List>
        )
    }

    const renderFileList = (files = []) => {
        if (!files.length) {
            return (
                <Typography variant='body2' color='text.secondary' sx={{ py: 1 }}>
                    No files referenced.
                </Typography>
            )
        }
        return (
            <List dense disablePadding>
                {files.map((f, i) => {
                    const nodeId = typeof f === 'string' ? f : f.nodeId
                    const node = nodeIndex.get(nodeId)
                    return (
                        <ListItem key={`${nodeId}-${i}`} sx={{ px: 0 }}>
                            <ListItemText
                                primary={
                                    <Stack direction='row' spacing={1} alignItems='center'>
                                        <IconFileText size={14} />
                                        <span>{node?.name || nodeId}</span>
                                    </Stack>
                                }
                                secondary={node ? pathFor(nodes, nodeId) : null}
                            />
                        </ListItem>
                    )
                })}
            </List>
        )
    }

    const directTools = data?.direct?.tools || []
    const directFiles = data?.direct?.files || []
    const transitiveTools = data?.transitive?.tools || data?.tools || []
    const transitiveFiles = data?.transitive?.files || data?.files || []

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'auto', width: '100%' }}>
            <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant='subtitle2'>{selectedNodeId ? 'Dependencies for selected node' : 'Skill dependencies'}</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
                {error ? (
                    <Alert severity='error'>{error}</Alert>
                ) : loading && !data ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={20} />
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {selectedNodeId && (
                            <Box>
                                <Typography variant='overline'>Direct</Typography>
                                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                                    References declared inside this node&apos;s content.
                                </Typography>
                                <Typography variant='body2' sx={{ fontWeight: 600, mt: 1 }}>
                                    Tools
                                </Typography>
                                {renderToolList(directTools)}
                                <Typography variant='body2' sx={{ fontWeight: 600, mt: 1 }}>
                                    Files
                                </Typography>
                                {renderFileList(directFiles)}
                                <Divider sx={{ my: 2 }} />
                            </Box>
                        )}
                        <Box>
                            <Typography variant='overline'>{selectedNodeId ? 'Transitive' : 'All references'}</Typography>
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                                {selectedNodeId
                                    ? 'Closure that would be injected if this node is activated.'
                                    : 'Aggregated across every skill node in this workspace skill.'}
                            </Typography>
                            <Typography variant='body2' sx={{ fontWeight: 600, mt: 1 }}>
                                Tools
                            </Typography>
                            {renderToolList(transitiveTools)}
                            <Typography variant='body2' sx={{ fontWeight: 600, mt: 1 }}>
                                Files
                            </Typography>
                            {renderFileList(transitiveFiles)}
                        </Box>
                    </Stack>
                )}
            </Box>
        </Box>
    )
}

SkillDependenciesPanel.propTypes = {
    skillId: PropTypes.string,
    selectedNodeId: PropTypes.string,
    nodes: PropTypes.array
}

export default SkillDependenciesPanel
