# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowise is an open-source visual builder for AI agents and workflows. It allows users to create custom AI workflows, chatbots, and agents using a drag-and-drop interface without writing code. The platform integrates with various language models, document loaders, vector stores, and other AI tools.

## Repository Structure

Flowise is organized as a monorepo with multiple packages:

- `packages/server`: Node.js/Express backend that serves the API logic
- `packages/ui`: React frontend for the visual interface
- `packages/components`: Third-party nodes/integrations with AI services
- `packages/api-documentation`: Auto-generated Swagger API docs

## Development Commands

### Setup and Installation

```bash
# Install pnpm (required)
npm i -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
# If you encounter JavaScript heap out of memory error
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### Development

```bash
# Start development mode (with hot reloading)
pnpm dev

# Start application in production mode
pnpm start

# Start worker (for distributed mode)
pnpm start-worker
```

### Cleaning and Maintenance

```bash
# Clean build artifacts
pnpm clean

# Complete reset (clean + remove node_modules)
pnpm nuke

# Format code
pnpm format

# Lint code
pnpm lint

# Fix linting issues
pnpm lint-fix
```

## Environment Configuration

Environment variables are defined in `.env` files in the `packages/server` directory. Key variables include:

- `PORT`: HTTP port for the server (default: 3000)
- `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`: For authentication
- `DATABASE_TYPE`: sqlite (default), mysql, or postgres
- `STORAGE_TYPE`: local (default), s3, or gcs for file storage

For development:
- Create `.env` file in `packages/ui` and set `VITE_PORT` (see `.env.example`)
- Create `.env` file in `packages/server` and set `PORT` (see `.env.example`)

## Architecture

Flowise uses a node-based architecture for creating AI workflows:

1. **Nodes**: Components that perform specific functions (LLMs, document loaders, vector stores, etc.)
2. **Edges**: Connections between nodes that define the flow of data
3. **Chatflows**: Complete workflows built by connecting nodes

The main workflow types are:
- **Chatflow**: Standard chatbot workflows with RAG capabilities
- **AgentFlow**: Advanced reasoning agent workflows with tools
- **Credentials**: Securely stored API keys and authentication details for external services

## Component Development

New components (nodes) can be added in the `packages/components` directory. Each component must define:

1. Input/output ports
2. Configuration UI
3. Execution logic

When making changes to components:
- After modifying `packages/components`, run `pnpm build` to pick up changes
- For UI/server changes, `pnpm dev` will automatically reload

## Common Development Tasks

1. **Creating a new node**: Extend existing node types in `packages/components`
2. **Modifying the UI**: React components in `packages/ui/src`
3. **Extending the API**: Express routes in `packages/server/src`

## Deployment Notes

- Node.js >= 18.15.0 is required
- PNPM v9+ is required for package management
- When building for production, always run `pnpm build` followed by `pnpm start`
- For containerization, use the Docker configuration in the `docker` directory

## Project Configuration Files

- `package.json`: Root project configuration and scripts
- `turbo.json`: Configuration for Turborepo build system
- `pnpm-workspace.yaml`: PNPM workspace configuration
- `.eslintrc.js`: ESLint configuration
- `.prettierrc`: Prettier formatting configuration

## Memory Considerations

If you encounter "JavaScript heap out of memory" errors during build:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Pull Request Guidelines

1. Fork the repository
2. Create a new branch (feature/bugfix)
3. Make changes following the project's code style
4. Ensure all linting passes
5. Submit PR targeting the main branch