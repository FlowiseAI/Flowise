'use client'
import React, { useState, useRef } from 'react'
import {
    Button,
    Box,
    DialogContent,
    DialogTitle,
    Fade,
    Snackbar,
    Typography,
    Card,
    CardContent,
    Avatar,
    Chip,
    Grid,
    Container,
    Paper,
    Link
} from '@mui/material'
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useAnswers } from '../AnswersContext'
import { useNavigate } from '@/utils/navigation'
import dynamic from 'next/dynamic'
import { alpha, useTheme } from '@mui/material/styles'
import NextLink from 'next/link'

import { StyledDialog } from './StyledComponents'
import { Sidekick } from './SidekickSelect.types'
import useSidekickFavorites from './hooks/useSidekickFavorites'
import useSidekickData from './hooks/useSidekickData'
import useSidekickCategories from './hooks/useSidekickCategories'
import useSidekickSelectionHandlers from './hooks/useSidekickSelectionHandlers'
import SidekickDialogContent from './components/SidekickDialogContent'

// Add marketplace dialog type definition
interface MarketplaceDialogProps {
    open: boolean
    onClose: () => void
    templateId: string | null
    onUse: (sidekick: Sidekick) => void
}

const MarketplaceLandingDialog = dynamic(() => import('@/views/chatflows/MarketplaceLandingDialog'), { ssr: false })
const MarketplaceDialogComponent = MarketplaceLandingDialog as React.ComponentType<MarketplaceDialogProps>

// Component props
interface SidekickSelectProps {
    onSidekickSelected?: (sidekick: Sidekick) => void
    sidekicks?: Sidekick[]
    noDialog?: boolean
}

