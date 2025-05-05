import { useNavigationState } from '@/utils/navigation'
import { useTheme } from '@emotion/react'
import { alpha, Box, Tooltip, Chip, Button } from '@mui/material'
import {
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    ContentCopy as IconCopy
} from '@mui/icons-material'
import { useCallback } from 'react'
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
    navigate: any
    handleSidekickSelect: any
    setSelectedTemplateId: any
    setIsMarketplaceDialogOpen: any
    toggleFavorite: any
}) => {
    const [, setNavigationState] = useNavigationState()

    const theme = useTheme()
    const handleClone = useCallback(
        (sidekick: Sidekick, e: React.MouseEvent) => {
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
        [navigate, user, setNavigationState]
    )

    const handleEdit = useCallback((sidekick: Sidekick, e: React.MouseEvent) => {
        e.stopPropagation()

        if (!sidekick) return

        const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
            (node: { data: { category: string } }) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )

        const url = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${sidekick.id}`
        window.open(url, '_blank')
    }, [])

    const handleCardClick = (sidekick: Sidekick) => {
        handleSidekickSelect(sidekick)
    }

    const handlePreviewClick = (sidekick: Sidekick, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedTemplateId(sidekick.id)
        setIsMarketplaceDialogOpen(true)
    }

    // Get the appropriate href for the sidekick card
    const getSidekickHref = useCallback((sidekick: Sidekick) => {
        if (!sidekick || !sidekick.isExecutable) return undefined

        // Return the URL for direct navigation (middle-click and keyboard navigation)
        return `/chat/${sidekick.id}`
    }, [])

    // Handle link clicks to prevent default behavior and use our custom handler instead
    const handleLinkClick = (e: React.MouseEvent, sidekick: Sidekick) => {
        // Only prevent default for left clicks to allow middle clicks to work natively
        if (e.button === 0) {
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
            onClick={sidekick.isExecutable ? (e) => handleLinkClick(e, sidekick) : undefined}
            style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block'
            }}
        >
            <SidekickCardContainer
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
                                <WhiteIconButton size='small' onClick={(e) => handleClone(sidekick, e)}>
                                    <IconCopy />
                                </WhiteIconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title='Clone this sidekick'>
                                <WhiteButton variant='outlined' endIcon={<IconCopy />} onClick={(e) => handleClone(sidekick, e)}>
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
                                    onClick={(e) => toggleFavorite(sidekick, e)}
                                    size='small'
                                    disabled={!sidekick.isExecutable && !favorites.has(sidekick.id)}
                                >
                                    {favorites.has(sidekick.id) ? <StarIcon /> : <StarBorderIcon />}
                                </WhiteIconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title='Preview this sidekick'>
                            <span>
                                <WhiteIconButton onClick={(e) => handlePreviewClick(sidekick, e)} size='small'>
                                    <VisibilityIcon />
                                </WhiteIconButton>
                            </span>
                        </Tooltip>
                        {sidekick.isExecutable && (
                            <Tooltip title='Use this sidekick'>
                                <Button
                                    variant='contained'
                                    size='small'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSidekickSelect(sidekick)
                                    }}
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
