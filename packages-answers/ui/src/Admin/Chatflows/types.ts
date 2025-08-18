export interface ChatMessage {
    id: string
    content: string
    role: string
    type?: string
    createdDate: string
    chatId: string
    chatflowid: string
    chatType: string
    sessionId?: string
    memoryType?: string
    leadEmail?: string
    sourceDocuments?: any[]
    usedTools?: any[]
    fileAnnotations?: any[]
    feedback?: {
        content: string
        rating: string
    }
    artifacts?: any[]
    agentReasoning?: any[]
    fileUploads?: any[]
}

export interface ChatLog {
    chatId: string
    sessionId?: string
    memoryType?: string
    chatType: string
    createdDate: string
    userContent: string
    apiContent: string
    leadEmail?: string
}

export interface Stats {
    totalMessages: number
    totalFeedback: number
    positiveFeedback: number
    negativeFeedback: number
}

export interface MetricsProps {
    chatflowId: string
}
