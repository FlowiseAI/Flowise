import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Typography
} from '@mui/material'
import { IconRefresh } from '@tabler/icons-react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

import skillsApi from '@/api/skills'

import { BROKEN_REF_MARKER } from '../constants'

// Minimal YAML-frontmatter parser. We intentionally avoid pulling in a full
// YAML dependency: skill frontmatter is, by convention, a flat map of
// scalar values (name, description, color, emoji, vibe, …). We support
// quoted strings and folded multi-line values via leading-indent
// continuation, which is enough for the GitHub-style summary table.
const parseFrontmatter = (content) => {
    if (typeof content !== 'string' || !content.length) {
        return { entries: [], body: content || '' }
    }
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    if (!match) return { entries: [], body: content }

    const [, yamlText, rawBody] = match
    const entries = []
    let currentKey = null

    for (const line of yamlText.split(/\r?\n/)) {
        if (!line.trim()) continue
        // Folded continuation of the previous key (indented line).
        if (currentKey && /^\s+\S/.test(line)) {
            const last = entries[entries.length - 1]
            last.value = last.value ? `${last.value} ${line.trim()}` : line.trim()
            continue
        }
        const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
        if (!kv) continue
        currentKey = kv[1]
        let value = kv[2].trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        entries.push({ key: currentKey, value })
    }

    return { entries, body: rawBody.replace(/^\r?\n/, '') }
}

// Renders the *compiled* draft bundle for the currently-selected skill node.
// Calls GET /bundle?mode=draft on demand — there is no local compiler.
const SkillPreviewPanel = ({ skillId, selectedNodeId }) => {
    const [loading, setLoading] = useState(false)
    const [bundle, setBundle] = useState(null)
    const [error, setError] = useState('')

    const reload = async () => {
        if (!skillId) return
        setLoading(true)
        setError('')
        try {
            const resp = await skillsApi.getBundle(skillId, 'draft')
            setBundle(resp.data)
        } catch (err) {
            const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
            setError(msg || 'Failed to compile draft bundle')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        reload()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skillId])

    const entry = bundle && selectedNodeId ? bundle.entries?.[selectedNodeId] : null
    const firstSkillEntry = !entry && bundle ? Object.values(bundle.entries || {}).find((e) => e.kind === 'skill') : null
    const displayEntry = entry || firstSkillEntry

    const brokenCount = displayEntry?.content
        ? (displayEntry.content.match(new RegExp(BROKEN_REF_MARKER.replace(/[[\]]/g, '\\$&'), 'g')) || []).length
        : 0

    const { entries: frontmatterEntries, body: markdownBody } = useMemo(
        () => parseFrontmatter(displayEntry?.content || ''),
        [displayEntry?.content]
    )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <Stack direction='row' spacing={1} alignItems='center' sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant='subtitle2' sx={{ flex: 1 }}>
                    Compiled preview (draft)
                </Typography>
                <Button
                    size='small'
                    variant='text'
                    startIcon={loading ? <CircularProgress size={12} /> : <IconRefresh size={14} />}
                    onClick={reload}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                >
                    Recompile
                </Button>
            </Stack>
            {error ? (
                <Alert severity='error' sx={{ m: 2 }}>
                    {error}
                </Alert>
            ) : loading && !displayEntry ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <CircularProgress size={20} />
                </Box>
            ) : !displayEntry ? (
                <Box sx={{ p: 3 }}>
                    <Typography variant='body2' color='text.secondary'>
                        Nothing to preview yet. Select a markdown file or add content to the skill.
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {brokenCount > 0 && (
                        <Alert severity='warning' sx={{ m: 2 }}>
                            {brokenCount} unresolved reference{brokenCount === 1 ? '' : 's'} in this node. The compiler replaced them with{' '}
                            <code>{BROKEN_REF_MARKER}</code>.
                        </Alert>
                    )}
                    <Box
                        sx={{
                            p: 3,
                            '& pre': {
                                background: (t) => (t.palette.mode === 'dark' ? '#1e1e1e' : '#f7f7f7'),
                                p: 1.5,
                                borderRadius: 1,
                                overflowX: 'auto'
                            },
                            '& code': { fontFamily: 'monospace', fontSize: '0.875rem' },
                            '& table': { borderCollapse: 'collapse', width: '100%' },
                            '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 }
                        }}
                    >
                        {frontmatterEntries.length > 0 && (
                            <TableContainer
                                sx={{
                                    mb: 3,
                                    // border: 1,
                                    borderColor: 'divider',
                                    // borderRadius: 1,
                                    overflow: 'hidden'
                                }}
                            >
                                <Table size='small' sx={{ tableLayout: 'fixed' }}>
                                    <TableBody>
                                        {frontmatterEntries.map(({ key, value }) => (
                                            <TableRow key={key}>
                                                <TableCell
                                                    component='th'
                                                    scope='row'
                                                    sx={{
                                                        width: 160,
                                                        fontFamily: 'monospace',
                                                        fontWeight: 600,
                                                        verticalAlign: 'top',
                                                        background: (t) =>
                                                            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                                        // borderRight: 1,
                                                        // borderColor: 'divider'
                                                    }}
                                                >
                                                    {key}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        verticalAlign: 'top'
                                                    }}
                                                >
                                                    {value}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, defaultSchema]]}>
                            {markdownBody}
                        </ReactMarkdown>
                    </Box>
                </Box>
            )}
        </Box>
    )
}

SkillPreviewPanel.propTypes = {
    skillId: PropTypes.string,
    selectedNodeId: PropTypes.string
}

export default SkillPreviewPanel
