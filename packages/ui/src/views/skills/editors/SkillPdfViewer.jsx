import PropTypes from 'prop-types'
import { useMemo } from 'react'

import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { IconDownload, IconExternalLink } from '@tabler/icons-react'

import { canRenderPdfNatively, humanBytes } from '../utils/extUtils'
import useNodeBlobUrl from '../utils/useNodeBlobUrl'
import SkillBinaryViewer from './SkillBinaryViewer'

// Inline PDF viewer that delegates rendering to the browser's built-in PDF
// plugin via an `<object>` tag on a blob URL. When the browser does not
// advertise a native PDF viewer (e.g. some mobile WebViews) we fall back to
// the existing `SkillBinaryViewer` so the user can still download the file.
const SkillPdfViewer = ({ node, fetchBlob }) => {
    const supportsNativePdf = useMemo(() => canRenderPdfNatively(), [])
    // Keep the hook call above any early returns to satisfy the rules of
    // hooks. We short-circuit the fetch with the `enabled` flag so we don't
    // pay for a blob download on browsers that can't render it anyway.
    const { url, loading, error } = useNodeBlobUrl(fetchBlob, supportsNativePdf && Boolean(fetchBlob))

    if (!supportsNativePdf) {
        return <SkillBinaryViewer node={node} fetchBlob={fetchBlob} />
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ px: 2, py: 1 }}>
                <Typography variant='body2' sx={{ flex: 1 }} noWrap>
                    {node?.name}{' '}
                    <Typography component='span' variant='caption' color='text.secondary'>
                        {humanBytes(node?.size || 0)}
                    </Typography>
                </Typography>
                {url && (
                    <>
                        <Button
                            size='small'
                            component='a'
                            href={url}
                            target='_blank'
                            rel='noopener noreferrer'
                            startIcon={<IconExternalLink size={14} />}
                            sx={{ textTransform: 'none' }}
                        >
                            Open in tab
                        </Button>
                        <Button
                            size='small'
                            component='a'
                            href={url}
                            download={node?.name}
                            startIcon={<IconDownload size={14} />}
                            sx={{ textTransform: 'none' }}
                        >
                            Download
                        </Button>
                    </>
                )}
            </Stack>
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: (t) => (t.palette.mode === 'dark' ? '#1a1a1a' : '#fafafa'),
                    p: 1
                }}
            >
                {loading && <CircularProgress size={28} />}
                {error && (
                    <Alert severity='error' sx={{ maxWidth: 480 }}>
                        Failed to load preview: {error?.message || 'unknown error'}
                    </Alert>
                )}
                {url && !loading && !error && (
                    <Box
                        component='object'
                        data={url}
                        type='application/pdf'
                        aria-label={node?.name || 'PDF preview'}
                        sx={{ width: '100%', height: '100%', border: 0, borderRadius: 1 }}
                    >
                        {/* Rendered inside the <object> when the plugin refuses to
                            display the blob (rare). Keeps the download affordance. */}
                        <SkillBinaryViewer node={node} fetchBlob={fetchBlob} />
                    </Box>
                )}
            </Box>
        </Box>
    )
}

SkillPdfViewer.propTypes = {
    node: PropTypes.object,
    fetchBlob: PropTypes.func
}

export default SkillPdfViewer
