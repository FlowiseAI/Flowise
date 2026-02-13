# @flowise/agentflow Examples

This folder demonstrates various usage patterns of the `@flowise/agentflow` package.

## Setup

1. First, build the agentflow package from the root:

    ```bash
    cd packages/agentflow
    pnpm build
    ```

2. Install dependencies for this example:

    ```bash
    cd examples
    pnpm install
    ```

3. Start the development server:

    ```bash
    pnpm dev
    ```

4. Open http://localhost:5174 in your browser

## Configuration

The examples app uses environment variables for configuration. To set up:

1. Copy the `.env.example` file to `.env`:

    ```bash
    cp .env.example .env
    ```

2. Edit `.env` to configure your Flowise API server:

    ```bash
    # Flowise API Base URL
    VITE_INSTANCE_URL=http://localhost:3000

    # API Key (required for authenticated endpoints)
    VITE_API_TOKEN=your-api-key-here
    ```

3. **Get your API Key from Flowise:**

    - Open your Flowise instance (http://localhost:3000)
    - Go to **Settings** → **API Keys**
    - Click **Create New Key**
    - Copy the generated key and paste it in `.env`

    ⚠️ **Important:** Use an **API Key**, not a user authentication token (JWT).

4. Restart the dev server to apply changes:
    ```bash
    pnpm dev
    ```

**Environment Variables:**

-   `VITE_INSTANCE_URL`: Flowise API server endpoint (maps to `apiBaseUrl` prop, default: `http://localhost:3000`)
-   `VITE_API_TOKEN`: Flowise API Key for programmatic access (required for authenticated endpoints)

**Note**: The `.env` file is gitignored and will not be committed to version control. Add your actual API key to `.env`, not `.env.example`.

### Troubleshooting Authentication

**Getting 401 Unauthorized errors?**

Common causes:

1. **Using wrong token type** ❌

    - Don't use: User authentication JWT tokens (long tokens starting with `eyJhbGc...`)
    - Use: API Keys (shorter tokens like `9CnKuLRHbEY...`)

2. **Token not loaded**

    - Restart dev server after editing `.env`: `pnpm dev`
    - Check browser console for: `[BasicExample] Environment check`

3. **Invalid API Key**

    - Regenerate key in Flowise: Settings → API Keys → Create New Key
    - Copy the new key to `.env`

4. **CORS issues**
    - Ensure Flowise allows requests from `http://localhost:5174`
    - Check Flowise CORS configuration

## Examples

### Basic Usage (`BasicExample.tsx`)

Demonstrates core usage:

-   Basic canvas rendering with `<Agentflow>` component
-   Passing `apiBaseUrl` and `initialFlow` props
-   Using the `ref` to access imperative methods (`validate`, `fitView`, `getFlow`, `clear`)
-   Handling `onFlowChange` and `onSave` callbacks

### Additional Examples

| Example                 | File                            | Description                                                                          |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| **Multi-Node Flow**     | `MultiNodeFlow.tsx`             | Complete translation agent flow with multiple connected nodes showing gradient edges |
| **Dark Mode**           | `DarkModeExample.tsx`           | Theme toggle demonstrating light/dark mode support                                   |
| **Status Indicators**   | `StatusIndicatorsExample.tsx`   | Node execution states (running, finished, error, stopped) with animated loader       |
| **Custom UI**           | `CustomUIExample.tsx`           | Custom header and node palette using render props                                    |
| **All Node Types**      | `AllNodeTypesExample.tsx`       | Visual catalog of all 15 available node types with colors and icons                  |
| **Filtered Components** | `FilteredComponentsExample.tsx` | Restricting available nodes with preset configurations                               |

## Switching Examples

Use the dropdown selector at the top of the page to switch between examples. All examples are lazy-loaded for better performance.

## Node Types Reference

| Node Type                 | Color   | Description                |
| ------------------------- | ------- | -------------------------- |
| `startAgentflow`          | #7EE787 | Entry point for the flow   |
| `llmAgentflow`            | #64B5F6 | Large Language Model node  |
| `agentAgentflow`          | #4DD0E1 | AI Agent with tools        |
| `conditionAgentflow`      | #FFB938 | Conditional branching      |
| `conditionAgentAgentflow` | #ff8fab | Agent-based condition      |
| `humanInputAgentflow`     | #6E6EFD | Human approval required    |
| `loopAgentflow`           | #FFA07A | Loop iteration             |
| `iterationAgentflow`      | #9C89B8 | Iteration container        |
| `directReplyAgentflow`    | #4DDBBB | Send response to user      |
| `customFunctionAgentflow` | #E4B7FF | Custom JavaScript function |
| `toolAgentflow`           | #d4a373 | External tool integration  |
| `retrieverAgentflow`      | #b8bedd | Vector store retrieval     |
| `httpAgentflow`           | #FF7F7F | HTTP API request           |
| `executeFlowAgentflow`    | #a3b18a | Execute another flow       |
| `stickyNoteAgentflow`     | #fee440 | Documentation note         |

## Requirements

The examples work best with a running Flowise instance at `http://localhost:3000` for the node API. Without it:

-   The canvas will render
-   Initial flow data will display
-   Node palette may be empty (nodes load from API)

For standalone testing, examples include mock flow data.
