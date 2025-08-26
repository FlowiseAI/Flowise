# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowise is a visual tool for building AI agents and chatflows. It's a monorepo with multiple packages managed using PNPM workspaces and Turbo.

## Architecture

### Modules Structure
The project consists of 4 main modules:
- **`server`** (`packages/server`): Node.js backend serving API logic with Express, TypeORM, and database migrations
- **`ui`** (`packages/ui`): React frontend built with Vite, Material-UI components, and canvas-based flow builder
- **`components`** (`packages/components`): Third-party node integrations including LLMs, vector stores, tools, and agent implementations
- **`api-documentation`** (`packages/api-documentation`): Auto-generated Swagger UI API documentation

### Key Technologies
- **Backend**: Express.js, TypeORM, BullMQ for queues, WebSocket/SSE streaming
- **Frontend**: React, Vite, Material-UI, Konva.js for canvas
- **Database**: Supports SQLite, PostgreSQL, MySQL, MariaDB
- **Package Management**: PNPM workspaces with Turbo for build orchestration
- **Node Architecture**: Each component in `packages/components/nodes` follows a standardized interface with inputs, outputs, and execution logic

## Common Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev             # Start development servers (parallel, no cache)
pnpm build           # Build all packages
pnpm build-force     # Clean build all packages
```

### Production
```bash
pnpm start           # Start production server
pnpm start-worker    # Start queue worker
```

### Code Quality
```bash
pnpm lint            # Lint all files
pnpm lint-fix        # Auto-fix linting issues
pnpm format          # Format code with Prettier
pnpm test            # Run tests
```

### Database
```bash
pnpm migration:create  # Create new TypeORM migration
```

## Development Setup

1. Install PNPM v9+ globally
2. Clone repository and run `pnpm install`
3. Build with `pnpm build` (increase Node heap size if needed: `export NODE_OPTIONS="--max-old-space-size=4096"`)
4. For development: Create `.env` files in `packages/ui` and `packages/server` (see respective `.env.example` files)
5. Run `pnpm dev` for hot-reload development on port 8080

## Architecture Details

### Component System
- Components in `packages/components/nodes` are organized by category (agents, chatmodels, llms, vectorstores, etc.)
- Each component exports a class with `init()` method and follows standardized input/output interfaces
- Components support credentials, memory, caching, and streaming capabilities

### Database Architecture
- Uses TypeORM with migrations for SQLite, PostgreSQL, MySQL, MariaDB
- Entities include ChatFlow, ChatMessage, Credential, Assistant, DocumentStore, Evaluation
- Migrations are organized by database type in `packages/server/src/database/migrations`

### API Structure
- RESTful APIs organized in `packages/server/src/routes`
- Controllers in `packages/server/src/controllers`
- Services in `packages/server/src/services`
- Enterprise features have separate controller/service layers

### Queue System
- Uses BullMQ with Redis for background processing
- Prediction queue handles chatflow executions
- Upsert queue manages vector store operations

## Code Conventions

### Prettier Configuration
- Print width: 140
- Single quotes, no semicolons
- Tab width: 4
- Trailing commas: none

### ESLint
- Extends React app configuration
- Includes TypeScript, React hooks, JSX a11y rules
- Unused imports plugin enabled

## Environment Variables
Configure in `.env` files within `packages/server` folder. Key variables include database connection, authentication, queue configuration, and third-party API keys.

## Testing
Run tests with `pnpm test`. The project uses Jest for testing with specific configurations in each package.