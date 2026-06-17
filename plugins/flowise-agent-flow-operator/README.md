# Flowise Agent Plugin

This plugin packages a focused agent workflow for Flowise maintainers and users. It is designed to be useful in Codex, Claude Code, Claude Cowork, Copilot-style coworkers, and other `SKILL.md`-compatible harnesses.

The plugin does not add a runtime dependency to Flowise. It gives agents a precise operating procedure, expected outputs, and plugin evals so maintainers can decide whether agent-produced work is good enough to accept.

## What It Includes

- Codex and Claude plugin manifests.
- A Flowise-specific skill at `skills/flowise-agent-flow-operator/SKILL.md`.
- Plugin eval cases in `evals/flowise-agent-flow-operator/cases.jsonl`.
- Privacy-safe measurement guidance for teams that want production plugin metrics.

## Manifest Compatibility

The Codex and Claude manifests use `skills: ./skills/`, which is resolved from the plugin root by the plugin manifest contract. The Codex manifest validates with the local plugin validator used for this contribution.

## Primary Workflows

- Flow design review.
- Tool and credential audit.
- Retrieval regression plan.
- Deployed-flow smoke test.

## Eval Cases

- `flow-review`: Review a Flowise customer-support flow before deployment.
- `retrieval-eval`: Create plugin evals for a Flowise RAG flow over product docs.
- `tool-failure`: Triage a Flowise tool node that returns an auth failure.

## Install In An Agent Harness

Use this plugin directory directly from the repository when your harness supports local or Git-backed plugin sources. The plugin root is:

```text
plugins/flowise-agent-flow-operator
```

For Telvine-backed distribution and metrics, the Telvine CLI is published as [`telvine` on npm](https://www.npmjs.com/package/telvine):

```bash
npm i -g telvine
telvine login
telvine publish ./plugins/flowise-agent-flow-operator
telvine plugins metrics
```

## Telemetry Boundary

The plugin should only record metadata about plugin execution and eval outcomes. Do not record prompts, source files, request bodies, connector payloads, credentials, model outputs, or production user data.
