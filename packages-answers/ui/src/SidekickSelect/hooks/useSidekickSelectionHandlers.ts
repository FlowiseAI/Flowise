'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
    const router = useRouter()
    const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    const [showCopyMessage, setShowCopyMessage] = useState(false)

    const handleSidekickSelect = useCallback(
        (sidekick: Sidekick) => {
            // Check if this is a personal sidekick (owned by user) vs marketplace template
            const isPersonalSidekick = sidekick.chatflow.isOwner

            if (isPersonalSidekick) {
                // Handle personal sidekicks - these can be used directly in chat
                if (!chat?.id) {
                    // Update local storage first
                    const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
                    sidekickHistory.lastUsed = sidekick
                    localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))

                    // Update context first
                    setSelectedSidekick(sidekick as unknown as SidekickListItem)
                    setSidekick(sidekick as unknown as SidekickListItem)

                    // Navigate to chat with this sidekick
                    const newUrl = `/chat/${sidekick.id}`
                    router.push(newUrl)
                } else {
                    // Already in a chat, just switch sidekicks
                    setSelectedSidekick(sidekick as unknown as SidekickListItem)
                    setSidekick(sidekick as unknown as SidekickListItem)
                    const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
                    sidekickHistory.lastUsed = sidekick
                    localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))
                    setIsMarketplaceDialogOpen(false)
                }
            } else {
                // Handle marketplace sidekicks - these are templates that need to be viewed/cloned
                // Always navigate to marketplace regardless of current chat state
                const marketplaceUrl = `/sidekick-studio/marketplace/${sidekick.id}`
                router.push(marketplaceUrl)
            }
        },
        [chat, setSidekick, setSelectedSidekick, router]
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
