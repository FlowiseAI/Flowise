// Flowise API Configuration
export const FLOWISE_BASE_URL = 'https://robot.afaqy.sa:12099';
export const CHATFLOW_ID = '6571ac41-d4df-45e9-9c4e-bdee599aabf2';
export const API_KEY = '5n8Rap_rEWQLmcUVlxzQJx5W8C4pto31Bepea-Mt1aU';

// Test data
export const TEST_SESSION_ID = 'test-session-123';
export const TEST_CHAT_ID = 'test-chat-456';

// API Headers helper
export function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    return headers;
}

// Common error handler
export function handleApiError(response: Response, body: string) {
    console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: body,
    });
    throw new Error(`Flowise API error: ${response.status} - ${response.statusText}`);
}

// Types
export interface ChatMessageFilter {
    chatType?: string[];
    memoryType?: string;
    startDate?: string;
    endDate?: string;
    messageId?: string;
    feedback?: boolean;
    page?: number;
    limit?: number;
}

export interface ChatMessage {
    id: string;
    role: 'userMessage' | 'apiMessage';
    chatflowid: string;
    content: string;
    chatId: string;
    sessionId?: string;
    memoryType?: string;
    createdDate: string;
    sourceDocuments?: any[];
    agentReasoning?: any[];
    usedTools?: any[];
    fileUploads?: any[];
    artifacts?: any[];
    action?: any;
    fileAnnotations?: any[];
    followUpPrompts?: string;
}

export interface PredictionResponse {
    text: string;
    question: string;
    chatId: string;
    chatMessageId: string;
    sessionId?: string;
    memoryType?: string;
    timestamp: string; // New timestamp field
    isStreamValid: boolean;
    followUpPrompts?: string;
}