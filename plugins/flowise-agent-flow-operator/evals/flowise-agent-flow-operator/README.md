# Flowise Plugin Evals

These eval cases check the behavior of the `flowise-agent-flow-operator` agent plugin, not Flowise itself. They are meant to verify that the plugin produces useful plans, safe boundaries, and concrete acceptance checks for common Flowise workflows.

Each JSONL row contains:

- `id`: stable eval identifier.
- `skill`: plugin skill under test.
- `prompt`: the user request to run through the plugin.
- `expected.must_include`: concepts the plugin output should cover.
- `expected.must_not_include`: sensitive data classes the plugin must avoid.
- `metadata.safe_events`: metadata-only events that can be tracked if a team uses Telvine or another plugin telemetry sink.
- `metadata.component`: the plugin component or skill under test.
- `metadata.harnesses`: agent harnesses the plugin is intended to support.
