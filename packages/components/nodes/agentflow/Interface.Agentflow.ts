export interface ILLMMessage {
    role: 'system' | 'assistant' | 'user' | 'tool' | 'developer'
    content: string
}

export interface IStructuredOutput {
    key: string
    type: string
    enumValues?: string
    description?: string
}

export interface IFlowState {
    key: string
    value: string
}
