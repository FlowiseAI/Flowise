import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton, Chip, Tooltip, Divider, alpha, Button } from '@mui/material'
import { Sidekick } from 'types'
import ShareIcon from '@mui/icons-material/Share'
import { Star as StarIcon, StarBorder as StarBorderIcon, Edit as EditIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { styled } from '@mui/system'
import { useSelector } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import { baseURL } from '@/store/constant'

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

const AssistantInfoCard = ({ sidekick, onShare, onEdit, isFavorite, onToggleFavorite }: AssistantInfoCardProps) => {
    const [expanded, setExpanded] = useState(false)
    const description = sidekick?.chatflow?.description || 'No description available'
    const theme = useTheme()
    const customization = useSelector((state: any) => state.customization)

    const [images, setImages] = useState<string[]>([])
    const [nodeTypes, setNodeTypes] = useState<string[]>([])

    useEffect(() => {
        if (sidekick?.flowData) {
            const flowData = typeof sidekick.flowData === 'string' ? JSON.parse(sidekick.flowData) : sidekick.flowData
            const nodes = flowData.nodes || []
            const processedImages = []
            const processedNodeTypes = []
            nodes.forEach((node: any) => {
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

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative' }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant='h6' sx={{ mb: 0.5 }}>
                        {sidekick?.chatflow?.name || 'Assistant'}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant='body2' color='text.secondary' sx={{ mr: 1 }}>
                            By {sidekick?.chatflow?.owner || 'Unknown'}
                        </Typography>
                        {sidekick?.chatflow?.isOwner && (
                            <Chip label='Owner' size='small' color='primary' variant='outlined' sx={{ mr: 1 }} />
                        )}
                        {sidekick?.categories?.length > 0 && (
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
                            <WhiteIconButton size='small' onClick={onEdit}>
                                <EditIcon />
                            </WhiteIconButton>
                        </Tooltip>
                    )}

                    <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                        <WhiteIconButton onClick={onToggleFavorite} size='small' disabled={!sidekick?.isExecutable && !isFavorite}>
                            {isFavorite ? <StarIcon /> : <StarBorderIcon />}
                        </WhiteIconButton>
                    </Tooltip>

                    <Tooltip title='Share this sidekick'>
                        <WhiteIconButton onClick={onShare} size='small'>
                            <ShareIcon />
                        </WhiteIconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    )
}

export default AssistantInfoCard
