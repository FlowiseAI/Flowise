# Flowise API Testing Documentation

This folder contains testing scripts and documentation for Flowise API endpoints.

## Available Tests

### 1. Session Integration Test (Recommended)

Complete end-to-end test that validates the full session workflow:
1. Sends predictions with custom session ID
2. Retrieves all messages for that session  
3. Asserts messages exist and are correctly associated

**File**: `session-integration-test.ts`

```bash
npm run test:session-integration
```

**What it tests**:
- Custom session ID handling via `overrideConfig`
- Message persistence in database
- Session-based message retrieval
- Message ordering and timestamps
- Session ID consistency across requests

### 2. Chat Message Retrieval by Session

Test retrieving all messages for a specific session using the existing chat message endpoint.

**Endpoint**: `GET /api/v1/chatmessage/{chatflowId}?sessionId={sessionId}`

**Features**:
- Retrieve all messages for a specific session
- Filter by chat type, memory type, date range
- Includes parsed response data (sourceDocuments, agentReasoning, etc.)
- Supports pagination

#### Basic Usage

```typescript
// Get all messages for a session
const messages = await getSessionMessages(CHATFLOW_ID, SESSION_ID);

// With additional filters
const messages = await getSessionMessages(CHATFLOW_ID, SESSION_ID, {
    chatType: ['EXTERNAL'],
    memoryType: 'BufferMemory',
    startDate: '2025-01-01',
    endDate: '2025-12-31'
});
```

#### Response Format

```json
[
    {
        "id": "message-uuid",
        "role": "userMessage",
        "chatflowid": "chatflow-uuid",
        "content": "Hello, how are you?",
        "chatId": "chat-uuid",
        "sessionId": "session-uuid",
        "memoryType": "BufferMemory",
        "createdDate": "2025-08-28T14:30:45.123Z",
        "sourceDocuments": [...],
        "agentReasoning": [...],
        "usedTools": [...],
        "fileUploads": [...],
        "artifacts": [...]
    },
    {
        "id": "message-uuid-2",
        "role": "apiMessage",
        "content": "I'm doing well, thank you!",
        // ... other fields
    }
]
```

### 2. Prediction API Testing

Test the prediction API with both streaming and non-streaming modes.

**Features**:
- Non-streaming predictions
- Streaming predictions with real-time token output
- Error handling and response parsing
- Timestamp validation (new feature)

## Test Files

- `chat-message-test.ts` - Session message retrieval tests
- `prediction-test.ts` - Prediction API tests (streaming & non-streaming)
- `config.ts` - Shared configuration and utilities

## Setup

1. Update configuration in `config.ts`:
   ```typescript
   export const FLOWISE_BASE_URL = 'https://your-flowise-instance.com';
   export const CHATFLOW_ID = 'your-chatflow-id';
   export const API_KEY = 'your-api-key'; // Optional
   ```

2. Install dependencies:
   ```bash
   npm install node-fetch @types/node typescript ts-node
   ```

3. Run tests:
   ```bash
   # Session message tests
   npx ts-node chat-message-test.ts
   
   # Prediction API tests
   npx ts-node prediction-test.ts
   ```

## Authentication

If your Flowise instance requires authentication, set the `API_KEY` in config.ts. The test scripts will automatically include it in the Authorization header.

## Error Handling

All test scripts include comprehensive error handling:
- Network errors
- HTTP error responses
- JSON parsing errors
- Streaming connection issues

## Notes

- The session message endpoint requires a valid `chatflowId` even when filtering by `sessionId`
- Streaming responses use Server-Sent Events (SSE) format
- All timestamps are in ISO 8601 format (UTC)
- Response data includes parsed JSON fields (sourceDocuments, agentReasoning, etc.)