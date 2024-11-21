export interface Message {
    role: string
    content: string
    id?: string
    isLoading?: boolean
    sourceDocuments?: any[]
    usedTools?: any[]
    fileAnnotations?: any[]
    agentReasoning?: any[]
    action?: any
    chat?: any
    fileUploads?: Array<{
        data: string
        type: string
    }>
    feedback?: any
}

export interface ChatbotConfig {
    // Add required fields
}

export interface FlowData {
    // Add required fields
}
