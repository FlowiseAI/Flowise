import React, { useState, useEffect, useCallback } from 'react'
import { Box, Typography, IconButton, Chip, Tooltip, alpha, Button } from '@mui/material'
import { Sidekick } from 'types'
import {
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Edit as EditIcon,
    ExpandMore as ExpandMoreIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material'
import { styled } from '@mui/system'
import { useSelector } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import { baseURL } from '@/store/constant'
import { useNavigate, useNavigationState } from '@/utils/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'

interface AssistantInfoCardProps {
    sidekick?: Sidekick
    onShare?: () => void
    onEdit?: () => void
    isFavorite?: boolean
    onToggleFavorite?: () => void
}

const WhiteIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main
    }
}))
const DescriptionText = styled(Typography)<{ expanded?: boolean }>(({ expanded }) => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: expanded ? 'unset' : 2,
    WebkitBoxOrient: 'vertical'
}))

const DescriptionContainer = styled(Box)<{ expanded?: boolean }>(({ expanded }) => ({
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
    position: 'relative',
    maxHeight: expanded ? '500px' : '40px' // Adjust the maxHeight values as needed
}))

const AssistantInfoCard = ({ sidekick, onShare, onEdit, isFavorite: propIsFavorite, onToggleFavorite }: AssistantInfoCardProps) => {
    const [expanded, setExpanded] = useState(false)
    const description = sidekick?.chatflow?.description || 'No description available'
    const theme = useTheme()
    const customization = useSelector((state: any) => state.customization)
    const navigate = useNavigate()
    const [, setNavigationState] = useNavigationState()
    const { user } = useUser()

    const [images, setImages] = useState<string[]>([])
    const [nodeTypes, setNodeTypes] = useState<string[]>([])

    const [localIsFavorite, setLocalIsFavorite] = useState(false)

    const [showCopyMessage, setShowCopyMessage] = useState(false)

    // Initialize favorite status from localStorage
    useEffect(() => {
        if (sidekick) {
            const storedFavorites = localStorage.getItem('favoriteSidekicks')
            const favorites = new Set(storedFavorites ? JSON.parse(storedFavorites) : [])
            setLocalIsFavorite(favorites.has(sidekick.id))
        }
    }, [sidekick])

    useEffect(() => {
        if (sidekick?.flowData) {
            const flowData = typeof sidekick.flowData === 'string' ? JSON.parse(sidekick.flowData) : sidekick.flowData
            const nodes = flowData.nodes || []
            const processedImages: string[] = []
            const processedNodeTypes: string[] = []
            nodes.forEach((node: { data: { category: string; name: string; label: string } }) => {
                if (['Agents', 'Chains', 'Chat Models', 'Tools', 'Document Loaders'].includes(node.data.category)) {
                    const imageSrc = `${baseURL}/api/v1/node-icon/${node.data.name}`
                    if (!processedImages.includes(imageSrc)) {
                        processedImages.push(imageSrc)
                        processedNodeTypes.push(node.data.label)
                    }
                }
            })
            setImages(processedImages)
            setNodeTypes(processedNodeTypes)
        }
    }, [sidekick])

    const handleClone = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()

            if (!sidekick) return

            const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
                (node: { data: { category: string } }) =>
                    node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
            )

            localStorage.setItem('duplicatedFlowData', JSON.stringify(sidekick.chatflow))
            const state = {
                templateData: JSON.stringify(sidekick),
                parentChatflowId: sidekick.id
            }
            if (!user) {
                const redirectUrl = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`
                const loginUrl = `/api/auth/login?redirect_uri=${redirectUrl}`
                setNavigationState(state)
                window.location.href = loginUrl
            } else {
                navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, {
                    state
                })
            }
        },
        [navigate, user, setNavigationState, sidekick]
    )

    const handleEdit = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()

            if (!sidekick) return

            const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
                (node: { data: { category: string } }) =>
                    node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
            )

            const url = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${sidekick.id}`
            window.open(url, '_blank')
        },
        [sidekick]
    )

    const handleToggleFavorite = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (!sidekick) return

            // Get current favorites from localStorage
            const storedFavorites = localStorage.getItem('favoriteSidekicks')
            const favorites = new Set(storedFavorites ? JSON.parse(storedFavorites) : [])

            // Toggle favorite
            const newFavoriteStatus = !favorites.has(sidekick.id)
            if (newFavoriteStatus) {
                favorites.add(sidekick.id)
            } else {
                favorites.delete(sidekick.id)
            }

            // Save back to localStorage
            localStorage.setItem('favoriteSidekicks', JSON.stringify(Array.from(favorites)))
            setLocalIsFavorite(newFavoriteStatus)

            // Call parent handler if provided
            if (onToggleFavorite) {
                onToggleFavorite()
            }
        },
        [sidekick, onToggleFavorite]
    )

    const handleShare = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (!sidekick) return

            // Create the share URL
            const shareUrl = `${window.location.origin}/sidekick-studio/canvas/${sidekick.id}`

            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                setShowCopyMessage(true)
                if (onShare) {
                    onShare()
                }
            })
        },
        [sidekick, onShare]
    )

    // Use localIsFavorite instead of the prop
    const isFavorite = localIsFavorite

    return (
        <>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative' }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant='h6' sx={{ mb: 0.5 }}>
                            {sidekick?.chatflow?.name || 'Assistant'}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {sidekick?.chatflow?.owner && (
                                <Typography variant='body2' color='text.secondary' sx={{ mr: 1 }}>
                                    By sidekick?.chatflow?.owner
                                </Typography>
                            )}

                            {sidekick?.chatflow?.isOwner && (
                                <Chip label='Owner' size='small' color='primary' variant='outlined' sx={{ mr: 1 }} />
                            )}

                            {sidekick?.categories?.map && (
                                <Tooltip title={sidekick.categories.map((category) => category.trim().split(';').join(', ')).join(', ')}>
                                    <Chip
                                        label={sidekick.categories.map((category) => category.trim().split(';').join(' | ')).join(' | ')}
                                        size='small'
                                        variant='outlined'
                                    />
                                </Tooltip>
                            )}
                        </Box>

                        <Box sx={{ position: 'relative' }}>
                            <DescriptionContainer expanded={expanded}>
                                <DescriptionText variant='body2' color='text.secondary' expanded={expanded}>
                                    {description}
                                </DescriptionText>

                                {images.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                                            Components Used
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            {images.map((img, index) => (
                                                <Tooltip key={img} title={nodeTypes[index]} arrow>
                                                    <Box
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: '50%',
                                                            backgroundColor: customization.isDarkMode
                                                                ? theme.palette.common.white
                                                                : alpha(theme.palette.grey[300], 0.75)
                                                        }}
                                                    >
                                                        <img
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                padding: 4,
                                                                objectFit: 'contain'
                                                            }}
                                                            alt=''
                                                            src={img}
                                                        />
                                                    </Box>
                                                </Tooltip>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </DescriptionContainer>

                            {(description.length > 100 || images.length > 0) && (
                                <Button
                                    onClick={() => setExpanded(!expanded)}
                                    size='small'
                                    endIcon={
                                        <ExpandMoreIcon
                                            sx={{
                                                transform: expanded ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.3s ease'
                                            }}
                                        />
                                    }
                                    sx={{
                                        p: 0,
                                        mt: 1,
                                        minWidth: 'auto',
                                        color: 'text.secondary',
                                        '&:hover': {
                                            backgroundColor: 'transparent',
                                            color: 'primary.main'
                                        }
                                    }}
                                >
                                    {expanded ? 'Show less' : 'Show more'}
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, position: 'absolute', right: 0, top: 0 }}>
                        {sidekick?.chatflow?.isOwner && (
                            <Tooltip title='Edit this sidekick'>
                                <WhiteIconButton size='small' onClick={handleEdit}>
                                    <EditIcon />
                                </WhiteIconButton>
                            </Tooltip>
                        )}

                        {sidekick?.isExecutable ? (
                            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                <WhiteIconButton onClick={handleToggleFavorite} size='small'>
                                    {isFavorite ? <StarIcon /> : <StarBorderIcon />}
                                </WhiteIconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title='Clone this sidekick to use it'>
                                <span>
                                    <WhiteIconButton onClick={handleToggleFavorite} size='small' disabled={!isFavorite}>
                                        {isFavorite ? <StarIcon /> : <StarBorderIcon />}
                                    </WhiteIconButton>
                                </span>
                            </Tooltip>
                        )}

                        {!sidekick?.isExecutable && (
                            <Tooltip title='Clone this sidekick'>
                                <WhiteIconButton onClick={handleClone} size='small'>
                                    <ContentCopyIcon />
                                </WhiteIconButton>
                            </Tooltip>
                        )}

                        {/* <Tooltip title='Share this sidekick'>
                            <WhiteIconButton onClick={handleShare} size='small'>
                                <ShareIcon />
                            </WhiteIconButton>
                        </Tooltip> */}
                    </Box>
                </Box>
            </Box>

            {/* <Snackbar
                open={showCopyMessage}
                autoHideDuration={2000}
                onClose={() => setShowCopyMessage(false)}
                message='Link copied to clipboard'
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            /> */}
        </>
    )
}

export default AssistantInfoCard
