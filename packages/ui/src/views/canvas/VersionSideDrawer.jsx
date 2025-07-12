import { useEffect, useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import dayjs from 'dayjs'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { Button, Box, SwipeableDrawer, Stack, Typography, Divider, Link, Tooltip, IconButton, useTheme, Menu, MenuItem } from '@mui/material'
import { IconX, IconDotsVertical, IconEye, IconFileText, IconCopy } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import versioningApi from '@/api/flowversion'
import { useDispatch } from 'react-redux'
import GitCommitDialog from '@/ui-component/dialog/GitCommitDialog'
import { IconGitBranch, IconBrandGithub } from '@tabler/icons-react'
import { IconBrandGit } from '@tabler/icons-react'
import { IconGitCommit } from '@tabler/icons-react'

// VersionHistory type structure:
// {
//   repository: string;    // Format: "owner/repo"
//   branch: string;        // Branch name (e.g., "main")
//   filename: string;      // File name (e.g., "chatflow-name.json")
//   commits: {             // Array of commit objects
//     commitId: string;
//     date: string;
//     message: string;
//     filePath: string;
//   }[]
// }

const VersionsSideDrawer = ({ show, dialogProps, onClickFunction, onSelectVersion, commitId }) => {
    const theme = useTheme()
    const onOpen = () => { }
    const [versionHistory, setVersionHistory] = useState({})
    const [publishDialogOpen, setPublishDialogOpen] = useState(false)
    const [commitMessage, setCommitMessage] = useState('')
    const [isPublishing, setIsPublishing] = useState(false)
    const [menuAnchorEl, setMenuAnchorEl] = useState(null)
    const [selectedCommit, setSelectedCommit] = useState(null)
    const [isDraftAvailable, setIsDraftAvailable] = useState(false)

    // const publishNewVersionApi = useApi(versioningApi.publishFlow)
    const getAllVersionsApi = useApi(versioningApi.getFlowVersions)

    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    useEffect(() => {
        if (dialogProps.id && show) {
            getAllVersionsApi.request(dialogProps.id)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (getAllVersionsApi.data) {
            setVersionHistory(getAllVersionsApi.data)
            setIsDraftAvailable(getAllVersionsApi.data.draft)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllVersionsApi.data])

    const closeAndRefreshAsNeeded = () => {
        onClickFunction(undefined)
    }

    function groupByDate(commits) {
        if (!commits || !Array.isArray(commits)) return {};
        return commits.reduce((acc, commit) => {
            const date = dayjs(commit.date).format('MMM DD, YYYY');
            if (!acc[date]) acc[date] = [];
            acc[date].push(commit);
            return acc;
        }, {});
    }

    const publishNewVersion = () => {
        setCommitMessage('')
        setPublishDialogOpen(true)
    }

    const handlePublishCommit = async () => {
        setIsPublishing(true)
        try {
            const result = await versioningApi.publishFlow(dialogProps.id, commitMessage)
            if (result.data?.success) {
                enqueueSnackbar({
                    message: (
                        <span>
                            Flow published to Git. <a href={result.data.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>View Commit</a><br />
                            Commit ID: <code style={{ fontSize: '0.9em' }}>{result.data.commitId}</code>
                        </span>
                    ),
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onSelectVersion(result.data.commitId)
            } else {
                enqueueSnackbar({
                    message: result.error || 'Failed to publish flow to Git',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        } catch (error) {
            enqueueSnackbar({
                message: 'Failed to publish flow to Git',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setIsPublishing(false)
            setPublishDialogOpen(false)
        }
    }

    const handleMenuClick = (event, commit) => {
        event.preventDefault()
        event.stopPropagation()
        setMenuAnchorEl(event.currentTarget)
        setSelectedCommit(commit)
    }

    const handleMenuClose = () => {
        setMenuAnchorEl(null)
        setSelectedCommit(null)
    }

    const handleShowCommit = () => {
        handleMenuClose()
        onSelectVersion(selectedCommit?.commitId)
    }

    const handleMakeDraft = async () => {
        handleMenuClose()
        try {
            const result = await versioningApi.makeDraft(dialogProps.id, selectedCommit?.commitId)
            if (result.data?.isDirty === true) {
                enqueueSnackbar({
                    message: 'Draft created',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success', 
                        autoHideDuration: 2000
                    }
                })
            } else {
                enqueueSnackbar({
                    message: result.error || 'Failed to make draft', 
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        autoHideDuration: 2000
                    }
                })
            }
            onSelectVersion(undefined)
        } catch (error) {
            enqueueSnackbar({
                message: 'Failed to make draft',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    autoHideDuration: 2000
                }
            })
        }
    }

    const handleCopyCommitId = () => {
        handleMenuClose()
        if (selectedCommit?.commitId) {
            navigator.clipboard.writeText(selectedCommit.commitId).then(() => {
                enqueueSnackbar({
                    message: 'Commit ID copied to clipboard',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        autoHideDuration: 2000
                    }
                })
            }).catch(() => {
                enqueueSnackbar({
                    message: 'Failed to copy commit ID',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        autoHideDuration: 2000
                    }
                })
            })
        }
    }

    const handleViewInGithub = () => {
        handleMenuClose()
        if (selectedCommit?.filePath) {
            window.open(selectedCommit.filePath, '_blank', 'noopener,noreferrer')
        }
    }

    const grouped = useMemo(() => groupByDate(versionHistory?.commits), [versionHistory?.commits])

    return (
        <SwipeableDrawer anchor='right' open={show} onClose={closeAndRefreshAsNeeded} onOpen={onOpen}>
            <Stack flexDirection='row' justifyContent='space-between' sx={{ width: '100%' }}>
                <Stack flexDirection='row' sx={{ width: '100%', maxWidth: '50%' }}>
                    <Box>
                        <Typography
                            sx={{
                                fontSize: '1.0rem',
                                fontWeight: 900,
                                m: 2,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                verticalAlign: 'middle'
                            }}
                        >
                            Versions
                        </Typography>
                    </Box>
                </Stack>
                <Box>
                    <IconButton sx={{ m: 1, color: 'black' }} onClick={closeAndRefreshAsNeeded}>
                        <IconX />
                    </IconButton>
                </Box>
            </Stack>
            <Divider />
            {dialogProps?.id && (
                <Button
                    variant='contained'
                    disabled={!dialogProps?.isDirty}
                    sx={{
                        background: theme.palette.canvasHeader.saveLight,
                        color: theme.palette.canvasHeader.saveDark,
                        boxShadow: 'none',
                        '&:hover': {
                            background: theme.palette.canvasHeader.saveDark,
                            color: theme.palette.canvasHeader.saveLight
                        },
                        m: 1,
                        p: 1
                    }}
                    startIcon={<IconGitCommit size={24} style={{ marginRight: 4 }} />}
                    onClick={publishNewVersion}
                >
                    {dialogProps?.isDirty ? 'Commit' : 'Nothing to Commit'}
                </Button>
            )}
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', 
                flexWrap: 'wrap', m: 1, p:1, borderBottom: '1px solid #d0d7de', background: '#f6f8fa' }}>
                <Typography
                    variant="caption"
                    sx={{ 
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: 2,
                        fontWeight: 900, mr: 0.5, 
                        fontFamily: 'monospace', alignItems: 'center', 
                        display: 'flex', flexDirection: 'row',
                        px: 1,
                        py: 0.5,
                    }}
                >
                    <IconBrandGit size={16} style={{ marginRight: 4 }} />{versionHistory.repository}
                </Typography>
                <Box
                    component="span"
                    sx={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: 2,
                        px: 1,
                        py: 0.5,
                        fontWeight: 700,
                        fontSize: '0.9em',
                        ml: 1,
                        alignItems: 'center',
                        display: 'flex',
                        flexDirection: 'row'
                    }}
                >
                    <IconGitBranch size={16} style={{ marginRight: 4 }} />{versionHistory.branch}
                </Box>
            </Box>
            {/* if commitId is provided, highlight the commit in the list and have a highlighted left border */}
            {versionHistory?.commits?.length > 0 && (
                <>
                    <Box sx={{ width: '100%', p: 2, height: '100%', overflowY: 'auto' }}>
                        <Box sx={{ position: 'relative' }}>
                            <Box sx={{ mb: 3, borderLeft: '1px solid #d0d7de', }}>
                                {isDraftAvailable && (
                                    <>
                                        <Typography variant="subtitle2" sx={{ color: '#888', mb: 1, ml: 1, mr: 1, fontWeight: 900 }}>
                                            Unpublished Changes
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, ml: 2, position: 'relative', 
                                            border: '1px solid #d0d7de', p: 2, borderRadius: 2, backgroundColor: '#e3f2fd', borderLeft: '1px solid #d0d7de' }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {'Current Draft'}
                                                </Typography>
                                            </Box>
                                            <Tooltip title="Draft actions">
                                                <span>
                                                    <IconButton
                                                        size="icon"
                                                        onClick={(e) => handleMenuClick(e, 'draft')}
                                                    >
                                                        <IconDotsVertical size={20} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </>
                                )}
                            </Box>
                            {Object.entries(grouped).map(([date, commits]) => (
                                <Box key={date} sx={{ mb: 3, borderLeft: '1px solid #d0d7de', }}>
                                    <Typography variant="subtitle2" sx={{ color: '#888', mb: 1, ml: 1, mr: 1, fontWeight: 900 }}>
                                        Commits on {date}
                                    </Typography>
                                    {commits.map((commit, idx) => (
                                        <Box key={commit.commitId} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1, ml: 2, position: 'relative', 
                                            border: '1px solid #d0d7de', p: 2, borderRadius: 2, backgroundColor: commitId === commit.commitId ? '#e3f2fd' : 'white', borderLeft: commitId === commit.commitId ? '4px solid rgb(22, 190, 140)' : '1px solid #d0d7de' }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {commit.message}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                        Commit&nbsp;
                                                        <Link
                                                            href={commit.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            underline="hover"
                                                            sx={{ fontFamily: 'monospace' }}
                                                        >
                                                            {commit.commitId.slice(0, 7)}
                                                        </Link>
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#888' }}>
                                                        {dayjs(commit.date).format('hh:mm:ss A')}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Tooltip title="Commit actions">
                                                <span>
                                                    <IconButton
                                                        size="icon"
                                                        onClick={(e) => handleMenuClick(e, commit)}
                                                    >
                                                        <IconDotsVertical size={20} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                        <Typography variant="subtitle2" sx={{ color: '#888', mb: 1, ml: 1, fontWeight: 900, textAlign: 'center' }}>
                            End of Commits for this flow
                        </Typography>
                    </Box>
                </>

            )}
            {versionHistory?.commits?.length === 0 && (
                <Box sx={{ width: 400, p: 2, background: '#f6f8fa', height: '100%' }}>
                    <Typography variant="subtitle" sx={{ mb: 1, ml: 1, fontWeight: 900, fontSize: '1.1rem' }}>
                        No versions history found for this flow
                    </Typography>
                </Box>
            )}
            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
            >
                {<MenuItem onClick={handleShowCommit}>
                    <IconEye size={18} style={{ marginRight: 8 }} />
                    Show Commit
                </MenuItem>}
                <MenuItem onClick={handleMakeDraft} disabled={isDraftAvailable || selectedCommit === 'draft'}>
                    <IconFileText size={18} style={{ marginRight: 8 }} />
                    Make Draft
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleCopyCommitId} disabled={selectedCommit === 'draft'}>
                    <IconCopy size={18} style={{ marginRight: 8 }} />
                    Copy Commit ID
                </MenuItem>
                <MenuItem onClick={handleViewInGithub} disabled={selectedCommit === 'draft'}>
                    {versionHistory.provider === 'GitHub' ? <IconBrandGithub size={18} style={{ marginRight: 8 }} /> : <IconBrandGit size={18} style={{ marginRight: 8 }} />}
                    View in {versionHistory.provider}
                </MenuItem>
            </Menu>
            <GitCommitDialog
                show={publishDialogOpen}
                message={commitMessage}
                onMessageChange={(e) => setCommitMessage(e.target.value)}
                onCancel={() => setPublishDialogOpen(false)}
                onCommit={handlePublishCommit}
                loading={isPublishing}
            />
        </SwipeableDrawer>
    )
}

VersionsSideDrawer.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onClickFunction: PropTypes.func,
    onSelectVersion: PropTypes.func,
    commitId: PropTypes.string
}

export default VersionsSideDrawer