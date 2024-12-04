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
    chatflowid?: string
    fileUploads?: Array<{
        data: string
        type: string
    }>
    feedback?: any
}

export interface ChatbotConfig {
    starterPrompts?: any
    chatFeedback?: any
    leads?: any
}

export interface FlowData {
    nodes?: any[]
    edges?: any[]
}
