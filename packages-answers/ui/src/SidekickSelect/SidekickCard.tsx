import { useNavigationState } from '@/utils/navigation'
import { alpha, Box, Tooltip, Chip, Button, CircularProgress, useTheme } from '@mui/material'
import {
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    ContentCopy as IconCopy
} from '@mui/icons-material'
import { useCallback, useState } from 'react'
import { Sidekick } from './SidekickSelect.types'
import {
    SidekickCardContainer,
    SidekickHeader,
    SidekickTitle,
    SidekickDescription,
    SidekickFooter,
    WhiteIconButton,
    WhiteButton
} from './StyledComponents'
import Link from 'next/link'
import useSidekickDetails from './hooks/useSidekickDetails'
import type { NavigateFn } from './hooks/useSidekickSelectionHandlers'

const SidekickCard = ({
    sidekick,
    user,
    favorites,
    navigate,
    handleSidekickSelect,
    setSelectedTemplateId,
    setIsMarketplaceDialogOpen,
    toggleFavorite
}: {
    sidekick: Sidekick
    user: any
    favorites: any
    navigate: NavigateFn
    handleSidekickSelect: any
    setSelectedTemplateId: any
    setIsMarketplaceDialogOpen: any
    toggleFavorite: any
}) => {
    const [, setNavigationState] = useNavigationState()
    const { fetchSidekickDetails } = useSidekickDetails()
    const [loadingAction, setLoadingAction] = useState<'clone' | 'preview' | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const theme = useTheme()

    const handleClone = useCallback(
        async (sidekick: Sidekick, e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()

            if (isProcessing || !sidekick) return

            setIsProcessing(true)
            setLoadingAction('clone')

            // Fetch full sidekick details if we don't have flowData
            let fullSidekick = sidekick
            if (!sidekick.flowData) {
                const details = await fetchSidekickDetails(sidekick.id)
                if (details) {
                    fullSidekick = details
                } else {
                    setLoadingAction(null)
                    setIsProcessing(false)
                    return
                }
            }

            const isAgentCanvas = (fullSidekick.flowData?.nodes || []).some(
                (node: { data: { category: string } }) =>
                    node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
            )

            localStorage.setItem('duplicatedFlowData', JSON.stringify(fullSidekick.chatflow))
            const state = {
                templateData: JSON.stringify(fullSidekick),
                parentChatflowId: fullSidekick.id
            }

            setLoadingAction(null)

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
            setIsProcessing(false)
        },
        [navigate, user, setNavigationState, fetchSidekickDetails, isProcessing]
    )

    const handleEdit = useCallback((sidekick: Sidekick, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!sidekick) return

        const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
            (node: { data: { category: string } }) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )

        const url = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${sidekick.id}`
        window.open(url, '_blank')
    }, [])

    const handleCardClick = async (sidekick: Sidekick) => {
        if (isProcessing) return
        setIsProcessing(true)
        // For executable sidekicks, fetch full details before selection
        if (sidekick.isExecutable && !sidekick.flowData) {
            const fullSidekick = await fetchSidekickDetails(sidekick.id)
            if (fullSidekick) {
                handleSidekickSelect(fullSidekick)
            }
        } else {
            handleSidekickSelect(sidekick)
        }
        setIsProcessing(false)
    }

    const handlePreviewClick = async (sidekick: Sidekick, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (isProcessing) return
        setIsProcessing(true)
        setLoadingAction('preview')

        // Fetch full details if needed
        if (!sidekick.flowData) {
            const fullSidekick = await fetchSidekickDetails(sidekick.id)
            if (fullSidekick) {
                sidekick = fullSidekick
            }
        }

        setSelectedTemplateId(sidekick.id)
        setIsMarketplaceDialogOpen(true)
        setLoadingAction(null)
        setIsProcessing(false)
    }

    // Get the appropriate href for the sidekick card
    const getSidekickHref = useCallback((sidekick: Sidekick) => {
        if (!sidekick || !sidekick.isExecutable) return undefined

        // Return the URL for direct navigation (middle-click and keyboard navigation)
        return `/chat/${sidekick.id}`
    }, [])

    // Handle card clicks - improved to check if click comes from action buttons
    const handleCardClickWrapper = (e: React.MouseEvent) => {
        // Check if the click target is a button or inside a button
        const target = e.target as HTMLElement
        const isButtonClick = target.closest('button') || target.closest('.actionButtons button')

        if (!isButtonClick && sidekick.isExecutable) {
            e.preventDefault()
            handleCardClick(sidekick)
        }
    }

    // Get the href for this sidekick
    const href = getSidekickHref(sidekick)

    return (
        <Link
            href={href || '#'}
            passHref
            style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block'
            }}
        >
            <SidekickCardContainer
                onClick={handleCardClickWrapper}
                key={sidekick.id}
                sx={{
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    ...(!sidekick.isExecutable && {
                        cursor: 'not-allowed',
                        '& .actionButtons': {
                            position: 'relative',
                            zIndex: 2,
                            pointerEvents: 'auto'
                        },
                        backgroundColor: `${theme.palette.background.paper}!important`,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                        overflow: 'hidden',
                        '&::before': {
                            content: '"MARKETPLACE"',
                            position: 'absolute',
                            top: 0,
                            right: theme.spacing(2),
                            fontSize: '0.65rem',
                            color: alpha(theme.palette.primary.main, 0.8),
                            letterSpacing: '1px',
                            fontWeight: 500,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
                                theme.palette.primary.main,
                                0.2
                            )} 100%)`,
                            padding: '4px 8px',
                            borderBottomLeftRadius: theme.shape.borderRadius,
                            borderBottomRightRadius: theme.shape.borderRadius,
                            backdropFilter: 'blur(8px)',
                            zIndex: 1
                        },
                        '&:hover': {
                            transform: 'none',
                            boxShadow: 'none'
                        }
                    })
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <SidekickHeader sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <SidekickTitle variant='h6'>{sidekick.chatflow.name}</SidekickTitle>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', gap: 1 }}>
                            {sidekick?.categories?.length && sidekick.categories?.map ? (
                                <Tooltip
                                    title={sidekick.categories?.map((category: string) => category.trim().split(';').join(', ')).join(', ')}
                                >
                                    <Chip
                                        label={sidekick.categories
                                            .map((category: string) => category.trim().split(';').join(' | '))
                                            .join(' | ')}
                                        size='small'
                                        variant='outlined'
                                        sx={{ marginRight: 0.5 }}
                                    />
                                </Tooltip>
                            ) : null}
                            {sidekick.chatflow.isOwner && <Chip label='Owner' size='small' color='primary' variant='outlined' />}
                        </Box>
                    </SidekickHeader>
                    <SidekickDescription variant='body2' color='text.secondary'>
                        {sidekick.chatflow.description || 'No description available'}
                    </SidekickDescription>
                    <SidekickFooter className='actionButtons'>
                        {sidekick.chatflow.canEdit ? (
                            <>
                                <Tooltip title='Edit this sidekick'>
                                    <WhiteIconButton size='small' onClick={(e) => handleEdit(sidekick, e)}>
                                        <EditIcon />
                                    </WhiteIconButton>
                                </Tooltip>
                            </>
                        ) : null}
                        {sidekick.isExecutable ? (
                            <Tooltip title='Clone this sidekick'>
                                <WhiteIconButton
                                    size='small'
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleClone(sidekick, e)
                                    }}
                                    disabled={loadingAction === 'clone' || isProcessing}
                                >
                                    {loadingAction === 'clone' ? <CircularProgress size={16} /> : <IconCopy />}
                                </WhiteIconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title='Clone this sidekick'>
                                <WhiteButton
                                    variant='outlined'
                                    endIcon={loadingAction === 'clone' ? <CircularProgress size={16} /> : <IconCopy />}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleClone(sidekick, e)
                                    }}
                                    disabled={loadingAction === 'clone' || isProcessing}
                                >
                                    Clone
                                </WhiteButton>
                            </Tooltip>
                        )}
                        <Tooltip
                            title={
                                !sidekick.isExecutable
                                    ? 'Clone this sidekick to use it'
                                    : favorites.has(sidekick.id)
                                    ? 'Remove from favorites'
                                    : 'Add to favorites'
                            }
                        >
                            <span>
                                <WhiteIconButton
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleFavorite(sidekick, e)
                                    }}
                                    size='small'
                                    disabled={(!sidekick.isExecutable && !favorites.has(sidekick.id)) || isProcessing}
                                >
                                    {favorites.has(sidekick.id) ? <StarIcon /> : <StarBorderIcon />}
                                </WhiteIconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title='Preview this sidekick'>
                            <span>
                                <WhiteIconButton
                                    onClick={(e) => handlePreviewClick(sidekick, e)}
                                    size='small'
                                    disabled={loadingAction === 'preview' || isProcessing}
                                >
                                    {loadingAction === 'preview' ? <CircularProgress size={16} /> : <VisibilityIcon />}
                                </WhiteIconButton>
                            </span>
                        </Tooltip>
                        {sidekick.isExecutable && (
                            <Tooltip title='Use this sidekick'>
                                <Button
                                    variant='contained'
                                    size='small'
                                    onClick={async (e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        await handleCardClick(sidekick)
                                    }}
                                    disabled={isProcessing}
                                >
                                    Use
                                </Button>
                            </Tooltip>
                        )}
                    </SidekickFooter>
                </Box>
            </SidekickCardContainer>
        </Link>
    )
}

export default SidekickCard
