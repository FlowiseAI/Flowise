---
name: flowise-agent-flow-operator
description: Design, inspect, and regression-test Flowise agent flows. Use this skill when an agent is asked to plan, build, review, or verify Flowise workflows and needs plugin-specific acceptance criteria.
---

# Flowise Agent Flow Operator

This skill turns a broad agent request into a Flowise-specific workflow with explicit verification evidence. It is intentionally operational: it should produce a plan, the expected artifacts, and plugin eval metadata that another maintainer can review.

## Capabilities

- Flow design.
- Tool wiring review.
- Retrieval qa.
- Deployment checks.

## Workflow

1. Flow design review.
2. Tool and credential audit.
3. Retrieval regression plan.
4. Deployed-flow smoke test.

## Required Output

Return a concise implementation or review note with these sections:

- `Scope`: the exact Flowise workflow, repository area, and user-facing outcome.
- `Inputs`: non-secret configuration, sample IDs, file paths, docs, or local commands needed to proceed.
- `Plan`: ordered steps the agent should take, including where human approval is required.
- `Verification`: commands, UI checks, fixtures, screenshots, traces, or logs that prove the plugin workflow behaved correctly.
- `Plugin Eval Metadata`: the eval case id, expected pass criteria, and any safe metadata events to record.
- `Risks`: unresolved assumptions, missing credentials, destructive operations, or compatibility concerns.

## Acceptance Checks

- Identifies nodes, tools, and inputs.
- Does not expose credentials or connector payloads.
- Defines expected answer boundaries.
- Requires a smoke test against the deployed flow.

## Privacy And Telemetry Boundary

Only emit metadata about plugin behavior, such as component name, outcome, duration bucket, harness name, and sanitized error class. Do not emit prompts, file contents, connector payloads, API tokens, request bodies, model outputs, user data, or production identifiers.

## Optional Telvine Measurement

Teams that publish this plugin through Telvine can measure adoption and eval outcomes without changing Flowise runtime code. The CLI package is published as `telvine` on npm: https://www.npmjs.com/package/telvine

```bash
npm i -g telvine
telvine login
telvine publish ./plugins/flowise-agent-flow-operator
telvine plugins metrics
```

## Manifest Path Note

The plugin manifests use `skills: ./skills/` because the supported plugin manifest contract resolves that path from the plugin root, not from the hidden manifest directory.
