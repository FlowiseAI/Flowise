export interface ILLMMessage {
    role: 'system' | 'assistant' | 'user' | 'tool' | 'developer'
    content: string
}

export interface IStructuredOutput {
    key: string
    type: 'string' | 'stringArray' | 'number' | 'boolean' | 'enum' | 'jsonArray'
    enumValues?: string
    description?: string
    jsonSchema?: string
}

export interface IFlowState {
    key: string
    value: string
}
