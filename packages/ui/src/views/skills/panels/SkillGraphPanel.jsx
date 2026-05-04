import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, Handle, MarkerType, MiniMap, Position, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'

import { Alert, Badge, Box, Chip, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconAlertTriangle, IconBinary, IconCode, IconFileText, IconMarkdown, IconTool } from '@tabler/icons-react'

import skillsApi from '@/api/skills'

// ─── Visual constants ──────────────────────────────────────────────────

const KIND_COLORS = {
    skill: '#9c27b0',
    data: '#2196f3',
    code: '#4caf50',
    binary: '#ff9800',
    tool: '#f44336'
}

const KIND_LABELS = {
    skill: 'Skill',
    data: 'Data',
    code: 'Code',
    binary: 'Binary',
    tool: 'Tool'
}

const KIND_ORDER = ['skill', 'data', 'code', 'binary', 'tool']

const KIND_ICONS = {
    skill: IconMarkdown,
    data: IconFileText,
    code: IconCode,
    binary: IconBinary,
    tool: IconTool
}

const NODE_WIDTH = 260
const NODE_HEIGHT = 110
const COLUMN_GAP = 80
const ROW_GAP = 24
const HEADER_HEIGHT = 40

// ─── Custom node ───────────────────────────────────────────────────────

const SkillGraphNode = ({ data }) => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
    const color = KIND_COLORS[data.kind] || '#999'
    const Icon = KIND_ICONS[data.kind] || IconFileText

    return (
        <Box
            sx={{
                border: `2px solid ${color}`,
                borderRadius: 2,
                bgcolor: isDark ? '#1e1e1e' : '#fff',
                width: NODE_WIDTH,
                overflow: 'hidden',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                cursor: data.kind === 'tool' ? 'default' : 'pointer',
                position: 'relative'
            }}
        >
            <Handle type='target' position={Position.Left} style={{ background: color, width: 8, height: 8 }} />
            <Handle type='source' position={Position.Right} style={{ background: color, width: 8, height: 8 }} />

            <Box
                sx={{
                    px: 1.25,
                    py: 0.5,
                    bgcolor: color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75
                }}
            >
                <Icon size={14} color='#fff' />
                <Typography variant='caption' sx={{ color: '#fff', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem' }}>
                    {KIND_LABELS[data.kind] || data.kind}
                </Typography>
                {data.brokenRefs > 0 && (
                    <Tooltip title={`${data.brokenRefs} broken reference${data.brokenRefs > 1 ? 's' : ''}`}>
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <IconAlertTriangle size={12} color='#fff' />
                            <Typography variant='caption' sx={{ color: '#fff', fontWeight: 700, fontSize: '0.6rem' }}>
                                {data.brokenRefs}
                            </Typography>
                        </Box>
                    </Tooltip>
                )}
            </Box>

            <Box sx={{ px: 1.25, py: 1 }}>
                <Typography
                    variant='caption'
                    sx={{
                        fontWeight: 600,
                        display: 'block',
                        fontSize: '0.72rem',
                        lineHeight: 1.3,
                        color: theme.palette.text.primary,
                        wordBreak: 'break-word'
                    }}
                >
                    {data.label}
                </Typography>
                {data.path && (
                    <Typography
                        variant='caption'
                        sx={{
                            display: 'block',
                            fontSize: '0.6rem',
                            color: theme.palette.text.secondary,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            mt: 0.25
                        }}
                    >
                        /{data.path}
                    </Typography>
                )}
                {data.kind === 'skill' && (
                    <Stack direction='row' spacing={0.5} sx={{ mt: 0.5 }}>
                        <Chip
                            size='small'
                            label={`T:${data.toolCount ?? 0}`}
                            sx={{
                                height: 16,
                                fontSize: '0.55rem',
                                bgcolor: KIND_COLORS.tool + '18',
                                color: KIND_COLORS.tool,
                                border: `1px solid ${KIND_COLORS.tool}30`,
                                '& .MuiChip-label': { px: 0.5 }
                            }}
                        />
                        <Chip
                            size='small'
                            label={`F:${data.fileCount ?? 0}`}
                            sx={{
                                height: 16,
                                fontSize: '0.55rem',
                                bgcolor: color + '18',
                                color: color,
                                border: `1px solid ${color}30`,
                                '& .MuiChip-label': { px: 0.5 }
                            }}
                        />
                    </Stack>
                )}
            </Box>
        </Box>
    )
}

SkillGraphNode.propTypes = {
    data: PropTypes.object.isRequired
}

const nodeTypes = { skillV2Node: SkillGraphNode }

// ─── Layout helpers ────────────────────────────────────────────────────

const layoutNodes = (graphNodes) => {
    const groups = {}
    for (const kind of KIND_ORDER) groups[kind] = graphNodes.filter((n) => n.kind === kind)

    const flow = []
    let colX = 0
    for (const kind of KIND_ORDER) {
        const arr = groups[kind]
        if (!arr || arr.length === 0) continue
        const color = KIND_COLORS[kind] || '#999'

        flow.push({
            id: `header-${kind}`,
            type: 'default',
            position: { x: colX + NODE_WIDTH / 2 - 40, y: 0 },
            data: { label: `${KIND_LABELS[kind] || kind} (${arr.length})` },
            selectable: false,
            draggable: false,
            style: {
                background: 'transparent',
                border: 'none',
                color,
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                width: 'auto',
                padding: 0,
                boxShadow: 'none'
            }
        })

        for (let i = 0; i < arr.length; i++) {
            const node = arr[i]
            flow.push({
                id: node.id,
                type: 'skillV2Node',
                position: { x: colX, y: HEADER_HEIGHT + i * (NODE_HEIGHT + ROW_GAP) },
                data: node
            })
        }

        colX += NODE_WIDTH + COLUMN_GAP
    }
    return flow
}

const EDGE_STYLES = {
    file_direct: { color: '#4caf50', dashed: false },
    file_transitive: { color: '#4caf50', dashed: true },
    tool_direct: { color: '#f44336', dashed: false },
    tool_transitive: { color: '#f44336', dashed: true }
}

const layoutEdges = (graphEdges) =>
    graphEdges.map((e) => {
        const style = EDGE_STYLES[e.relation] || { color: '#999', dashed: false }
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'smoothstep',
            animated: false,
            style: {
                stroke: style.color,
                strokeWidth: 1.5,
                strokeDasharray: style.dashed ? '4 4' : undefined
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 12,
                height: 12,
                color: style.color
            }
        }
    })