// New simplified card component
const SimpleSidekickCard: React.FC<{
    sidekick: Sidekick
    onSelect: (sidekick: Sidekick) => void
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
}> = ({ sidekick, onSelect, favorites, toggleFavorite }) => {
    const theme = useTheme()
    const isFavorite = favorites.has(sidekick.id)

    return (
        <Card
            sx={{
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(
                    theme.palette.background.paper,
                    0.95
                )})`,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'visible',
                height: '100%',
                minHeight: 140,
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                },
                '&:active': {
                    transform: 'translateY(-2px)'
                }
            }}
            onClick={() => onSelect(sidekick)}
        >
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Favorite button */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 2,
                        cursor: 'pointer',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.background.default, 0.8),
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.default, 0.9)
                        }
                    }}
                    onClick={(e) => toggleFavorite(sidekick, e)}
                >
                    {isFavorite ? (
                        <StarIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />
                    ) : (
                        <StarBorderIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                    )}
                </Box>

                {/* Avatar and Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 40,
                            height: 40,
                            fontSize: '1rem',
                            fontWeight: 600,
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            mr: 2
                        }}
                    >
                        {sidekick.chatflow.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant='h6'
                            sx={{
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                lineHeight: 1.2,
                                fontSize: '1.1rem'
                            }}
                        >
                            {sidekick.chatflow.name}
                        </Typography>
                    </Box>
                </Box>

                {/* Description */}
                <Typography
                    variant='body2'
                    sx={{
                        color: theme.palette.text.secondary,
                        fontSize: '0.875rem',
                        lineHeight: 1.4,
                        flex: 1,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        mb: 2
                    }}
                >
                    {sidekick.chatflow.description || 'No description available'}
                </Typography>

                {/* Categories/Tags */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 'auto' }}>
                    {sidekick.chatflow.isOwner && (
                        <Chip
                            label='Mine'
                            size='small'
                            sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.main,
                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                '& .MuiChip-label': { px: 1.5 }
                            }}
                        />
                    )}
                    {sidekick.categories?.slice(0, 3).map((category, index) => (
                        <Chip
                            key={index}
                            label={category.length > 15 ? `${category.substring(0, 15)}...` : category}
                            size='small'
                            sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                '& .MuiChip-label': { px: 1.5 }
                            }}
                        />
                    ))}
                    {sidekick.categories && sidekick.categories.length > 3 && (
                        <Chip
                            label={`+${sidekick.categories.length - 3}`}
                            size='small'
                            sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.text.secondary, 0.1),
                                color: theme.palette.text.secondary,
                                border: `1px solid ${alpha(theme.palette.text.secondary, 0.2)}`,
                                '& .MuiChip-label': { px: 1.5 }
                            }}
                        />
                    )}
                </Box>
            </CardContent>
        </Card>
    )
}

const SidekickSelect: React.FC<SidekickSelectProps> = ({ sidekicks: defaultSidekicks = [], noDialog = false }) => {
    // Add render counter for debugging
    const renderCountRef = useRef(0)
    renderCountRef.current++

    // Performance debug flag - ENABLE DEBUGGING
    const enablePerformanceLogs = false

    // Get context values
    const { chat, sidekick: selectedSidekick } = useAnswers()
    const { user } = useUser()
    const navigate = useNavigate()
    const theme = useTheme()

    // Dialog open state
    const [open, setOpen] = useState(false || noDialog)

    // Use the sidekick data hook
    const { combinedSidekicks, isLoading, sidekicksByCategoryCache, perfLog, allCategories, data } = useSidekickData({
        defaultSidekicks,
        enablePerformanceLogs
    })

    // Use the favorites hook
    const { favorites, toggleFavorite } = useSidekickFavorites()

    // Use the categories hook
    const {
        expandedCategory,
        setExpandedCategory,
        focusedCategory,
        setFocusedCategory,
        viewMode,
        setViewMode,
        activeFilterCategory,
        setActiveFilterCategory,
        toggleViewMode,
        getSidekicksByCategory
    } = useSidekickCategories({
        combinedSidekicks,
        favorites,
        enablePerformanceLogs,
        sidekicksByCategoryCache,
        perfLog
    })

    // Use selection handlers hook
    const {
        isMarketplaceDialogOpen,
        setIsMarketplaceDialogOpen,
        selectedTemplateId,
        setSelectedTemplateId,
        showCopyMessage,
        setShowCopyMessage,
        handleSidekickSelect: handleSidekickSelectFromSidekickSelect,
        handleCreateNewSidekick
    } = useSidekickSelectionHandlers({
        chat,
        navigate,
        enablePerformanceLogs
    })

    // DEBUG: Log data flow
    React.useEffect(() => {
        if (enablePerformanceLogs) {
            console.log('=== SIDEKICK DEBUG INFO ===')
            console.log('defaultSidekicks:', defaultSidekicks)
            console.log('data from API:', data)
            console.log('combinedSidekicks:', combinedSidekicks)
            console.log('allCategories:', allCategories)

            if (combinedSidekicks?.length > 0) {
                const personalSidekicks = combinedSidekicks.filter((s) => s.chatflow.isOwner)
                const marketplaceSidekicks = combinedSidekicks.filter((s) => !s.chatflow.isOwner)
                console.log('Personal sidekicks:', personalSidekicks)
                console.log('Marketplace sidekicks:', marketplaceSidekicks)

                // Check isExecutable property
                const executableSidekicks = combinedSidekicks.filter((s) => s.isExecutable)
                const nonExecutableSidekicks = combinedSidekicks.filter((s) => !s.isExecutable)
                console.log('Executable sidekicks:', executableSidekicks)
                console.log('Non-executable sidekicks:', nonExecutableSidekicks)
            }
            console.log('========================')
        }
    }, [defaultSidekicks, data, combinedSidekicks, allCategories, enablePerformanceLogs])

    const handleSidekickSelect = (sidekick: Sidekick) => {
        handleSidekickSelectFromSidekickSelect(sidekick)
        setOpen(false)
    }

    // Filter and organize sidekicks for display
    const organizeSidekicks = () => {
        if (!combinedSidekicks?.length) return { personal: [], recent: [], popular: [] }

        const personal = combinedSidekicks.filter((s) => s.chatflow.isOwner)
        const recent = combinedSidekicks.filter((s) => s.isRecent && !s.chatflow.isOwner).slice(0, 6)
        const popular = combinedSidekicks.filter((s) => !s.isRecent && !s.chatflow.isOwner).slice(0, 8)

        if (enablePerformanceLogs) {
            console.log('Organized sidekicks:', { personal: personal.length, recent: recent.length, popular: popular.length })
        }

        return { personal, recent, popular }
    }

    const { personal, recent, popular } = organizeSidekicks()

    if (enablePerformanceLogs) {
        console.log(`[SidekickSelect] Before final render, noDialog: ${noDialog}, render #${renderCountRef.current}`)
    }

    if (noDialog) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                {/* Header - Simplified */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant='body1' sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                        Select from your personal sidekicks or explore popular ones
                    </Typography>

                    <Button
                        variant='contained'
                        startIcon={<AddIcon />}
                        onClick={handleCreateNewSidekick}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            '&:hover': {
                                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                transform: 'translateY(-1px)'
                            }
                        }}
                    >
                        Create New Sidekick
                    </Button>
                </Box>

                {isLoading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography>Loading your sidekicks...</Typography>
                    </Box>
                )}

                {!isLoading && (
                    <>
                        {/* Personal Sidekicks */}
                        {personal.length > 0 && (
                            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                                <Typography variant='h6' sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
                                    Your Sidekicks ({personal.length})
                                </Typography>
                                <Grid container spacing={2}>
                                    {personal.map((sidekick) => (
                                        <Grid item xs={12} sm={6} md={6} lg={6} key={`personal-${sidekick.id}`}>
                                            <SimpleSidekickCard
                                                sidekick={sidekick}
                                                onSelect={handleSidekickSelect}
                                                favorites={favorites}
                                                toggleFavorite={toggleFavorite}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Paper>
                        )}

                        {/* Recent/Popular */}
                        {(recent.length > 0 || popular.length > 0) && (
                            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant='h6' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                        Explore Sidekicks
                                    </Typography>
                                    <Link component={NextLink} href='/sidekick-studio/marketplaces' passHref>
                                        <Button variant='text' startIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none' }}>
                                            View Marketplace
                                        </Button>
                                    </Link>
                                </Box>
                                <Grid container spacing={2}>
                                    {[...recent, ...popular].map((sidekick) => (
                                        <Grid item xs={12} sm={6} md={6} lg={6} key={`explore-${sidekick.id}`}>
                                            <SimpleSidekickCard
                                                sidekick={sidekick}
                                                onSelect={handleSidekickSelect}
                                                favorites={favorites}
                                                toggleFavorite={toggleFavorite}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Paper>
                        )}

                        {/* Empty state */}
                        {!isLoading && personal.length === 0 && recent.length === 0 && popular.length === 0 && (
                            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                <Typography variant='h6' sx={{ mb: 2 }}>
                                    No sidekicks available
                                </Typography>
                                <Typography variant='body2' sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                                    Start by creating your first AI sidekick
                                </Typography>
                                <Button variant='contained' onClick={handleCreateNewSidekick}>
                                    Create Your First Sidekick
                                </Button>
                            </Paper>
                        )}
                    </>
                )}
            </Container>
        )
    }

    return (
        <Box>
            <Button variant='outlined' onClick={() => setOpen(true)} endIcon={<ExpandMoreIcon />} sx={{ justifyContent: 'space-between' }}>
                {selectedSidekick && 'chatflow' in selectedSidekick ? selectedSidekick.chatflow.name : 'Select Sidekick'}
            </Button>
            <StyledDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='lg' TransitionComponent={Fade}>
                <DialogTitle sx={{ pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Select a Sidekick
                    <Button variant='contained' color='primary' onClick={handleCreateNewSidekick}>
                        Create
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <SidekickDialogContent
                        user={user}
                        focusedCategory={focusedCategory}
                        isLoading={isLoading}
                        combinedSidekicks={combinedSidekicks}
                        allCategories={allCategories}
                        getSidekicksByCategory={getSidekicksByCategory}
                        expandedCategory={expandedCategory}
                        viewMode={viewMode}
                        toggleViewMode={toggleViewMode}
                        activeFilterCategory={activeFilterCategory}
                        setActiveFilterCategory={setActiveFilterCategory}
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                        navigate={navigate}
                        handleSidekickSelect={handleSidekickSelect}
                        isMarketplaceDialogOpen={isMarketplaceDialogOpen}
                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                        selectedTemplateId={selectedTemplateId}
                        setSelectedTemplateId={setSelectedTemplateId}
                        setExpandedCategory={setExpandedCategory}
                        setFocusedCategory={setFocusedCategory}
                        setViewMode={setViewMode}
                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                        handleCreateNewSidekick={handleCreateNewSidekick}
                        enablePerformanceLogs={enablePerformanceLogs}
                        perfLog={perfLog}
                    />
                </DialogContent>
            </StyledDialog>
            <MarketplaceDialogComponent
                key='marketplace-dialog-outer'
                open={isMarketplaceDialogOpen}
                onClose={() => {
                    setIsMarketplaceDialogOpen(false)
                    setSelectedTemplateId(null)
                    window.history.pushState(null, '', window.location.pathname)
                }}
                templateId={selectedTemplateId}
                onUse={(sidekick) => handleSidekickSelect(sidekick as Sidekick)}
            />
            <Snackbar
                open={showCopyMessage}
                autoHideDuration={2000}
                onClose={() => setShowCopyMessage(false)}
                message='Link copied to clipboard'
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    )
}

export default SidekickSelect
