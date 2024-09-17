'use client'
import React, { createContext, useContext, useState } from 'react'

interface HelpChatContextType {
    helpChatOpen: boolean
    setHelpChatOpen: (open: boolean) => void
}

const HelpChatContext = createContext<HelpChatContextType>({
    helpChatOpen: true,
    setHelpChatOpen: () => {}
})

export function useHelpChatContext() {
    const context = useContext(HelpChatContext)
    return {
        ...context
    }
}

interface HelpChatProviderProps {
    children: React.ReactNode
}

export function HelpChatProvider({ children }: HelpChatProviderProps) {
    const [helpChatOpen, setHelpChatOpen] = useState(false)

    const contextValue = {
        helpChatOpen,
        setHelpChatOpen
    }

    return <HelpChatContext.Provider value={contextValue}>{children}</HelpChatContext.Provider>
}
