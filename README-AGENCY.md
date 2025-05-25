# AI Agent Orchestration Platform

This platform is built on top of Flowise, extending it to support AI agent orchestration with Google ADK, Composio tools, and scheduled triggers.

## Features

### Google ADK Integration
- ADKAgent implementation for LLM-based nodes
- Support for agent names, personas, and memory
- Authentication with Google ADK API

### Composio Tools Integration
- Pluggable action nodes (e.g., GMAIL_SEND_EMAIL, NOTION_CREATE_PAGE)
- Trigger sources (e.g., NEW_EMAIL_RECEIVED)
- Webhook support for external triggers

### Calendar and Scheduling
- Calendar view for visualizing scheduled tasks
- Support for one-time and recurring triggers
- Cron-based scheduling for complex patterns

### Trigger System
- Database-backed trigger storage
- Event logging for trigger executions
- Webhook endpoints for external systems

## Architecture

### Frontend
- React-based UI (extended from Flowise UI)
- FullCalendar integration for calendar view
- Form-based trigger configuration

### Backend
- Node.js server (extended from Flowise server)
- TypeORM for database access
- node-cron for scheduling

### Database
- Supabase (PostgreSQL with RLS)
- Tables for triggers, events, and agent configurations

## Deployment

### Prerequisites
- Node.js 18.15.0 or later
- pnpm package manager
- Supabase account
- Google ADK API key
- Composio API key

### Environment Variables
See `.env.example` for required environment variables.

### Railway Deployment
1. Fork this repository
2. Connect to Railway
3. Set up required environment variables
4. Deploy

## Development

### Setup
```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Start development server
pnpm dev
```

### Project Structure
- `/packages/server` - Backend server
- `/packages/ui` - Frontend UI
- `/packages/components` - Flowise components

### Key Components
- `TriggerService` - Manages triggers in the database
- `TriggerSchedulerService` - Handles scheduling and execution
- `Calendar` - UI component for calendar view

## Usage

### Creating an Agency
1. Create a new chatflow
2. Add ADKAgent nodes with appropriate personas
3. Configure Composio tool nodes for actions
4. Set up triggers for scheduling or external events

### Scheduling Tasks
1. Navigate to the Calendar view
2. Create a new trigger
3. Select the chatflow to execute
4. Configure schedule (one-time or recurring)

### External Triggers
Use the webhook endpoint to trigger flows from external systems:
```
POST /api/v1/triggers/:id/webhook
```

## License
See LICENSE file for details.