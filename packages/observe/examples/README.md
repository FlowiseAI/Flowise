# @flowiseai/observe — Examples

A Vite + React dev app for exploring and testing `@flowiseai/observe` components against a live Flowise instance.

## Setup

**1. Copy the env file and fill in your values:**

```bash
cp .env.example .env
```

<!-- prettier-ignore -->
| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of your Flowise instance (default: `http://localhost:3000`) |
| `VITE_API_TOKEN` | API key for authentication — get this from **Flowise UI → Settings → API Keys → Create New Key**. This is an API key, not a user session token. Ensure the key has the necessary permissions for any features you want to exercise (e.g. deleting executions). |
| `VITE_FLOW_ID` | _(optional)_ UUID of an agentflow — scopes the Executions Viewer to that flow only. When unset, all executions across every agentflow are shown. Get it from the URL or settings of your agentflow in Flowise UI. |
| `VITE_EXECUTION_ID` | UUID of a specific execution — used by the Standalone Detail demo. Get it from any execution row in the executions view. |
| `VITE_AGENTFLOW_CANVAS_URL` | _(optional)_ Base URL of the agentflow canvas — when set, the demos wire `onAgentflowClick` to open `${VITE_AGENTFLOW_CANVAS_URL}/<agentflowId>` in a new tab. When unset, the agentflow chip in the SDK header renders non-clickable. Example: `http://localhost:3000/v2/agentcanvas`. |

**2. Install dependencies (from this directory):**

```bash
npm install
```

**3. Start the dev server:**

```bash
npm run dev
```

The app opens at `http://localhost:5174` (or the next available port).

---

## Demos

### Executions Viewer (`ExecutionsViewerExample`)

Route: `/` (default tab)

Renders `<ExecutionsViewer />` with optional scoping via `VITE_FLOW_ID`. When `VITE_FLOW_ID` is set, the viewer is scoped to that agentflow; when unset, all executions across every agentflow are shown.

Features exercised:

-   Execution list with state and session ID filters
-   Pagination
-   Clicking a row opens `ExecutionDetail` in a side drawer (drag the left edge of the drawer to resize)
-   Single-row delete (`allowDelete={true}`)
-   Auto-poll while a run is INPROGRESS
-   HITL Approve/Reject buttons (logs to console — no real prediction call)
-   Clicking the agentflow name chip opens `${VITE_AGENTFLOW_CANVAS_URL}/<agentflowId>` in a new tab when the env var is set; renders non-clickable when unset

### Standalone Detail (`StandaloneDetailExample`)

Route: `/detail` (second tab)

Renders `<ExecutionDetail executionId="..." />` given an execution UUID. Useful for testing the step viewer in isolation or deep-linking into a known trace.

The execution ID can be pre-filled via `VITE_EXECUTION_ID` or pasted into the text field at runtime.

Features exercised:

-   Resizable split-pane layout (drag the divider between tree and detail)
-   Node tree sidebar with iteration grouping
-   `NodeExecutionDetail` — all renderers (markdown, JSON, raw/rendered toggle)
-   Token / cost / time metrics per node
-   Auto-poll while INPROGRESS
-   Clicking the agentflow name chip opens `${VITE_AGENTFLOW_CANVAS_URL}/<agentflowId>` in a new tab when the env var is set; renders non-clickable when unset

---

## Notes

-   The examples import `@flowiseai/observe` directly from `packages/observe/src/` via Vite path aliases — no build step required. Source changes are reflected immediately via HMR.
-   HITL callbacks in these demos log to the browser console instead of making real prediction calls. To test end-to-end HITL, replace the `onHumanInput` handler with a real fetch to your Flowise prediction endpoint.
