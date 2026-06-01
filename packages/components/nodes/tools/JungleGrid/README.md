# Jungle Grid

The Jungle Grid tool node lets Flowise agents estimate, submit, monitor, cancel, and retrieve artifacts for asynchronous Jungle Grid workloads.

Jungle Grid acts as the durable execution layer for long-running AI workloads while Flowise remains the orchestration and visual agent-building layer.

## Credentials

Create a `Jungle Grid API` credential with:

-   `Jungle Grid API Key`: a Jungle Grid API key.
-   `Jungle Grid API Base URL`: defaults to `https://api.junglegrid.dev`. Override only for development or self-hosted orchestrators.

Do not place Jungle Grid API keys in prompts, command arguments, environment variables, source code, exported flows, or logs.

## Actions

-   `Estimate Job`: calls `POST /v1/jobs/estimate` before starting work. Use this when cost, capacity, routing, or GPU tier matters.
-   `Submit Job`: calls `POST /v1/jobs` and returns immediately with a `job_id`. A returned `job_id` does not mean the job is complete.
-   `List Jobs`: calls `GET /v1/jobs` with verified `limit` and `status` filters.
-   `Get Job`: calls `GET /v1/jobs/{job_id}` to retrieve current status and details.
-   `Get Job Runtime`: calls `GET /v1/jobs/{job_id}/runtime` for stdout/stderr tails, exit information, diagnostics, and runtime availability.
-   `Cancel Job`: calls `POST /v1/jobs/{job_id}/cancel` with an optional reason.
-   `Get Job Logs`: uses the verified runtime endpoint to return available stdout/stderr and exit information.
-   `List Job Artifacts`: calls `GET /v1/jobs/{job_id}/artifacts`.
-   `Get Artifact Download URL`: calls `POST /v1/jobs/{job_id}/artifacts/{artifact_id}/download`.

Live log streaming is intentionally not exposed as a Flowise tool action. The official stream route is long-lived Server-Sent Events, while Flowise agent tools execute synchronously. Polling `Get Job`, `Get Job Runtime`, and `Get Job Logs` is the production-safe Flowise path.

## Usage Pattern

```text
Estimate Job
  -> Submit Job
  -> store job_id
  -> Get Job / Get Job Runtime / Get Job Logs
  -> wait for terminal status
  -> List Job Artifacts
  -> Get Artifact Download URL
```

`Submit Job` is asynchronous. It returns a `job_id` immediately, but that does not mean the workload has completed. Poll `Get Job`, `Get Job Runtime`, or `Get Job Logs` until Jungle Grid reports a terminal status. Retrieve artifacts after successful completion unless the API response explicitly shows partial outputs are available.

## Example Workloads

Minimal inference smoke-test shape:

```json
{
    "name": "flowise-jungle-grid-smoke-test",
    "image": "python:3.11",
    "workload_type": "inference",
    "model_size_gb": 1,
    "command": "python",
    "args": ["-c", "print(42)"]
}
```

Artifact-producing shape:

```json
{
    "name": "flowise-jungle-grid-artifact-test",
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

Common use cases include running inference workloads, batch jobs, evaluation workloads, artifact-producing container jobs, and agent-monitored long-running compute work.
