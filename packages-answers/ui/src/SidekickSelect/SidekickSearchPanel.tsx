'use client'
import React from 'react'
import { Box } from '@mui/material'
import { Sidekick } from './SidekickSelect.types'
import SidekickTypeaheadSearch from './components/SidekickTypeaheadSearch'

interface SidekickSearchPanelProps {
    sidekicks: Sidekick[]
    isLoading: boolean
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
    handleSidekickSelect: (sidekick: Sidekick) => void
    enablePerformanceLogs?: boolean
    onClose?: () => void
    shouldAutoFocus?: boolean
    autoOpen?: boolean
}

const SidekickSearchPanel: React.FC<SidekickSearchPanelProps> = ({
    sidekicks,
    isLoading,
    favorites,
    toggleFavorite,
    handleSidekickSelect,
    enablePerformanceLogs = false,
    onClose,
    shouldAutoFocus = false,
    autoOpen = false
}) => {
    return (
        <Box sx={{ width: '100%', maxWidth: '400px' }}>
            <SidekickTypeaheadSearch
                sidekicks={sidekicks || []}
                isLoading={isLoading}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onSidekickSelect={handleSidekickSelect}
                placeholder='Search for a sidekick...'
                enablePerformanceLogs={enablePerformanceLogs}
                onClose={onClose}
                shouldAutoFocus={shouldAutoFocus}
                autoOpen={autoOpen}
            />
        </Box>
    )
}

export default SidekickSearchPanel
