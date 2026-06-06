# Jungle Grid

The Jungle Grid tool node lets Flowise agents estimate, submit, monitor, cancel, and retrieve outputs for asynchronous Jungle Grid workloads.

Jungle Grid is live production infrastructure. Submitting jobs may start managed compute and spend credits. Estimate first whenever a user needs cost, capacity, or routing information before execution.

## Links

-   Website: https://junglegrid.dev
-   Docs: https://junglegrid.dev/docs
-   API docs: https://junglegrid.dev/docs/api
-   MCP docs: https://junglegrid.dev/docs/mcp
-   MCP server: https://github.com/Jungle-Grid/mcp-server
-   Discord: https://discord.com/invite/kpJqxXFFCs

## Credentials

Create a `Jungle Grid API` credential in Flowise:

-   `Jungle Grid API Key`: a scoped Jungle Grid API key from the Jungle Grid portal.
-   `Jungle Grid API Base URL`: defaults to `https://api.junglegrid.dev`. Override only for staging, local development, or private deployments.

Keep the API key in Flowise credentials or a server-side environment variable used to create that credential. Do not place Jungle Grid API keys in prompts, command arguments, exported flows, source code, logs, browser code, or public repositories.

Recommended API key scopes:

-   `jobs:estimate` for estimates.
-   `jobs:submit` or `jobs:write` for submit and cancel.
-   `jobs:read` for list, status, runtime, logs, and artifacts.
-   `logs:read` for stored job logs.

## Actions

-   `Estimate Job`: calls `POST /v1/jobs/estimate`. This is read-only and does not start compute.
-   `Submit Job`: calls `POST /v1/jobs`. This starts asynchronous remote work and can spend credits.
-   `List Jobs`: calls `GET /v1/jobs` with `limit`, `cursor`, and `status` filters.
-   `Get Job`: calls `GET /v1/jobs/{job_id}` for status and job details.
-   `Get Job Runtime`: calls `GET /v1/jobs/{job_id}/runtime` for runtime tails, exit code, timeout, and diagnostics where available.
-   `Get Job Logs`: calls `GET /v1/jobs/{job_id}/logs` with `tail`, `limit`, `cursor`, and `stream` filters.
-   `Cancel Job`: calls `POST /v1/jobs/{job_id}/cancel`. Use only for non-terminal jobs.
-   `List Artifacts`: calls `GET /v1/jobs/{job_id}/artifacts`.
-   `Get Artifact`: calls `POST /v1/jobs/{job_id}/artifacts/{artifact_id}/download` to create temporary download information.

Live log streaming uses `GET /v1/jobs/{job_id}/logs/live` as Server-Sent Events. Flowise tools execute synchronously, so this integration exposes polling through `Get Job` and `Get Job Logs` instead of holding a long-lived stream.

## Usage Pattern

```text
Estimate Job
  -> review estimate/capacity/cost fields
  -> Submit Job after user approval
  -> store job_id
  -> Get Job / Get Job Runtime / Get Job Logs
  -> wait for completed, failed, rejected, or cancelled
  -> List Artifacts
  -> Get Artifact
```

`Submit Job` returns a `job_id` immediately. It does not wait for completion. Poll until Jungle Grid reports a terminal status before assuming outputs are final.

## Example Workloads

Inference estimate:

```json
{
    "name": "flowise-inference-estimate",
    "image": "python:3.11",
    "workload_type": "inference",
    "model_size_gb": 1,
    "optimize_for": "balanced"
}
```

Low-cost batch submit:

```json
{
    "name": "flowise-batch-smoke",
    "image": "python:3.11",
    "workload_type": "batch",
    "model_size_gb": 1,
    "optimize_for": "cost",
    "command": "python",
    "args": ["-c", "print(42)"]
}
```

Agent-triggered artifact job:

```json
{
    "name": "flowise-artifact-job",
    "image": "python:3.11",
    "workload_type": "batch",
    "model_size_gb": 1,
    "command": "python",
    "args": [
        "-c",
        "import json, os; os.makedirs('/workspace/artifacts', exist_ok=True); json.dump({'status':'ok'}, open('/workspace/artifacts/output.json','w'))"
    ]
}
```

Job monitoring:

```json
{
    "job_id": "job_..."
}
```

Logs retrieval:

```json
{
    "job_id": "job_...",
    "tail": 100,
    "stream": "all"
}
```

Artifact retrieval:

```json
{
    "job_id": "job_...",
    "artifact_id": "art_..."
}
```

## Field Notes

-   `workload_type` supports `inference`, `training`, `fine_tuning` / `fine-tuning`, and `batch`. The integration sends `fine-tuning` to the REST API.
-   `routing_mode` is accepted as an agent-friendly alias for `optimize_for`.
-   `env` is accepted as an alias for `environment`; values must be strings.
-   `callback_url`, `callback_auth_token`, and `callback_metadata` follow the documented per-job callback fields. Treat callback tokens as secrets.
-   Managed jobs can upload regular files written under `/workspace/artifacts`. Direct input file upload is not part of the documented public job-submit contract; pass file references through your image, command, environment, or storage system where appropriate.
