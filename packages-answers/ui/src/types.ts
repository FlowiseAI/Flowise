export interface Message {
    id?: string
    role: string
    content: string
    isLoading?: boolean
    sourceDocuments?: any[]
    usedTools?: any[]
    fileAnnotations?: any[]
    agentReasoning?: any[]
    artifacts?: any[]
    action?: any
    fileUploads?: any[]
    feedback?: any
    type?: string
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
