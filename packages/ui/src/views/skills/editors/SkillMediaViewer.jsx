import PropTypes from 'prop-types'

import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { IconDownload } from '@tabler/icons-react'

import { humanBytes, isImage, isVideo } from '../utils/extUtils'
import useNodeBlobUrl from '../utils/useNodeBlobUrl'

// Viewer for inline image/video previews. The raw URL is protected by the
// same auth middleware as every other /api/v1 endpoint, so we fetch the bytes
// through the authenticated axios client and render from a blob URL instead
// of pointing `<img src>` at the server endpoint directly.
const SkillMediaViewer = ({ node, fetchBlob }) => {
    const ext = node?.extension
    const canPreview = isImage(ext) || isVideo(ext)
    const { url, loading, error } = useNodeBlobUrl(fetchBlob, canPreview)

    let body
    if (!canPreview) {
        body = (
            <Typography variant='body2' color='text.secondary'>
                Unsupported media type.
            </Typography>
        )
    } else if (loading) {
        body = <CircularProgress size={28} />
    } else if (error) {
        body = (
            <Alert severity='error' sx={{ maxWidth: 480 }}>
                Failed to load preview: {error?.message || 'unknown error'}
            </Alert>
        )
    } else if (url) {
        body = isImage(ext) ? (
            <Box
                component='img'
                src={url}
                alt={node?.name}
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1 }}
            />
        ) : (
            <Box component='video' src={url} controls sx={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 1 }} />
        )
    } else {
        body = (
            <Typography variant='body2' color='text.secondary'>
                No preview available.
            </Typography>
        )
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
                    p: 2,
                    overflow: 'auto'
                }}
            >
                {body}
            </Box>
        </Box>
    )
}

SkillMediaViewer.propTypes = {
    node: PropTypes.object,
    fetchBlob: PropTypes.func
}

export default SkillMediaViewer
