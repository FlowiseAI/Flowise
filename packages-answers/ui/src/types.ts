export interface Message {
    role: 'user' | 'assistant'
    content: string
    id?: string
    isLoading?: boolean
    sourceDocuments?: any[]
    usedTools?: any[]
    fileAnnotations?: any[]
    agentReasoning?: any[]
    action?: any
    fileUploads?: any[]
    chat?: any
}

export interface ChatbotConfig {
    starterPrompts?: any
    chatFeedback?: {
        status: boolean
    }
    leads?: any
}

export interface FlowData {
    [key: string]: any
}
