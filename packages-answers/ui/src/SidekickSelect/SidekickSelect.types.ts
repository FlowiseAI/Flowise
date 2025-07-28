export interface Sidekick {
    id: string
    chatflow: {
        id?: string
        name: string
        description?: string
        category?: string
        categories?: string[]
        isOwner?: boolean
        canEdit?: boolean
        answersConfig?: any
        chatbotConfig?: any
        flowData?: any
    }
    categories?: string[]
    isRecent?: boolean
    isExecutable?: boolean
    favoritedBy?: Array<{ id: string }>
    flowData?: {
        nodes: Array<{ data: { category: string } }>
    }
    needsSetup?: boolean
    credentialsToShow?: any[]
}