// ─── Legend ────────────────────────────────────────────────────────────

const Legend = () => (
    <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' sx={{ px: 2, py: 1 }}>
        {KIND_ORDER.map((k) => (
            <Stack key={k} direction='row' spacing={0.5} alignItems='center'>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: KIND_COLORS[k] }} />
                <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
                    {KIND_LABELS[k]}
                </Typography>
            </Stack>
        ))}
        <Stack direction='row' spacing={0.5} alignItems='center'>
            <Box sx={{ width: 18, height: 0, borderTop: '2px solid #4caf50' }} />
            <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
                file ref (direct)
            </Typography>
        </Stack>
        <Stack direction='row' spacing={0.5} alignItems='center'>
            <Box sx={{ width: 18, height: 0, borderTop: '2px dashed #4caf50' }} />
            <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
                file ref (transitive)
            </Typography>
        </Stack>
        <Stack direction='row' spacing={0.5} alignItems='center'>
            <Box sx={{ width: 18, height: 0, borderTop: '2px solid #f44336' }} />
            <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
                tool (direct)
            </Typography>
        </Stack>
        <Stack direction='row' spacing={0.5} alignItems='center'>
            <Box sx={{ width: 18, height: 0, borderTop: '2px dashed #f44336' }} />
            <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
                tool (transitive)
            </Typography>
        </Stack>
    </Stack>
)

// ─── Main component ────────────────────────────────────────────────────

