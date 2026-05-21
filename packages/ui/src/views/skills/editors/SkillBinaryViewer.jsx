import PropTypes from 'prop-types'

import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { IconDownload, IconFile } from '@tabler/icons-react'

import { humanBytes } from '../utils/extUtils'
import useNodeBlobUrl from '../utils/useNodeBlobUrl'

// Fallback panel for any binary file type we can't preview inline. The
// download link has to be backed by a blob URL fetched via the authenticated
// axios client because the raw /api/v1 endpoint rejects plain browser
// navigations that don't carry the `x-request-from: internal` header.
const SkillBinaryViewer = ({ node, fetchBlob }) => {
    const { url, loading, error } = useNodeBlobUrl(fetchBlob, Boolean(fetchBlob))

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                p: 4,
                textAlign: 'center'
            }}
        >
            <Stack spacing={2} alignItems='center'>
                <IconFile size={64} color='#888' />
                <Typography variant='h4'>{node?.name || 'Binary file'}</Typography>
                <Typography variant='body2' color='text.secondary'>
                    {node?.extension ? `${node.extension.toUpperCase()} · ` : ''}
                    {humanBytes(node?.size || 0)}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    Binary content is not editable in-place. Download the file to inspect it, or re-upload a new version.
                </Typography>
                {loading && <CircularProgress size={20} />}
                {error && (
                    <Alert severity='error' sx={{ maxWidth: 420 }}>
                        Failed to prepare download: {error?.message || 'unknown error'}
                    </Alert>
                )}
                {url && (
                    <Button
                        variant='outlined'
                        component='a'
                        href={url}
                        download={node?.name}
                        startIcon={<IconDownload size={16} />}
                        sx={{ textTransform: 'none' }}
                    >
                        Download
                    </Button>
                )}
            </Stack>
        </Box>
    )
}

SkillBinaryViewer.propTypes = {
    node: PropTypes.object,
    fetchBlob: PropTypes.func
}

export default SkillBinaryViewer
