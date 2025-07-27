# Flowise Codebase Guide

## Project Overview

Flowise is a visual flow-based tool for building LLM-powered applications, agents, and chatbots. It uses a node-based interface similar to Node-RED but specialized for AI workflows.

**Architecture**: TypeScript monorepo (PNPM + Turbo) with three main packages:
- `packages/components/` - Core node components and business logic 
- `packages/server/` - Express backend with APIs and database
- `packages/ui/` - React frontend with visual flow builder

## Key Development Patterns

### 1. Node Development Pattern

All nodes follow a standardized interface in `packages/components/src/Interface.ts`:

```typescript
interface INode {
    label: string           // Display name
    name: string           // Unique identifier  
    type: string           // Node category
    version: number        // Version for compatibility
    category: string       // UI grouping
    baseClasses: string[]  // Output types
    inputs: INodeParams[]  // Input configuration
    outputs?: INodeOutputsValue[]
    init?(nodeData: INodeData): Promise<any>
    run?(nodeData: INodeData): Promise<any>
}
```

**Node Categories**:
- Agents, ChatModels, Tools, VectorStores, DocumentLoaders, Memory, Chains, AgentFlow

### 2. Streaming Architecture

Real-time updates use `IServerSideEventStreamer` interface with events like:
- `streamTokenEvent()` - Token-by-token LLM responses
- `streamToolEvent()` - Tool execution notifications  
- `streamAgentReasoningEvent()` - Agent thought processes
- `streamCustomEvent()` - Custom event types

**Pattern**: Agents and chains receive `sseStreamer` via `options.sseStreamer` and call appropriate stream methods.

### 3. Tool Integration Pattern

Tools can be:
- **Custom Functions**: User-defined JavaScript with Zod schema validation
- **API Tools**: HTTP request wrappers (GET, POST, etc.)
- **Chain Tools**: Embedded chatflows as tools
- **MCP Tools**: Model Context Protocol integrations
- **Service Tools**: Platform integrations (Google, GitHub, Slack)

Tools receive runtime context via `RunnableConfig` parameter containing `chatId`, `sseStreamer`, etc.

### 4. Agent Patterns

**Traditional Agents**: Single LLM with tools (ReAct, Conversational)
**Multi-Agent**: Supervisor-worker coordination patterns
**AgentFlow v2**: Visual node-based agent orchestration with:
- Conditional branching
- Loops and iteration  
- State management
- Human-in-the-loop

### 5. Database and API Patterns

**TypeORM** entities in `/server/src/database/entities/`
**RESTful APIs** with Express middleware for auth, rate limiting
**Queue system** using BullMQ for background processing
**WebSocket/SSE** for real-time communication

## File Organization

```
packages/
├── components/
│   ├── nodes/           # All node implementations
│   │   ├── agents/      # Agent nodes
│   │   ├── tools/       # Tool integrations (including MCP)
│   │   ├── chatmodels/  # LLM integrations
│   │   └── chains/      # LangChain chains
│   └── src/
│       ├── Interface.ts # Core interfaces
│       └── handler.ts   # Execution handlers
├── server/
│   ├── src/controllers/ # API endpoints
│   ├── src/utils/       # SSEStreamer, buildChatflow
│   └── src/database/    # Database entities and migrations
└── ui/
    ├── src/views/       # Page components
    ├── src/api/         # API client functions
    └── src/store/       # Redux store
```

## Development Guidelines

### Adding New Nodes
1. Create node file in appropriate `/nodes/` category
2. Implement `INode` interface with `init()` and/or `run()` methods
3. Export in `/components/src/index.ts`
4. Add to category mapping in `/server/src/utils/buildChatflow.ts`

### Adding Streaming Support
1. Extract `sseStreamer` from `options.sseStreamer`
2. Extract `chatId` from `options.chatId` or config
3. Call appropriate `stream*Event()` methods during execution
4. Use `streamCustomEvent()` for custom notification types

### Working with Tools
1. Tools are LangChain-compatible functions created with `tool()` helper
2. Use Zod schemas for input validation
3. Access runtime context via second `config` parameter
4. Return string responses that get passed back through agent layer

### MCP (Model Context Protocol) Pattern
- MCP tools in `/nodes/tools/MCP/` create LangChain tool wrappers
- Each tool call creates new MCP client connection
- Notifications received via client event handlers
- Currently notifications only logged to console (opportunity for enhancement)

## Common Patterns

### Error Handling
- Use try/catch blocks in async operations
- Return descriptive error messages as strings
- Log errors for debugging but don't expose sensitive data

### Configuration Management  
- Use environment variables for external service configs
- Store sensitive data in credentials system
- Support both local and external credential storage

### Testing Strategy
- Component testing for individual nodes
- Integration testing for complete flows
- Use test databases for server tests
- Mock external APIs in tests

## Key Integration Points

### UI to Server Communication
- REST APIs for CRUD operations
- WebSocket/SSE for real-time streaming
- File uploads for document processing

### Server to Components
- Node execution via `run()` methods
- Streaming via `IServerSideEventStreamer` 
- State management through memory systems

### External Integrations
- LangChain ecosystem compatibility
- OpenAI/Anthropic/Google API integrations
- Vector database connections
- Third-party service APIs (GitHub, Slack, etc.)

## Current Development Focus Areas

1. **AgentFlow v2**: Enhanced visual agent orchestration
2. **Multi-agent systems**: Coordination and communication patterns
3. **Real-time streaming**: Enhanced user feedback and monitoring
4. **MCP integrations**: Model Context Protocol tool ecosystem
5. **Enterprise features**: Workspaces, analytics, usage tracking

## Troubleshooting Common Issues

### Streaming Not Working
- Check if `sseStreamer` is properly extracted from options
- Verify `chatId` is available in context
- Ensure streaming is enabled in flow configuration

### Tool Execution Failures
- Validate input schemas with Zod
- Check credential configuration and permissions
- Review tool return value format (should be string)

### Node Not Appearing in UI
- Verify node is exported in `/components/src/index.ts`
- Check category mapping in buildChatflow.ts
- Ensure node follows `INode` interface correctly