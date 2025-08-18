---
description: Learn how to deploy AnswerAgentAI locally
---

# Local Development

This guide will help you set up and run AnswerAgentAI in your local development environment for ultimate privacy and control.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/en/download) (v18.15.0 or v20 and above)
-   [PNPM](https://pnpm.io/installation) (v9 or above)
-   [Git](https://git-scm.com/downloads)

## Project Structure

AnswerAgentAI is a monorepo project with multiple packages:

Certainly! I'll list out the rest of the @packages folders with descriptions based on the information available in the provided code blocks. Here's an expanded list of the packages:

-   `server`: Node.js backend for API logic
-   `ui`: React frontend
-   `components`: Integration components
-   `docs`: Documentation site
-   `embed`: Javascript library to display AnswerAgentAI chatbot on your website

Here's a more detailed breakdown of each package:

1. `server`:

    - Main backend server for AnswerAgentAI
    - Handles API logic, database interactions, and server-side operations
    - Contains marketplaces and chatflow configurations

2. `ui`:

    - React-based frontend for the AnswerAgentAI application
    - Provides the user interface for interacting with AnswerAgentAI

3. `components`:

    - Contains integration components and nodes for AnswerAgentAI
    - Includes various LLM models, tools, and utilities

4. `docs`:

    - Documentation site for AnswerAgentAI
    - Contains user guides, API documentation, and developer resources

5. `embed`:

    - Javascript library for embedding AnswerAgentAI chatbot on websites
    - Provides components and features for full chatbot integration

These packages work together to create the full AnswerAgentAI ecosystem, providing a comprehensive solution for building and deploying AI-powered chatbots and workflows.

## Setup

1. Clone the repository:

```bash
git clone https://github.com/AnswerAgentAI/AnswerAgentAI.git
cd AnswerAgentAI
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm build
```

## Running the Application

To start the application in development mode:

```bash
pnpm dev
```

This command will start both the backend server and the frontend development server. The application will be available at [http://localhost:8080](http://localhost:8080).

For production mode:

```bash
pnpm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Environment Configuration

1. Create `.env` files in both `packages/ui` and `packages/server` directories.
2. Use the `.env.example` files in each directory as a reference for the required environment variables.

Key environment variables:

-   `packages/ui/.env`: Set `VITE_PORT` for the frontend development server
-   `packages/server/.env`: Set `PORT` for the backend server

## Development Workflow

1. Make changes to the code in `packages/ui` or `packages/server`.
2. The development server will automatically reload with your changes.
3. For changes in `packages/components`, you need to rebuild the project:

```bash
pnpm build
```

## Project Configuration

The project uses the following key configurations:

1. TypeScript Configuration:

```1:22:packages/components/tsconfig.json
{
    "compilerOptions": {
        "lib": ["ES2020", "ES2021.String"],
        "experimentalDecorators": true /* Enable experimental support for TC39 stage 2 draft decorators. */,
        "emitDecoratorMetadata": true /* Emit design-type metadata for decorated declarations in source files. */,
        "target": "ES2020", // or higher
        "outDir": "./dist/",
        "resolveJsonModule": true,
        "esModuleInterop": true /* Emit additional JavaScript to ease support for importing CommonJS modules. This enables `allowSyntheticDefaultImports` for type compatibility. */,
        "forceConsistentCasingInFileNames": true /* Ensure that casing is correct in imports. */,
        "strict": true /* Enable all strict type-checking options. */,
        "skipLibCheck": true /* Skip type checking all .d.ts files. */,
        "sourceMap": true,
        "strictPropertyInitialization": false,
        "useUnknownInCatchVariables": false,
        "declaration": true,
        "module": "commonjs"
    },
    "include": ["src", "nodes", "credentials"],
    "exclude": ["gulpfile.ts", "node_modules", "dist"]
}

```

2. Prettier Configuration:

```98:106:package.json
    "prettier": {
        "printWidth": 140,
        "singleQuote": true,
        "jsxSingleQuote": true,
        "trailingComma": "none",
        "tabWidth": 4,
        "semi": false,
        "endOfLine": "auto"
    },
```

3. Babel Configuration:

```107:119:package.json
    "babel": {
        "presets": [
            "@babel/preset-typescript",
            [
                "@babel/preset-env",
                {
                    "targets": {
                        "node": "current"
                    }
                }
            ]
        ]
    },
```

## Testing

To run end-to-end tests:

```bash
pnpm test:e2e
```

For component tests:

```bash
pnpm test:cmp
```

## Documentation

To run the documentation site locally:

```bash
cd packages/docs
pnpm start
```

The documentation will be available at [http://localhost:4242](http://localhost:4242).

## Troubleshooting

-   If you encounter memory issues during build, try increasing the Node.js heap size:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

-   Ensure all required environment variables are set correctly in your `.env` files.
-   For any other issues, check the console output for error messages or refer to the project's issue tracker on GitHub.

## Contributing

Please refer to the `CONTRIBUTING.md` file in the repository for guidelines on how to contribute to the project.

This guide should help you get started with running AnswerAgentAI locally. If you encounter any issues or have questions, please refer to the project's documentation or reach out to the development team.
