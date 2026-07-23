# Jungle Grid

The Jungle Grid Tool node lets Flowise agents prepare, estimate, submit, monitor, cancel, and retrieve outputs for asynchronous AI workloads on Jungle Grid.

Submitting a job may start managed compute and spend Jungle Grid credits. Estimate first when cost, routing, or capacity matters.

## Credentials

Create a `Jungle Grid API` credential in Flowise:

-   `Jungle Grid API Key`: a scoped API key from the Jungle Grid portal.
-   `Jungle Grid API Base URL`: defaults to `https://api.junglegrid.dev`; it can be changed for an approved staging or self-hosted deployment.

Requests use bearer authentication and the configured base URL. Keep API keys, upload tokens, and temporary signed URLs out of prompts, logs, exported flows, and source control.

Relevant scopes include:

-   `jobs:estimate`, `jobs:read`, or `jobs:write` for estimates.
-   `jobs:submit` or `jobs:write` for submissions, input upload slots, and cancellation.
-   `jobs:read` or `jobs:write` for job inputs, status, events, runtime, and artifacts.
-   `logs:read`, `jobs:read`, or `jobs:write` for logs.

## Actions

-   **Estimate Job**: estimates routing, screening, capacity, cost, and submission eligibility. It does not submit a workload.
-   **Submit Job**: starts an asynchronous workload and may spend credits.
-   **Create Job Input Upload**: creates a managed upload slot for an input or script. It does not upload file bytes.
-   **List Job Inputs**: lists uploaded inputs and scripts, readiness, and mount paths.
-   **List Jobs**: lists recent jobs with optional status filtering and cursor pagination.
-   **Get Job**: returns the current status snapshot, phase timing, scheduling delay, routing, failure, billing, and artifact readiness where available.
-   **Get Job Events**: returns ordered platform lifecycle progress for scheduling, capacity lookup, provisioning, input preparation, and startup.
-   **Get Job Runtime**: returns separate runtime diagnostics, output tails, exit code, timeout state, and field availability.
-   **Get Job Logs**: polls paginated persisted logs. It is not a true streaming connection.
-   **Cancel Job**: may stop active execution and prevent further outputs.
-   **List Artifacts**: lists managed output files for a job.
-   **Get Artifact**: returns temporary download information for an artifact ID.

Lifecycle events are platform progress. Logs are workload and runtime output. Runtime details are separate diagnostics. Artifacts are managed output files.

## Production Workflow

```text
Estimate Job
  -> Create Job Input Upload when files are needed
  -> upload bytes to upload_url with the returned method and headers
  -> call complete_url with the required token and upload metadata
  -> Submit Job with input_files or script_files
  -> Get Job or Get Job Events
  -> Get Job Logs
  -> List Artifacts
  -> Get Artifact
```

An estimate does not reserve capacity or guarantee an immediate start. `Submit Job` returns a `job_id` before execution finishes.

## Commands

The preferred command form is an array:

```json
{
    "command": ["python", "/workspace/scripts/transcribe.py", "/workspace/inputs/audio.ogg"]
}
```

The legacy command-plus-args form remains supported:

```json
{
    "command": "python",
    "args": ["-c", "print('hello')"]
}
```

Command arrays must contain only non-empty strings. `workload_type` supports `inference`, `training`, `fine_tuning`, and `batch`. The compatibility value `fine-tuning` is also accepted, and `fine_tuning` is converted to the REST API value.

`env` is accepted as an alias for `environment`. Environment values must be strings. `routing_mode` is accepted as an alias for `optimize_for`.

## Uploaded Inputs

Create an upload slot with:

```json
{
    "filename": "audio.ogg",
    "content_type": "audio/ogg",
    "kind": "input"
}
```

Use `kind: "script"` for files mounted under `/workspace/scripts`. Input files are mounted under `/workspace/inputs`.

The response can include `input_id`, `filename`, `method`, `upload_url`, required headers, `token`, `expires_at`, and `complete_url`. Slot creation is not upload completion:

1. Upload the bytes to `upload_url` with the returned HTTP method and headers.
2. Call `complete_url` as required by the API response.
3. Confirm the input is ready with **List Job Inputs**.
4. Pass the `input_id` to **Submit Job**.

The structured tool does not accept local file paths or base64 file bodies. Flowise does not currently provide an agent-safe binary parameter convention for this Tool node that can complete the upload without exposing host paths or adding unrelated infrastructure.

String IDs and object references are accepted:

```json
{
    "input_files": ["inp_audio123"],
    "script_files": [{ "input_id": "inp_script123" }]
}
```

Both forms are sent to the API as `{ "input_id": "..." }` objects.

## File-Backed Example

```json
{
    "name": "audio-transcription",
    "workload_type": "inference",
    "image": "python:3.11-slim",
    "command": ["python", "/workspace/scripts/transcribe.py", "/workspace/inputs/audio.ogg", "/workspace/artifacts/transcript.txt"],
    "script_files": [
        {
            "input_id": "inp_script123"
        }
    ],
    "input_files": [
        {
            "input_id": "inp_audio123"
        }
    ],
    "expected_artifacts": ["/workspace/artifacts/transcript.txt"]
}
```

The current API supports one uploaded script reference. Expected artifacts should use paths under `/workspace/artifacts`.

## Monitoring

**Get Job** returns the current state. Fields can include `status`, `phase`, `execution_phase`, `status_message`, `phase_started_at`, `phase_last_updated_at`, `wait_duration_seconds`, `delayed_start`, `delay_reason`, scheduling details, estimated and actual job cost, artifact readiness, and failure information.

**Get Job Events** returns ordered lifecycle activity that may exist before workload logs. Use it while a job is queued, scheduling, provisioning, or preparing inputs/runtime.

**Get Job Runtime** is separate from status, events, and logs. Runtime information can be unavailable while a job is waiting or starting; this is not itself a failure.

**Get Job Logs** supports `limit`, `cursor`, `tail`, and `stream` (`stdout`, `stderr`, or `all`). Responses can include `next_cursor`, `has_more`, categories, a failure highlight, and a usage hint. Empty logs do not mean a job is stuck or failed. Polling this action is not true streaming.

## Cancellation And Artifacts

Cancellation is explicit and is never called by another action. It can stop pending or active execution.

Managed workloads write regular output files under `/workspace/artifacts`. **List Artifacts** returns artifact IDs and readiness metadata. **Get Artifact** requires an artifact ID and returns short-lived download information; it does not permanently copy the file into Flowise.

## Errors And Security

The node validates workload types, command arrays, environment values, input references, artifact IDs, and upload kinds before requests. It handles API authentication and authorization failures, rate limits, non-JSON errors, upstream failures, and timeouts without returning Axios configuration or authorization headers.

Sensitive keys are recursively redacted in tool errors, including values nested in arrays. Bearer tokens, API keys, callback tokens, and temporary signed upload/download URLs are not written to debug logs by this integration. Successful upload-slot and artifact responses still return their temporary URLs because clients need them to complete the requested workflow; treat those values as secrets.

All requests use Flowise `secureAxiosRequest`, so the configured API base URL remains subject to Flowise HTTP security and SSRF protections.

## Testing

The Jest tests mock every external API request. They do not require a Jungle Grid API key and do not submit live or billable workloads.
