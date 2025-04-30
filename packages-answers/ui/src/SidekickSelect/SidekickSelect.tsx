'use client'
import React, { useState, useRef } from 'react'
import { Button, Box, DialogContent, DialogTitle, Fade, Snackbar } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useAnswers } from '../AnswersContext'
import { useNavigate } from '@/utils/navigation'
import dynamic from 'next/dynamic'

import { ContentWrapper, StyledDialog } from './StyledComponents'
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

const SidekickSelect: React.FC<SidekickSelectProps> = ({ sidekicks: defaultSidekicks = [], noDialog = false }) => {
    // Add render counter for debugging
    const renderCountRef = useRef(0)
    renderCountRef.current++

    // Performance debug flag - set to true to see performance logs
    const enablePerformanceLogs = true

    // Get context values
    const { chat, sidekick: selectedSidekick } = useAnswers()
    const { user } = useUser()
    const navigate = useNavigate()

    // Dialog open state
    const [open, setOpen] = useState(false || noDialog)

    // Use the sidekick data hook
    const { combinedSidekicks, isLoading, sidekicksByCategoryCache, perfLog, allCategories } = useSidekickData({
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
        handleSidekickSelect,
        handleCreateNewSidekick
    } = useSidekickSelectionHandlers({
        chat,
        navigate,
        enablePerformanceLogs
    })

    if (enablePerformanceLogs) {
        console.log(`[SidekickSelect] Before final render, noDialog: ${noDialog}, render #${renderCountRef.current}`)
    }

    if (noDialog) {
        return (
            <ContentWrapper>
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
            </ContentWrapper>
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
