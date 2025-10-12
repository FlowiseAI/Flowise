# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Flowise is a visual AI agent building platform that allows users to build AI Agents and LLM applications through a drag-and-drop interface. It's built as a Node.js monorepo using TypeScript, React, and Express with a modular architecture supporting both chatflows and agentflows.

## Development Commands

### Prerequisites
- Node.js >= 18.15.0 < 19.0.0 || ^20
- PNPM >= 9 (package manager)

Install PNPM if not already installed:
```bash
npm i -g pnpm
```

### Core Development Workflow

```bash
# Install all dependencies across all packages
pnpm install

# Build all packages (production)
pnpm build

# Build with clean slate (if build issues occur)
pnpm build-force

# Start development servers (all packages)
pnpm dev

# Start production server
pnpm start

# Run tests across all packages
pnpm test

# Clean build artifacts
pnpm clean

# Nuclear clean (removes node_modules and .turbo)
pnpm nuke
```

### Package-Specific Commands

```bash
# Server development (packages/server)
cd packages/server && pnpm dev

# UI development (packages/ui) 
cd packages/ui && pnpm dev

# Build individual packages
turbo run build --filter=flowise
turbo run build --filter=flowise-ui
```

### Database Management

```bash
# Generate TypeORM migration
pnpm typeorm:migration-generate -- src/database/migrations/YourMigrationName

# Run migrations
pnpm typeorm:migration-run

# Revert migration
pnpm typeorm:migration-revert
```

### Testing

```bash
# Run all tests
pnpm test

# Server tests only
cd packages/server && pnpm test

# E2E tests with Cypress
cd packages/server && pnpm e2e

# Open Cypress UI
cd packages/server && pnpm cypress:open
```

### Code Quality

```bash
# Lint all files
pnpm lint

# Fix linting issues
pnpm lint-fix

# Format code
pnpm format

# Quick format staged files
pnpm quick
```

## Architecture Overview

### Monorepo Structure
- **`packages/server`**: Node.js/Express backend API server with TypeORM
- **`packages/ui`**: React frontend built with Vite and Material-UI
- **`packages/components`**: Third-party node integrations and components library
- **`packages/api-documentation`**: Auto-generated Swagger API documentation

### Key Architectural Concepts

#### Database Layer
- **TypeORM** with support for MySQL, PostgreSQL, SQLite
- **Entities**: Located in `packages/server/src/database/entities/`
- **Core entities**: ChatFlow, AgentFlow, ChatMessage, Credential, Tool, Assistant, DocumentStore
- **Migrations**: Separate migration files for each database type (postgres, mysql, sqlite, mariadb)

#### API Routes Structure
Routes are organized by feature in `packages/server/src/routes/`:
- **chatflows/**: Chat flow management and execution  
- **agentflows/**: Agent flow creation and management
- **predictions/**: LLM prediction handling
- **components-credentials/**: Authentication for third-party services
- **documentstore/**: Vector database and document management
- **tools/**: Custom tool integrations
- **assistants/**: OpenAI Assistants API integration

#### Component System
Located in `packages/components/`, organized by type:
- **nodes/**: LLM nodes, memory, tools, chains, agents
- **credentials/**: Authentication configs for external APIs
- **vectorstores/**: Vector database integrations
- **documentloaders/**: Document processing components
- **embeddings/**: Text embedding providers

#### Frontend Architecture
- **React 18** with **Material-UI (MUI)** components
- **Redux Toolkit** for state management  
- **React Flow** for visual flow builder
- **Vite** for build tooling
- **CodeMirror** for code editing

### Environment Configuration

Create `.env` files in both server and UI packages:
- `packages/server/.env` - Server configuration (PORT, database settings)
- `packages/ui/.env` - UI configuration (VITE_PORT)

Refer to `.env.example` files in each package for available variables.

### Memory Management

For large builds, you may need to increase Node.js heap size:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Common Development Patterns

#### Adding New Node Components
1. Create component in `packages/components/nodes/[category]/`
2. Implement required interfaces (INode, ICommonObject)
3. Add to component registry
4. Update TypeScript types if needed

#### Database Schema Changes  
1. Create entity changes in `packages/server/src/database/entities/`
2. Generate migration: `pnpm typeorm:migration-generate -- MigrationName`
3. Review generated migration files for all database types
4. Test migration: `pnpm typeorm:migration-run`

#### API Route Development
1. Create route handler in `packages/server/src/routes/[feature]/`
2. Add route to main router in `packages/server/src/index.ts`
3. Include proper authentication middleware if needed
4. Add TypeScript interfaces in `packages/server/src/Interface.ts`

### Deployment Considerations

The application supports various deployment methods:
- **Docker**: Use provided Dockerfile and docker-compose
- **Cloud platforms**: AWS, GCP, Azure deployment guides available
- **Self-hosted**: Railway, Render, Vercel options supported

### Enterprise Features

The codebase includes enterprise functionality in `packages/server/src/enterprise/`:
- Multi-tenant workspaces and organizations
- Role-based access control
- Audit logging
- Advanced authentication (SSO, SAML)