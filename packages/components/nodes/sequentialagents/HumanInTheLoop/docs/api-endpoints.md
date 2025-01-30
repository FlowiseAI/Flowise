# API Endpoints Documentation

## Action Management

### Create Action Request
```http
POST /api/v1/hil/actions
```

Creates a new action request for human interaction.

#### Request Body
```typescript
{
    flowId: string           // Associated flow ID
    sessionId: string        // Current session ID
    nodeId: string          // Node that created the request
    type: string            // Type of action (approval/feedback/input/review)
    context: {
        question: string     // Question/prompt for human
        options?: any[]      // Available options/choices
        metadata: any        // Additional context
        requirements?: any   // Validation requirements
    }
    priority?: 'low' | 'medium' | 'high'
    timeout?: number        // Time in milliseconds before request expires
}
```

#### Response
```typescript
{
    id: string              // Action request ID
    status: 'pending'
    createdAt: string
    // ... other fields from request
}
```

### List Actions
```http
GET /api/v1/hil/actions
```

Lists action requests with optional filtering.

#### Query Parameters
- `status`: 'pending' | 'completed' | 'expired'
- `flowId`: string (optional)
- `sessionId`: string (optional)
- `type`: string (optional)
- `from`: Date (optional)
- `to`: Date (optional)
- `page`: number (optional)
- `limit`: number (optional)

#### Response
```typescript
{
    data: Array<{
        id: string
        flowId: string
        sessionId: string
        type: string
        status: string
        context: any
        createdAt: string
        updatedAt: string
    }>
    total: number
    page: number
    pageSize: number
}
```

### Get Action Details
```http
GET /api/v1/hil/actions/:actionId
```

Gets details of a specific action request.

#### Response
```typescript
{
    id: string
    flowId: string
    sessionId: string
    type: string
    status: string
    context: any
    response?: any
    createdAt: string
    updatedAt: string
}
```

### Submit Response
```http
POST /api/v1/hil/actions/:actionId/respond
```

Submits a response to an action request.

#### Request Body
```typescript
{
    response: {
        value: any          // The actual response value
        metadata?: any      // Additional response context
        respondedBy?: string // Who responded
    }
}
```

### Cancel Action
```http
POST /api/v1/hil/actions/:actionId/cancel
```

Cancels a pending action request.

#### Request Body
```typescript
{
    reason: string
    cancelledBy?: string
}
```

## Flow Control

### Check Flow Status
```http
GET /api/v1/hil/flows/:flowId/status
```

Checks the status of a flow and its pending actions.

#### Response
```typescript
{
    status: 'running' | 'paused' | 'completed'
    pendingActions: Array<{
        id: string
        type: string
        createdAt: string
        context: any
    }>
}
```

### Resume Flow
```http
POST /api/v1/hil/flows/:flowId/resume
```

Resumes a flow after handling an action.

#### Request Body
```typescript
{
    sessionId: string
    actionId: string
    response: any
}
```

## Batch Operations

### Batch Action Response
```http
POST /api/v1/hil/actions/batch
```

Handles multiple action responses in one request.

#### Request Body
```typescript
{
    actions: Array<{
        actionId: string
        response: any
    }>
}
```

### Batch Status Update
```http
POST /api/v1/hil/actions/batch/status
```

Updates status for multiple actions.

#### Request Body
```typescript
{
    actionIds: string[]
    status: 'cancelled' | 'expired'
    reason?: string
}
```

## Webhooks

### Register Webhook
```http
POST /api/v1/hil/webhooks
```

Registers a webhook for HIL events.

#### Request Body
```typescript
{
    url: string
    events: Array<'action.created' | 'action.completed' | 'action.expired'>
    secret?: string
}
```

### Webhook Payload Example
```typescript
{
    event: 'action.created'
    actionId: string
    flowId: string
    sessionId: string
    type: string
    context: any
    timestamp: string
}
```

## Authentication

All API endpoints require authentication. Include the following headers:

```http
Authorization: Bearer <api_key>
X-Flow-Secret: <flow_specific_secret>
```

## Rate Limiting

API requests are rate limited to prevent abuse:

- 100 requests per 15 minutes per IP
- 1000 requests per hour per API key
- Webhook delivery attempts: 3 retries with exponential backoff 