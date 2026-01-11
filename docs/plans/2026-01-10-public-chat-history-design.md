# Public Chat History Retrieval Design

Date: 2026-01-10
Status: Draft

## Goals
- Provide server-side chat history retrieval for public chatbots by session key.
- Support UI replay and model context using existing session identifiers.
- Keep public exposure gated via chatbot configuration and allowed origins.

## Non-goals
- Replace or redesign flowise-embed UI.
- Add admin analytics or cross-chatflow search.
- Add pagination in v1 (can be added later if needed).

## Current Behavior (Summary)
- External embed stores chat history in localStorage keyed by chatflowid + "_EXTERNAL".
- Server memory uses sessionId when overrideConfig.sessionId is present, else chatId.
- Public endpoints expose chatbot config and prediction APIs, but no public chat history API.

## Proposed API

### GET /api/v1/public-chatmessage/:chatflowid
Query parameters:
- sessionId (string, preferred)
- chatId (string, fallback)
- order (optional, default ASC)

Behavior:
- Validate chatflow exists and isPublic is true.
- Validate chatbotConfig.chatHistory.enabled is true.
- Enforce allowedOrigins when configured (same rules as predictions).
- Resolve session key: use sessionId if provided; otherwise use chatId.
- Query chat_message for chatflowid and (sessionId = key OR chatId = key), chatType = EXTERNAL.
- Join execution for agentflow messages.
- Parse JSON fields (sourceDocuments, usedTools, fileAnnotations, agentReasoning, fileUploads, action, artifacts).
- Return ordered array of messages.

Response:
- Array of parsed chat message objects, matching internal chatmessage response shape.

## Session Key Resolution
- Input key is sessionId if provided; otherwise chatId.
- Server does not generate new IDs for history retrieval.
- For model context, clients should continue to pass the same sessionId (overrideConfig.sessionId) used today.

## Data Flow (Include History)
- Client already uses an existing session key for model context (overrideConfig.sessionId or chatId).
- When includeHistory is enabled, client calls public-chatmessage with that session key.
- Client replays the returned messages in UI.
- Subsequent /prediction calls continue using the same session key for memory continuity.

## Error Handling and Security
- 400 if neither sessionId nor chatId is supplied.
- 403 if chatflow is not public, chatHistory is disabled, or origin is not allowed.
- 404 if chatflow does not exist.
- Return [] for valid requests with no matching messages.
- Ensure no INTERNAL messages are returned from public endpoint.

## Server Implementation Notes
- Add new public-chat-messages router and controller.
- Reuse JSON parsing logic from chat-messages controller to keep response parity.
- Add chatbotConfig.chatHistory.enabled in Chatbot Config UI (Share Chatbot) and store in chatflow.chatbotConfig.

## Testing
- Unit tests for session key resolution and query filters.
- Integration tests for public endpoint gating, allowedOrigins, and JSON field parsing.
- Regression test that predictions and internal chatmessage endpoints remain unchanged.

## Rollout
- Feature is gated by chatbotConfig.chatHistory.enabled (default false).
- Document public endpoint usage and session key requirements.
