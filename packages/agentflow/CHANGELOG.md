# Changelog

All notable changes to `@flowiseai/agentflow` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.0-dev.14] - 2026-05-04

### Added

-   Node execution visualization with Human-in-the-Loop support
-   End-to-end example demonstrating flow execution against a Flowise server

### Changed

-   Canvas styling aligned with AgentflowV2

### Fixed

-   Variable resolution and credential sync in node editor
-   Iteration node functionality (output selection, highlight color, tool args)

## [0.0.0-dev.13] - 2026-04-17

### Added

-   Core canvas functionality (add, connect, edit, delete, duplicate nodes)
-   15 built-in node types (Start, Agent, LLM, Condition, Condition Agent, Human Input, Loop, Direct Reply, Custom Function, Tool, Retriever, Sticky Note, HTTP, Iteration, Execute Flow)
-   Node editor dialog with dynamic input types (text, number, boolean, dropdown, arrays, JSON, code, variable selector, async options)
-   Async option loading for models, tools, and credentials
-   Variable system with `{{variable}}` syntax and visual picker
-   Field visibility based on input values (show/hide conditions)
-   Flow validation with visual feedback (empty flows, missing start node, disconnected nodes, cycles, hanging edges, per-node input errors)
-   Connection constraints (single Start node, no nested Iteration, cycle prevention)
-   Flow export as JSON with secret stripping
-   AI flow generation from natural language descriptions
-   Credential creation dialog inline from node editor
-   Dark/light mode theming via design tokens and CSS variables
-   Read-only mode for view-only embedding
-   Custom rendering via `renderHeader` and `renderNodePalette` render props
-   Imperative API via ref (`getFlow`, `validate`, `fitView`, `clear`, `addNode`, `toJSON`)
-   Request interceptor for customizing outgoing API requests
-   Dirty state tracking
-   Keyboard shortcut: Cmd/Ctrl+S to save
-   CodeMirror rich code editor (JavaScript, Python, JSON)
-   TipTap rich text / markdown editor
-   10 working examples demonstrating all features
