# Human-in-the-Loop (HIL) Node for Flowise

## Overview
The Human-in-the-Loop (HIL) node enables asynchronous human interaction within Flowise agent flows. It structures requests in formats suitable for different interaction types (chat, email, custom) and pauses execution until human input is received.

## Features
- Multiple output formats (chat, email, custom schema)
- Automatic prompt enhancement based on format
- Seamless integration with existing checkpoint system
- Simple response handling

## Output Types

### 1. Chat Message
Simple chat-based interaction with optional enumerated responses:
```typescript
{
    type: 'chat',
    args: {
        message: string,
        expectedResponse?: string[]  // Optional enum of allowed responses
    }
}
```

### 2. Email Format
Structured email output format:
```typescript
{
    type: 'email',
    args: {
        to: string[],
        cc?: string[],
        bcc?: string[],
        bodyHTML: string,
        bodyText: string,
        attachments?: string[]
    }
}
```

### 3. Custom Schema
User-defined structured output:
```typescript
{
    type: 'custom',
    args: {
        // Any JSON structure defined by user's schema
        [key: string]: any
    }
}
```

## Usage

### Basic Configuration
```typescript
{
    name: "Review Request",
    question: "Please review this content for accuracy",
    outputTypes: ['chat'],  // Choose one or more types
    chatConfig: {
        responseOptions: ['approve', 'reject', 'revise']
    }
}
```

### Email Configuration
```typescript
{
    name: "Legal Review",
    question: "Review contract for legal compliance",
    outputTypes: ['email'],
    emailConfig: {
        subjectPrefix: '[Legal Review]',
        includeAttachments: true
    }
}
```

### Custom Schema Configuration
```typescript
{
    name: "Content Review",
    question: "Review marketing content",
    outputTypes: ['custom'],
    customSchema: [
        {
            key: 'brandAlignment',
            type: 'number',
            description: 'Rate brand alignment (1-5)'
        },
        {
            key: 'suggestedEdits',
            type: 'string',
            description: 'Proposed changes'
        }
    ]
}
```

## Integration

### Node Integration
The HIL node integrates with Flowise's sequential agent system:
```typescript
const hilNode = {
    type: 'HumanInTheLoop',
    outputTypes: ['chat', 'email'],
    // ... configuration
}
```

### State Management
Uses existing checkpoint system for state preservation:
```typescript
// State is automatically preserved during interrupt
const state = {
    pendingActionId: 'action-123',
    // ... other state data
}
```

### Response Handling
Responses are passed directly back to the flow:
```typescript
// Response is handled like any other agent response
const response = {
    content: responseData,
    // ... standard message format
}
```

## Best Practices

1. Output Type Selection
   - Choose appropriate output types for the use case
   - Combine types when needed (e.g., chat + email)
   - Use custom schema for specific requirements

2. Question/Task Design
   - Be specific about what needs review
   - Include context in the question
   - Specify expected response format

3. Schema Design
   - Keep custom schemas simple
   - Use descriptive field names
   - Include clear field descriptions

## API Reference
See [API Documentation](./api-endpoints.md) for endpoint specifications.

## Database Schema
See [Database Schema](./database-schema.md) for entity relationships.
