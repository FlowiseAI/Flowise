'use client'
import { useState, useCallback } from 'react'
import { Sidekick } from '../SidekickSelect.types'
import { useAnswers } from '../../AnswersContext'
import { Chat, SidekickListItem } from 'types'

export type NavigateFn = (url: string | number, options?: { state?: any; replace?: boolean }) => void

interface UseSidekickSelectionHandlersProps {
    chat?: Chat
    navigate: NavigateFn
}

interface UseSidekickSelectionHandlersResult {
    isMarketplaceDialogOpen: boolean
    setIsMarketplaceDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
    selectedTemplateId: string | null
    setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>
    showCopyMessage: boolean
    setShowCopyMessage: React.Dispatch<React.SetStateAction<boolean>>
    handleSidekickSelect: (sidekick: Sidekick) => void
    handleCreateNewSidekick: () => void
}

const useSidekickSelectionHandlers = ({ chat, navigate }: UseSidekickSelectionHandlersProps): UseSidekickSelectionHandlersResult => {
    const { setSidekick, setSidekick: setSelectedSidekick } = useAnswers()
    const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [showCopyMessage, setShowCopyMessage] = useState(false)

    const handleSidekickSelect = useCallback(
        (sidekick: Sidekick) => {
            if (!chat?.id) {
                // Update local storage first
                const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
                sidekickHistory.lastUsed = sidekick
                localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))

                // Update URL without navigation using history API
                const newUrl = `/chat/${sidekick.id}`
                window.history.pushState({ sidekick, isClientNavigation: true }, '', newUrl)

                // Directly initialize the chat with the sidekick data
                setSelectedSidekick(sidekick as unknown as SidekickListItem)
                setSidekick(sidekick as unknown as SidekickListItem)
            } else {
                setSelectedSidekick(sidekick as unknown as SidekickListItem)
                setSidekick(sidekick as unknown as SidekickListItem)
                const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
                sidekickHistory.lastUsed = sidekick
                localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))
                setIsMarketplaceDialogOpen(false)
            }
        },
        [chat, setSidekick, setSelectedSidekick]
    )

    const handleCreateNewSidekick = useCallback(() => {
        navigate('/canvas')
    }, [navigate])

    return {
        isMarketplaceDialogOpen,
        setIsMarketplaceDialogOpen,
        selectedTemplateId,
        setSelectedTemplateId,
        showCopyMessage,
        setShowCopyMessage,
        handleSidekickSelect,
        handleCreateNewSidekick
    }
}

export default useSidekickSelectionHandlers
