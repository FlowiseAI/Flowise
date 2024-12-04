export interface FileUpload {
    data: string
    preview: string
    type: 'file' | 'url' | 'audio'
    name: string
    mime?: string
}

export interface Message {
    role: 'user' | 'assistant'
    content: string
    id?: string
    sourceDocuments?: any[]
    usedTools?: any[]
    fileAnnotations?: any[]
    agentReasoning?: any[]
    action?: any
    isLoading?: boolean
    fileUploads?: FileUpload[] | string
    chat?: any
    chatflowid?: string
    picture?: string
}

export interface ChatbotConfig {
    starterPrompts?: any[]
    displayMode?: string
    embeddedUrl?: string
    textInput?: {
        placeholder?: string
    }
}

export interface FlowData {
    nodes: any[]
    edges: any[]
}

export interface SendMessageParams {
    content: string
    sidekick?: SidekickListItem
    gptModel?: string
    retry?: boolean
    files?: FileUpload[]
    audio?: File | null
}

export interface DefaultPromptsProps {
    prompts?: any[]
    handleChange: (value: string) => void
    onPromptSelected: (value: string) => void
}

export interface SidekickListItem {
    id: string
    chatbotConfig?: ChatbotConfig
    flowData?: FlowData
}