const SkillGraphPanel = ({ skillId, hasPublished, onSelectNode, refreshKey }) => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    const [mode, setMode] = useState('draft')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [graph, setGraph] = useState(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            if (!skillId) return
            setLoading(true)
            setError('')
            try {
                const resp = await skillsApi.getSkillGraph(skillId, mode)
                if (!cancelled) setGraph(resp.data)
            } catch (err) {
                if (!cancelled) {
                    const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
                    setError(msg || 'Failed to load graph')
                    setGraph(null)
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [skillId, mode, refreshKey])

    const flowNodes = useMemo(() => layoutNodes(graph?.nodes || []), [graph])
    const flowEdges = useMemo(() => layoutEdges(graph?.edges || []), [graph])

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes)
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges)

    useEffect(() => {
        setRfNodes(flowNodes)
    }, [flowNodes, setRfNodes])

    useEffect(() => {
        setRfEdges(flowEdges)
    }, [flowEdges, setRfEdges])

    const minimapNodeColor = useCallback((node) => {
        if (node.type === 'skillV2Node') return KIND_COLORS[node.data?.kind] || '#999'
        return 'transparent'
    }, [])

    const handleNodeClick = useCallback(
        (_event, node) => {
            const kind = node.data?.kind
            if (!onSelectNode || kind === 'tool' || !kind) return
            if (typeof node.id === 'string' && node.id.startsWith('header-')) return
            onSelectNode(node.id)
        },
        [onSelectNode]
    )

    const nodeCount = graph?.nodes?.length || 0
    const edgeCount = graph?.edges?.length || 0
    const brokenTotal = (graph?.nodes || []).reduce((acc, n) => acc + (n.brokenRefs || 0), 0)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
            <Stack
                direction='row'
                spacing={2}
                alignItems='center'
                sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
            >
                <Typography variant='subtitle2'>Bundle graph</Typography>
                <ToggleButtonGroup
                    size='small'
                    exclusive
                    value={mode}
                    onChange={(_, v) => v && setMode(v)}
                    sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1, fontSize: '0.7rem', textTransform: 'none' } }}
                >
                    <ToggleButton value='draft'>Draft</ToggleButton>
                    <ToggleButton value='published' disabled={!hasPublished}>
                        Published
                    </ToggleButton>
                </ToggleButtonGroup>
                <Stack direction='row' spacing={1} alignItems='center' sx={{ ml: 'auto' }}>
                    <Chip size='small' label={`${nodeCount} nodes`} variant='outlined' />
                    <Chip size='small' label={`${edgeCount} edges`} variant='outlined' />
                    {brokenTotal > 0 && (
                        <Badge color='error'>
                            <Chip
                                size='small'
                                icon={<IconAlertTriangle size={12} />}
                                label={`${brokenTotal} broken`}
                                color='error'
                                variant='outlined'
                            />
                        </Badge>
                    )}
                    {graph?.bundleId && (
                        <Tooltip title={`bundleId ${graph.bundleId}`}>
                            <Typography variant='caption' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                {graph.bundleId.slice(0, 10)}…
                            </Typography>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            <Legend />

            <Box sx={{ flex: 1, minHeight: 0, position: 'relative', borderTop: 1, borderColor: 'divider' }}>
                {error && (
                    <Alert severity='error' sx={{ m: 2 }}>
                        {error}
                    </Alert>
                )}
                {loading && !graph && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                {!error && graph && nodeCount === 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
                        <Typography variant='body2' color='text.secondary'>
                            This skill has no file nodes yet. Add files and references to see a graph.
                        </Typography>
                    </Box>
                )}
                {graph && nodeCount > 0 && (
                    <ReactFlow
                        nodes={rfNodes}
                        edges={rfEdges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={handleNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.2}
                        maxZoom={2}
                        proOptions={{ hideAttribution: true }}
                        nodesDraggable
                        nodesConnectable={false}
                        elementsSelectable
                        defaultEdgeOptions={{ type: 'smoothstep' }}
                    >
                        <Controls
                            position='bottom-right'
                            style={{
                                borderRadius: 8,
                                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                        />
                        <Background color={isDark ? '#333' : '#ddd'} gap={20} size={1} />
                        <MiniMap
                            nodeColor={minimapNodeColor}
                            nodeStrokeWidth={2}
                            zoomable
                            pannable
                            style={{
                                borderRadius: 8,
                                overflow: 'hidden',
                                background: isDark ? '#1a1a1a' : '#f5f5f5'
                            }}
                        />
                    </ReactFlow>
                )}
            </Box>
        </Box>
    )
}

SkillGraphPanel.propTypes = {
    skillId: PropTypes.string,
    hasPublished: PropTypes.bool,
    onSelectNode: PropTypes.func,
    refreshKey: PropTypes.any
}

export default SkillGraphPanel
